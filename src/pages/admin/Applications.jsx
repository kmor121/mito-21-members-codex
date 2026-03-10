import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

const STATUS_TABS = [
  { key: "申請中", label: "申請中" },
  { key: "承認済", label: "承認済" },
  { key: "却下", label: "却下" },
  { key: "all", label: "すべて" },
];

const STATUS_BADGE = {
  "申請中": { bg: "#fffbeb", color: "#d97706" },
  "承認済": { bg: "#ecfdf5", color: "#059669" },
  "却下":   { bg: "#fee2e2", color: "#991b1b" },
};

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function renderStatusBadge(status) {
  const style = STATUS_BADGE[status] || { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: 600,
      background: style.bg,
      color: style.color,
      whiteSpace: "nowrap",
    }}>
      {status || "-"}
    </span>
  );
}

export default function Applications() {
  const navigate = useNavigate();
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("申請中");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadPending = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const list = await base44.entities.Member.filter(
        { approval_status: { "$in": ["申請中", "承認済", "却下"] } },
        "-created_date"
      );
      setAllMembers(list);
    } catch (err) {
      setError(err.message || "申込一覧の取得に失敗しました。");
      setAllMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const filteredMembers = useMemo(() => {
    return allMembers.filter((m) => {
      const statusPass = statusFilter === "all" || m.approval_status === statusFilter;
      const q = debouncedSearch.toLowerCase();
      const searchPass = !q || [m.name_kanji, m.name_kana, m.company_name].some(v => v && String(v).toLowerCase().includes(q));
      return statusPass && searchPass;
    });
  }, [allMembers, statusFilter, debouncedSearch]);

  const statusCounts = useMemo(() => {
    const counts = { all: allMembers.length, "申請中": 0, "承認済": 0, "却下": 0 };
    for (const m of allMembers) {
      const s = m.approval_status || "";
      if (counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [allMembers]);

  return (
    <section className="admin-shell">
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 className="page-title" style={{ margin: 0 }}>入会申込管理</h1>
          {!loading && statusCounts["申請中"] > 0 && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 12px",
              borderRadius: "999px",
              background: "#fee2e2",
              color: "#dc2626",
              fontSize: "13px",
              fontWeight: 700,
            }}>
              {statusCounts["申請中"]}件 未処理
            </span>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="card panel-card single-panel" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: 20 }}>
          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <svg style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              width: 16, height: 16, color: "var(--text-secondary)", pointerEvents: "none",
            }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="氏名・会社名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px 12px 42px",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                fontSize: "14px",
                background: "#fff",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
            />
          </div>

          {/* Pill tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginRight: 4 }}>ステータス</span>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`nl2-pill-tab${statusFilter === tab.key ? " active" : ""}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
                <span className="nl2-pill-tab-count">{statusCounts[tab.key] || 0}</span>
              </button>
            ))}

            <span style={{
              marginLeft: "auto",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}>
              {filteredMembers.length}件表示中
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "var(--radius)",
          background: "#fee2e2",
          color: "#991b1b",
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "16px",
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : !error && filteredMembers.length === 0 ? (
        <div className="card panel-card single-panel">
          <div className="card-body" style={{ padding: "60px 20px", textAlign: "center" }}>
            <svg style={{ width: 48, height: 48, color: "var(--muted)", margin: "0 auto 16px", display: "block", opacity: 0.4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: 0 }}>該当する申込はありません。</p>
          </div>
        </div>
      ) : !error && (
        <div className="card panel-card single-panel">
          <div className="table-wrap" style={{ overflow: "auto" }}>
            <table className="data-table" style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={{ width: 100, whiteSpace: "nowrap" }}>申込日</th>
                  <th style={{ minWidth: 120 }}>氏名</th>
                  <th style={{ minWidth: 100 }}>フリガナ</th>
                  <th style={{ minWidth: 140 }}>会社名</th>
                  <th style={{ minWidth: 100 }}>紹介者</th>
                  <th style={{ width: 90 }}>ステータス</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((item) => (
                  <tr
                    key={item.id}
                    style={{ cursor: "pointer", transition: "background 0.12s" }}
                    onClick={() => navigate(`/admin/applications/${item.id}`)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-light)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                  >
                    <td style={{ fontVariantNumeric: "tabular-nums", fontSize: 13, color: "var(--text-secondary)" }}>
                      {item.applied_at ? item.applied_at.slice(0, 10).replace(/-/g, '/') : "-"}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {displayValue(item.name_kanji)}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {displayValue(item.name_kana)}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {displayValue(item.company_name)}
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {displayValue(item.referrer_1)}
                      {item.referrer_2 ? `, ${item.referrer_2}` : ""}
                    </td>
                    <td>
                      {renderStatusBadge(item.approval_status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{
            textAlign: "center",
            padding: "12px 20px",
            borderTop: "1px solid var(--line)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}>
            全 {filteredMembers.length} 件
          </div>
        </div>
      )}
    </section>
  );
}
