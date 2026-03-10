import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest, base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const RichTextEditor = lazy(() => import('../../components/common/RichTextEditor'));

const DOC_TYPES = ["事業計画", "団体理念", "会則・規約", "年間スケジュール", "運用マニュアル"];

export default function DocumentEditor() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const isNew = !documentId;

  const [loading, setLoading] = useState(!isNew);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDocType, setFormDocType] = useState("");
  const [formFiscalYearId, setFormFiscalYearId] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formPublished, setFormPublished] = useState(false);
  const [formContent, setFormContent] = useState("");
  const [formAttachment, setFormAttachment] = useState("");
  const [formCategory, setFormCategory] = useState("");

  const isDirty = useRef(false);
  const initialLoad = useRef(true);

  // Track dirty state
  useEffect(() => {
    if (initialLoad.current) return;
    isDirty.current = true;
  }, [formTitle, formDocType, formFiscalYearId, formSortOrder, formPublished, formContent, formAttachment, formCategory]);

  // Warn on browser back if dirty
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (isDirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const fyList = await base44.entities.FiscalYear.list("-year");
      setFiscalYears(fyList);

      if (!isNew) {
        const result = await base44.entities.OrgDocument.get(documentId);
        setFormTitle(result.title || "");
        setFormDocType(result.doc_type || "");
        setFormFiscalYearId(result.fiscal_year_id || "");
        setFormSortOrder(result.sort_order || 0);
        setFormPublished(!!result.published);
        setFormContent(result.content || "");
        setFormAttachment(result.attachment || "");
        setFormCategory(result.category || (result.doc_type === "運用マニュアル" ? "運用マニュアル" : ""));
      }
    } catch (err) {
      setError(err.message || "データの取得に失敗しました。");
    } finally {
      setLoading(false);
      // Mark initial load complete after a tick
      setTimeout(() => { initialLoad.current = false; }, 100);
    }
  }, [isNew, documentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");

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
      if (!isNew) payload.id = documentId;

      await apiRequest("save-org-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      isDirty.current = false;
      navigate("/admin/documents");
    } catch (err) {
      setError(err.message || "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (isDirty.current && !window.confirm("未保存の変更があります。破棄しますか？")) return;
    isDirty.current = false;
    navigate("/admin/documents");
  }

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">{isNew ? "新規資料" : "資料編集"}</h1>
          <p className="page-description"><Link className="text-link" to="/admin/documents">&larr; 資料一覧へ戻る</Link></p>
        </div>
        <section className="card panel-card single-panel"><div className="card-body"><LoadingSpinner /></div></section>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">{isNew ? "新規資料" : "資料編集"}</h1>
        <p className="page-description"><Link className="text-link" to="/admin/documents">&larr; 資料一覧へ戻る</Link></p>
      </div>

      {error && (
        <p className="message error" aria-live="polite">{error}</p>
      )}

      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <form className="editor-form" noValidate onSubmit={handleSave}>
            <div className="editor-grid">
              <div className="field field-span-2">
                <label htmlFor="doc-title">タイトル *</label>
                <input id="doc-title" type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="doc-type">資料種別 *</label>
                <select id="doc-type" value={formDocType} onChange={(e) => {
                  setFormDocType(e.target.value);
                  if (e.target.value === "運用マニュアル" && !formCategory) setFormCategory("運用マニュアル");
                }}>
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
            </div>

            <div className="field" style={{ marginTop: '1rem' }}>
              <label>本文</label>
              <Suspense fallback={<div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>}>
                <div style={{ minHeight: 300 }}>
                  <RichTextEditor content={formContent} onChange={setFormContent} />
                </div>
              </Suspense>
            </div>

            <div className="editor-grid" style={{ marginTop: '1rem' }}>
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

            <div className="actions" style={{ marginTop: '1.5rem' }}>
              <button className="button" type="submit" disabled={saving}>
                {saving ? "保存中..." : "保存する"}
              </button>
              <button className="button ghost" type="button" onClick={handleCancel}>キャンセル</button>
            </div>
          </form>
        </div>
      </section>
    </section>
  );
}
