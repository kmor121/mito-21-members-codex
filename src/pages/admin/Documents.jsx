import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const RichTextEditor = lazy(() => import('../../components/common/RichTextEditor'));

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

const DOC_TYPES = ["事業計画", "団体理念", "会則・規約", "年間スケジュール", "運用マニュアル"];

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Editor form state
  const [formTitle, setFormTitle] = useState("");
  const [formDocType, setFormDocType] = useState("");
  const [formFiscalYearId, setFormFiscalYearId] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formPublished, setFormPublished] = useState(false);
  const [formContent, setFormContent] = useState("");
  const [formAttachment, setFormAttachment] = useState("");
  const [formCategory, setFormCategory] = useState("");

  // Drag state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const loadDocs = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [docsResult, fyResult] = await Promise.all([
        apiRequest("list-org-documents-admin"),
        apiRequest("list-fiscal-years-admin"),
      ]);
      const rawDocs = docsResult.documents || docsResult;
      setDocs(Array.isArray(rawDocs) ? rawDocs : []);
      const rawFY2 = fyResult.fiscal_years;
      setFiscalYears(Array.isArray(rawFY2) ? rawFY2 : []);
    } catch (err) {
      setError(err.message || "資料一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setFormTitle("");
    setFormDocType("");
    setFormFiscalYearId("");
    setFormSortOrder(0);
    setFormPublished(false);
    setFormContent("");
    setFormAttachment("");
    setFormCategory("");
  }

  function handleNew() {
    setEditingId(null);
    resetForm();
    setShowModal(true);
    setMessage("");
  }

  async function handleEdit(doc) {
    setEditingId(doc.id);
    setMessage("");
    setError("");

    try {
      const result = await apiRequest(`get-org-document-detail?id=${doc.id}`);
      setFormTitle(result.title || "");
      setFormDocType(result.doc_type || "");
      setFormFiscalYearId(result.fiscal_year_id || "");
      setFormSortOrder(result.sort_order || 0);
      setFormPublished(!!result.published);
      setFormContent(result.content || "");
      setFormAttachment(result.attachment || "");
      setFormCategory(result.category || (result.doc_type === "運用マニュアル" ? "運用マニュアル" : ""));
      setShowModal(true);
    } catch (err) {
      setError(err.message || "資料詳細の取得に失敗しました。");
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!formTitle.trim()) { setError("タイトルは必須です。"); return; }
    if (!formDocType) { setError("資料種別は必須です。"); return; }
    if (formAttachment && !/^https?:\/\/.+/.test(formAttachment)) { setError("添付URLの形式が正しくありません。"); return; }

    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        doc_type: formDocType,
        fiscal_year_id: formFiscalYearId || null,
        sort_order: Number(formSortOrder) || 0,
        published: formPublished,
        content: formContent,
        attachment: formAttachment || null,
      };
      if (formDocType === "運用マニュアル") {
        payload.category = formCategory || "運用マニュアル";
      }
      if (editingId) payload.id = editingId;

      await apiRequest("save-org-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setMessage("保存しました。");
      setShowModal(false);
      await loadDocs();
    } catch (err) {
      setError(err.message || "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

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

  // Drag & Drop sort order
  function handleDragStart(idx) {
    dragItem.current = idx;
  }

  function handleDragEnter(idx) {
    dragOverItem.current = idx;
  }

  async function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const reordered = [...docs];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    setDocs(reordered);
    dragItem.current = null;
    dragOverItem.current = null;

    // Save new sort orders
    try {
      const updates = reordered.map((doc, idx) => ({
        id: doc.id,
        sort_order: idx,
      }));
      await apiRequest("batch-update-sort-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "org_documents", items: updates }),
      });
    } catch {
      // Silently fail on sort save - order is preserved locally
    }
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">資料管理</h1>
        <p className="page-description">団体資料の管理</p>
      </div>

      {(error || message) && (
        <p className={`message${error ? " error" : ""}`} aria-live="polite">
          {error || message}
        </p>
      )}

      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <div className="panel-heading">
            <div><h2>資料一覧</h2></div>
            <button className="button" type="button" onClick={handleNew}>新規追加</button>
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
                        <button className="text-link" type="button" onClick={() => handleEdit(doc)}>編集</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Edit Modal */}
      {showModal && (
        <div className="confirm-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? "資料編集" : "新規資料"}</h3>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form className="modal-body" noValidate onSubmit={handleSave}>
              <div className="form-grid">
                <div className="field field-span-2">
                  <label htmlFor="doc-title">タイトル</label>
                  <input id="doc-title" type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
                </div>

                <div className="field">
                  <label htmlFor="doc-type">資料種別</label>
                  <select id="doc-type" value={formDocType} onChange={(e) => {
                    setFormDocType(e.target.value);
                    if (e.target.value === "運用マニュアル" && !formCategory) setFormCategory("運用マニュアル");
                  }} required>
                    <option value="">選択してください</option>
                    {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="doc-fy">年度</label>
                  <select id="doc-fy" value={formFiscalYearId} onChange={(e) => setFormFiscalYearId(e.target.value)}>
                    <option value="">常設 / 年度なし</option>
                    {fiscalYears.map((fy) => <option key={fy.id} value={fy.id}>{fy.year}年度</option>)}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="doc-sort">表示順</label>
                  <input id="doc-sort" type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value)} />
                </div>

                <div className="field">
                  <label htmlFor="doc-published" className="checkbox-label">
                    <input id="doc-published" type="checkbox" checked={formPublished} onChange={(e) => setFormPublished(e.target.checked)} />
                    公開する
                  </label>
                </div>

                <div className="field field-span-2">
                  <label>本文</label>
                  <Suspense fallback={<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>}>
                    <RichTextEditor content={formContent} onChange={setFormContent} />
                  </Suspense>
                </div>

                <div className="field field-span-2">
                  <label htmlFor="doc-attachment">添付URL</label>
                  <input id="doc-attachment" type="url" placeholder="https://..." value={formAttachment} onChange={(e) => setFormAttachment(e.target.value)} />
                </div>

                {formDocType === "運用マニュアル" && (
                  <div className="field field-span-2">
                    <label htmlFor="doc-category">カテゴリ</label>
                    <input id="doc-category" type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="button" type="submit" disabled={saving}>
                  {saving ? "保存中..." : "保存する"}
                </button>
                <button className="button ghost" type="button" onClick={() => setShowModal(false)}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
