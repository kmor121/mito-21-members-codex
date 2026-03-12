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
  "その他": { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1" },
};

const ROLE_COLORS = {
  "会長":   { bg: "#eef2ff", text: "#4f46e5" },
  "委員長": { bg: "#eef2ff", text: "#4f46e5" },
  "副会長": { bg: "#ecfdf5", text: "#059669" },
  "副委員長": { bg: "#ecfdf5", text: "#059669" },
  "幹事":   { bg: "#fffbeb", text: "#d97706" },
};

const QUICK_ROLES = ["会長", "副会長", "委員長", "副委員長", "幹事", "委員"];

function roleBadgeStyle(role) {
  const c = ROLE_COLORS[role];
  if (c) return { background: c.bg, color: c.text, border: `1px solid ${c.bg}` };
  return { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" };
}

function typeBadgeStyle(type) {
  const c = TYPE_COLORS[type] || TYPE_COLORS["その他"];
  return { background: c.bg, color: c.text, border: `1px solid ${c.border}` };
}

function MemberAvatar({ name, size = 28 }) {
  const initial = (name || "M").charAt(0);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "var(--primary-light)",
      color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 700, flexShrink: 0,
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

/* ═══ Skeleton ═══ */
function SkeletonCard() {
  return (
    <div style={{ padding: 20, borderRadius: "var(--radius-lg)", border: "1px solid var(--line)", background: "#fff" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style={{ width: 120, height: 18, borderRadius: 4, background: "var(--line-light)", animation: "pulse 1.5s ease infinite" }} />
        <div style={{ width: 60, height: 22, borderRadius: 12, background: "var(--line-light)", animation: "pulse 1.5s ease infinite" }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: 100, height: 32, borderRadius: 20, background: "var(--line-light)", animation: "pulse 1.5s ease infinite" }} />
        ))}
      </div>
    </div>
  );
}

