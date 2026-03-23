import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, base44, invalidateReadCache } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Button, PageHeader, Modal } from '../../components/ui';
import { useIsMobile } from '../../hooks/useIsMobile';

const DOC_TYPE_BADGE = {
  "事業計画": { color: "var(--color-accent)", bg: "var(--color-accent-light)", icon: "📋" },
  "団体理念": { color: "#7c3aed", bg: "#f5f3ff", icon: "💡" },
  "会則・規約": { color: "var(--color-warning)", bg: "var(--color-warning-light)", icon: "📜" },
  "年間スケジュール": { color: "var(--color-success)", bg: "var(--color-success-light)", icon: "📅" },
  "運用マニュアル": { color: "var(--color-accent)", bg: "var(--color-accent-light)", icon: "📖" },
};

function getTypeBadge(type) {
  return DOC_TYPE_BADGE[type] || { color: "var(--color-text-secondary)", bg: "var(--color-border)", icon: "📄" };
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
  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      title={title}
      footer={<>
        <Button variant="secondary" onClick={onCancel}>キャンセル</Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
          style={danger ? { background: "var(--color-danger)", color: "#fff", border: "none" } : {}}
        >{confirmLabel}</Button>
      </>}
    >
      {children}
    </Modal>
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

  useEffect(() => { try { base44.appLogs?.logUserInApp?.('A10-資料管理'); } catch (e) { /* analytics */ } }, []);
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
      {isMobile ? (
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="page-title" style={{ margin: 0 }}>資料管理</h1>
          <button
            type="button"
            onClick={() => navigate("/admin/documents/new")}
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-accent)', cursor: 'pointer', color: '#fff', flexShrink: 0,
            }}
            aria-label="新規作成"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      ) : (
        <PageHeader title="資料管理" subtitle="団体資料の管理・並び替え・公開設定" />
      )}

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

      {/* Sort dirty floating bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--color-bg)", borderTop: "1px solid var(--color-border)",
        boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
        padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, zIndex: 100,
        transform: sortDirty ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.25s ease",
      }}>
        <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>並び順が変更されました</span>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={handleCancelSort}>キャンセル</Button>
          <Button variant="primary" onClick={handleSaveSortOrder} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      <section className={isMobile ? "" : "card panel-card single-panel"}>
        <div className={isMobile ? "" : "card-body stack"}>
          {!isMobile && (
            <div className="panel-heading compact">
              <h2>資料一覧</h2>
              <Button variant="primary" onClick={() => navigate("/admin/documents/new")}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 4 }}>
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                新規作成
              </Button>
            </div>
          )}

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
              <Button variant="primary" onClick={() => navigate("/admin/documents/new")} style={{ marginTop: 12 }}>
                新規作成
              </Button>
            </div>
          ) : isMobile ? (
            /* ── Mobile card list ── */
            <div style={{ borderTop: '1px solid var(--color-border)' }}>
              {docs.map((doc, idx) => {
                const isLast = idx === docs.length - 1;
                return (
                  <div
                    key={doc.id}
                    style={{
                      padding: '10px 12px 10px 16px',
                      borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/admin/documents/${doc.id}/edit`)}
                  >
                    {/* Row 1: title + compact toggle + delete */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        flex: 1, minWidth: 0,
                        fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {doc.title || "-"}
                      </div>
                      {/* Compact toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!doc.published}
                        aria-label={doc.published ? "公開中 — タップで非公開に" : "非公開 — タップで公開に"}
                        onClick={(e) => { e.stopPropagation(); setConfirmToggle(doc); }}
                        style={{
                          position: 'relative',
                          display: 'inline-block',
                          width: 36,
                          height: 20,
                          borderRadius: 10,
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          flexShrink: 0,
                          background: doc.published ? 'var(--color-accent)' : '#d1d5db',
                          transition: 'background 0.2s ease',
                          verticalAlign: 'middle',
                        }}
                      >
                        <span style={{
                          position: 'absolute',
                          top: 2,
                          left: doc.published ? 18 : 2,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </button>
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(doc); }}
                        aria-label="削除"
                        style={{
                          padding: 4, border: 'none', background: 'none', cursor: 'pointer',
                          color: 'var(--color-text-tertiary)', flexShrink: 0, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M6.5 7v4M9.5 7v4M3.5 4.5l.5 8a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5l.5-8" />
                        </svg>
                      </button>
                    </div>
                    {/* Row 2: meta info */}
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {doc.doc_type || "-"} · {doc.fiscal_year_label || "常設"}{doc.updated_at ? ` · ${doc.updated_at.slice(0, 10)}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Desktop table ── */
            <div className="table-wrap" style={{ WebkitOverflowScrolling: "touch" }}>
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
    </section>
  );
}
