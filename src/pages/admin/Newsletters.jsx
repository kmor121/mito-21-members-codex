import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiRequest } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";

function statusLabel(s) {
  return (
    { draft: "下書き", scheduled: "予約中", sent: "送信済", cancelled: "取消", failed: "失敗" }[
      s
    ] ||
    s ||
    "-"
  );
}

function statusClass(s) {
  return (
    {
      draft: "",
      scheduled: "pill-warning",
      sent: "pill-success",
      failed: "pill-danger",
      cancelled: "",
    }[s] || ""
  );
}

function channelIcon(c) {
  if (c === "line") return "LINE";
  if (c === "email+line") return "Mail+LINE";
  return "Mail";
}

function audienceLabel(t) {
  return (
    {
      all: "全員",
      member_type: "会員種別",
      status: "ステータス",
      approval_status: "承認状態",
    }[t] ||
    t ||
    "全員"
  );
}

const STATUS_TABS = [
  { key: "all", label: "全て" },
  { key: "draft", label: "下書き" },
  { key: "scheduled", label: "予約中" },
  { key: "sent", label: "送信済" },
];

function SkeletonLoading() {
  return (
    <div className="nl-skeleton">
      <div className="skeleton-line"></div>
      <div className="skeleton-line short"></div>
      <div className="skeleton-block"></div>
    </div>
  );
}

