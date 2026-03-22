import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { PageHeader, Button } from '../../components/ui';

/* ── Inline SVG Icons ── */
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13L2 4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 5.81 2 10.5c0 3.58 2.82 6.59 6.63 7.71-.09.82-.53 3.04-.61 3.51 0 0-.01.1.05.14s.13.02.13.02c.17-.02 2.03-1.33 2.87-1.96.61.09 1.24.13 1.93.13 5.52 0 10-3.81 10-8.5S17.52 2 12 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

/* ── Delete Confirm Modal ── */
function DeleteConfirmModal({ label, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "nlModalFade 0.2s ease",
      }}
      onClick={onCancel}
    >
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)" }} />
      <div
        style={{
          position: "relative", zIndex: 1, width: "100%", maxWidth: 420,
          background: "var(--color-bg)", borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          animation: "nlModalScale 0.2s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "28px 28px 0" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)" }}>
            {label}を削除しますか？
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: "var(--color-danger)", fontWeight: 500 }}>
            削除すると元に戻せません。
          </p>
        </div>
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "20px 28px 24px",
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 20px", borderRadius: 8,
              border: "1px solid var(--line, var(--color-border))",
              background: "var(--color-bg)", color: "var(--color-text-primary)",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: "var(--color-danger)", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Helper Functions ── */
function statusLabel(s) {
  return { draft: "下書き", scheduled: "予約中", sent: "送信済", cancelled: "取消", failed: "失敗" }[s] || s || "-";
}

function statusColor(s) {
  return {
    draft: { bg: "var(--color-bg-sub)", text: "var(--color-text-secondary)" },
    scheduled: { bg: "var(--color-warning-light)", text: "#92400e" },
    sent: { bg: "var(--color-success-light)", text: "#065f46" },
    failed: { bg: "var(--color-danger-light)", text: "#991b1b" },
  }[s] || { bg: "var(--color-bg-sub)", text: "var(--color-text-secondary)" };
}

function channelLabel(c) {
  if (c === "line") return "LINE";
  if (c === "email+line") return "メール+LINE";
  return "メール";
}

function audienceLabel(nl) {
  if (nl.audience_type === "all") return "全員";
  if (nl.audience_type === "individual") {
    try {
      const fj = JSON.parse(nl.audience_filter_json || "{}");
      const count = Array.isArray(fj.member_ids) ? fj.member_ids.length : 0;
      return count > 0 ? `個人指定(${count}名)` : "個人指定";
    } catch { return "個人指定"; }
  }
  try {
    const fj = JSON.parse(nl.audience_filter_json || "{}");
    const parts = [];
    if (fj.segment) parts.push(fj.segment);
    else if (fj.member_type) parts.push(fj.member_type);
    if (fj.unpaid_only) parts.push("未納");
    if (fj.is_graduate) parts.push("卒業生");
    if (parts.length > 0) return parts.join("+");
  } catch { /* ignore */ }
  return "全員";
}

function audienceDetailLabel(nl) {
  if (nl.audience_type === "all") return "全員";
  try {
    const fj = JSON.parse(nl.audience_filter_json || "{}");
    const parts = [];
    if (fj.segment) parts.push(fj.segment);
    else if (fj.member_type) parts.push(fj.member_type);
    if (fj.unpaid_only) parts.push("会費未納者");
    if (fj.is_graduate) parts.push("卒業生");
    if (nl.audience_type === "individual" && Array.isArray(fj.member_ids)) {
      parts.push(`個人指定(${fj.member_ids.length}名)`);
    }
    if (parts.length > 0) return parts.join(" + ");
  } catch { /* ignore */ }
  return "全員";
}

function formatDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  } catch {
    return "-";
  }
}

