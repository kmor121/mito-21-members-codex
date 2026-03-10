import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest, base44 } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmDialog from "../../components/common/ConfirmDialog";

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

function buildOrgTree(orgs) {
  const result = [];
  const childrenMap = {};
  for (const org of orgs) {
    const pid = org.parent_id || null;
    if (!childrenMap[pid]) childrenMap[pid] = [];
    childrenMap[pid].push(org);
  }
  for (const key of Object.keys(childrenMap)) {
    childrenMap[key].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }
  function walk(parentId, depth) {
    const children = childrenMap[parentId] || [];
    for (const org of children) {
      result.push({ org, depth });
      walk(org.id, depth + 1);
    }
  }
  walk(null, 0);
  if (result.length === 0) walk("", 0);
  if (result.length === 0) {
    for (const org of orgs) result.push({ org, depth: 0 });
  }
  return result;
}

export default function OrgChart() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYearId = searchParams.get("fiscalYearId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [fiscalYears, setFiscalYears] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [memberOptions, setMemberOptions] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);

  // Org modal
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgForm, setOrgForm] = useState({ id: "", org_name: "", org_type: "幹事会", parent_id: "", sort_order: 0 });

  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignOrgId, setAssignOrgId] = useState(null);
  const [assignOrgName, setAssignOrgName] = useState("");
  const [assignmentForm, setAssignmentForm] = useState({ id: "", member_id: "", role: "", sort_order: 0 });

  // Expanded orgs (for viewing assignments inline)
  const [expandedOrgs, setExpandedOrgs] = useState(new Set());

  const dragOrgIdx = useRef(null);
  const dragOverOrgIdx = useRef(null);

  // Confirm dialogs
  const [confirmCopy, setConfirmCopy] = useState(false);
  const [confirmDeleteOrg, setConfirmDeleteOrg] = useState(false);
  const [confirmDeleteAssignment, setConfirmDeleteAssignment] = useState(false);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(""), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [allFiscalYears, allOrgs, allAssignments, allMembers] = await Promise.all([
          base44.entities.FiscalYear.list("-year"),
          base44.entities.Organization.list("sort_order"),
          base44.entities.OrgAssignment.list("sort_order"),
          base44.entities.Member.filter({ approval_status: "承認済" }),
        ]);

        setFiscalYears(allFiscalYears);
        const currentFy = allFiscalYears.find((fy) => fy.is_current === true);
        const activeFyId = fiscalYearId || currentFy?.id || "";
        const selectedFy = allFiscalYears.find((fy) => fy.id === activeFyId) || null;
        setSelectedFiscalYear(selectedFy);

        // Build member map and options
        const memberMap = {};
        const memberOpts = allMembers.map((m) => {
          memberMap[m.id] = m;
          return { id: m.id, name_kanji: m.name_kanji || "", name_kana: m.name_kana || "" };
        });
        setMemberOptions(memberOpts);

        // Filter orgs and assignments for active fiscal year, enrich with assignments
        const fyOrgs = allOrgs.filter((o) => o.fiscal_year_id === activeFyId);
        const fyAssignments = allAssignments.filter((a) => a.fiscal_year_id === activeFyId);

        const enrichedOrgs = fyOrgs.map((org) => {
          const orgAssigns = fyAssignments
            .filter((a) => a.organization_id === org.id)
            .map((a) => ({
              ...a,
              member_name: memberMap[a.member_id]?.name_kanji || "",
              member_name_kana: memberMap[a.member_id]?.name_kana || "",
            }));
          return { ...org, assignments: orgAssigns };
        });

        setOrganizations(enrichedOrgs);
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
  const yearLabel = selectedFiscalYear?.year_label || "";

  function handleFiscalYearChange(e) {
    const val = e.target.value;
    if (val) setSearchParams({ fiscalYearId: val });
    else setSearchParams({});
  }

  function toggleExpand(orgId) {
    setExpandedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId); else next.add(orgId);
      return next;
    });
  }

  // Org modal helpers
  function openNewOrg() {
    setOrgForm({ id: "", org_name: "", org_type: "幹事会", parent_id: "", sort_order: 0 });
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
    setSaving(true);
    try {
      await apiRequest("save-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orgForm,
          fiscal_year_id: activeFiscalYearId,
          sort_order: Number(orgForm.sort_order) || 0,
        }),
      });
      setToastMessage("組織を保存しました。");
      setShowOrgModal(false);
      loadData();
    } catch (err) {
      setToastMessage(err.message || "組織の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function executeDeleteOrg() {
    setConfirmDeleteOrg(false);
    if (!orgForm.id) return;
    setSaving(true);
    try {
      await apiRequest("delete-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orgForm.id }),
      });
      setToastMessage("組織を削除しました。");
      setShowOrgModal(false);
      loadData();
    } catch (err) {
      setToastMessage(err.message || "組織の削除に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  // Assignment modal helpers
  function openNewAssignment(orgId, orgName) {
    setAssignOrgId(orgId);
    setAssignOrgName(orgName);
    setAssignmentForm({ id: "", member_id: "", role: "", sort_order: 0 });
    setShowAssignModal(true);
  }

  function openEditAssignment(orgId, orgName, a) {
    setAssignOrgId(orgId);
    setAssignOrgName(orgName);
    setAssignmentForm({
      id: a.id || "", member_id: a.member_id || "", role: a.role || "", sort_order: a.sort_order || 0,
    });
    setShowAssignModal(true);
  }

  async function handleSaveAssignment(e) {
    e.preventDefault();
    if (!assignOrgId) return;
    setSaving(true);
    try {
      await apiRequest("save-org-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...assignmentForm,
          organization_id: assignOrgId,
          sort_order: Number(assignmentForm.sort_order) || 0,
        }),
      });
      setToastMessage("配属を保存しました。");
      setShowAssignModal(false);
      loadData();
    } catch (err) {
      setToastMessage(err.message || "配属の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function executeDeleteAssignment() {
    setConfirmDeleteAssignment(false);
    if (!assignmentForm.id) return;
    setSaving(true);
    try {
      await apiRequest("delete-org-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignmentForm.id }),
      });
      setToastMessage("配属を削除しました。");
      setShowAssignModal(false);
      loadData();
    } catch (err) {
      setToastMessage(err.message || "配属の削除に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function executeCopyFromPreviousYear() {
    setConfirmCopy(false);
    setSaving(true);
    try {
      await apiRequest("copy-organizations-to-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_fiscal_year_id: activeFiscalYearId }),
      });
      setToastMessage("前年度からコピーしました。");
      loadData();
    } catch (err) {
      setToastMessage(err.message || "コピーに失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header"><h1 className="page-title">組織図管理</h1><p className="page-description">年度別の組織構成管理</p></div>
        <section className="card panel-card single-panel"><div className="card-body"><LoadingSpinner /></div></section>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div className="page-header"><h1 className="page-title">組織図管理</h1><p className="page-description">年度別の組織構成管理</p></div>
        <section className="card panel-card single-panel"><div className="card-body stack"><p className="message error">{error}</p></div></section>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">組織図管理</h1>
        <p className="page-description">年度別の組織構成管理</p>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog open={confirmCopy} title="コピー確認" message="前年度の組織構成をコピーしますか？"
        confirmLabel="コピーする" onConfirm={executeCopyFromPreviousYear} onCancel={() => setConfirmCopy(false)} />
      <ConfirmDialog open={confirmDeleteOrg} title="削除確認" message="この組織を削除しますか？"
        confirmLabel="削除する" confirmStyle={{ background: '#c53030', borderColor: '#c53030' }}
        onConfirm={executeDeleteOrg} onCancel={() => setConfirmDeleteOrg(false)} />
      <ConfirmDialog open={confirmDeleteAssignment} title="削除確認" message="この配属を削除しますか？"
        confirmLabel="削除する" confirmStyle={{ background: '#c53030', borderColor: '#c53030' }}
        onConfirm={executeDeleteAssignment} onCancel={() => setConfirmDeleteAssignment(false)} />

      {/* Org Modal */}
      {showOrgModal && (
        <div className="confirm-overlay" style={{ zIndex: 10001 }} onClick={() => setShowOrgModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{orgForm.id ? "組織編集" : "新規組織"}</h3>
              <button type="button" className="modal-close" onClick={() => setShowOrgModal(false)}>&times;</button>
            </div>
            <form className="modal-body" noValidate onSubmit={handleSaveOrg}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="org-name">組織名</label>
                  <input id="org-name" type="text" value={orgForm.org_name}
                    onChange={(e) => setOrgForm((prev) => ({ ...prev, org_name: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="org-type">種別</label>
                  <select id="org-type" value={orgForm.org_type}
                    onChange={(e) => setOrgForm((prev) => ({ ...prev, org_type: e.target.value }))}>
                    <option value="幹事会">幹事会</option>
                    <option value="委員会">委員会</option>
                    <option value="部会">部会</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="org-parent">親組織</label>
                  <select id="org-parent" value={orgForm.parent_id}
                    onChange={(e) => setOrgForm((prev) => ({ ...prev, parent_id: e.target.value }))}>
                    <option value="">-- なし (ルート) --</option>
                    {organizations.filter((o) => o.id !== orgForm.id).map((o) => (
                      <option key={o.id} value={o.id}>{o.org_name || "（名称未設定）"}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="org-sort">表示順</label>
                  <input id="org-sort" type="number" value={orgForm.sort_order}
                    onChange={(e) => setOrgForm((prev) => ({ ...prev, sort_order: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <button className="button" type="submit" disabled={saving}>保存</button>
                {orgForm.id && (
                  <button className="button ghost" type="button" style={{ color: "#c53030" }}
                    onClick={() => setConfirmDeleteOrg(true)} disabled={saving}>削除</button>
                )}
                <button className="button ghost" type="button" onClick={() => setShowOrgModal(false)}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="confirm-overlay" style={{ zIndex: 10001 }} onClick={() => setShowAssignModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{assignmentForm.id ? "配属編集" : "新規配属"} - {assignOrgName}</h3>
              <button type="button" className="modal-close" onClick={() => setShowAssignModal(false)}>&times;</button>
            </div>
            <form className="modal-body" noValidate onSubmit={handleSaveAssignment}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="assign-member">会員</label>
                  <select id="assign-member" value={assignmentForm.member_id}
                    onChange={(e) => setAssignmentForm((prev) => ({ ...prev, member_id: e.target.value }))}>
                    <option value="">-- 選択 --</option>
                    {memberOptions.map((m) => (
                      <option key={m.id} value={m.id}>{m.name || "（名前未設定）"}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="assign-role">役職</label>
                  <input id="assign-role" type="text" value={assignmentForm.role}
                    onChange={(e) => setAssignmentForm((prev) => ({ ...prev, role: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="assign-sort">表示順</label>
                  <input id="assign-sort" type="number" value={assignmentForm.sort_order}
                    onChange={(e) => setAssignmentForm((prev) => ({ ...prev, sort_order: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <button className="button" type="submit" disabled={saving}>保存</button>
                {assignmentForm.id && (
                  <button className="button ghost" type="button" style={{ color: "#c53030" }}
                    onClick={() => setConfirmDeleteAssignment(true)} disabled={saving}>削除</button>
                )}
                <button className="button ghost" type="button" onClick={() => setShowAssignModal(false)}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <p className="message" aria-live="polite" style={{ marginBottom: '0.75rem' }}>{toastMessage}</p>
      )}

      {/* Controls */}
      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <div className="panel-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ margin: 0, minWidth: 180 }}>
                <select value={activeFiscalYearId} onChange={handleFiscalYearChange} style={{ padding: '0.4rem 0.75rem' }}>
                  <option value="">-- 年度選択 --</option>
                  {fiscalYears.map((fy) => (
                    <option key={fy.id} value={fy.id}>
                      {fy.year_label || (fy.year ? `${fy.year}年度` : fy.id)}
                    </option>
                  ))}
                </select>
              </div>
              {yearLabel && <span className="pill">{yearLabel}</span>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="button" type="button" onClick={openNewOrg}>新規組織</button>
              <button className="button ghost" type="button" onClick={() => setConfirmCopy(true)} disabled={saving || organizations.length > 0}>
                前年度からコピー
              </button>
            </div>
          </div>

          {/* Full width org tree */}
          {orgTree.length === 0 ? (
            <p className="muted">組織データがありません。</p>
          ) : (
            <div className="stack">
              {orgTree.map(({ org, depth }, idx) => {
                const assignments = Array.isArray(org.assignments) ? org.assignments : [];
                const isExpanded = expandedOrgs.has(org.id);

                return (
                  <div
                    key={org.id}
                    style={{ marginLeft: `${depth * 24}px` }}
                    draggable
                    onDragStart={() => { dragOrgIdx.current = idx; }}
                    onDragEnter={() => { dragOverOrgIdx.current = idx; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={async () => {
                      if (dragOrgIdx.current === null || dragOverOrgIdx.current === null || dragOrgIdx.current === dragOverOrgIdx.current) return;
                      const flatOrdered = orgTree.map(item => item.org);
                      const [removed] = flatOrdered.splice(dragOrgIdx.current, 1);
                      flatOrdered.splice(dragOverOrgIdx.current, 0, removed);
                      const updated = flatOrdered.map((o, i) => ({ ...organizations.find(r => r.id === o.id) || o, sort_order: i }));
                      setOrganizations(updated);
                      dragOrgIdx.current = null;
                      dragOverOrgIdx.current = null;
                      try {
                        await apiRequest("batch-update-sort-order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ entity: "organizations", items: updated.map((o, i) => ({ id: o.id, sort_order: i })) }),
                        });
                      } catch { /* silent */ }
                    }}
                  >
                    <div
                      className="detail-card"
                      style={{ cursor: 'grab', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--text-secondary)', cursor: 'grab' }}>&#8942;</span>
                        <div>
                          <strong>{depth > 0 ? "└ " : ""}{displayValue(org.org_name)}</strong>
                          <span className="pill" style={{ marginLeft: 8, fontSize: '0.8em' }}>{displayValue(org.org_type)}</span>
                          <span className="muted" style={{ marginLeft: 8, fontSize: '0.85em' }}>配属 {assignments.length}名</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="text-link" type="button" onClick={() => toggleExpand(org.id)}>
                          {isExpanded ? "閉じる" : "配属表示"}
                        </button>
                        <button className="text-link" type="button" onClick={() => openEditOrg(org)}>編集</button>
                        <button className="text-link" type="button" onClick={() => openNewAssignment(org.id, org.org_name)}>配属追加</button>
                      </div>
                    </div>

                    {/* Expanded assignments */}
                    {isExpanded && (
                      <div style={{ marginLeft: '2rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                        {assignments.length === 0 ? (
                          <p className="muted" style={{ fontSize: '0.85em' }}>配属がありません。</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '4px' }}>
                            {assignments.map((a) => (
                              <div key={a.id} className="organization-assignment"
                                style={{ cursor: 'pointer' }}
                                onClick={() => openEditAssignment(org.id, org.org_name, a)}>
                                <strong>{displayValue(a.member_name)}</strong>
                                <span className="muted">{displayValue(a.role)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