export default function Newsletters() {
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // List data
  const [newsletters, setNewsletters] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  // Detail / form data
  const [form, setForm] = useState({
    id: "",
    title: "",
    body: "",
    channel: "email",
    channel_email: true,
    channel_line: false,
    audience_type: "all",
    audience_filter_json: "",
    audience_detail: "",
    scheduled_at: "",
    attachment_name: "",
    attachment_url: "",
    status: "",
    sent_at: "",
    sent_count: 0,
  });

  const [previewCount, setPreviewCount] = useState(null);
  const [toast, setToast] = useState("");
  const bodyRef = useRef(null);

  const loadList = useCallback(() => {
    setLoading(true);
    setError("");
    apiRequest("list-newsletters-admin")
      .then((result) => {
        const raw = result.newsletters || result;
        setNewsletters(Array.isArray(raw) ? raw : []);
      })
      .catch((err) => {
        setError(err.message || "配信一覧の取得に失敗しました。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Load detail when selectedId changes
  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    setPreviewCount(null);
    apiRequest(`get-newsletter-detail?id=${selectedId}`)
      .then((nl) => {
        const channelVal = nl.channel || "email";
        setForm({
          id: nl.id || "",
          title: nl.title || "",
          body: nl.body || "",
          channel: channelVal,
          channel_email: channelVal === "email" || channelVal === "email+line",
          channel_line: channelVal === "line" || channelVal === "email+line",
          audience_type: nl.audience_type || "all",
          audience_filter_json: nl.audience_filter_json || "",
          audience_detail: nl.audience_detail || "",
          scheduled_at: nl.scheduled_at || "",
          attachment_name: nl.attachment_name || (nl.attachments && nl.attachments[0]?.name) || "",
          attachment_url: nl.attachment_url || (nl.attachments && nl.attachments[0]?.url) || "",
          status: nl.status || "",
          sent_at: nl.sent_at || "",
          sent_count: nl.sent_count || 0,
        });
      })
      .catch((err) => {
        alert(err.message || "詳細の取得に失敗しました。");
      })
      .finally(() => {
        setDetailLoading(false);
      });
  }, [selectedId]);

  // Auto-resize body textarea
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = "auto";
      bodyRef.current.style.height = bodyRef.current.scrollHeight + "px";
    }
  }, [form.body]);

  // Show toast then auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function resetForm() {
    setSelectedId(null);
    setPreviewCount(null);
    setForm({
      id: "",
      title: "",
      body: "",
      channel: "email",
      channel_email: true,
      channel_line: false,
      audience_type: "all",
      audience_filter_json: "",
      audience_detail: "",
      scheduled_at: "",
      attachment_name: "",
      attachment_url: "",
      status: "",
      sent_at: "",
      sent_count: 0,
    });
  }

  function deriveChannel(email, line) {
    if (email && line) return "email+line";
    if (line) return "line";
    return "email";
  }

  function handleChannelToggle(field) {
    setForm((prev) => {
      const next = { ...prev, [field]: !prev[field] };
      // Ensure at least one is selected
      if (!next.channel_email && !next.channel_line) {
        next.channel_email = true;
      }
      next.channel = deriveChannel(next.channel_email, next.channel_line);
      return next;
    });
  }

  function handleAudienceTypeChange(e) {
    const val = e.target.value;
    setForm((prev) => ({
      ...prev,
      audience_type: val,
      audience_detail: "",
      audience_filter_json: "",
    }));
    setPreviewCount(null);
  }

  function handleAudienceDetailChange(e) {
    const val = e.target.value;
    setForm((prev) => ({
      ...prev,
      audience_detail: val,
      audience_filter_json: val ? JSON.stringify({ member_type: val }) : "",
    }));
    setPreviewCount(null);
  }

  async function handleSaveDraft(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const attachments =
        form.attachment_name || form.attachment_url
          ? [{ name: form.attachment_name, url: form.attachment_url }]
          : [];
      const payload = {
        id: form.id || undefined,
        title: form.title,
        body: form.body,
        channel: form.channel,
        audience_type: form.audience_type,
        audience_filter_json: form.audience_filter_json,
        scheduled_at: form.scheduled_at || undefined,
        attachments_json: JSON.stringify(attachments),
      };
      const result = await apiRequest("save-newsletter-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setToast("下書きを保存しました。");
      // Update form with returned id
      if (result.id) {
        setForm((prev) => ({ ...prev, id: result.id, status: result.status || "draft" }));
        setSelectedId(result.id);
      }
      loadList();
    } catch (err) {
      alert(err.message || "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setSaving(true);
    try {
      const result = await apiRequest("preview-newsletter-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience_type: form.audience_type,
          audience_filter_json: form.audience_filter_json,
        }),
      });
      setPreviewCount(result.count ?? result.total ?? 0);
    } catch (err) {
      alert(err.message || "プレビューに失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!form.id) return;
    const scheduledMsg = form.scheduled_at ? `\n予約日時: ${form.scheduled_at}` : "";
    if (!window.confirm(`この配信を送信しますか？${scheduledMsg}`)) return;
    setSaving(true);
    try {
      await apiRequest("send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletter_id: form.id }),
      });
      setToast("配信を送信しました。");
      loadList();
      // Reload detail
      setSelectedId(form.id);
    } catch (err) {
      alert(err.message || "送信に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  // Filter newsletters by tab
  const filteredNewsletters = useMemo(() =>
    activeTab === "all"
      ? newsletters
      : newsletters.filter((nl) => nl.status === activeTab),
    [activeTab, newsletters]
  );

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">配信管理</h1>
          <p className="page-description">メール・LINE配信の管理</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body">
            <LoadingSpinner />
          </div>
        </section>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">配信管理</h1>
          <p className="page-description">メール・LINE配信の管理</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message error">{error}</p>
          </div>
        </section>
      </section>
    );
  }

  const isSent = form.status === "sent";

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">配信管理</h1>
        <p className="page-description">メール・LINE配信の管理</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="message success" style={{ marginBottom: "1rem" }}>
          {toast}
        </div>
      )}

      <div className="master-detail-layout">
        {/* Left panel: newsletter list */}
        <section className="card panel-card nl-list-panel">
          <div className="card-body stack">
            <div className="panel-heading">
              <div>
                <h2>配信一覧</h2>
              </div>
              <button className="btn btn-primary" onClick={resetForm}>
                新規作成
              </button>
            </div>

            {/* Status tabs */}
            <div className="nl-status-tabs">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`nl-tab${activeTab === tab.key ? " active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Newsletter card list */}
            {filteredNewsletters.length === 0 ? (
              <div className="nl-empty-state">
                <p className="muted">配信データがありません。</p>
              </div>
            ) : (
              <div className="nl-card-list">
                {filteredNewsletters.map((nl) => (
                  <button
                    key={nl.id}
                    className={`nl-card${selectedId === nl.id ? " is-selected" : ""}`}
                    onClick={() => setSelectedId(nl.id)}
                  >
                    <div className="nl-card-header">
                      <span className={`pill ${statusClass(nl.status)}`}>
                        {statusLabel(nl.status)}
                      </span>
                      <span className="nl-channel-badge">{channelIcon(nl.channel)}</span>
                    </div>
                    <div className="nl-card-title">{nl.title || "-"}</div>
                    <div className="nl-card-meta">
                      <span>{audienceLabel(nl.audience_type)}</span>
                      <span>{nl.date || nl.updated_at || nl.created_at || "-"}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right panel: newsletter editor */}
        <section className="card panel-card nl-detail-panel">
          <div className="card-body stack">
            {detailLoading ? (
              <SkeletonLoading />
            ) : (
              <>
                <div className="nl-detail-header">
                  <h2>{form.id ? "配信編集" : "新規配信"}</h2>
                  {form.status && (
                    <span className={`pill ${statusClass(form.status)}`}>
                      {statusLabel(form.status)}
                    </span>
                  )}
                </div>

                <form className="nl-form" onSubmit={handleSaveDraft}>
                  <div className="nl-detail-stack">
                    {/* Title */}
                    <div className="nl-subject-field">
                      <label className="field-label" htmlFor="nl-title">
                        件名
                      </label>
                      <input
                        id="nl-title"
                        className="nl-subject-input"
                        type="text"
                        placeholder="配信タイトル"
                        value={form.title}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        disabled={isSent}
                      />
                    </div>

                    {/* Body */}
                    <div className="form-field">
                      <label className="field-label" htmlFor="nl-body">
                        本文
                      </label>
                      <textarea
                        id="nl-body"
                        ref={bodyRef}
                        className="nl-body-textarea"
                        placeholder="配信本文を入力..."
                        value={form.body}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, body: e.target.value }))
                        }
                        disabled={isSent}
                        rows={6}
                      />
                    </div>

                    {/* Options grid */}
                    <div className="nl-options-grid">
                      {/* Channel toggles */}
                      <div className="nl-option-section">
                        <span className="nl-option-label">配信チャネル</span>
                        <div className="nl-channel-toggles">
                          <button
                            type="button"
                            className={`nl-toggle-btn${form.channel_email ? " active" : ""}`}
                            onClick={() => handleChannelToggle("channel_email")}
                            disabled={isSent}
                          >
                            Mail
                          </button>
                          <button
                            type="button"
                            className={`nl-toggle-btn${form.channel_line ? " active" : ""}`}
                            onClick={() => handleChannelToggle("channel_line")}
                            disabled={isSent}
                          >
                            LINE
                          </button>
                        </div>
                        <input type="hidden" name="channel" value={form.channel} />
                      </div>

                      {/* Audience */}
                      <div className="nl-option-section">
                        <span className="nl-option-label">配信対象</span>
                        <select
                          className="field-input"
                          value={form.audience_type}
                          onChange={handleAudienceTypeChange}
                          disabled={isSent}
                        >
                          <option value="all">全員</option>
                          <option value="member_type">会員種別</option>
                        </select>
                        {form.audience_type === "member_type" && (
                          <select
                            className="field-input"
                            value={form.audience_detail}
                            onChange={handleAudienceDetailChange}
                            disabled={isSent}
                            style={{ marginTop: "0.5rem" }}
                          >
                            <option value="">-- 選択 --</option>
                            <option value="正会員">正会員</option>
                            <option value="賛助会員">賛助会員</option>
                          </select>
                        )}
                        <input
                          type="hidden"
                          name="audience_filter_json"
                          value={form.audience_filter_json}
                        />
                      </div>

                      {/* Scheduled at */}
                      <div className="nl-option-section">
                        <span className="nl-option-label">予約送信</span>
                        <input
                          className="field-input"
                          type="datetime-local"
                          value={form.scheduled_at}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))
                          }
                          disabled={isSent}
                        />
                      </div>
                    </div>

                    {/* Attachment section */}
                    <details className="nl-attachment-section">
                      <summary>添付ファイル</summary>
                      <div className="nl-attachment-drop">
                        <div className="form-field">
                          <label className="field-label" htmlFor="nl-attach-name">
                            ファイル名
                          </label>
                          <input
                            id="nl-attach-name"
                            className="field-input"
                            type="text"
                            placeholder="例: 案内.pdf"
                            value={form.attachment_name}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                attachment_name: e.target.value,
                              }))
                            }
                            disabled={isSent}
                          />
                        </div>
                        <div className="form-field">
                          <label className="field-label" htmlFor="nl-attach-url">
                            URL
                          </label>
                          <input
                            id="nl-attach-url"
                            className="field-input"
                            type="url"
                            placeholder="https://..."
                            value={form.attachment_url}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                attachment_url: e.target.value,
                              }))
                            }
                            disabled={isSent}
                          />
                        </div>
                      </div>
                    </details>

                    {/* Sent info display */}
                    {isSent && (
                      <div className="nl-sent-info">
                        <p>
                          <strong>送信日時:</strong> {form.sent_at || "-"}
                        </p>
                        <p>
                          <strong>送信数:</strong> {form.sent_count || 0}
                        </p>
                      </div>
                    )}

                    {/* Action bar */}
                    <div className="nl-action-bar">
                      <button
                        className="btn btn-secondary"
                        type="submit"
                        disabled={saving || isSent}
                      >
                        {saving ? <span className="nl-spinner" /> : null}
                        下書き保存
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={handlePreview}
                        disabled={saving || isSent}
                      >
                        プレビュー
                        {previewCount !== null && (
                          <span
                            className="pill pill-info"
                            style={{ marginLeft: "0.5rem" }}
                          >
                            {previewCount}名
                          </span>
                        )}
                      </button>
                      {form.id && !isSent && (
                        <button
                          className="nl-send-btn"
                          type="button"
                          onClick={handleSend}
                          disabled={saving}
                        >
                          {saving ? <span className="nl-spinner" /> : null}
                          送信する
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
