import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

const DOC_TYPES = ["事業計画", "団体理念", "会則・規約", "年間スケジュール", "運用マニュアル"];

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Editor form state
  const [formTitle, setFormTitle] = useState("");
  const [formDocType, setFormDocType] = useState("");
  const [formFiscalYearId, setFormFiscalYearId] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formPublished, setFormPublished] = useState(false);
  const [formContent, setFormContent] = useState("");
  const [formAttachment, setFormAttachment] = useState("");
  const [formCategory, setFormCategory] = useState("");

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
      setFiscalYears(fyResult.fiscal_years || []);
    } catch (err) {
      setError(err.message || "資料一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDetail(id) {
    if (!id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setError("");
    try {
      const result = await apiRequest(`get-org-document-detail?id=${id}`);
      setDetail(result);
      populateForm(result);
    } catch (err) {
      setError(err.message || "資料詳細の取得に失敗しました。");
    } finally {
      setDetailLoading(false);
    }
  }

  function populateForm(doc) {
    setFormTitle(doc.title || "");
    setFormDocType(doc.doc_type || "");
    setFormFiscalYearId(doc.fiscal_year_id || "");
    setFormSortOrder(doc.sort_order || 0);
    setFormPublished(!!doc.published);
    setFormContent(doc.content || "");
    setFormAttachment(doc.attachment || "");
    setFormCategory(doc.category || (doc.doc_type === "運用マニュアル" ? "運用マニュアル" : ""));
  }

  function handleSelect(doc) {
    setSelectedId(doc.id);
    setMessage("");
    loadDetail(doc.id);
  }

  function handleNew() {
    setSelectedId(null);
    setDetail(null);
    setFormTitle("");
    setFormDocType("");
    setFormFiscalYearId("");
    setFormSortOrder(0);
    setFormPublished(false);
    setFormContent("");
    setFormAttachment("");
    setFormCategory("");
    setMessage("");
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!formTitle.trim()) {
      setError("タイトルは必須です。");
      return;
    }
    if (!formDocType) {
      setError("資料種別は必須です。");
      return;
    }
    if (formAttachment && !/^https?:\/\/.+/.test(formAttachment)) {
      setError("添付URLの形式が正しくありません。");
      return;
    }

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
      if (selectedId) payload.id = selectedId;

      const result = await apiRequest("save-org-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const savedId = result.id || selectedId;
      setMessage("保存しました。");
      await loadDocs();

      if (savedId) {
        setSelectedId(savedId);
        await loadDetail(savedId);
      }
    } catch (err) {
      setError(err.message || "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublished() {
    if (!selectedId) return;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await apiRequest("toggle-org-document-published", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId }),
      });
      setMessage("公開状態を変更しました。");
      await loadDocs();
      await loadDetail(selectedId);
    } catch (err) {
      setError(err.message || "公開状態の変更に失敗しました。");
    } finally {
      setSaving(false);
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

      <div className="master-detail">
        {/* Left: document list */}
        <section className="card panel-card list-panel">
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
              <div className="pending-list">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`basic-info-document${doc.id === selectedId ? " selected" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSelect(doc)}
                  >
                    <div>
                      <strong>{displayValue(doc.title)}</strong>
                      <span className="muted" style={{ marginLeft: "0.5rem" }}>
                        {displayValue(doc.updated_at)}
                      </span>
                    </div>
                    <div>
                      <span className="pill">{displayValue(doc.doc_type)}</span>
                      {doc.fiscal_year_label && (
                        <span className="muted" style={{ marginLeft: "0.5rem" }}>
                          {doc.fiscal_year_label}
                        </span>
                      )}
                      <span className={`pill${doc.published ? " pill-success" : ""}`} style={{ marginLeft: "0.5rem" }}>
                        {doc.published ? "公開" : "非公開"}
                      </span>
                      {doc.sort_order != null && (
                        <span className="muted" style={{ marginLeft: "0.5rem" }}>
                          順序: {doc.sort_order}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: document editor */}
        <section className="card panel-card detail-panel">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>{selectedId ? "資料編集" : "新規資料"}</h2></div>
            </div>

            {detailLoading ? (
              <LoadingSpinner />
            ) : (
              <form className="form-grid" noValidate onSubmit={handleSave}>
                <div className="field field-span-2">
                  <label htmlFor="doc-title">タイトル</label>
                  <input
                    id="doc-title"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="doc-type">資料種別</label>
                  <select
                    id="doc-type"
                    value={formDocType}
                    onChange={(e) => {
                      setFormDocType(e.target.value);
                      if (e.target.value === "運用マニュアル" && !formCategory) {
                        setFormCategory("運用マニュアル");
                      }
                    }}
                    required
                  >
                    <option value="">選択してください</option>
                    {DOC_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="doc-fy">年度</label>
                  <select
                    id="doc-fy"
                    value={formFiscalYearId}
                    onChange={(e) => setFormFiscalYearId(e.target.value)}
                  >
                    <option value="">常設 / 年度なし</option>
                    {fiscalYears.map((fy) => (
                      <option key={fy.id} value={fy.id}>{fy.year}年度</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="doc-sort">表示順</label>
                  <input
                    id="doc-sort"
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="doc-published" className="checkbox-label">
                    <input
                      id="doc-published"
                      type="checkbox"
                      checked={formPublished}
                      onChange={(e) => setFormPublished(e.target.checked)}
                    />
                    公開する
                  </label>
                </div>

                <div className="field field-span-2">
                  <label htmlFor="doc-content">本文</label>
                  <textarea
                    id="doc-content"
                    rows={12}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                  />
                </div>

                <div className="field field-span-2">
                  <label htmlFor="doc-attachment">添付URL</label>
                  <input
                    id="doc-attachment"
                    type="url"
                    placeholder="https://..."
                    value={formAttachment}
                    onChange={(e) => setFormAttachment(e.target.value)}
                  />
                </div>

                {formDocType === "運用マニュアル" && (
                  <div className="field field-span-2">
                    <label htmlFor="doc-category">カテゴリ</label>
                    <input
                      id="doc-category"
                      type="text"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                    />
                  </div>
                )}

                {detail && (
                  <div className="field field-span-2">
                    <div className="info-block">
                      <p><span className="muted">資料種別:</span> {displayValue(detail.doc_type)}</p>
                      <p><span className="muted">年度:</span> {displayValue(detail.fiscal_year_label || detail.fiscal_year_id)}</p>
                      <p><span className="muted">カテゴリ:</span> {displayValue(detail.category)}</p>
                      <p>
                        <span className="muted">公開状態:</span>{" "}
                        <span className={`pill${detail.published ? " pill-success" : ""}`}>
                          {detail.published ? "公開" : "非公開"}
                        </span>
                      </p>
                      <p><span className="muted">最終更新:</span> {displayValue(detail.updated_at)}</p>
                    </div>
                  </div>
                )}

                <div className="filter-actions">
                  <button className="button" type="submit" disabled={saving}>
                    {saving ? "保存中..." : "保存する"}
                  </button>
                  {selectedId && (
                    <button
                      className="button ghost"
                      type="button"
                      disabled={saving}
                      onClick={handleTogglePublished}
                    >
                      {formPublished ? "非公開にする" : "公開にする"}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