function formatDateFull(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function parseAttachments(nl) {
  try {
    const raw = nl.attachments_json;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(a => a.filename).map(a => ({
      filename: a.filename,
      size: a.size || null,
    }));
  } catch { return []; }
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/* ── useDebounce Hook ── */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ── Tab Definitions ── */
const TABS = [
  { key: "all", label: "すべて" },
  { key: "draft", label: "下書き" },
  { key: "scheduled", label: "予約中" },
  { key: "history", label: "送信履歴" },
  { key: "template", label: "テンプレート" },
];

/* ── Period Filter ── */
const PERIOD_FILTERS = [
  { key: "month", label: "今月" },
  { key: "last_month", label: "先月" },
  { key: "3months", label: "3ヶ月" },
  { key: "all", label: "全期間" },
];

function getStartOfMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ── History Detail Modal ── */
function HistoryDetailModal({ newsletter, onClose, onResend }) {
  const [showRecipients, setShowRecipients] = useState(false);
  if (!newsletter) return null;

  const sc = statusColor(newsletter.status);
  const attachments = parseAttachments(newsletter);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "nlModalFade 0.2s ease",
      }}
      onClick={onClose}
    >
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)" }} />
      <div
        style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: 600,
          background: "var(--color-bg)",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          maxHeight: "90vh", overflow: "hidden",
          display: "flex", flexDirection: "column",
          animation: "nlModalScale 0.2s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid var(--line, var(--color-border))",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {newsletter.title || "(無題)"}
            </h3>
            <span style={{
              flexShrink: 0,
              display: "inline-block", padding: "3px 10px", borderRadius: 999,
              fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.text,
            }}>
              {statusLabel(newsletter.status)}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 4 }}
          >
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* Info Card */}
          <div style={{
            background: "var(--bg, var(--color-bg-sub))", borderRadius: 12,
            padding: 20, marginBottom: 20,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 4 }}>送信日時</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {formatDateFull(newsletter.last_sent_at || newsletter.scheduled_at)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 4 }}>チャネル</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  {newsletter.channel === "line" || newsletter.channel === "email+line"
                    ? <LineIcon />
                    : <MailIcon />}
                  {channelLabel(newsletter.channel)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 4 }}>配信対象</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {audienceDetailLabel(newsletter)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 4 }}>対象人数</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {newsletter.sent_count ? `${newsletter.sent_count}名` : "-"}
                </div>
              </div>
            </div>
            {newsletter.error_message && (
              <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "var(--color-danger-light)", color: "#991b1b", fontSize: 13 }}>
                {newsletter.error_message}
              </div>
            )}
          </div>

          {/* Body Preview */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>本文プレビュー</div>
            <div style={{
              border: "1px solid var(--line, var(--color-border))", borderRadius: 10,
              padding: 16, maxHeight: 300, overflowY: "auto",
              fontSize: 14, lineHeight: 1.7, color: "var(--color-text-primary)",
              background: "var(--color-bg)",
            }}>
              {newsletter.body_html ? (
                <div dangerouslySetInnerHTML={{ __html: newsletter.body_html }} />
              ) : (
                <div style={{ whiteSpace: "pre-wrap" }}>{newsletter.body || "(本文なし)"}</div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>添付ファイル</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {attachments.map((att, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", borderRadius: 8,
                    background: "var(--bg, var(--color-bg-sub))", fontSize: 13,
                  }}>
                    <ClipIcon />
                    <span style={{ fontWeight: 500 }}>{att.filename}</span>
                    {att.size && <span style={{ color: "var(--color-text-tertiary)" }}>{formatFileSize(att.size)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recipients (collapsible) */}
          {newsletter.audience_type === "individual" && (() => {
            try {
              const fj = JSON.parse(newsletter.audience_filter_json || "{}");
              if (Array.isArray(fj.member_ids) && fj.member_ids.length > 0) {
                return (
                  <div style={{ marginBottom: 8 }}>
                    <button
                      onClick={() => setShowRecipients(!showRecipients)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 13, fontWeight: 600, color: "var(--color-accent)", padding: 0,
                      }}
                    >
                      <ChevronIcon open={showRecipients} />
                      配信先を表示（{fj.member_ids.length}名）
                    </button>
                    <div style={{
                      overflow: "hidden",
                      maxHeight: showRecipients ? 300 : 0,
                      transition: "max-height 0.3s ease",
                    }}>
                      <div style={{ paddingTop: 8, fontSize: 13, color: "var(--color-text-primary)" }}>
                        {fj.member_ids.map((id, i) => (
                          <span key={i} style={{
                            display: "inline-block", padding: "3px 10px", margin: "0 4px 4px 0",
                            borderRadius: 6, background: "var(--color-bg-sub)", fontSize: 12,
                          }}>
                            ID: {id}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
            } catch { /* ignore */ }
            return null;
          })()}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "16px 24px", borderTop: "1px solid var(--line, var(--color-border))",
          background: "var(--bg, var(--color-bg-sub))", borderRadius: "0 0 16px 16px",
        }}>
          <button
            onClick={() => onResend(newsletter)}
            style={{
              padding: "9px 20px", borderRadius: 8,
              border: "1px solid var(--color-accent)",
              background: "var(--color-bg)", color: "var(--color-accent)",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            この内容で再送信
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: "var(--color-accent)", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function NewsletterList() {
  const navigate = useNavigate();

  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);

  /* History-specific state */
  const [historyPeriod, setHistoryPeriod] = useState("all");
  const [historyChannel, setHistoryChannel] = useState("all");
  const [selectedHistory, setSelectedHistory] = useState(null);

  /* Delete state */
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, label }
  const [deleting, setDeleting] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 300);

  /* ── Data Loading ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await base44.entities.Newsletter.list("-created_date", 200);
      setNewsletters(data || []);
    } catch (err) {
      console.error("Newsletter load error:", err);
      setError("配信データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { try { base44.appLogs?.logUserInApp?.('A7-配信管理'); } catch (e) { /* analytics */ } }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Toast Auto-Dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ── Delete Handler ── */
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await base44.entities.Newsletter.delete(deleteTarget.id);
      invalidateReadCache();
      setDeleteTarget(null);
      setToast({ type: "success", msg: "削除しました" });
      setNewsletters(prev => prev.filter(nl => nl.id !== deleteTarget.id));
    } catch (err) {
      console.error("Delete error:", err);
      setToast({ type: "error", msg: "削除に失敗しました" });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  /* ── Derived Data ── */
  const templates = useMemo(() => newsletters.filter(nl => nl.is_template === true), [newsletters]);
  const regularNewsletters = useMemo(() => newsletters.filter(nl => nl.is_template !== true), [newsletters]);
  const sentNewsletters = useMemo(() => regularNewsletters.filter(nl =>
    nl.status === "sent" || nl.status === "failed" || nl.status === "scheduled"
  ), [regularNewsletters]);

  const tabCounts = useMemo(() => {
    const counts = { all: regularNewsletters.length, draft: 0, scheduled: 0, template: templates.length, history: 0 };
    regularNewsletters.forEach(nl => {
      if (nl.status === "draft") counts.draft++;
      else if (nl.status === "scheduled") counts.scheduled++;
    });
    counts.history = sentNewsletters.length;
    return counts;
  }, [regularNewsletters, templates, sentNewsletters]);

  /* ── History filtered items ── */
  const historyItems = useMemo(() => {
    let items = [...sentNewsletters].sort((a, b) => {
      const da = a.last_sent_at || a.scheduled_at || a.created_date || "";
      const db = b.last_sent_at || b.scheduled_at || b.created_date || "";
      return db.localeCompare(da);
    });

    // Period filter
    if (historyPeriod !== "all") {
      let startDate;
      if (historyPeriod === "month") startDate = getStartOfMonth(0);
      else if (historyPeriod === "last_month") startDate = getStartOfMonth(-1);
      else if (historyPeriod === "3months") startDate = getStartOfMonth(-2);
      items = items.filter(nl => {
        const d = nl.last_sent_at || nl.scheduled_at || nl.created_date;
        return d && new Date(d) >= startDate;
      });
    }

    // Channel filter
    if (historyChannel !== "all") {
      items = items.filter(nl => (nl.channel || "email") === historyChannel);
    }

    // Search
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.trim().toLowerCase();
      items = items.filter(nl => (nl.title || "").toLowerCase().includes(q));
    }

    return items;
  }, [sentNewsletters, historyPeriod, historyChannel, debouncedQuery]);

  /* ── History summary stats ── */
  const historySummary = useMemo(() => {
    const now = new Date();
    const startOfMonth = getStartOfMonth(0);
    const thisMonthItems = sentNewsletters.filter(nl => {
      const d = nl.last_sent_at || nl.scheduled_at || nl.created_date;
      return d && new Date(d) >= startOfMonth;
    });
    const thisMonthSendCount = thisMonthItems.length;
    const thisMonthRecipients = thisMonthItems.reduce((sum, nl) => sum + (nl.sent_count || 0), 0);

    // Most recent sent
    const sorted = [...sentNewsletters].sort((a, b) => {
      const da = a.last_sent_at || a.scheduled_at || a.created_date || "";
      const db = b.last_sent_at || b.scheduled_at || b.created_date || "";
      return db.localeCompare(da);
    });
    const latest = sorted[0];

    return { thisMonthSendCount, thisMonthRecipients, latest };
  }, [sentNewsletters]);

  const filteredItems = useMemo(() => {
    if (activeTab === "history") return []; // handled separately
    const isTemplate = activeTab === "template";
    let items = isTemplate ? templates : regularNewsletters;

    /* Filter by status tab */
    if (!isTemplate && activeTab !== "all") {
      items = items.filter(nl => nl.status === activeTab);
    }

    /* Filter by search query */
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.trim().toLowerCase();
      items = items.filter(nl => (nl.title || "").toLowerCase().includes(q));
    }

    return items;
  }, [activeTab, regularNewsletters, templates, debouncedQuery]);

  const isTemplateTab = activeTab === "template";
  const isHistoryTab = activeTab === "history";

  /* ── Render ── */
  if (loading) {
    return (
      <div className="admin-shell" style={{ animation: "nlFade 0.15s ease" }}>
        <PageHeader title="配信管理" />
        {/* Skeleton loading area */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {TABS.map(t => (
            <div
              key={t.key}
              style={{
                width: 80,
                height: 34,
                borderRadius: 999,
                background: "var(--line, var(--color-border))",
                opacity: 0.5,
              }}
            />
          ))}
        </div>
        <div style={{
          height: 44,
          borderRadius: 8,
          background: "var(--line, var(--color-border))",
          opacity: 0.4,
          marginBottom: 16,
        }} />
        <div style={{
          height: 200,
          borderRadius: 8,
          background: "var(--line, var(--color-border))",
          opacity: 0.3,
        }} />
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
          <LoadingSpinner />
        </div>
        <style>{`@keyframes nlFade { from { opacity: 0 } to { opacity: 1 } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-shell" style={{ animation: "nlFade 0.15s ease" }}>
        <PageHeader title="配信管理" />
        <div className="card panel-card single-panel" style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
          <p>{error}</p>
          <button
            onClick={loadData}
            style={{
              marginTop: 12,
              padding: "8px 20px",
              background: "var(--color-accent)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            再読み込み
          </button>
        </div>
        <style>{`@keyframes nlFade { from { opacity: 0 } to { opacity: 1 } }`}</style>
      </div>
    );
  }

  return (
    <div className="admin-shell" style={{ animation: "nlFade 0.15s ease" }}>
      {/* ── Toast ── */}
      {toast && (
        <div
          className="nl2-toast"
          style={{
            background: toast.type === "error" ? "var(--color-danger-light)" : "var(--color-success-light)",
            color: toast.type === "error" ? "#991b1b" : "#065f46",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── History Detail Modal ── */}
      {selectedHistory && (
        <HistoryDetailModal
          newsletter={selectedHistory}
          onClose={() => setSelectedHistory(null)}
          onResend={(nl) => {
            setSelectedHistory(null);
            navigate(`/admin/newsletters/new?from=${nl.id}`);
          }}
        />
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <DeleteConfirmModal
          label={deleteTarget.label}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Page Header ── */}
      <PageHeader
        title="配信管理"
        actions={!isHistoryTab && (
          <Button variant="primary" onClick={() => navigate('/admin/newsletters/new')}>
            <PlusIcon /> 新規作成
          </Button>
        )}
      />

      {/* ── Pill Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`nl2-pill-tab${activeTab === t.key ? " active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.key === "history" && <HistoryIcon />}
            {t.label}
            <span className="nl2-pill-tab-count">{tabCounts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* ── History Tab Content ── */}
      {isHistoryTab ? (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
            <div style={{
              background: "var(--color-bg)", borderRadius: 12, padding: "20px 24px",
              border: "1px solid var(--line, var(--color-border))",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 6 }}>今月の送信数</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)" }}>
                {historySummary.thisMonthSendCount}<span style={{ fontSize: 14, fontWeight: 500, marginLeft: 4 }}>件</span>
              </div>
            </div>
            <div style={{
              background: "var(--color-bg)", borderRadius: 12, padding: "20px 24px",
              border: "1px solid var(--line, var(--color-border))",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 6 }}>今月の配信総数</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)" }}>
                {historySummary.thisMonthRecipients}<span style={{ fontSize: 14, fontWeight: 500, marginLeft: 4 }}>通</span>
              </div>
            </div>
            <div style={{
              background: "var(--color-bg)", borderRadius: 12, padding: "20px 24px",
              border: "1px solid var(--line, var(--color-border))",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 6 }}>直近の送信</div>
              {historySummary.latest ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 2 }}>
                    {formatDate(historySummary.latest.last_sent_at || historySummary.latest.scheduled_at)}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {historySummary.latest.title || "(無題)"}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-tertiary)" }}>-</div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "var(--color-text-tertiary)", display: "flex", alignItems: "center",
              }}>
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="件名で検索"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px 10px 38px",
                  border: "1px solid var(--line, var(--color-border))", borderRadius: 8,
                  fontSize: 14, outline: "none", background: "var(--bg, var(--color-bg))",
                  color: "var(--color-text-primary)", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Period filter */}
            <div style={{ display: "flex", gap: 4, background: "var(--color-bg-sub)", borderRadius: 8, padding: 3 }}>
              {PERIOD_FILTERS.map(pf => (
                <button
                  key={pf.key}
                  onClick={() => setHistoryPeriod(pf.key)}
                  style={{
                    padding: "6px 14px", border: "none", borderRadius: 6,
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                    background: historyPeriod === pf.key ? "var(--color-bg)" : "transparent",
                    color: historyPeriod === pf.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    boxShadow: historyPeriod === pf.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {pf.label}
                </button>
              ))}
            </div>

            {/* Channel filter */}
            <select
              value={historyChannel}
              onChange={e => setHistoryChannel(e.target.value)}
              style={{
                height: 38, padding: "0.5rem 0.75rem", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)", fontSize: "0.875rem", fontFamily: "inherit",
                background: "var(--color-bg)", color: "var(--color-text-primary)",
                cursor: "pointer", outline: "none",
                transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
              }}
            >
              <option value="all">すべて</option>
              <option value="email">メール</option>
              <option value="line">LINE</option>
              <option value="email+line">メール+LINE</option>
            </select>
          </div>

          {/* History Table */}
          <div className="card panel-card single-panel" style={{ padding: 0, overflow: "hidden" }}>
            {historyItems.length === 0 ? (
              <div style={{
                padding: "64px 24px", textAlign: "center",
                color: "var(--color-text-tertiary)",
              }}>
                <div style={{ marginBottom: 12, opacity: 0.5, display: "flex", justifyContent: "center" }}>
                  <HistoryIcon />
                </div>
                <p style={{ margin: 0, fontSize: 15 }}>送信履歴がありません</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>送信日時</th>
                      <th>件名</th>
                      <th>チャネル</th>
                      <th>配信対象</th>
                      <th style={{ textAlign: "center" }}>対象人数</th>
                      <th style={{ textAlign: "center" }}>ステータス</th>
                      <th style={{ textAlign: "center" }}>添付</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyItems.map(nl => {
                      const sc = statusColor(nl.status);
                      const sentDate = nl.last_sent_at || nl.scheduled_at || nl.created_date;
                      const attachments = parseAttachments(nl);
                      return (
                        <tr
                          key={nl.id}
                          onClick={() => setSelectedHistory(nl)}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--color-bg-sub)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                        >
                          <td style={{ whiteSpace: "nowrap", fontSize: 13 }}>
                            {formatDateFull(sentDate)}
                          </td>
                          <td style={{ fontWeight: 600, color: "var(--color-accent)" }}>
                            {nl.title || "(無題)"}
                          </td>
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              {nl.channel === "line" || nl.channel === "email+line"
                                ? <LineIcon />
                                : <MailIcon />}
                              {channelLabel(nl.channel)}
                            </span>
                          </td>
                          <td>{audienceLabel(nl)}</td>
                          <td style={{ textAlign: "center" }}>
                            {nl.sent_count ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <span style={{
                                  display: "inline-block", padding: "2px 10px", borderRadius: 999,
                                  fontSize: 12, fontWeight: 600,
                                  background: "var(--color-accent-light)", color: "var(--color-accent-dark)",
                                }}>
                                  {nl.sent_count}
                                </span>
                                {nl.failed_count > 0 && (
                                  <span style={{
                                    display: "inline-block", padding: "1px 8px", borderRadius: 999,
                                    fontSize: 11, fontWeight: 600,
                                    background: "var(--color-danger-light)", color: "var(--color-danger)",
                                  }}>
                                    失敗{nl.failed_count}
                                  </span>
                                )}
                              </div>
                            ) : "-"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "3px 10px", borderRadius: 999,
                              fontSize: 12, fontWeight: 600,
                              background: sc.bg, color: sc.text,
                            }}>
                              {nl.status === "scheduled" && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "nlSpin 1s linear infinite" }}>
                                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                                </svg>
                              )}
                              {statusLabel(nl.status)}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {attachments.length > 0 && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-text-secondary)" }}>
                                <ClipIcon />
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{attachments.length}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* ── Search Bar (non-history tabs) ── */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "var(--color-text-tertiary)", display: "flex", alignItems: "center",
            }}>
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="件名で検索"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px 10px 38px",
                border: "1px solid var(--line, var(--color-border))", borderRadius: 8,
                fontSize: 14, outline: "none", background: "var(--bg, var(--color-bg))",
                color: "var(--color-text-primary)", boxSizing: "border-box",
              }}
            />
          </div>

          {/* ── Data Table ── */}
          <div className="card panel-card single-panel" style={{ padding: 0, overflow: "hidden" }}>
            {filteredItems.length === 0 ? (
              /* Empty State */
              <div style={{
                padding: "64px 24px", textAlign: "center",
                color: "var(--color-text-tertiary)",
              }}>
                <div style={{ marginBottom: 12, opacity: 0.5, display: "flex", justifyContent: "center" }}>
                  <MailIcon />
                </div>
                <p style={{ margin: "0 0 16px", fontSize: 15 }}>
                  {isTemplateTab ? "テンプレートはまだありません" : "配信はまだありません"}
                </p>
                <button
                  onClick={() => navigate('/admin/newsletters/new')}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 18px", background: "var(--color-accent)", color: "#fff",
                    border: "none", borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: "pointer",
                  }}
                >
                  <PlusIcon /> 新規作成
                </button>
              </div>
            ) : isTemplateTab ? (
              /* ── Template Table ── */
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>テンプレート名</th>
                      <th>チャネル</th>
                      <th>配信対象</th>
                      <th>作成日</th>
                      <th style={{ width: 1 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(tmpl => (
                      <tr
                        key={tmpl.id}
                        onClick={() => navigate(`/admin/newsletters/template/${tmpl.id}/edit`)}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--color-bg-sub)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                      >
                        <td style={{ fontWeight: 600 }}>{tmpl.title || "(無題)"}</td>
                        <td>{channelLabel(tmpl.channel)}</td>
                        <td>{audienceLabel(tmpl)}</td>
                        <td>{formatDate(tmpl.created_date)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                navigate(`/admin/newsletters/new?from=${tmpl.id}`);
                              }}
                              style={{
                                whiteSpace: "nowrap", padding: "5px 12px",
                                background: "var(--color-success-light)", color: "#065f46",
                                border: "1px solid #a7f3d0", borderRadius: 6,
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              この内容で配信作成
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setDeleteTarget({ id: tmpl.id, label: "このテンプレート" });
                              }}
                              title="削除"
                              style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 30, height: 30, borderRadius: 6,
                                border: "none", background: "transparent", color: "var(--color-text-tertiary)",
                                cursor: "pointer", transition: "all 0.15s",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "var(--color-danger-light)"; e.currentTarget.style.color = "var(--color-danger)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── Regular Newsletter Table ── */
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>件名</th>
                      <th>チャネル</th>
                      <th>配信対象</th>
                      <th>ステータス</th>
                      <th>日時</th>
                      <th>作成日</th>
                      <th style={{ width: 1 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(nl => {
                      const sc = statusColor(nl.status);
                      const dateVal = nl.last_sent_at || nl.scheduled_at || nl.created_date;
                      const canDelete = nl.status === "draft" || nl.status === "cancelled" || nl.status === "failed";
                      return (
                        <tr
                          key={nl.id}
                          onClick={() => navigate(`/admin/newsletters/${nl.id}/edit`)}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--color-bg-sub)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                        >
                          <td style={{ fontWeight: 600 }}>{nl.title || "(無題)"}</td>
                          <td>{channelLabel(nl.channel)}</td>
                          <td>{audienceLabel(nl)}</td>
                          <td>
                            <span style={{
                              display: "inline-block", padding: "3px 10px", borderRadius: 999,
                              fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.text,
                            }}>
                              {statusLabel(nl.status)}
                            </span>
                          </td>
                          <td>{formatDate(dateVal)}</td>
                          <td>{formatDate(nl.created_date)}</td>
                          <td>
                            {canDelete && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setDeleteTarget({ id: nl.id, label: "この下書き" });
                                }}
                                title="削除"
                                style={{
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  width: 30, height: 30, borderRadius: 6,
                                  border: "none", background: "transparent", color: "var(--color-text-tertiary)",
                                  cursor: "pointer", transition: "all 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "var(--color-danger-light)"; e.currentTarget.style.color = "var(--color-danger)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Animations ── */}
      <style>{`
        @keyframes nlFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes nlModalFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes nlModalScale { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
        @keyframes nlSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