/* ═══ OrgTreeNode (recursive) ═══ */
function OrgTreeNode({
  org, depth, expandedOrgs, toggleExpand,
  onEditOrg, onDeleteOrg, onAddMember, onEditAssignment, onRemoveAssignment,
  dragHandlers,
}) {
  const assignments = Array.isArray(org.assignments) ? org.assignments : [];
  const children = org.children || [];
  const isExpanded = expandedOrgs.has(org.id);
  const tc = TYPE_COLORS[org.org_type] || TYPE_COLORS["その他"];
  const hasChildren = children.length > 0;

  return (
    <div style={{ position: "relative" }}>
      {/* Connection lines for child orgs */}
      {depth > 0 && (
        <div style={{
          position: "absolute", left: -20, top: 0, bottom: 0, width: 20,
        }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "var(--line)",
          }} />
          <div style={{
            position: "absolute", left: 0, top: 24, height: 2, width: 20, background: "var(--line)",
          }} />
        </div>
      )}

      {/* Org card */}
      <div
        style={{
          border: `1px solid ${tc.border}`, borderRadius: "var(--radius-lg)", background: "#fff",
          transition: "box-shadow 0.2s ease, transform 0.2s ease", overflow: "hidden",
        }}
        {...dragHandlers}
      >
        {/* Card header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderBottom: `1px solid ${tc.border}`, background: tc.bg,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Drag handle */}
            <span style={{
              cursor: "grab", color: "var(--muted)", fontSize: 16, userSelect: "none",
              display: "flex", alignItems: "center",
            }} title="ドラッグで並び替え">≡</span>

            {/* Collapse toggle */}
            {(hasChildren || assignments.length > 0) && (
              <button
                type="button"
                onClick={() => toggleExpand(org.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
                  fontSize: 12, color: "var(--text-secondary)", transition: "transform 0.2s ease",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >▶</button>
            )}

            <strong style={{ fontSize: 15 }}>{org.org_name || "（名称未設定）"}</strong>
            <span style={{
              ...typeBadgeStyle(org.org_type), padding: "2px 10px", borderRadius: 20,
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
            }}>{org.org_type || "その他"}</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{assignments.length}名</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" onClick={() => onEditOrg(org)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
                borderRadius: "var(--radius)", fontSize: 14, transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
              title="編集">✏️</button>
            <button type="button" onClick={() => onDeleteOrg(org)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
                borderRadius: "var(--radius)", fontSize: 14, transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
              title="削除">🗑️</button>
          </div>
        </div>

        {/* Card body - member chips */}
        {isExpanded && (
          <div style={{
            padding: "14px 18px",
            animation: "orgSlideDown 0.2s ease",
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {assignments.map(a => (
                <div
                  key={a.id}
                  onClick={() => onEditAssignment(org, a)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "5px 12px 5px 6px",
                    borderRadius: 20, border: "1px solid var(--line)", background: "#fff",
                    cursor: "pointer", transition: "all 0.15s", fontSize: 13,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "var(--primary-light)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "#fff"; }}
                >
                  <MemberAvatar name={a.member_name} size={24} />
                  <span style={{ fontWeight: 500 }}>{a.member_name || "（名前未設定）"}</span>
                  {a.role && (
                    <span style={{
                      ...roleBadgeStyle(a.role), padding: "1px 8px", borderRadius: 12,
                      fontSize: 11, fontWeight: 600,
                    }}>{a.role}</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemoveAssignment(org, a); }}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: "0 2px",
                      fontSize: 14, color: "var(--muted)", lineHeight: 1,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--error)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
                    title="配属解除"
                  >×</button>
                </div>
              ))}

              {/* Add member button */}
              <button
                type="button"
                onClick={() => onAddMember(org)}
                style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "5px 12px",
                  borderRadius: 20, border: "1px dashed var(--line)", background: "transparent",
                  cursor: "pointer", fontSize: 13, color: "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> メンバーを追加
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Children (recursive) */}
      {isExpanded && children.length > 0 && (
        <div style={{ marginLeft: 40, marginTop: 12, display: "grid", gap: 12, position: "relative" }}>
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
  const [orgForm, setOrgForm] = useState({ id: "", org_name: "", org_type: "幹事会", parent_id: "", sort_order: 0 });

  /* ── Assignment modal ── */
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignOrg, setAssignOrg] = useState(null);
  const [assignForm, setAssignForm] = useState({ id: "", member_id: "", role: "", sort_order: 0 });
  const [assignSearch, setAssignSearch] = useState("");

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
    setOrgForm({ id: "", org_name: "", org_type: "幹事会", parent_id: "", sort_order: organizations.length });
    setShowOrgModal(true);
  }

  function openEditOrg(org) {
    setOrgForm({
      id: org.id || "", org_name: org.org_name || "", org_type: org.org_type || "幹事会",
      parent_id: org.parent_id || "", sort_order: org.sort_order || 0,
    });
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
        <div style={{ display: "grid", gap: 16, padding: "0" }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
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
        }}>
          <span className="nl2-toast-icon">{toast.type === "error" ? "⚠️" : "✅"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>組織図管理</h1>
          {yearLabel && (
            <span style={{
              padding: "3px 12px", borderRadius: 20, background: "var(--primary-light)",
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
            📋 前年度からコピー
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
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> 新規組織追加
          </button>
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

      {/* ── Empty state ── */}
      {orgTree.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px", background: "#fff",
          borderRadius: "var(--radius-lg)", border: "1px solid var(--line)",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>この年度の組織はまだありません</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 14 }}>
            新規組織を追加するか、前年度のデータをコピーして始めましょう
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn"
              type="button"
              onClick={openNewOrg}
              style={{ background: "var(--primary)", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 6 }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> 新規組織を追加
            </button>
            {prevYear && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowCopyModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                📋 前年度からコピー
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ── Org tree ── */
        <div style={{ display: "grid", gap: 16 }}>
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
          background: "#fff", border: "1px solid var(--primary)", borderRadius: "var(--radius-lg)",
          padding: "12px 20px", display: "flex", alignItems: "center", gap: 12,
          boxShadow: "var(--shadow-lg)", zIndex: 100, animation: "orgSlideUp 0.3s ease",
        }}>
          <span style={{ fontSize: 13, color: "var(--text)" }}>未保存の並び順変更があります</span>
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
            style={{ background: "var(--primary)", color: "#fff", border: "none", fontSize: 13, padding: "6px 16px" }}
          >{saving ? "保存中..." : "並び順を保存"}</button>
          <button
            type="button"
            onClick={() => { setUnsavedOrder(false); reloadData(); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}
          >取り消す</button>
        </div>
      )}

      {/* ═══ Org Edit Modal ═══ */}
      {showOrgModal && (
        <div className="confirm-overlay" onClick={() => setShowOrgModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{orgForm.id ? "組織を編集" : "新規組織作成"}</h3>
              <button type="button" className="modal-close" onClick={() => setShowOrgModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveOrg}>
              <div className="modal-body" style={{ padding: 24 }}>
                {/* Name */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
                    組織名
                  </label>
                  <input
                    type="text" value={orgForm.org_name}
                    onChange={e => setOrgForm(p => ({ ...p, org_name: e.target.value }))}
                    placeholder="例: 総務委員会"
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "var(--radius)",
                      border: "1px solid var(--line)", fontSize: 15, fontWeight: 500,
                    }}
                    autoFocus
                  />
                </div>

                {/* Type - pill selector */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
                    種別
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["幹事会", "委員会", "部会", "その他"].map(t => {
                      const isActive = orgForm.org_type === t;
                      const tc = TYPE_COLORS[t];
                      return (
                        <button
                          key={t} type="button"
                          onClick={() => setOrgForm(p => ({ ...p, org_type: t }))}
                          style={{
                            padding: "7px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                            cursor: "pointer", transition: "all 0.15s",
                            background: isActive ? tc.bg : "#fff",
                            color: isActive ? tc.text : "var(--text-secondary)",
                            border: `2px solid ${isActive ? tc.text : "var(--line)"}`,
                          }}
                        >{t}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Parent */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
                    親組織
                  </label>
                  <select
                    value={orgForm.parent_id}
                    onChange={e => setOrgForm(p => ({ ...p, parent_id: e.target.value }))}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "var(--radius)",
                      border: "1px solid var(--line)", fontSize: 14,
                    }}
                  >
                    <option value="">なし（ルート）</option>
                    {organizations.filter(o => o.id !== orgForm.id).map(o => (
                      <option key={o.id} value={o.id}>{o.org_name || "（名称未設定）"}</option>
                    ))}
                  </select>
                </div>

                {/* Sort order */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
                    表示順
                  </label>
                  <input
                    type="number" value={orgForm.sort_order}
                    onChange={e => setOrgForm(p => ({ ...p, sort_order: e.target.value }))}
                    style={{
                      width: 100, padding: "10px 14px", borderRadius: "var(--radius)",
                      border: "1px solid var(--line)", fontSize: 14,
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: "space-between" }}>
                <div>
                  {orgForm.id && (
                    <button type="button" onClick={() => { setShowOrgModal(false); handleDeleteOrgClick(orgForm); }}
                      style={{
                        background: "none", border: "1px solid var(--error)", color: "var(--error)",
                        borderRadius: "var(--radius)", padding: "8px 16px", cursor: "pointer", fontSize: 13,
                      }}
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
        <div className="confirm-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{
              background: TYPE_COLORS[assignOrg.org_type]?.bg || "var(--line-light)",
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
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
                    会員
                  </label>
                  {!assignForm.id && (
                    <input
                      type="text"
                      placeholder="氏名で検索..."
                      value={assignSearch}
                      onChange={e => setAssignSearch(e.target.value)}
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: "var(--radius)",
                        border: "1px solid var(--line)", fontSize: 13, marginBottom: 8,
                      }}
                    />
                  )}
                  <select
                    value={assignForm.member_id}
                    onChange={e => setAssignForm(p => ({ ...p, member_id: e.target.value }))}
                    disabled={!!assignForm.id}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "var(--radius)",
                      border: "1px solid var(--line)", fontSize: 14,
                      background: assignForm.id ? "var(--line-light)" : "#fff",
                    }}
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
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
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
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {QUICK_ROLES.map(r => (
                      <button
                        key={r} type="button"
                        onClick={() => setAssignForm(p => ({ ...p, role: r }))}
                        style={{
                          padding: "3px 10px", borderRadius: 16, fontSize: 12, fontWeight: 500,
                          cursor: "pointer", transition: "all 0.15s",
                          background: assignForm.role === r ? "var(--primary-light)" : "#fff",
                          color: assignForm.role === r ? "var(--primary)" : "var(--text-secondary)",
                          border: `1px solid ${assignForm.role === r ? "var(--primary)" : "var(--line)"}`,
                        }}
                      >{r}</button>
                    ))}
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
                      }}
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
        <div className="confirm-overlay" onClick={() => setShowCopyModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: "var(--primary-light)", borderBottom: "none" }}>
              <h3 style={{ fontSize: "1rem" }}>前年度の組織構成をコピー</h3>
              <button type="button" className="modal-close" onClick={() => setShowCopyModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                padding: 16, background: "var(--bg)", borderRadius: "var(--radius)", marginBottom: 20,
              }}>
                <span style={{
                  padding: "4px 14px", borderRadius: 20, background: "var(--line-light)",
                  fontSize: 14, fontWeight: 600,
                }}>{prevYearLabel}</span>
                <span style={{ fontSize: 20, color: "var(--muted)" }}>→</span>
                <span style={{
                  padding: "4px 14px", borderRadius: 20, background: "var(--primary-light)",
                  color: "var(--primary)", fontSize: 14, fontWeight: 600,
                }}>{yearLabel}</span>
              </div>

              <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--success)", fontSize: 16 }}>✅</span>
                  <span>組織構成（幹事会、委員会、部会）</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--success)", fontSize: 16 }}>✅</span>
                  <span>配属メンバーと役職</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                  <span style={{ fontSize: 16 }}>ℹ️</span>
                  <span>コピー後に個別に編集できます</span>
                </div>
              </div>

              {organizations.length > 0 && (
                <div style={{
                  marginTop: 16, padding: "10px 14px", borderRadius: "var(--radius)",
                  background: "var(--warning-light)", border: "1px solid #fde68a", fontSize: 13,
                }}>
                  <strong style={{ color: "var(--warning)" }}>注意:</strong> 現在の年度に既に{organizations.length}件の組織があります。
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCopyModal(false)}>キャンセル</button>
              <button
                type="button" className="btn"
                onClick={executeCopy}
                disabled={copying}
                style={{ background: "var(--primary)", color: "#fff", border: "none" }}
              >
                {copying ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    コピー中...
                  </span>
                ) : "コピーする"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Confirm Dialogs ═══ */}
      <ConfirmDialog
        open={!!confirmDeleteOrg}
        title="組織の削除"
        message={`「${confirmDeleteOrg?.org_name || ""}」を削除しますか？配属メンバーも解除されます。`}
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
        @keyframes orgSlideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 500px; }
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
      `}</style>
    </section>
  );
}
