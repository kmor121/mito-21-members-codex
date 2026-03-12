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
      width: size, height: size, borderRadius: "50%", background: "var(--primary-light)",
      color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center",
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
function SkeletonCard() {
  return (
    <div style={{ padding: 20, borderRadius: "var(--radius-lg)", border: "1px solid var(--line)", background: "#fff" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ width: 100, height: 18, borderRadius: 4, background: "var(--line-light)", animation: "pulse 1.5s ease infinite" }} />
        <div style={{ width: 60, height: 22, borderRadius: 12, background: "var(--line-light)", animation: "pulse 1.5s ease infinite" }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ width: 110, height: 36, borderRadius: 20, background: "var(--line-light)", animation: "pulse 1.5s ease infinite" }} />
        ))}
      </div>
    </div>
  );
}

/* ═══ OrgViewNode (recursive, read-only) ═══ */
function OrgViewNode({ org, depth, expandedOrgs, toggleExpand }) {
  const assignments = Array.isArray(org.assignments) ? org.assignments : [];
  const children = org.children || [];
  const isExpanded = expandedOrgs.has(org.id);
  const tc = TYPE_COLORS[org.org_type] || TYPE_COLORS["その他"];
  const hasContent = assignments.length > 0 || children.length > 0;

  return (
    <div style={{ position: "relative" }}>
      {/* Connection lines for child orgs */}
      {depth > 0 && (
        <div style={{ position: "absolute", left: -20, top: 0, bottom: 0, width: 20 }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "var(--line)" }} />
          <div style={{ position: "absolute", left: 0, top: 24, height: 2, width: 20, background: "var(--line)" }} />
        </div>
      )}

      <div style={{
        border: `1px solid ${tc.border}`, borderRadius: "var(--radius-lg)", background: "#fff",
        overflow: "hidden", transition: "box-shadow 0.2s ease",
      }}>
        {/* Header */}
        <div
          onClick={() => hasContent && toggleExpand(org.id)}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 18px", borderBottom: isExpanded ? `1px solid ${tc.border}` : "none",
            background: tc.bg, cursor: hasContent ? "pointer" : "default",
            transition: "background 0.15s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {hasContent && (
              <span style={{
                fontSize: 12, color: "var(--text-secondary)", transition: "transform 0.2s ease",
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block",
              }}>▶</span>
            )}
            <strong style={{ fontSize: 15 }}>{org.org_name || "（名称未設定）"}</strong>
            <span style={{
              ...typeBadgeStyle(org.org_type), padding: "2px 10px", borderRadius: 20,
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
            }}>{org.org_type || "その他"}</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{assignments.length}名</span>
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
                  return (
                    <Link
                      key={idx}
                      to={`/directory/members/${encodeURIComponent(member.id || "")}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 14px 6px 6px",
                        borderRadius: 24, border: "1px solid var(--line)", background: "#fff",
                        textDecoration: "none", color: "var(--text)", fontSize: 13,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "var(--primary-light)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "#fff"; }}
                    >
                      <MemberAvatar src={member.profile_image} name={member.name_kanji} size={28} />
                      <span style={{ fontWeight: 500 }}>{member.name_kanji || "（名前未設定）"}</span>
                      {a.role && (
                        <span style={{
                          ...roleBadgeStyle(a.role), padding: "1px 8px", borderRadius: 12,
                          fontSize: 11, fontWeight: 600,
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
        <div style={{ marginLeft: 40, marginTop: 12, display: "grid", gap: 12, position: "relative" }}>
          {children.map(child => (
            <OrgViewNode
              key={child.id}
              org={child}
              depth={depth + 1}
              expandedOrgs={expandedOrgs}
              toggleExpand={toggleExpand}
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

        const memberMap = {};
        for (const m of allMembers) memberMap[m.id] = m;

        const fyOrgs = allOrgs.filter(o => o.fiscal_year_id === effectiveId);
        const fyAssignments = allAssignments.filter(a => a.fiscal_year_id === effectiveId);

        const organizations = fyOrgs.map(org => ({
          ...org,
          assignments: fyAssignments
            .filter(a => a.organization_id === org.id)
            .map(a => ({ ...a, member: memberMap[a.member_id] || {} })),
        }));

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
        <div style={{ display: "grid", gap: 16 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
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
      }}>
        <button type="button" onClick={() => goYear(-1)} disabled={currentIdx <= 0}
          style={{
            background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius)",
            padding: "4px 10px", cursor: currentIdx <= 0 ? "default" : "pointer",
            color: currentIdx <= 0 ? "var(--muted)" : "var(--text)", fontSize: 13,
          }}>←</button>
        <div className="nl2-pill-tabs" style={{ gap: 4 }}>
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
            padding: "4px 10px", cursor: currentIdx >= sortedYears.length - 1 ? "default" : "pointer",
            color: currentIdx >= sortedYears.length - 1 ? "var(--muted)" : "var(--text)", fontSize: 13,
          }}>→</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button type="button" onClick={expandAll}
            style={{
              background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius)",
              padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)",
            }}>すべて展開</button>
          <button type="button" onClick={collapseAll}
            style={{
              background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius)",
              padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)",
            }}>すべて閉じる</button>
        </div>
      </div>

      {/* ── Summary ── */}
      {orgTree.length > 0 && (
        <div style={{
          display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap",
        }}>
          <div style={{
            flex: 1, minWidth: 120, padding: "14px 18px", borderRadius: "var(--radius-lg)",
            background: "#fff", border: "1px solid var(--line)",
          }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>組織数</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)" }}>{orgTree.length}</div>
          </div>
          <div style={{
            flex: 1, minWidth: 120, padding: "14px 18px", borderRadius: "var(--radius-lg)",
            background: "#fff", border: "1px solid var(--line)",
          }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>配属人数</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--success)" }}>{totalMembers}</div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {orgTree.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px", background: "#fff",
          borderRadius: "var(--radius-lg)", border: "1px solid var(--line)",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>この年度の組織図はまだ登録されていません</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            管理者が組織データを登録すると、ここに表示されます
          </p>
        </div>
      ) : (
        /* ── Org tree ── */
        <div style={{ display: "grid", gap: 16 }}>
          {orgTree.map(org => (
            <OrgViewNode
              key={org.id}
              org={org}
              depth={0}
              expandedOrgs={expandedOrgs}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}

      {/* ═══ Animations ═══ */}
      <style>{`
        @keyframes orgViewSlide {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 500px; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  );
}
