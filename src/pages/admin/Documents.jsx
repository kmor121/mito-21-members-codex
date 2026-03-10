import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

export default function Documents() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [savedDocs, setSavedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [sortDirty, setSortDirty] = useState(false);

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

  useEffect(() => {
    loadDocs();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTogglePublished(doc) {
    setError("");
    setMessage("");
    try {
      await apiRequest("toggle-org-document-published", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
      });
      setMessage("公開状態を変更しました。");
      await loadDocs();
    } catch (err) {
      setError(err.message || "公開状態の変更に失敗しました。");
    }
  }

  function handleDragStart(idx) { dragItem.current = idx; }
  function handleDragEnter(idx) { dragOverItem.current = idx; }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;
    const reordered = [...docs];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    setDocs(reordered);
    setSortDirty(true);
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
      setMessage("並び順を保存しました。");
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
        <p className="page-description">団体資料の管理</p>
      </div>

      {(error || message) && (
        <p className={`message${error ? " error" : ""}`} aria-live="polite">{error || message}</p>
      )}

      {sortDirty && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '0.75rem 1rem', marginBottom: '0.75rem',
          background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, fontSize: '0.9em',
        }}>
          <span style={{ fontWeight: 500 }}>未保存の変更があります</span>
          <button className="button" type="button" onClick={handleSaveSortOrder} disabled={saving} style={{ fontSize: '0.85em' }}>
            {saving ? "保存中..." : "並び順を保存"}
          </button>
          <button className="button ghost" type="button" onClick={handleCancelSort} style={{ fontSize: '0.85em' }}>元に戻す</button>
        </div>
      )}

      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <div className="panel-heading">
            <div><h2>資料一覧</h2></div>
            <button className="button" type="button" onClick={() => navigate("/admin/documents/new")}>新規追加</button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : docs.length === 0 ? (
            <p className="empty-state">資料がありません。</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>タイトル</th>
                    <th>資料種別</th>
                    <th>年度</th>
                    <th>順序</th>
                    <th>状態</th>
                    <th>更新日</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, idx) => (
                    <tr
                      key={doc.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnter={() => handleDragEnter(idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      style={{ cursor: 'grab' }}
                    >
                      <td style={{ cursor: 'grab', textAlign: 'center', color: 'var(--text-secondary)' }}>&#8942;</td>
                      <td><strong>{displayValue(doc.title)}</strong></td>
                      <td><span className="pill">{displayValue(doc.doc_type)}</span></td>
                      <td>{doc.fiscal_year_label || "常設"}</td>
                      <td>{doc.sort_order ?? "-"}</td>
                      <td>
                        <span
                          className={`pill${doc.published ? " pill-success" : ""}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleTogglePublished(doc)}
                        >
                          {doc.published ? "公開" : "非公開"}
                        </span>
                      </td>
                      <td className="muted">{doc.updated_at ? doc.updated_at.slice(0, 10) : "-"}</td>
                      <td>
                        <button className="text-link" type="button" onClick={() => navigate(`/admin/documents/${doc.id}/edit`)}>編集</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
