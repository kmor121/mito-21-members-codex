import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

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

/* ── Helper Functions ── */
function statusLabel(s) {
  return { draft: "下書き", scheduled: "予約中", sent: "送信済", cancelled: "取消", failed: "失敗" }[s] || s || "-";
}

function statusColor(s) {
  return {
    draft: { bg: "#f1f5f9", text: "#64748b" },
    scheduled: { bg: "#fffbeb", text: "#92400e" },
    sent: { bg: "#ecfdf5", text: "#065f46" },
    failed: { bg: "#fef2f2", text: "#991b1b" },
  }[s] || { bg: "#f1f5f9", text: "#64748b" };
}

function channelLabel(c) {
  if (c === "line") return "LINE";
  if (c === "email+line") return "メール+LINE";
  return "メール";
}

function audienceLabel(nl) {
  if (nl.audience_type === "all") return "全員";
  try {
    const fj = JSON.parse(nl.audience_filter_json || "{}");
    if (fj.member_type) return fj.member_type;
  } catch {
    /* ignore */
  }
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
  { key: "all", label: "全て" },
  { key: "draft", label: "下書き" },
  { key: "scheduled", label: "予約中" },
  { key: "sent", label: "送信済" },
  { key: "template", label: "テンプレート" },
];

/* ── Main Component ── */
export default function NewsletterList() {
  const navigate = useNavigate();

  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Toast Auto-Dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ── Derived Data ── */
  const templates = useMemo(() => newsletters.filter(nl => nl.is_template === true), [newsletters]);
  const regularNewsletters = useMemo(() => newsletters.filter(nl => nl.is_template !== true), [newsletters]);

  const tabCounts = useMemo(() => {
    const counts = { all: regularNewsletters.length, draft: 0, scheduled: 0, sent: 0, template: templates.length };
    regularNewsletters.forEach(nl => {
      if (nl.status === "draft") counts.draft++;
      else if (nl.status === "scheduled") counts.scheduled++;
      else if (nl.status === "sent") counts.sent++;
    });
    return counts;
  }, [regularNewsletters, templates]);

  const filteredItems = useMemo(() => {
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

  /* ── Render ── */
  if (loading) {
    return (
      <div className="admin-shell" style={{ animation: "nlFade 0.15s ease" }}>
        <div className="page-header">
          <h1 className="page-title">配信管理</h1>
        </div>
        {/* Skeleton loading area */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {TABS.map(t => (
            <div
              key={t.key}
              style={{
                width: 80,
                height: 34,
                borderRadius: 999,
                background: "var(--line, #e5e7eb)",
                opacity: 0.5,
              }}
            />
          ))}
        </div>
        <div style={{
          height: 44,
          borderRadius: 8,
          background: "var(--line, #e5e7eb)",
          opacity: 0.4,
          marginBottom: 16,
        }} />
        <div style={{
          height: 200,
          borderRadius: 8,
          background: "var(--line, #e5e7eb)",
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
        <div className="page-header">
          <h1 className="page-title">配信管理</h1>
        </div>
        <div className="card panel-card single-panel" style={{ padding: 32, textAlign: "center", color: "var(--text-secondary, #64748b)" }}>
          <p>{error}</p>
          <button
            onClick={loadData}
            style={{
              marginTop: 12,
              padding: "8px 20px",
              background: "var(--primary, #4f46e5)",
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
            background: toast.type === "error" ? "#fef2f2" : "#ecfdf5",
            color: toast.type === "error" ? "#991b1b" : "#065f46",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="page-title">配信管理</h1>
        <button
          onClick={() => navigate('/admin/newsletters/new')}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          <PlusIcon /> 新規作成
        </button>
      </div>

      {/* ── Pill Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`nl2-pill-tab${activeTab === t.key ? " active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            <span className="nl2-pill-tab-count">{tabCounts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* ── Search Bar ── */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-secondary, #94a3b8)",
          display: "flex",
          alignItems: "center",
        }}>
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="件名で検索"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px 10px 38px",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: 8,
            fontSize: 14,
            outline: "none",
            background: "var(--bg, #fff)",
            color: "var(--text, #1e293b)",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* ── Data Table ── */}
      <div className="card panel-card single-panel" style={{ padding: 0, overflow: "hidden" }}>
        {filteredItems.length === 0 ? (
          /* Empty State */
          <div style={{
            padding: "64px 24px",
            textAlign: "center",
            color: "var(--text-secondary, #94a3b8)",
          }}>
            <div style={{ marginBottom: 12, opacity: 0.5 }}>
              <MailIcon />
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 15 }}>
              {isTemplateTab ? "テンプレートはまだありません" : "配信はまだありません"}
            </p>
            <button
              onClick={() => navigate('/admin/newsletters/new')}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
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
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--line-light)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                  >
                    <td style={{ fontWeight: 600 }}>{tmpl.title || "(無題)"}</td>
                    <td>{channelLabel(tmpl.channel)}</td>
                    <td>{audienceLabel(tmpl)}</td>
                    <td>{formatDate(tmpl.created_date)}</td>
                    <td>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/admin/newsletters/new?from=${tmpl.id}`);
                        }}
                        style={{
                          whiteSpace: "nowrap",
                          padding: "5px 12px",
                          background: "#ecfdf5",
                          color: "#065f46",
                          border: "1px solid #a7f3d0",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        この内容で配信作成
                      </button>
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
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(nl => {
                  const sc = statusColor(nl.status);
                  const dateVal = nl.last_sent_at || nl.scheduled_at || nl.created_date;
                  return (
                    <tr
                      key={nl.id}
                      onClick={() => navigate(`/admin/newsletters/${nl.id}/edit`)}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--line-light)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                    >
                      <td style={{ fontWeight: 600 }}>{nl.title || "(無題)"}</td>
                      <td>{channelLabel(nl.channel)}</td>
                      <td>{audienceLabel(nl)}</td>
                      <td>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: sc.bg,
                          color: sc.text,
                        }}>
                          {statusLabel(nl.status)}
                        </span>
                      </td>
                      <td>{formatDate(dateVal)}</td>
                      <td>{formatDate(nl.created_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Fade Animation ── */}
      <style>{`@keyframes nlFade { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}
