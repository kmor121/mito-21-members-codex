import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";

/* ═══ helpers ═══ */
const TYPE_COLORS = {
  "幹事会": { bg: "#eef2ff", text: "#4f46e5", border: "#c7d2fe" },
  "委員会": { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" },
  "部会":   { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  "室":     { bg: "#fdf2f8", text: "#db2777", border: "#fbcfe8" },
  "その他": { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1" },
};

const ROLE_COLORS = {
  "会長":     { bg: "#eef2ff", text: "#4f46e5" },
  "直前会長": { bg: "#eef2ff", text: "#6366f1" },
  "副会長":   { bg: "#ecfdf5", text: "#059669" },
  "代表幹事": { bg: "#fef3c7", text: "#b45309" },
  "会計幹事": { bg: "#fef3c7", text: "#b45309" },
  "会計副幹事": { bg: "#fef3c7", text: "#b45309" },
  "事務局":   { bg: "#f1f5f9", text: "#475569" },
  "室長":     { bg: "#fdf2f8", text: "#db2777" },
  "委員長":   { bg: "#eef2ff", text: "#4f46e5" },
  "副委員長": { bg: "#ecfdf5", text: "#059669" },
  "総括幹事": { bg: "#fffbeb", text: "#d97706" },
  "運営幹事": { bg: "#fffbeb", text: "#d97706" },
  "名誉顧問": { bg: "#faf5ff", text: "#7c3aed" },
  "監事":     { bg: "#faf5ff", text: "#7c3aed" },
  "委員":     { bg: "#f1f5f9", text: "#64748b" },
};

/* Role display order (lower = higher rank) */
const ROLE_SORT_ORDER = {
  "会長": 1, "直前会長": 2, "副会長": 3,
  "代表幹事": 4, "会計幹事": 5, "会計副幹事": 6, "事務局": 7,
  "室長": 10,
  "委員長": 11, "副委員長": 12, "総括幹事": 13, "運営幹事": 14,
  "名誉顧問": 20, "監事": 21,
  "委員": 50,
};

function roleSortValue(role) {
  return ROLE_SORT_ORDER[role] ?? 99;
}

function roleBadgeStyle(role) {
  const c = ROLE_COLORS[role];
  if (c) return { background: c.bg, color: c.text, border: `1px solid ${c.bg}` };
  return { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" };
}

function typeBadgeStyle(type) {
  const c = TYPE_COLORS[type] || TYPE_COLORS["その他"];
  return { background: c.bg, color: c.text, border: `1px solid ${c.border}` };
}

/* Accent border color by org type */
const TYPE_ACCENT = {
  "幹事会": "#818cf8",
  "委員会": "#6ee7b7",
  "部会":   "#fbbf24",
  "室":     "#f472b6",
  "その他": "#94a3b8",
};

/* High-rank roles get filled badge style */
const HIGH_RANK_ROLES = new Set(["会長", "委員長", "室長", "代表幹事"]);

/* Avatar gradient palettes based on character code */
const AVATAR_GRADIENTS = [
  ["#818cf8", "#6366f1"],
  ["#6ee7b7", "#34d399"],
  ["#fbbf24", "#f59e0b"],
  ["#f472b6", "#ec4899"],
  ["#a78bfa", "#8b5cf6"],
  ["#67e8f9", "#22d3ee"],
  ["#fb923c", "#f97316"],
];

function getAvatarGradient(name) {
  const code = (name || "M").charCodeAt(0);
  const pair = AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
}

function MemberAvatar({ src, name, size = 32 }) {
  const initial = (name || "M").charAt(0);
  if (src) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
        border: "2px solid #fff", boxShadow: "0 0 0 1px var(--line)",
      }}>
        <img src={src} alt={name || ""} loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: getAvatarGradient(name),
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
      border: "2px solid #fff", boxShadow: "0 0 0 1px var(--line)",
    }}>{initial}</div>
  );
}

