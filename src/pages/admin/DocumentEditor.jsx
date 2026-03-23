import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest, base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Button } from '../../components/ui';

const RichTextEditor = lazy(() => import('../../components/common/RichTextEditor'));

const DOC_TYPES = [
  { key: "事業計画", label: "事業計画", icon: "📋", desc: "年間の事業計画書" },
  { key: "団体理念", label: "団体理念", icon: "💡", desc: "ミッション・ビジョン" },
  { key: "会則・規約", label: "会則・規約", icon: "📜", desc: "定款・諸規則" },
  { key: "年間スケジュール", label: "年間スケジュール", icon: "📅", desc: "イベント予定表" },
  { key: "運用マニュアル", label: "運用マニュアル", icon: "📖", desc: "手順書・ガイド" },
];

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
  const [attachOpen, setAttachOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const isDirty = useRef(false);
  const initialLoad = useRef(true);

  // Track dirty
  useEffect(() => {
    if (initialLoad.current) return;
    isDirty.current = true;
  }, [formTitle, formDocType, formFiscalYearId, formSortOrder, formPublished, formContent, formAttachment]);

  // Warn on browser back
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
        if (result.attachment) setAttachOpen(true);
      }
    } catch (err) {
      setError(err.message || "データの取得に失敗しました。");
    } finally {
      setLoading(false);
      setTimeout(() => { initialLoad.current = false; }, 100);
    }
  }, [isNew, documentId]);

  useEffect(() => { loadData(); }, [loadData]);

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
    if (isDirty.current) {
      setConfirmCancel(true);
      return;
    }
    navigate("/admin/documents");
  }

  function handleConfirmCancel() {
    isDirty.current = false;
    setConfirmCancel(false);
    navigate("/admin/documents");
  }

  function handleDocTypeSelect(key) {
    setFormDocType(key);
  }

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <p className="page-description">
            <Link className="text-link" to="/admin/documents">&larr; 資料一覧に戻る</Link>
          </p>
          <h1 className="page-title">{isNew ? "新しい資料を作成" : "資料編集"}</h1>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body"><LoadingSpinner /></div>
        </section>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <ConfirmDialog
        open={confirmCancel}
        title="編集内容の破棄"
        message="未保存の変更があります。破棄しますか？"
        confirmLabel="破棄する"
        confirmStyle={{ background: "var(--color-danger)", borderColor: "var(--color-danger)" }}
        onConfirm={handleConfirmCancel}
        onCancel={() => setConfirmCancel(false)}
      />
      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Link className="text-link" to="/admin/documents" style={{ fontSize: 13, marginBottom: 8 }}>&larr; 資料一覧に戻る</Link>
        <h1 className="page-title">
          {isNew ? "新しい資料を作成" : "資料編集"}
        </h1>
      </div>

      {error && <p className="message error" aria-live="polite">{error}</p>}

      <form className="doc-editor-form" noValidate onSubmit={handleSave}>
        {/* Title */}
        <section className="card panel-card single-panel">
          <div className="card-body">
            <div className="doc-ed-field">
              <label className="doc-ed-label" htmlFor="doc-title">
                タイトル <span className="required">必須</span>
              </label>
              <input
                id="doc-title"
                className="doc-ed-title-input"
                type="text"
                placeholder="資料のタイトルを入力"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Doc Type cards */}
        <section className="card panel-card single-panel">
          <div className="card-body">
            <div className="doc-ed-field">
              <label className="doc-ed-label">
                種別 <span className="required">必須</span>
              </label>
              <div className="doc-type-cards">
                {DOC_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`doc-type-card${formDocType === t.key ? " active" : ""}`}
                    onClick={() => handleDocTypeSelect(t.key)}
                  >
                    <span className="doc-type-card-icon">{t.icon}</span>
                    <span className="doc-type-card-label">{t.label}</span>
                    <span className="doc-type-card-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Settings row */}
        <section className="card panel-card single-panel">
          <div className="card-body">
            <div className="doc-ed-settings-grid">
              <div className="doc-ed-field">
                <label className="doc-ed-label" htmlFor="doc-fy">年度</label>
                <select
                  id="doc-fy"
                  className="field-input"
                  value={formFiscalYearId}
                  onChange={(e) => setFormFiscalYearId(e.target.value)}
                >
                  <option value="">年度なし（常設）</option>
                  {fiscalYears.map((fy) => (
                    <option key={fy.id} value={fy.id}>{fy.year}年度</option>
                  ))}
                </select>
              </div>


              <div className="doc-ed-field">
                <label className="doc-ed-label">公開設定</label>
                <div className="doc-publish-toggle">
                  <button
                    type="button"
                    className={`doc-toggle${formPublished ? " doc-toggle-on" : ""}`}
                    onClick={() => setFormPublished(!formPublished)}
                  >
                    <span className="doc-toggle-knob" />
                  </button>
                  <span className={`doc-publish-label${formPublished ? " doc-publish-on" : ""}`}>
                    {formPublished ? "公開" : "非公開"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content editor */}
        <section className="card panel-card single-panel">
          <div className="card-body">
            <div className="doc-ed-field">
              <label className="doc-ed-label">本文</label>
              <Suspense fallback={
                <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LoadingSpinner />
                </div>
              }>
                <div className="doc-ed-editor-wrap">
                  <RichTextEditor content={formContent} onChange={setFormContent} />
                </div>
              </Suspense>
            </div>
          </div>
        </section>

        {/* Attachment */}
        <section className="card panel-card single-panel">
          <div className="card-body">
            <button
              type="button"
              className="doc-attach-toggle"
              onClick={() => setAttachOpen(!attachOpen)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: "transform 0.2s", transform: attachOpen ? "rotate(90deg)" : "rotate(0)" }}>
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {"📎"} 添付ファイル
              {formAttachment && <span className="doc-attach-badge">1</span>}
            </button>
            {attachOpen && (
              <div className="doc-attach-area nl2-slide-in">
                <div className="doc-attach-drop">
                  <div className="doc-attach-drop-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M16 6v14M10 14l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 22v4a2 2 0 002 2h20a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p>ファイルをドロップまたはURLを入力</p>
                  <div className="doc-ed-field" style={{ textAlign: "left", maxWidth: 480, margin: "0 auto" }}>
                    <label className="doc-ed-label-sm" htmlFor="doc-attachment">添付URL</label>
                    <input
                      id="doc-attachment"
                      className="field-input"
                      type="url"
                      placeholder="https://..."
                      value={formAttachment}
                      onChange={(e) => setFormAttachment(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Action bar */}
        <div className="doc-ed-action-bar">
          <Button variant="secondary" onClick={handleCancel}>
            キャンセル
          </Button>
          <button type="submit" className="doc-ed-save-btn" disabled={saving}>
            {saving ? "保存中..." : isNew ? "作成" : "保存"}
          </button>
        </div>
      </form>
    </section>
  );
}
