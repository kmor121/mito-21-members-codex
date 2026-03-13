import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";

/* ═══ helpers ═══ */
/* Role badge tiers (3-tier system) */
const ROLE_TIER = {
  "会長": "top", "委員長": "top", "室長": "top",
  "直前会長": "sub", "副会長": "sub", "副委員長": "sub",
  "代表幹事": "exec", "総括幹事": "exec", "運営幹事": "exec",
  "会計幹事": "exec", "会計副幹事": "exec", "事務局": "exec",
  "名誉顧問": "honor", "監事": "honor",
  "委員": "member",
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
  const tier = ROLE_TIER[role] || "member";
  switch (tier) {
    case "top":
      return { background: "#4338ca", color: "#fff", border: "1px solid #4338ca" };
    case "sub":
      return { background: "transparent", color: "#4338ca", border: "1px solid #a5b4fc" };
    case "exec":
    case "honor":
      return { background: "transparent", color: "#475569", border: "1px solid #cbd5e1" };
    case "member":
    default:
      return { background: "#f1f5f9", color: "#64748b", border: "1px solid #f1f5f9" };
  }
}

/* Accent border color by org type */
const TYPE_ACCENT = {
  "幹事会": "#818cf8",
  "委員会": "#6ee7b7",
  "部会":   "#fbbf24",
  "室":     "#f472b6",
  "その他": "#94a3b8",
};

/* Avatar colors - 2 muted tones */
const AVATAR_COLORS = ["#6366f1", "#64748b"];

function nameHash(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function MemberAvatar({ src, name, size = 26 }) {
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
      background: AVATAR_COLORS[nameHash(name) % AVATAR_COLORS.length],
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 600, flexShrink: 0,
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
  const hasContent = assignments.length > 0 || children.length > 0;
  const accentColor = TYPE_ACCENT[org.org_type] || TYPE_ACCENT["その他"];

  /* Font sizing by depth: 幹事会=large, 室/部会=medium, 委員会=standard */
  const nameSize = depth === 0 ? 16 : depth === 1 ? 15 : 14;
  const nameWeight = depth === 0 ? 700 : depth === 1 ? 600 : 500;

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
            padding: "12px 18px",
            borderBottom: isExpanded ? "1px solid var(--line-light)" : "none",
            cursor: hasContent ? "pointer" : "default",
            transition: "background var(--transition)",
            userSelect: "none",
          }}
          onMouseEnter={e => { if (hasContent) e.currentTarget.style.background = "var(--bg)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {hasContent && (
              <span style={{
                transition: "transform 0.2s ease",
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                display: "flex", alignItems: "center", flexShrink: 0,
              }}>
                <ChevronRight size={12} color="var(--text-secondary)" />
              </span>
            )}
            <span style={{ fontWeight: nameWeight, fontSize: nameSize, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {org.org_name || "（名称未設定）"}
            </span>
            {org.supervisor_id && memberMap?.[org.supervisor_id] && (() => {
              const svRole = supervisorRoleMap?.[org.supervisor_id];
              const label = svRole ? `担当${svRole}` : "担当";
              return (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "1px 8px 1px 5px", borderRadius: 10,
                  fontSize: 10, fontWeight: 500, whiteSpace: "nowrap",
                  color: "#64748b", background: "transparent",
                  border: "1px dashed #cbd5e1",
                }}>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="5" r="3"/>
                    <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5"/>
                  </svg>
                  {label}: {memberMap[org.supervisor_id].name_kanji || ""}
                </span>
              );
            })()}
          </div>
          {assignments.length > 0 && (
            <span style={{
              fontSize: 11, color: "var(--text-secondary)", background: "var(--bg)",
              padding: "2px 8px", borderRadius: 10, fontWeight: 500, flexShrink: 0, marginLeft: 8,
            }}>{assignments.length}名</span>
          )}
        </div>

        {/* Member chips */}
        {isExpanded && assignments.length > 0 && (
          <div style={{ padding: "10px 18px 12px", animation: "orgViewSlide 0.2s ease" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[...assignments].sort((a, b) => roleSortValue(a.role) - roleSortValue(b.role)).map((a, idx) => {
                const member = a.member || {};
                return (
                  <Link
                    key={idx}
                    to={`/directory/members/${encodeURIComponent(member.id || "")}`}
                    className="orgview-chip"
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "3px 10px 3px 3px",
                      borderRadius: 16, border: "1px solid var(--line)", background: "#fff",
                      textDecoration: "none", color: "var(--text)", fontSize: 12,
                      transition: "all var(--transition)",
                      animation: `chipEnter 0.25s ease ${idx * 30}ms both`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "var(--primary)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--line)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <MemberAvatar src={member.profile_image} name={member.name_kanji} size={22} />
                    <span style={{ fontWeight: 500, fontSize: 12 }}>{member.name_kanji || "（名前未設定）"}</span>
                    {a.role && (
                      <span style={{
                        ...roleBadgeStyle(a.role), padding: "0px 6px", borderRadius: 4,
                        fontSize: 10, fontWeight: 500, lineHeight: "16px",
                      }}>{a.role}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && children.length > 0 && (
        <div style={{
          marginTop: 8, paddingLeft: 24,
          borderLeft: "2px solid var(--line)",
          marginLeft: 14,
          display: "grid", gap: 8,
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

  return (
    <section className="admin-shell">
      {/* ── Page header ── */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1 className="page-title" style={{ margin: 0 }}>組織図</h1>
      </div>

      {/* ── Year pill navigator ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
        borderBottom: "1px solid var(--line)", marginBottom: 20,
        flexWrap: "wrap",
      }}>
        <button type="button" onClick={() => goYear(-1)} disabled={currentIdx <= 0}
          style={{
            background: "none", border: "1px solid var(--line)", borderRadius: 6,
            width: 32, height: 32, cursor: currentIdx <= 0 ? "default" : "pointer",
            color: currentIdx <= 0 ? "var(--muted)" : "var(--text)", fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all var(--transition)",
            opacity: currentIdx <= 0 ? 0.4 : 1,
            pointerEvents: currentIdx <= 0 ? "none" : "auto",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "var(--line)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {sortedYears.map(fy => {
            const isActive = fy.id === activeFiscalYearId;
            return (
              <button
                key={fy.id}
                type="button"
                onClick={() => setSearchParams({ fiscalYearId: fy.id })}
                style={{
                  fontSize: 13, padding: "5px 18px", borderRadius: 20, border: "none",
                  cursor: "pointer", fontWeight: isActive ? 600 : 400,
                  background: isActive ? "var(--primary)" : "transparent",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  transition: "all var(--transition)",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {fy.year_label || `${fy.year}年度`}
              </button>
            );
          })}
        </div>

        <button type="button" onClick={() => goYear(1)} disabled={currentIdx >= sortedYears.length - 1}
          style={{
            background: "none", border: "1px solid var(--line)", borderRadius: 6,
            width: 32, height: 32, cursor: currentIdx >= sortedYears.length - 1 ? "default" : "pointer",
            color: currentIdx >= sortedYears.length - 1 ? "var(--muted)" : "var(--text)", fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all var(--transition)",
            opacity: currentIdx >= sortedYears.length - 1 ? 0.4 : 1,
            pointerEvents: currentIdx >= sortedYears.length - 1 ? "none" : "auto",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "var(--line)"; }}
        >
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
        <div style={{ display: "grid", gap: 10 }}>
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