function buildTree(organizations) {
  const map = new Map();
  organizations.forEach(o => map.set(o.id, { ...o, children: [] }));
  const roots = [];
  map.forEach(o => {
    const pid = o.parent_id || "";
    if (pid && map.has(pid)) map.get(pid).children.push(o);
    else roots.push(o);
  });
  const sortFn = (a, b) => (a.sort_order || 0) - (b.sort_order || 0);
  roots.sort(sortFn);
  map.forEach(o => o.children.sort(sortFn));
  return roots;
}

/* ═══ Skeleton ═══ */
function SkeletonCard({ delay = 0 }) {
  const shimmer = { animation: `pulse 1.5s ease infinite ${delay}ms` };
  return (
    <div style={{
      padding: "18px 20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--line-light)",
      background: "#fff", borderLeft: "4px solid var(--line-light)",
      animation: `orgViewSlide 0.3s ease ${delay}ms both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 120, height: 16, borderRadius: 4, background: "var(--line-light)", ...shimmer }} />
          <div style={{ width: 48, height: 20, borderRadius: 6, background: "var(--line-light)", ...shimmer }} />
        </div>
        <div style={{ width: 32, height: 16, borderRadius: 8, background: "var(--line-light)", ...shimmer }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            width: 130, height: 38, borderRadius: 20,
            background: "var(--line-light)", ...shimmer,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ═══ Chevron SVG ═══ */
function ChevronRight({ size = 14, color = "var(--text-secondary)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
      <path d="M6 3l5 5-5 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══ OrgViewNode (recursive, read-only) ═══ */
function OrgViewNode({ org, depth, expandedOrgs, toggleExpand, memberMap, supervisorRoleMap }) {
  const assignments = Array.isArray(org.assignments) ? org.assignments : [];
  const children = org.children || [];
  const isExpanded = expandedOrgs.has(org.id);
  const tc = TYPE_COLORS[org.org_type] || TYPE_COLORS["その他"];
  const hasContent = assignments.length > 0 || children.length > 0;
  const accentColor = TYPE_ACCENT[org.org_type] || TYPE_ACCENT["その他"];

  return (
    <div style={{ animation: "orgViewSlide 0.25s ease both" }}>
      <div
        className="orgview-card"
        style={{
          borderRadius: "var(--radius-lg)", background: "#fff",
          border: "1px solid var(--line)", borderLeft: `4px solid ${accentColor}`,
          overflow: "hidden", transition: "box-shadow var(--transition)",
        }}
      >
        {/* Header */}
        <div
          onClick={() => hasContent && toggleExpand(org.id)}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 18px",
            borderBottom: isExpanded ? "1px solid var(--line-light)" : "none",
            cursor: hasContent ? "pointer" : "default",
            transition: "background var(--transition)",
            userSelect: "none",
          }}
          onMouseEnter={e => { if (hasContent) e.currentTarget.style.background = "var(--bg)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {hasContent && (
              <span style={{
                transition: "transform 0.2s ease",
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                display: "flex", alignItems: "center", flexShrink: 0,
              }}>
                <ChevronRight size={13} color="var(--text-secondary)" />
              </span>
            )}
            <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {org.org_name || "（名称未設定）"}
            </span>
            <span style={{
              padding: "2px 8px", borderRadius: 6,
              fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
              background: "transparent", color: tc.text, border: `1px solid ${tc.border}`,
            }}>{org.org_type || "その他"}</span>
            {org.supervisor_id && memberMap?.[org.supervisor_id] && (() => {
              const svRole = supervisorRoleMap?.[org.supervisor_id];
              const label = svRole ? `担当${svRole}` : "担当";
              return (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 10px 2px 6px", borderRadius: 12,
                  fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
                  color: "#7c3aed", background: "transparent",
                  border: "1px dashed #c4b5fd",
                }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="5" r="3"/>
                    <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5"/>
                  </svg>
                  {label}: {memberMap[org.supervisor_id].name_kanji || ""}
                </span>
              );
            })()}
          </div>
          <span style={{
            fontSize: 12, color: "var(--text-secondary)", background: "var(--bg)",
            padding: "2px 10px", borderRadius: 10, fontWeight: 500, flexShrink: 0, marginLeft: 8,
          }}>{assignments.length}名</span>
        </div>

        {/* Member chips */}
        {isExpanded && (
          <div style={{ padding: "16px 18px", animation: "orgViewSlide 0.2s ease" }}>
            {assignments.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>配属メンバーはいません</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[...assignments].sort((a, b) => roleSortValue(a.role) - roleSortValue(b.role)).map((a, idx) => {
                  const member = a.member || {};
                  const isHighRank = HIGH_RANK_ROLES.has(a.role);
                  const rc = ROLE_COLORS[a.role];
                  const roleSt = isHighRank && rc
                    ? { background: rc.text, color: "#fff", border: `1px solid ${rc.text}` }
                    : roleBadgeStyle(a.role);

                  return (
                    <Link
                      key={idx}
                      to={`/directory/members/${encodeURIComponent(member.id || "")}`}
                      className="orgview-chip"
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 14px 6px 6px",
                        borderRadius: 24, border: "1px solid var(--line)", background: "#fff",
                        textDecoration: "none", color: "var(--text)", fontSize: 13,
                        transition: "all var(--transition)",
                        animation: `chipEnter 0.25s ease ${idx * 30}ms both`,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = "var(--primary)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = "var(--line)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <MemberAvatar src={member.profile_image} name={member.name_kanji} size={28} />
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{member.name_kanji || "（名前未設定）"}</span>
                      {a.role && (
                        <span style={{
                          ...roleSt, padding: "1px 8px", borderRadius: 12,
                          fontSize: 11, fontWeight: 600, lineHeight: "18px",
                        }}>{a.role}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && children.length > 0 && (
        <div style={{
          marginTop: 10, paddingLeft: 28,
          borderLeft: "2px solid var(--line)",
          marginLeft: 14,
          display: "grid", gap: 10,
        }}>
          {children.map(child => (
            <OrgViewNode
              key={child.id}
              org={child}
              depth={depth + 1}
              expandedOrgs={expandedOrgs}
              toggleExpand={toggleExpand}
              memberMap={memberMap}
              supervisorRoleMap={supervisorRoleMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════ MAIN ═══ */
export default function OrgChartView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYearIdParam = searchParams.get("fiscalYearId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [years, setYears] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [orgTree, setOrgTree] = useState([]);
  const [memberMap, setMemberMap] = useState({});
  const [supervisorRoleMap, setSupervisorRoleMap] = useState({});
  const [expandedOrgs, setExpandedOrgs] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    setError("");

    (async () => {
      try {
        const [yearsList, allOrgs, allAssignments, allMembers] = await Promise.all([
          base44.entities.FiscalYear.list("-year"),
          base44.entities.Organization.list("sort_order"),
          base44.entities.OrgAssignment.list("sort_order"),
          base44.entities.Member.filter({ approval_status: "承認済", status: "活動中" }),
        ]);

        const currentFy = yearsList.find(fy => fy.is_current === true);
        const effectiveId = fiscalYearIdParam || currentFy?.id || "";
        const selectedFy = yearsList.find(fy => fy.id === effectiveId) || null;

        const mMap = {};
        for (const m of allMembers) mMap[m.id] = m;
        setMemberMap(mMap);

        const fyOrgs = allOrgs.filter(o => o.fiscal_year_id === effectiveId);
        const fyAssignments = allAssignments.filter(a => a.fiscal_year_id === effectiveId);

        const organizations = fyOrgs.map(org => ({
          ...org,
          assignments: fyAssignments
            .filter(a => a.organization_id === org.id)
            .map(a => ({ ...a, member: mMap[a.member_id] || {} })),
        }));

        // Build supervisor role map from 幹事会 assignments
        const svRoleMap = {};
        for (const org of organizations) {
          if (org.org_type !== "幹事会") continue;
          for (const a of (org.assignments || [])) {
            if (a.member_id && a.role) svRoleMap[a.member_id] = a.role;
          }
        }
        setSupervisorRoleMap(svRoleMap);

        setYears(yearsList);
        setSelectedFiscalYear(selectedFy);
        const tree = buildTree(organizations);
        setOrgTree(tree);
        // Auto-expand all
        const allIds = new Set();
        function collectIds(nodes) { nodes.forEach(n => { allIds.add(n.id); if (n.children) collectIds(n.children); }); }
        collectIds(tree);
        setExpandedOrgs(allIds);
      } catch (err) {
        setError(err.message || "組織図の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [fiscalYearIdParam]);

  function toggleExpand(orgId) {
    setExpandedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId); else next.add(orgId);
      return next;
    });
  }

  const sortedYears = useMemo(() => [...years].sort((a, b) => (a.year || 0) - (b.year || 0)), [years]);
  const activeFiscalYearId = selectedFiscalYear?.id || "";
  const currentIdx = sortedYears.findIndex(fy => fy.id === activeFiscalYearId);
  const yearLabel = selectedFiscalYear?.year_label || (selectedFiscalYear?.year ? `${selectedFiscalYear.year}年度` : "");

  function goYear(delta) {
    const next = sortedYears[currentIdx + delta];
    if (next) setSearchParams({ fiscalYearId: next.id });
  }

  function expandAll() {
    const allIds = new Set();
    function collect(nodes) { nodes.forEach(n => { allIds.add(n.id); if (n.children) collect(n.children); }); }
    collect(orgTree);
    setExpandedOrgs(allIds);
  }
  function collapseAll() { setExpandedOrgs(new Set()); }

  /* ═══ RENDER ═══ */

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>組織図</h1>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <SkeletonCard delay={0} />
          <SkeletonCard delay={80} />
          <SkeletonCard delay={160} />
        </div>
        <style>{`
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
          @keyframes orgViewSlide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div className="page-header"><h1 className="page-title">組織図</h1></div>
        <section className="card panel-card single-panel">
          <div className="card-body"><p className="message error">{error}</p></div>
        </section>
      </section>
    );
  }

  const totalMembers = orgTree.reduce((sum, org) => {
    function count(node) {
      let c = (node.assignments || []).length;
      (node.children || []).forEach(child => { c += count(child); });
      return c;
    }
    return sum + count(org);
  }, 0);

  return (
    <section className="admin-shell">
      {/* ── Page header ── */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>組織図</h1>
          {yearLabel && (
            <span style={{
              padding: "3px 12px", borderRadius: 20, background: "var(--primary-light)",
              color: "var(--primary)", fontSize: 13, fontWeight: 600,
            }}>{yearLabel}</span>
          )}
        </div>
      </div>

      {/* ── Year pill navigator ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "12px 0",
        borderBottom: "1px solid var(--line)", marginBottom: 20,
        flexWrap: "wrap",
      }}>
        <button type="button" onClick={() => goYear(-1)} disabled={currentIdx <= 0}
          style={{
            background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius)",
            padding: "6px 10px", cursor: currentIdx <= 0 ? "default" : "pointer",
            color: currentIdx <= 0 ? "var(--muted)" : "var(--text)", fontSize: 13,
            display: "flex", alignItems: "center", transition: "all var(--transition)",
            opacity: currentIdx <= 0 ? 0.4 : 1,
          }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="nl2-pill-tabs" style={{ gap: 4, flexWrap: "wrap" }}>
          {sortedYears.map(fy => (
            <button
              key={fy.id}
              type="button"
              className={`nl2-pill-tab${fy.id === activeFiscalYearId ? " active" : ""}`}
              onClick={() => setSearchParams({ fiscalYearId: fy.id })}
              style={{ fontSize: 13, padding: "5px 14px" }}
            >
              {fy.year_label || `${fy.year}年度`}
            </button>
          ))}
        </div>

        <button type="button" onClick={() => goYear(1)} disabled={currentIdx >= sortedYears.length - 1}
          style={{
            background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius)",
            padding: "6px 10px", cursor: currentIdx >= sortedYears.length - 1 ? "default" : "pointer",
            color: currentIdx >= sortedYears.length - 1 ? "var(--muted)" : "var(--text)", fontSize: 13,
            display: "flex", alignItems: "center", transition: "all var(--transition)",
            opacity: currentIdx >= sortedYears.length - 1 ? 0.4 : 1,
          }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button type="button" onClick={expandAll}
            style={{
              background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius)",
              padding: "5px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)",
              transition: "all var(--transition)", fontWeight: 500,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >すべて展開</button>
          <button type="button" onClick={collapseAll}
            style={{
              background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius)",
              padding: "5px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)",
              transition: "all var(--transition)", fontWeight: 500,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >すべて閉じる</button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {orgTree.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14, marginBottom: 24,
        }}>
          <div style={{
            padding: "16px 20px", borderRadius: "var(--radius-lg)",
            background: "#fff", border: "1px solid var(--line)",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "var(--radius)",
              background: "var(--primary-light)", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="var(--primary)" strokeWidth="2" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="var(--primary)" strokeWidth="2" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="var(--primary)" strokeWidth="2" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="var(--primary)" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2, fontWeight: 500 }}>組織数</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{orgTree.length}</div>
            </div>
          </div>
          <div style={{
            padding: "16px 20px", borderRadius: "var(--radius-lg)",
            background: "#fff", border: "1px solid var(--line)",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "var(--radius)",
              background: "#ecfdf5", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#059669" strokeWidth="2" />
                <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2, fontWeight: 500 }}>配属人数</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{totalMembers}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {orgTree.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 24px", background: "#fff",
          borderRadius: "var(--radius-lg)", border: "1px solid var(--line)",
        }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: 20, opacity: 0.6 }}>
            <rect x="8" y="6" width="20" height="14" rx="3" stroke="var(--line)" strokeWidth="2" fill="var(--bg)" />
            <rect x="36" y="6" width="20" height="14" rx="3" stroke="var(--line)" strokeWidth="2" fill="var(--bg)" />
            <rect x="8" y="44" width="20" height="14" rx="3" stroke="var(--line)" strokeWidth="2" fill="var(--bg)" />
            <rect x="36" y="44" width="20" height="14" rx="3" stroke="var(--line)" strokeWidth="2" fill="var(--bg)" />
            <line x1="18" y1="20" x2="18" y2="44" stroke="var(--line)" strokeWidth="2" strokeDasharray="4 3" />
            <line x1="46" y1="20" x2="46" y2="44" stroke="var(--line)" strokeWidth="2" strokeDasharray="4 3" />
            <line x1="18" y1="32" x2="46" y2="32" stroke="var(--line)" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>
            この年度の組織図はまだ登録されていません
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            管理者が組織データを登録すると、ここに表示されます
          </p>
        </div>
      ) : (
        /* ── Org tree ── */
        <div style={{ display: "grid", gap: 12 }}>
          {orgTree.map(org => (
            <OrgViewNode
              key={org.id}
              org={org}
              depth={0}
              expandedOrgs={expandedOrgs}
              toggleExpand={toggleExpand}
              memberMap={memberMap}
              supervisorRoleMap={supervisorRoleMap}
            />
          ))}
        </div>
      )}

      {/* ═══ Animations & Responsive ═══ */}
      <style>{`
        @keyframes orgViewSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes chipEnter {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .orgview-card:hover {
          box-shadow: var(--shadow-sm) !important;
        }
        @media (max-width: 640px) {
          .orgview-chip {
            padding: 5px 10px 5px 5px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
    </section>
  );
}
