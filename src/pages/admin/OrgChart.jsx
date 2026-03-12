import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest, base44, invalidateReadCache } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmDialog from "../../components/common/ConfirmDialog";

/* ═══ helpers ═══ */
function todayStr() { return new Date().toISOString().slice(0, 10); }

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

/* Quick role suggestions per org type */
const ROLES_BY_ORG_TYPE = {
  "幹事会": ["会長", "直前会長", "副会長", "代表幹事", "会計幹事", "会計副幹事", "事務局", "室長", "委員長", "委員"],
  "室":     ["室長"],
  "委員会": ["委員長", "副委員長", "総括幹事", "運営幹事", "会計幹事", "委員"],
  "部会":   ["室長", "委員長", "副委員長", "総括幹事", "運営幹事", "会計幹事", "委員"],
  "その他": ["名誉顧問", "監事", "委員"],
};

/* High-rank roles get filled badge style */
const HIGH_RANK_ROLES = new Set(["会長", "直前会長", "副会長", "委員長", "室長", "代表幹事"]);

function roleBadgeStyle(role) {
  const c = ROLE_COLORS[role];
  if (c && HIGH_RANK_ROLES.has(role)) {
    return { background: c.text, color: "#fff", border: `1px solid ${c.text}` };
  }
  if (c) return { background: "transparent", color: c.text, border: `1px solid ${c.text}40` };
  return { background: "transparent", color: "#64748b", border: "1px solid #e2e8f0" };
}

function typeBadgeStyle(type) {
  const c = TYPE_COLORS[type] || TYPE_COLORS["その他"];
  return { background: "transparent", color: c.text, border: `1px solid ${c.text}50` };
}

/* Simple hash for avatar gradient */
function nameHash(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #667eea, #764ba2)",
  "linear-gradient(135deg, #f093fb, #f5576c)",
  "linear-gradient(135deg, #4facfe, #00f2fe)",
  "linear-gradient(135deg, #43e97b, #38f9d7)",
  "linear-gradient(135deg, #fa709a, #fee140)",
  "linear-gradient(135deg, #a18cd1, #fbc2eb)",
  "linear-gradient(135deg, #fccb90, #d57eeb)",
  "linear-gradient(135deg, #84fab0, #8fd3f4)",
];

function MemberAvatar({ name, size = 26 }) {
  const initial = (name || "M").charAt(0);
  const gradient = AVATAR_GRADIENTS[nameHash(name) % AVATAR_GRADIENTS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: gradient,
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 700, flexShrink: 0, letterSpacing: 0,
    }}>{initial}</div>
  );
}

/* ═══ build tree with children references ═══ */
function buildOrgTree(orgs) {
  const map = new Map();
  orgs.forEach(o => map.set(o.id, { ...o, children: [] }));
  const roots = [];
  map.forEach(o => {
    const pid = o.parent_id || "";
    if (pid && map.has(pid)) map.get(pid).children.push(o);
    else roots.push(o);
  });
  // sort children
  const sortFn = (a, b) => (a.sort_order || 0) - (b.sort_order || 0);
  roots.sort(sortFn);
  map.forEach(o => o.children.sort(sortFn));
  return roots;
}

/* ═══ Build hierarchy indent for parent select ═══ */
function buildOrgHierarchy(orgs, excludeId) {
  const map = new Map();
  orgs.forEach(o => map.set(o.id, { ...o, children: [] }));
  const roots = [];
  map.forEach(o => {
    const pid = o.parent_id || "";
    if (pid && map.has(pid)) map.get(pid).children.push(o);
    else roots.push(o);
  });
  const sortFn = (a, b) => (a.sort_order || 0) - (b.sort_order || 0);
  roots.sort(sortFn);
  map.forEach(o => o.children.sort(sortFn));

  const result = [];
  function walk(nodes, depth) {
    for (const n of nodes) {
      if (n.id === excludeId) continue;
      const prefix = depth > 0 ? "\u00A0\u00A0".repeat(depth) + "\u2514 " : "";
      result.push({ id: n.id, label: prefix + (n.org_name || "\uFF08\u540D\u79F0\u672A\u8A2D\u5B9A\uFF09"), depth });
      walk(n.children, depth + 1);
    }
  }
  walk(roots, 0);
  return result;
}

