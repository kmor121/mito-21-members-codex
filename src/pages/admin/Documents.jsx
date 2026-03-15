import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, base44, invalidateReadCache } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useIsMobile } from '../../hooks/useIsMobile';

const DOC_TYPE_BADGE = {
  "事業計画": { color: "#2563eb", bg: "#eff6ff", icon: "📋" },
  "団体理念": { color: "#7c3aed", bg: "#f5f3ff", icon: "💡" },
  "会則・規約": { color: "#d97706", bg: "#fffbeb", icon: "📜" },
  "年間スケジュール": { color: "#059669", bg: "#ecfdf5", icon: "📅" },
  "運用マニュアル": { color: "#4f46e5", bg: "#eef2ff", icon: "📖" },
};

function getTypeBadge(type) {
  return DOC_TYPE_BADGE[type] || { color: "var(--text-secondary)", bg: "var(--line-light)", icon: "📄" };
}

/* ── Toggle Switch ── */
function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      className={`doc-toggle${checked ? " doc-toggle-on" : ""}`}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      disabled={disabled}
      aria-label={checked ? "公開中" : "非公開"}
    >
      <span className="doc-toggle-knob" />
    </button>
  );
}

/* ── Confirm Dialog ── */
function DocConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, danger }) {
  if (!open) return null;
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="fy-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="fy-confirm-header">
          <h3>{title}</h3>
        </div>
        <div className="fy-confirm-body">{children}</div>
        <div className="fy-confirm-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}
            style={danger ? { background: "var(--error)", borderColor: "var(--error)" } : {}}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [docs, setDocs] = useState([]);
  const [savedDocs, setSavedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const [sortDirty, setSortDirty] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Confirm toggle
  const [confirmToggle, setConfirmToggle] = useState(null);
  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadDocs = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const docList = await base44.entities.OrgDocument.list("sort_order");
      setDocs(docList);
      setSavedDocs(docList);
      setSortDirty(false);
    } catch (err) {
      setError(err.message || "資料一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDocs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Toggle published ── */
  async function executeToggle() {
    if (!confirmToggle) return;
    const doc = confirmToggle;
    setConfirmToggle(null);
    try {
      await apiRequest("toggle-org-document-published", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
      });
      setToast(doc.published ? "非公開にしました" : "公開しました");
      invalidateReadCache("OrgDocument");
      await loadDocs();
    } catch (err) {
      setError(err.message || "公開状態の変更に失敗しました。");
    }
  }

  /* ── Delete ── */
  async function executeDelete() {
    if (!confirmDelete) return;
    const doc = confirmDelete;
    setConfirmDelete(null);
    try {
      await base44.entities.OrgDocument.delete(doc.id);
      invalidateReadCache("OrgDocument");
      setToast("削除しました");
      await loadDocs();
    } catch (err) {
      setError(err.message || "削除に失敗しました。");
    }
  }

  /* ── Drag: only from handle ── */
  function handleDragStart(e, idx) {
    dragItem.current = idx;
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnter(idx) {
    dragOverItem.current = idx;
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      setDraggingIdx(null);
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const reordered = [...docs];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    setDocs(reordered);
    setSortDirty(true);
    setDraggingIdx(null);
    dragItem.current = null;
    dragOverItem.current = null;
  }

  async function handleSaveSortOrder() {
    setSaving(true);
    setError("");
    try {
      const updates = docs.map((doc, idx) => ({ id: doc.id, sort_order: idx }));
      await apiRequest("batch-update-sort-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "org_documents", items: updates }),
      });
      setToast("並び順を保存しました");
      setSavedDocs(docs);
      setSortDirty(false);
    } catch (err) {
      setError(err.message || "並び順の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelSort() {
    setDocs(savedDocs);
    setSortDirty(false);
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">資料管理</h1>
        <p className="page-description">団体資料の管理・並び替え・公開設定</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="nl2-toast nl2-toast-enter">
          <span className="nl2-toast-icon">{"\u2713"}</span>
          {toast}
        </div>
      )}

      {error && <p className="message error" aria-live="polite">{error}</p>}

      {/* Confirm toggle dialog */}
      <DocConfirmDialog
        open={!!confirmToggle}
        title="公開状態の変更"
        confirmLabel={confirmToggle?.published ? "非公開にする" : "公開する"}
        onConfirm={executeToggle}
        onCancel={() => setConfirmToggle(null)}
      >
        <p>
          「<strong>{confirmToggle?.title}</strong>」を
          {confirmToggle?.published ? "非公開" : "公開"}にしますか？
        </p>
      </DocConfirmDialog>

      {/* Confirm delete dialog */}
      <DocConfirmDialog
        open={!!confirmDelete}
        title="資料の削除"
        confirmLabel="削除"
        danger
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      >
        <p>
          「<strong>{confirmDelete?.title}</strong>」を削除しますか？この操作は取り消せません。
        </p>
      </DocConfirmDialog>

      {/* Sort dirty banner */}
      {sortDirty && (
        <div className="doc-sort-banner">
          <span className="doc-sort-banner-icon">{"\u26A0\uFE0F"}</span>
          <span className="doc-sort-banner-text">未保存の変更があります</span>
          <div className="doc-sort-banner-actions">
            <button className="btn btn-primary" type="button" onClick={handleSaveSortOrder} disabled={saving}>
              {saving ? "保存中..." : "並び順を保存"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleCancelSort}>元に戻す</button>
          </div>
        </div>
      )}

      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <div className="panel-heading compact">
            <h2>資料一覧</h2>
            <button className="btn btn-primary" type="button" onClick={() => navigate("/admin/documents/new")}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 4 }}>
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              新規作成
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : docs.length === 0 ? (
            <div className="doc-empty">
              <div className="doc-empty-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="10" y="6" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M18 16h12M18 22h12M18 28h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>まだ資料がありません</h3>
              <p className="muted">新規作成ボタンから最初の資料を追加しましょう</p>
              <button className="btn btn-primary" type="button" onClick={() => navigate("/admin/documents/new")} style={{ marginTop: 12 }}>
                新規作成
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table doc-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>タイトル</th>
                    <th>種別</th>
                    <th>年度</th>
                    <th style={{ width: 80 }}>公開</th>
                    <th>更新日</th>
                    <th style={{ width: 48 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, idx) => {
                    const badge = getTypeBadge(doc.doc_type);
                    const isDragging = draggingIdx === idx;
                    return (
                      <tr
                        key={doc.id}
                        className={`doc-row${isDragging ? " doc-row-dragging" : ""}`}
                        onClick={() => navigate(`/admin/documents/${doc.id}/edit`)}
                        onDragEnter={() => handleDragEnter(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={handleDragEnd}
                      >
                        {/* Drag handle */}
                        <td
                          className="doc-drag-handle"
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="6" cy="4" r="1.5" />
                            <circle cx="10" cy="4" r="1.5" />
                            <circle cx="6" cy="8" r="1.5" />
                            <circle cx="10" cy="8" r="1.5" />
                            <circle cx="6" cy="12" r="1.5" />
                            <circle cx="10" cy="12" r="1.5" />
                          </svg>
                        </td>
                        <td>
                          <strong className="doc-title-text">{doc.title || "-"}</strong>
                        </td>
                        <td>
                          <span
                            className="doc-type-badge"
                            style={{ color: badge.color, background: badge.bg }}
                          >
                            {badge.icon} {doc.doc_type || "-"}
                          </span>
                        </td>
                        <td className="doc-fy-cell">{doc.fiscal_year_label || "常設"}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <ToggleSwitch
                            checked={!!doc.published}
                            onChange={() => setConfirmToggle(doc)}
                          />
                        </td>
                        <td className="doc-date-cell">
                          {doc.updated_at ? doc.updated_at.slice(0, 10) : "-"}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="doc-delete-btn"
                            onClick={() => setConfirmDelete(doc)}
                            aria-label="削除"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M6.5 7v4M9.5 7v4M3.5 4.5l.5 8a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5l.5-8" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      {isMobile && (
        <style>{`
          .doc-table td, .doc-table th { padding: 8px 6px !important; font-size: 13px !important; }
          .doc-type-badge { font-size: 12px !important; }
        `}</style>
      )}
    </section>
  );
}
