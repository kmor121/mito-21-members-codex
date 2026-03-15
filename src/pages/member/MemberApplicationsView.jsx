import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import { fullName, fullNameKana } from '../../utils/formatName';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useIsMobile } from '../../hooks/useIsMobile';

const STATUS_BADGE = {
  "申請中": { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  "承認済": { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  "却下":   { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
};

const STATUS_TABS = [
  { key: "申請中", label: "申請中" },
  { key: "承認済", label: "承認済" },
  { key: "却下", label: "却下" },
  { key: "all", label: "すべて" },
];

export default function MemberApplicationsView() {
  const isMobile = useIsMobile();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("申請中");
  const [expandedId, setExpandedId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const list = await base44.entities.Member.filter(
        { approval_status: { "$in": ["申請中", "承認済", "却下"] } },
        "-created_date"
      );
      setMembers(list || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return members;
    return members.filter((m) => m.approval_status === statusFilter);
  }, [members, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: members.length, "申請中": 0, "承認済": 0, "却下": 0 };
    members.forEach((m) => { if (counts[m.approval_status] !== undefined) counts[m.approval_status]++; });
    return counts;
  }, [members]);

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header"><h1 className="page-title">入会申込一覧</h1></div>
        <LoadingSpinner />
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div style={{ marginBottom: 8 }}>
        <Link to="/meetings" className="text-link" style={{ fontSize: 13 }}>&larr; 幹事会に戻る</Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">入会申込一覧</h1>
        <p className="page-description">入会申込の現在のステータスを確認できます（閲覧専用）</p>
      </div>

      {/* Status tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
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
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-secondary)" }}>
          {filtered.length}件
        </span>
      </div>

      {filtered.length === 0 ? (
        <section className="card panel-card">
          <div className="card-body" style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
            <p>該当する申込はありません。</p>
          </div>
        </section>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((m) => {
            const badge = STATUS_BADGE[m.approval_status] || STATUS_BADGE["申請中"];
            const isExpanded = expandedId === m.id;
            return (
              <section key={m.id} className="card detail-card" style={{ overflow: "hidden" }}>
                <div
                  style={{ padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{fullName(m)}</span>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.color }} />
                        {m.approval_status}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
                      {m.applied_at ? m.applied_at.slice(0, 10).replace(/-/g, "/") : ""} 申込
                      {m.company_name && ` / ${m.company_name}`}
                    </p>
                  </div>
                  <span style={{ fontSize: 16, color: "var(--text-secondary)", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--line)", padding: "16px 20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "10px 24px" }}>
                      <DetailItem label="氏名" value={fullName(m)} />
                      <DetailItem label="フリガナ" value={fullNameKana(m)} />
                      <DetailItem label="会社名" value={m.company_name} />
                      <DetailItem label="役職" value={m.company_position} />
                      <DetailItem label="メール" value={m.email} />
                      <DetailItem label="電話" value={m.phone} />
                      <DetailItem label="紹介者1" value={m.referrer_1} />
                      <DetailItem label="紹介者2" value={m.referrer_2} />
                      <DetailItem label="会員種別" value={m.member_type} />
                      <DetailItem label="申込日" value={m.applied_at ? m.applied_at.slice(0, 10).replace(/-/g, "/") : "-"} />
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>{label}</span>
      <span style={{ fontSize: 13 }}>{value || "-"}</span>
    </div>
  );
}