/* ═══ Skeleton ═══ */
function SkeletonCard() {
  return (
    <div style={{
      borderRadius: "var(--radius-lg)", border: "1px solid var(--line-light)",
      background: "#fff", overflow: "hidden",
    }}>
      {/* Header skeleton */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
        borderLeft: "4px solid var(--line-light)",
      }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, background: "var(--line-light)", animation: "pulse 1.8s ease infinite" }} />
        <div style={{ width: 130, height: 16, borderRadius: 4, background: "var(--line-light)", animation: "pulse 1.8s ease infinite 0.1s" }} />
        <div style={{ width: 48, height: 20, borderRadius: 6, background: "var(--line-light)", animation: "pulse 1.8s ease infinite 0.2s" }} />
        <div style={{ flex: 1 }} />
        <div style={{ width: 36, height: 18, borderRadius: 10, background: "var(--line-light)", animation: "pulse 1.8s ease infinite 0.3s" }} />
      </div>
      {/* Body skeleton */}
      <div style={{ padding: "14px 18px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            width: 90 + i * 12, height: 34, borderRadius: 20,
            background: "var(--line-light)", animation: `pulse 1.8s ease infinite ${0.1 * i}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ═══ OrgTreeNode (recursive) ═══ */
function OrgTreeNode({
  org, depth, expandedOrgs, toggleExpand,
  onEditOrg, onDeleteOrg, onAddMember, onEditAssignment, onRemoveAssignment,
  dragHandlers, memberMap,
}) {
  const assignments = Array.isArray(org.assignments) ? org.assignments : [];
  const children = org.children || [];
  const isExpanded = expandedOrgs.has(org.id);
  const tc = TYPE_COLORS[org.org_type] || TYPE_COLORS["その他"];
  const hasChildren = children.length > 0;

  return (
    <div style={{ position: "relative", animation: "orgSlideDown 0.25s ease" }}>
      {/* Org card */}
      <div
        style={{
          borderRadius: "var(--radius-lg)", background: "#fff",
          border: "1px solid var(--line-light)",
          borderLeft: `4px solid ${tc.text}`,
          transition: "box-shadow var(--transition), border-color var(--transition)",
          overflow: "hidden",
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
        {...dragHandlers}
      >
        {/* Card header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 18px", borderBottom: isExpanded ? "1px solid var(--line-light)" : "none",
          background: "#fff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {/* Drag handle */}
            <span style={{
              cursor: "grab", color: "var(--muted)", fontSize: 15, userSelect: "none",
              display: "flex", alignItems: "center", opacity: 0.5,
              transition: "opacity var(--transition)",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "1"}
              onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
              title="ドラッグで並び替え"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/>
                <circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/>
                <circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/>
              </svg>
            </span>

            {/* Collapse toggle */}
            {(hasChildren || assignments.length > 0) && (
              <button
                type="button"
                onClick={() => toggleExpand(org.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
                  fontSize: 11, color: "var(--text-secondary)", transition: "transform 0.2s ease",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  display: "flex", alignItems: "center",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M4.5 2L9 6L4.5 10" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {org.org_name || "\uFF08\u540D\u79F0\u672A\u8A2D\u5B9A\uFF09"}
            </span>
            <span style={{
              ...typeBadgeStyle(org.org_type), padding: "2px 8px", borderRadius: 6,
              fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", lineHeight: "18px",
            }}>{org.org_type || "その他"}</span>
            {org.supervisor_id && memberMap?.[org.supervisor_id] && (
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
                担当: {memberMap[org.supervisor_id].name_kanji || ""}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Member count pill */}
            <span style={{
              fontSize: 11, color: "var(--text-secondary)", background: "var(--bg)",
              padding: "2px 8px", borderRadius: 10, fontWeight: 500,
              whiteSpace: "nowrap",
            }}>{assignments.length}名</span>

            {/* Edit/delete actions */}
            <div style={{ display: "flex", gap: 2 }}>
              <button type="button" onClick={() => onEditOrg(org)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
                  borderRadius: "var(--radius)", fontSize: 13, color: "var(--text-secondary)",
                  opacity: 0.4, transition: "all var(--transition)",
                  display: "flex", alignItems: "center",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "var(--bg)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.4"; e.currentTarget.style.background = "none"; }}
                title="編集">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z"/>
                </svg>
              </button>
              <button type="button" onClick={() => onDeleteOrg(org)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
                  borderRadius: "var(--radius)", fontSize: 13, color: "var(--text-secondary)",
                  opacity: 0.4, transition: "all var(--transition)",
                  display: "flex", alignItems: "center",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--error)"; e.currentTarget.style.background = "#fef2f2"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.4"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "none"; }}
                title="削除">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M13.33 4v9.33a1.33 1.33 0 01-1.33 1.34H4a1.33 1.33 0 01-1.33-1.34V4"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Card body - member chips */}
        {isExpanded && (
          <div style={{
            padding: "14px 18px",
            animation: "orgSlideDown 0.2s ease",
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {[...assignments].sort((a, b) => roleSortValue(a.role) - roleSortValue(b.role)).map(a => (
                <div
                  key={a.id}
                  onClick={() => onEditAssignment(org, a)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "5px 10px 5px 5px",
                    borderRadius: 20, border: "1px solid var(--line)", background: "#fff",
                    cursor: "pointer", transition: "all 0.15s ease", fontSize: 13,
                    animation: "chipEnter 0.2s ease",
                    position: "relative",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                    const rmBtn = e.currentTarget.querySelector("[data-rm]");
                    if (rmBtn) rmBtn.style.opacity = "1";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "var(--line)";
                    const rmBtn = e.currentTarget.querySelector("[data-rm]");
                    if (rmBtn) rmBtn.style.opacity = "0";
                  }}
                >
                  <MemberAvatar name={a.member_name} size={26} />
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{a.member_name || "\uFF08\u540D\u524D\u672A\u8A2D\u5B9A\uFF09"}</span>
                  {a.role && (
                    <span style={{
                      ...roleBadgeStyle(a.role), padding: "1px 7px", borderRadius: 6,
                      fontSize: 11, fontWeight: 500, lineHeight: "17px",
                    }}>{a.role}</span>
                  )}
                  <button
                    data-rm="1"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemoveAssignment(org, a); }}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: "0 2px",
                      fontSize: 12, color: "var(--muted)", lineHeight: 1, opacity: 0,
                      transition: "all var(--transition)", marginLeft: 2,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--error)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
                    title="配属解除"
                  >&times;</button>
                </div>
              ))}

              {/* Add member button */}
              <button
                type="button"
                onClick={() => onAddMember(org)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                  borderRadius: 20, border: "1px dashed var(--line)", background: "transparent",
                  cursor: "pointer", fontSize: 13, color: "var(--text-secondary)",
                  transition: "all var(--transition)",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.background = "var(--primary-light)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "transparent"; }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 3v10M3 8h10"/>
                </svg>
                メンバーを追加
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Children (recursive) */}
      {isExpanded && children.length > 0 && (
        <div style={{
          marginLeft: 18, marginTop: 0, paddingLeft: 28,
          borderLeft: "2px solid var(--line)",
          display: "grid", gap: 10, paddingTop: 10, position: "relative",
        }}>
          {children.map(child => (
            <OrgTreeNode
              key={child.id}
              org={child}
              depth={depth + 1}
              expandedOrgs={expandedOrgs}
              toggleExpand={toggleExpand}
              onEditOrg={onEditOrg}
              onDeleteOrg={onDeleteOrg}
              onAddMember={onAddMember}
              onEditAssignment={onEditAssignment}
              onRemoveAssignment={onRemoveAssignment}
              dragHandlers={{}}
              memberMap={memberMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════ MAIN ═══ */
export default function OrgChart() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYearId = searchParams.get("fiscalYearId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [fiscalYears, setFiscalYears] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [memberOptions, setMemberOptions] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);

  /* ── Org modal ── */
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgForm, setOrgForm] = useState({ id: "", org_name: "", org_type: "幹事会", parent_id: "", sort_order: 0, supervisor_id: "" });

  /* ── Assignment modal ── */
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignOrg, setAssignOrg] = useState(null);
  const [assignForm, setAssignForm] = useState({ id: "", member_id: "", role: "", sort_order: 0 });
  const [assignSearch, setAssignSearch] = useState("");

  /* ── Supervisor search ── */
  const [supervisorSearch, setSupervisorSearch] = useState("");

  /* ── Copy modal ── */
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copying, setCopying] = useState(false);

  /* ── Expanded orgs ── */
  const [expandedOrgs, setExpandedOrgs] = useState(new Set());

  /* ── Confirm dialogs ── */
  const [confirmDeleteOrg, setConfirmDeleteOrg] = useState(null);
  const [confirmRemoveAssignment, setConfirmRemoveAssignment] = useState(null);

  /* ── Unsaved order ── */
  const [unsavedOrder, setUnsavedOrder] = useState(false);

  /* ── Toast ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg, type = "success") { setToast({ msg, type }); }

  /* ── Data loading ── */
  function reloadData() {
    invalidateReadCache("Organization");
    invalidateReadCache("OrgAssignment");
    loadData();
  }

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [allFY, allOrgs, allAssign, allMembers] = await Promise.all([
          base44.entities.FiscalYear.list("-year"),
          base44.entities.Organization.list("sort_order"),
          base44.entities.OrgAssignment.list("sort_order"),
          base44.entities.Member.filter({ approval_status: "承認済" }),
        ]);

        setFiscalYears(allFY);
        const currentFy = allFY.find(fy => fy.is_current === true);
        const activeFyId = fiscalYearId || currentFy?.id || "";
        const selectedFy = allFY.find(fy => fy.id === activeFyId) || null;
        setSelectedFiscalYear(selectedFy);

        const memberMap = {};
        const memberOpts = allMembers.map(m => {
          memberMap[m.id] = m;
          return { id: m.id, name_kanji: m.name_kanji || "", name_kana: m.name_kana || "" };
        });
        setMemberOptions(memberOpts);

        const fyOrgs = allOrgs.filter(o => o.fiscal_year_id === activeFyId);
        const fyAssign = allAssign.filter(a => a.fiscal_year_id === activeFyId);

        const enriched = fyOrgs.map(org => ({
          ...org,
          assignments: fyAssign
            .filter(a => a.organization_id === org.id)
            .map(a => ({
              ...a,
              member_name: memberMap[a.member_id]?.name_kanji || "",
              member_name_kana: memberMap[a.member_id]?.name_kana || "",
            })),
        }));

        setOrganizations(enriched);
        // Auto-expand all on first load
        setExpandedOrgs(new Set(enriched.map(o => o.id)));
        setUnsavedOrder(false);
      } catch (err) {
        setError(err.message || "組織図データの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [fiscalYearId]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeFiscalYearId = selectedFiscalYear?.id || fiscalYearId;
  const orgTree = useMemo(() => buildOrgTree(organizations), [organizations]);
  const yearLabel = selectedFiscalYear?.year_label || (selectedFiscalYear?.year ? `${selectedFiscalYear.year}年度` : "");

  /* ── Year nav ── */
  const sortedYears = useMemo(() => [...fiscalYears].sort((a, b) => (a.year || 0) - (b.year || 0)), [fiscalYears]);
  const currentIdx = sortedYears.findIndex(fy => fy.id === activeFiscalYearId);

  function goYear(delta) {
    const next = sortedYears[currentIdx + delta];
    if (next) setSearchParams({ fiscalYearId: next.id });
  }

  function toggleExpand(orgId) {
    setExpandedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId); else next.add(orgId);
      return next;
    });
  }

  function expandAll() { setExpandedOrgs(new Set(organizations.map(o => o.id))); }
  function collapseAll() { setExpandedOrgs(new Set()); }

  /* ── Org modal ── */
  function openNewOrg() {
    setOrgForm({ id: "", org_name: "", org_type: "幹事会", parent_id: "", sort_order: organizations.length, supervisor_id: "" });
    setSupervisorSearch("");
    setShowOrgModal(true);
  }

  function openEditOrg(org) {
    setOrgForm({
      id: org.id || "", org_name: org.org_name || "", org_type: org.org_type || "幹事会",
      parent_id: org.parent_id || "", sort_order: org.sort_order || 0,
      supervisor_id: org.supervisor_id || "",
    });
    setSupervisorSearch("");
    setShowOrgModal(true);
  }

  async function handleSaveOrg(e) {
    e.preventDefault();
    if (!orgForm.org_name.trim()) return;
    setSaving(true);
    try {
      await apiRequest("save-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orgForm, fiscal_year_id: activeFiscalYearId,
          sort_order: Number(orgForm.sort_order) || 0,
        }),
      });
      showToast(orgForm.id ? "組織を更新しました" : "組織を作成しました");
      setShowOrgModal(false);
      reloadData();
    } catch (err) {
      showToast(err.message || "組織の保存に失敗しました", "error");
    } finally { setSaving(false); }
  }

  function handleDeleteOrgClick(org) {
    setConfirmDeleteOrg(org);
  }

  async function executeDeleteOrg() {
    const org = confirmDeleteOrg;
    setConfirmDeleteOrg(null);
    if (!org?.id) return;
    setSaving(true);
    try {
      // Cascade: delete all assignments for this org first
      const orgAssignments = Array.isArray(org.assignments) ? org.assignments : [];
      for (const a of orgAssignments) {
        if (!a.id) continue;
        await apiRequest("delete-org-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: a.id }),
        });
      }
      // Then delete the organization itself
      await apiRequest("delete-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: org.id }),
      });
      showToast("組織を削除しました");
      setShowOrgModal(false);
      reloadData();
    } catch (err) {
      showToast(err.message || "組織の削除に失敗しました", "error");
    } finally { setSaving(false); }
  }

  /* ── Assignment modal ── */
  function openAddMember(org) {
    setAssignOrg(org);
    setAssignForm({ id: "", member_id: "", role: "", sort_order: (org.assignments?.length || 0) });
    setAssignSearch("");
    setShowAssignModal(true);
  }

  function openEditAssignment(org, a) {
    setAssignOrg(org);
    setAssignForm({ id: a.id || "", member_id: a.member_id || "", role: a.role || "", sort_order: a.sort_order || 0 });
    setAssignSearch("");
    setShowAssignModal(true);
  }

  function handleRemoveAssignment(org, a) {
    setConfirmRemoveAssignment({ org, assignment: a });
  }

  async function handleSaveAssignment(e) {
    e.preventDefault();
    if (!assignOrg || !assignForm.member_id) return;
    setSaving(true);
    try {
      await apiRequest("save-org-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...assignForm, organization_id: assignOrg.id,
          fiscal_year_id: activeFiscalYearId,
          sort_order: Number(assignForm.sort_order) || 0,
        }),
      });
      showToast(assignForm.id ? "配属を更新しました" : "メンバーを配属しました");
      setShowAssignModal(false);
      reloadData();
    } catch (err) {
      showToast(err.message || "配属の保存に失敗しました", "error");
    } finally { setSaving(false); }
  }

  async function executeRemoveAssignment() {
    const { assignment } = confirmRemoveAssignment || {};
    setConfirmRemoveAssignment(null);
    if (!assignment?.id) return;
    setSaving(true);
    try {
      await apiRequest("delete-org-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignment.id }),
      });
      showToast("配属を解除しました");
      setShowAssignModal(false);
      reloadData();
    } catch (err) {
      showToast(err.message || "配属解除に失敗しました", "error");
    } finally { setSaving(false); }
  }

  /* ── Copy ── */
  async function executeCopy() {
    setCopying(true);
    try {
      await apiRequest("copy-organizations-to-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_fiscal_year_id: activeFiscalYearId }),
      });
      showToast("前年度の組織構成をコピーしました");
      setShowCopyModal(false);
      reloadData();
    } catch (err) {
      showToast(err.message || "コピーに失敗しました", "error");
    } finally { setCopying(false); }
  }

  /* ── Drag & Drop (flat sort among same-depth siblings) ── */
  const dragOrgId = useRef(null);

  /* ── Previous fiscal year label ── */
  const prevYear = currentIdx > 0 ? sortedYears[currentIdx - 1] : null;
  const prevYearLabel = prevYear?.year_label || (prevYear?.year ? `${prevYear.year}年度` : "前年度");

  /* ── Assigned member IDs for current org ── */
  const assignedMemberIds = useMemo(() => {
    if (!assignOrg) return new Set();
    const assigns = organizations.find(o => o.id === assignOrg.id)?.assignments || [];
    return new Set(assigns.map(a => a.member_id));
  }, [assignOrg, organizations]);

  /* ── Filtered member options for assignment ── */
  const filteredMembers = useMemo(() => {
    const q = assignSearch.toLowerCase().trim();
    return memberOptions.filter(m => {
      if (!q) return true;
      return (m.name_kanji || "").toLowerCase().includes(q) || (m.name_kana || "").toLowerCase().includes(q);
    });
  }, [memberOptions, assignSearch]);

  /* ── Member map for supervisor display ── */
  const memberMapById = useMemo(() => {
    const map = {};
    for (const m of memberOptions) map[m.id] = m;
    return map;
  }, [memberOptions]);

  /* ── Org hierarchy for parent selector ── */
  const orgHierarchyOptions = useMemo(() => buildOrgHierarchy(organizations, orgForm.id), [organizations, orgForm.id]);

  /* ── Filtered member options for supervisor selector ── */
  const filteredSupervisors = useMemo(() => {
    const q = supervisorSearch.toLowerCase().trim();
    return memberOptions.filter(m => {
      if (!q) return true;
      return (m.name_kanji || "").toLowerCase().includes(q) || (m.name_kana || "").toLowerCase().includes(q);
    });
  }, [memberOptions, supervisorSearch]);

  /* ═══ RENDER ═══ */

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              組織図管理
            </h1>
          </div>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <style>{`
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        `}</style>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div className="page-header"><h1 className="page-title">組織図管理</h1></div>
        <section className="card panel-card single-panel">
          <div className="card-body"><p className="message error">{error}</p></div>
        </section>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      {/* ── Toast ── */}
      {toast && (
        <div className="nl2-toast" style={{
          borderLeft: `4px solid ${toast.type === "error" ? "var(--error)" : "var(--success)"}`,
          animation: "orgSlideUp 0.3s ease",
        }}>
          <span className="nl2-toast-icon">{toast.type === "error" ? "\u26A0" : "\u2713"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>組織図管理</h1>
          {yearLabel && (
            <span style={{
              padding: "3px 12px", borderRadius: 6, background: "var(--primary-light)",
              color: "var(--primary)", fontSize: 13, fontWeight: 600,
            }}>{yearLabel}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setShowCopyModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="5" width="9" height="9" rx="1.5"/>
              <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11"/>
            </svg>
            前年度からコピー
          </button>
          <button
            className="btn"
            type="button"
            onClick={openNewOrg}
            style={{
              background: "var(--primary)", color: "#fff", border: "none",
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3v10M3 8h10"/>
            </svg>
            新規組織追加
          </button>
        </div>
      </div>

      {/* ── Year pill navigator ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "12px 0",
        borderBottom: "1px solid var(--line-light)", marginBottom: 20,
      }}>
        <button type="button" onClick={() => goYear(-1)} disabled={currentIdx <= 0}
          style={{
            background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius)",
            padding: "4px 8px", cursor: currentIdx <= 0 ? "default" : "pointer",
            color: currentIdx <= 0 ? "var(--muted)" : "var(--text)", fontSize: 13,
            display: "flex", alignItems: "center", transition: "all var(--transition)",
          }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3L5 8l5 5"/>
          </svg>
        </button>
        <div style={{ display: "flex", gap: 4 }}>
          {sortedYears.map(fy => {
            const isActive = fy.id === activeFiscalYearId;
            return (
              <button
                key={fy.id}
                type="button"
                onClick={() => setSearchParams({ fiscalYearId: fy.id })}
                style={{
                  fontSize: 13, padding: "5px 14px", borderRadius: 20, border: "none",
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
            background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius)",
            padding: "4px 8px", cursor: currentIdx >= sortedYears.length - 1 ? "default" : "pointer",
            color: currentIdx >= sortedYears.length - 1 ? "var(--muted)" : "var(--text)", fontSize: 13,
            display: "flex", alignItems: "center", transition: "all var(--transition)",
          }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3l5 5-5 5"/>
          </svg>
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button type="button" onClick={expandAll}
            title="すべて展開"
            style={{
              background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius)",
              padding: "4px 8px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)",
              display: "flex", alignItems: "center", gap: 4, transition: "all var(--transition)",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4l4 4 4-4"/>
            </svg>
            展開
          </button>
          <button type="button" onClick={collapseAll}
            title="すべて閉じる"
            style={{
              background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius)",
              padding: "4px 8px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)",
              display: "flex", alignItems: "center", gap: 4, transition: "all var(--transition)",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8l4-4 4 4"/>
            </svg>
            閉じる
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {orgTree.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "72px 24px", background: "#fff",
          borderRadius: "var(--radius-lg)", border: "1px solid var(--line-light)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: "var(--bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="10" height="10" rx="2"/>
              <rect x="18" y="4" width="10" height="10" rx="2"/>
              <rect x="11" y="18" width="10" height="10" rx="2"/>
              <path d="M9 14v4h7M23 14v8h-7" strokeDasharray="2 2"/>
            </svg>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>この年度の組織はまだありません</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: 28, fontSize: 14, lineHeight: 1.6 }}>
            新規組織を追加するか、前年度のデータをコピーして始めましょう
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn"
              type="button"
              onClick={openNewOrg}
              style={{
                background: "var(--primary)", color: "#fff", border: "none",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 3v10M3 8h10"/>
              </svg>
              新規組織を追加
            </button>
            {prevYear && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowCopyModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="5" width="9" height="9" rx="1.5"/>
                  <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11"/>
                </svg>
                前年度からコピー
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ── Org tree ── */
        <div style={{ display: "grid", gap: 12 }}>
          {orgTree.map(org => (
            <OrgTreeNode
              key={org.id}
              org={org}
              depth={0}
              expandedOrgs={expandedOrgs}
              toggleExpand={toggleExpand}
              onEditOrg={openEditOrg}
              onDeleteOrg={handleDeleteOrgClick}
              onAddMember={openAddMember}
              onEditAssignment={openEditAssignment}
              onRemoveAssignment={handleRemoveAssignment}
              memberMap={memberMapById}
              dragHandlers={{
                draggable: true,
                onDragStart: () => { dragOrgId.current = org.id; },
                onDragOver: (e) => e.preventDefault(),
                onDrop: async () => {
                  if (!dragOrgId.current || dragOrgId.current === org.id) return;
                  // Simple swap sort_order
                  const fromOrg = organizations.find(o => o.id === dragOrgId.current);
                  const toOrg = organizations.find(o => o.id === org.id);
                  if (!fromOrg || !toOrg) return;
                  const updated = organizations.map(o => {
                    if (o.id === fromOrg.id) return { ...o, sort_order: toOrg.sort_order };
                    if (o.id === toOrg.id) return { ...o, sort_order: fromOrg.sort_order };
                    return o;
                  });
                  setOrganizations(updated);
                  setUnsavedOrder(true);
                  dragOrgId.current = null;
                },
                onDragEnd: () => { dragOrgId.current = null; },
              }}
            />
          ))}
        </div>
      )}

      {/* ── Unsaved order banner ── */}
      {unsavedOrder && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          border: "1px solid var(--line)", borderRadius: "var(--radius-xl)",
          padding: "12px 24px", display: "flex", alignItems: "center", gap: 14,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 100, animation: "orgSlideUp 0.3s ease",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="7"/>
            <path d="M8 5v3.5l2.5 1.5"/>
          </svg>
          <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>未保存の並び順変更があります</span>
          <button
            className="btn"
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await apiRequest("batch-update-sort-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    entity: "organizations",
                    items: organizations.map(o => ({ id: o.id, sort_order: o.sort_order })),
                  }),
                });
                showToast("並び順を保存しました");
                setUnsavedOrder(false);
              } catch (err) {
                showToast("並び順の保存に失敗しました", "error");
              } finally { setSaving(false); }
            }}
            style={{
              background: "var(--primary)", color: "#fff", border: "none",
              fontSize: 13, padding: "6px 16px", borderRadius: "var(--radius)",
            }}
          >{saving ? "保存中..." : "並び順を保存"}</button>
          <button
            type="button"
            onClick={() => { setUnsavedOrder(false); reloadData(); }}
            style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 13,
              color: "var(--text-secondary)", padding: "6px 8px",
              transition: "color var(--transition)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
          >取り消す</button>
        </div>
      )}

      {/* ═══ Org Edit Modal ═══ */}
      {showOrgModal && (
        <div className="confirm-overlay" onClick={() => setShowOrgModal(false)}
          style={{ animation: "modalFadeIn 0.2s ease" }}>
          <div className="modal-dialog" style={{ maxWidth: 600, animation: "modalSlideIn 0.25s ease" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{orgForm.id ? "組織を編集" : "新規組織作成"}</h3>
              <button type="button" className="modal-close" onClick={() => setShowOrgModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveOrg}>
              <div className="modal-body" style={{ padding: 24 }}>
                {/* Name */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)", letterSpacing: "0.02em" }}>
                    組織名
                  </label>
                  <input
                    type="text" value={orgForm.org_name}
                    onChange={e => setOrgForm(p => ({ ...p, org_name: e.target.value }))}
                    placeholder="例: 総務委員会"
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "var(--radius)",
                      border: "1px solid var(--line)", fontSize: 15, fontWeight: 500,
                      transition: "border-color var(--transition)",
                      outline: "none",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--line)"}
                    autoFocus
                  />
                </div>

                {/* Type - pill selector */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)", letterSpacing: "0.02em" }}>
                    種別
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["幹事会", "委員会", "部会", "室", "その他"].map(t => {
                      const isActive = orgForm.org_type === t;
                      const tc = TYPE_COLORS[t];
                      return (
                        <button
                          key={t} type="button"
                          onClick={() => setOrgForm(p => ({ ...p, org_type: t }))}
                          style={{
                            padding: "7px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                            cursor: "pointer", transition: "all 0.15s",
                            transform: isActive ? "scale(1.02)" : "scale(1)",
                            background: isActive ? tc.text : "#fff",
                            color: isActive ? "#fff" : "var(--text-secondary)",
                            border: `1.5px solid ${isActive ? tc.text : "var(--line)"}`,
                            boxShadow: isActive ? `0 2px 8px ${tc.text}30` : "none",
                          }}
                        >{t}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Parent */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)", letterSpacing: "0.02em" }}>
                    親組織
                  </label>
                  <select
                    value={orgForm.parent_id}
                    onChange={e => setOrgForm(p => ({ ...p, parent_id: e.target.value }))}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "var(--radius)",
                      border: "1px solid var(--line)", fontSize: 14,
                      transition: "border-color var(--transition)", outline: "none",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--line)"}
                  >
                    <option value="">なし（ルート）</option>
                    {orgHierarchyOptions.map(o => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Sort order */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)", letterSpacing: "0.02em" }}>
                    表示順
                  </label>
                  <input
                    type="number" value={orgForm.sort_order}
                    onChange={e => setOrgForm(p => ({ ...p, sort_order: e.target.value }))}
                    style={{
                      width: 100, padding: "10px 14px", borderRadius: "var(--radius)",
                      border: "1px solid var(--line)", fontSize: 14,
                      transition: "border-color var(--transition)", outline: "none",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--line)"}
                  />
                </div>

                {/* Supervisor */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)", letterSpacing: "0.02em" }}>
                    担当者（上位監督者）
                  </label>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.5 }}>
                    この組織を統括する副会長・代表幹事等を設定できます（任意）
                  </p>
                  <div style={{ position: "relative", marginBottom: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                      <circle cx="7" cy="7" r="5"/>
                      <path d="M14 14l-3.5-3.5"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="氏名で検索..."
                      value={supervisorSearch}
                      onChange={e => setSupervisorSearch(e.target.value)}
                      style={{
                        width: "100%", padding: "8px 12px 8px 34px", borderRadius: "var(--radius)",
                        border: "1px solid var(--line)", fontSize: 13,
                        transition: "border-color var(--transition)", outline: "none",
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--line)"}
                    />
                  </div>
                  <select
                    value={orgForm.supervisor_id}
                    onChange={e => setOrgForm(p => ({ ...p, supervisor_id: e.target.value }))}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "var(--radius)",
                      border: "1px solid var(--line)", fontSize: 14,
                      transition: "border-color var(--transition)", outline: "none",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--line)"}
                  >
                    <option value="">なし</option>
                    {filteredSupervisors.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name_kanji}{m.name_kana ? ` (${m.name_kana})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: "space-between" }}>
                <div>
                  {orgForm.id && (
                    <button type="button" onClick={() => { setShowOrgModal(false); handleDeleteOrgClick(orgForm); }}
                      style={{
                        background: "none", border: "1px solid var(--error)", color: "var(--error)",
                        borderRadius: "var(--radius)", padding: "8px 16px", cursor: "pointer", fontSize: 13,
                        transition: "all var(--transition)",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                      disabled={saving}
                    >この組織を削除</button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowOrgModal(false)}>キャンセル</button>
                  <button type="submit" className="btn" disabled={saving || !orgForm.org_name.trim()}
                    style={{ background: "var(--primary)", color: "#fff", border: "none" }}
                  >{saving ? "保存中..." : "保存"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Assignment Modal ═══ */}
      {showAssignModal && assignOrg && (
        <div className="confirm-overlay" onClick={() => setShowAssignModal(false)}
          style={{ animation: "modalFadeIn 0.2s ease" }}>
          <div className="modal-dialog" style={{ maxWidth: 520, animation: "modalSlideIn 0.25s ease" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{
              borderLeft: `4px solid ${TYPE_COLORS[assignOrg.org_type]?.text || "var(--muted)"}`,
            }}>
              <h3 style={{ fontSize: "1rem" }}>
                {assignForm.id ? "配属を編集" : `${assignOrg.org_name || "組織"}にメンバーを追加`}
              </h3>
              <button type="button" className="modal-close" onClick={() => setShowAssignModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveAssignment}>
              <div className="modal-body" style={{ padding: 24 }}>
                {/* Member selection */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)", letterSpacing: "0.02em" }}>
                    会員
                  </label>
                  {!assignForm.id && (
                    <div style={{ position: "relative", marginBottom: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                        <circle cx="7" cy="7" r="5"/>
                        <path d="M14 14l-3.5-3.5"/>
                      </svg>
                      <input
                        type="text"
                        placeholder="氏名で検索..."
                        value={assignSearch}
                        onChange={e => setAssignSearch(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 12px 8px 34px", borderRadius: "var(--radius)",
                          border: "1px solid var(--line)", fontSize: 13,
                          transition: "border-color var(--transition)", outline: "none",
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--line)"}
                      />
                    </div>
                  )}
                  <select
                    value={assignForm.member_id}
                    onChange={e => setAssignForm(p => ({ ...p, member_id: e.target.value }))}
                    disabled={!!assignForm.id}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "var(--radius)",
                      border: "1px solid var(--line)", fontSize: 14,
                      background: assignForm.id ? "var(--line-light)" : "#fff",
                      transition: "border-color var(--transition)", outline: "none",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--line)"}
                  >
                    <option value="">-- 会員を選択 --</option>
                    {filteredMembers.map(m => {
                      const isAssigned = assignedMemberIds.has(m.id) && m.id !== assignForm.member_id;
                      return (
                        <option key={m.id} value={m.id} disabled={isAssigned}
                          style={{ color: isAssigned ? "var(--muted)" : "inherit" }}
                        >
                          {m.name_kanji}{isAssigned ? "（配属済）" : ""}{m.name_kana ? ` (${m.name_kana})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Role */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)", letterSpacing: "0.02em" }}>
                    役職
                  </label>
                  <input
                    type="text"
                    value={assignForm.role}
                    onChange={e => setAssignForm(p => ({ ...p, role: e.target.value }))}
                    placeholder="例: 委員長、副委員長、幹事、委員"
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "var(--radius)",
                      border: "1px solid var(--line)", fontSize: 14, marginBottom: 8,
                      transition: "border-color var(--transition)", outline: "none",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--line)"}
                  />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(ROLES_BY_ORG_TYPE[assignOrg.org_type] || ROLES_BY_ORG_TYPE["その他"]).map(r => {
                      const isActive = assignForm.role === r;
                      return (
                        <button
                          key={r} type="button"
                          onClick={() => setAssignForm(p => ({ ...p, role: r }))}
                          style={{
                            padding: "3px 10px", borderRadius: 16, fontSize: 12, fontWeight: 500,
                            cursor: "pointer", transition: "all 0.15s",
                            transform: isActive ? "scale(1.02)" : "scale(1)",
                            background: isActive ? "var(--primary)" : "#fff",
                            color: isActive ? "#fff" : "var(--text-secondary)",
                            border: `1px solid ${isActive ? "var(--primary)" : "var(--line)"}`,
                          }}
                        >{r}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: "space-between" }}>
                <div>
                  {assignForm.id && (
                    <button type="button"
                      onClick={() => {
                        setShowAssignModal(false);
                        setConfirmRemoveAssignment({
                          org: assignOrg,
                          assignment: { id: assignForm.id, member_name: memberOptions.find(m => m.id === assignForm.member_id)?.name_kanji || "" },
                        });
                      }}
                      style={{
                        background: "none", border: "1px solid var(--error)", color: "var(--error)",
                        borderRadius: "var(--radius)", padding: "8px 16px", cursor: "pointer", fontSize: 13,
                        transition: "all var(--transition)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                      disabled={saving}
                    >配属解除</button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>キャンセル</button>
                  <button type="submit" className="btn" disabled={saving || !assignForm.member_id}
                    style={{ background: "var(--primary)", color: "#fff", border: "none" }}
                  >{saving ? "保存中..." : assignForm.id ? "更新" : "追加"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Copy Modal ═══ */}
      {showCopyModal && (
        <div className="confirm-overlay" onClick={() => setShowCopyModal(false)}
          style={{ animation: "modalFadeIn 0.2s ease" }}>
          <div className="modal-dialog" style={{ maxWidth: 480, animation: "modalSlideIn 0.25s ease" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: "none" }}>
              <h3 style={{ fontSize: "1rem" }}>前年度の組織構成をコピー</h3>
              <button type="button" className="modal-close" onClick={() => setShowCopyModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              {copying ? (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "40px 20px", gap: 16,
                }}>
                  <div style={{
                    width: 40, height: 40, border: "3px solid var(--line)", borderTopColor: "var(--primary)",
                    borderRadius: "50%", animation: "spin 0.8s linear infinite",
                  }} />
                  <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>コピー中...</span>
                </div>
              ) : (
                <>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
                    padding: 20, background: "var(--bg)", borderRadius: "var(--radius-lg)", marginBottom: 20,
                  }}>
                    <span style={{
                      padding: "5px 16px", borderRadius: "var(--radius)", background: "#fff",
                      border: "1px solid var(--line)", fontSize: 14, fontWeight: 600,
                    }}>{prevYearLabel}</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 10h12M12 6l4 4-4 4"/>
                    </svg>
                    <span style={{
                      padding: "5px 16px", borderRadius: "var(--radius)", background: "var(--primary-light)",
                      color: "var(--primary)", fontSize: 14, fontWeight: 600, border: "1px solid transparent",
                    }}>{yearLabel}</span>
                  </div>

                  <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", background: "#ecfdf5",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6l3 3 5-5"/>
                        </svg>
                      </div>
                      <span>組織構成（幹事会、委員会、部会）</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", background: "#ecfdf5",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6l3 3 5-5"/>
                        </svg>
                      </div>
                      <span>配属メンバーと役職</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)" }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", background: "var(--bg)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="6" cy="6" r="5"/>
                          <path d="M6 4v3M6 8.5v0"/>
                        </svg>
                      </div>
                      <span>コピー後に個別に編集できます</span>
                    </div>
                  </div>

                  {organizations.length > 0 && (
                    <div style={{
                      marginTop: 16, padding: "10px 14px", borderRadius: "var(--radius)",
                      background: "#fffbeb", border: "1px solid #fde68a", fontSize: 13,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 1L1 14h14L8 1zM8 6v4M8 12v0"/>
                      </svg>
                      <span><strong style={{ color: "#b45309" }}>注意:</strong> 現在の年度に既に{organizations.length}件の組織があります。</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {!copying && (
              <div className="modal-footer" style={{ justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCopyModal(false)}>キャンセル</button>
                <button
                  type="button" className="btn"
                  onClick={executeCopy}
                  disabled={copying}
                  style={{ background: "var(--primary)", color: "#fff", border: "none" }}
                >コピーする</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Confirm Dialogs ═══ */}
      <ConfirmDialog
        open={!!confirmDeleteOrg}
        title="組織の削除"
        message={(() => {
          const cnt = (confirmDeleteOrg?.assignments || []).length;
          if (cnt > 0) return `「${confirmDeleteOrg?.org_name || ""}」には${cnt}名のメンバーが配属されています。配属情報も含めて削除しますか？`;
          return `「${confirmDeleteOrg?.org_name || ""}」を削除しますか？`;
        })()}
        confirmLabel="削除する"
        confirmStyle={{ background: "#dc2626", borderColor: "#dc2626" }}
        onConfirm={executeDeleteOrg}
        onCancel={() => setConfirmDeleteOrg(null)}
      />
      <ConfirmDialog
        open={!!confirmRemoveAssignment}
        title="配属解除"
        message={`${confirmRemoveAssignment?.assignment?.member_name || "このメンバー"}さんを「${confirmRemoveAssignment?.org?.org_name || "この組織"}」から解除しますか？`}
        confirmLabel="解除する"
        confirmStyle={{ background: "#dc2626", borderColor: "#dc2626" }}
        onConfirm={executeRemoveAssignment}
        onCancel={() => setConfirmRemoveAssignment(null)}
      />

      {/* ═══ Animations ═══ */}
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes orgSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes orgSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes chipEnter {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  );
}
