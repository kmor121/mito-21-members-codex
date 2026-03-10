import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "../../api/base44Client";
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

  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [orgForm, setOrgForm] = useState({
    id: "", org_name: "", org_type: "幹事会", parent_id: "", sort_order: 0,
  });
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    id: "", member_id: "", role: "", sort_order: 0,
  });

  const dragOrgIdx = useRef(null);
  const dragOverOrgIdx = useRef(null);

  // Confirm dialog states
  const [confirmCopy, setConfirmCopy] = useState(false);
  const [confirmDeleteOrg, setConfirmDeleteOrg] = useState(false);
  const [confirmDeleteAssignment, setConfirmDeleteAssignment] = useState(false);

  // Toast auto-hide
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(""), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    const query = fiscalYearId
      ? `list-organization-chart-admin?fiscalYearId=${fiscalYearId}`
      : "list-organization-chart-admin";
    apiRequest(query)
      .then((result) => {
        setFiscalYears(Array.isArray(result.fiscal_years) ? result.fiscal_years : []);
        setOrganizations(Array.isArray(result.organizations) ? result.organizations : []);
        setMemberOptions(Array.isArray(result.member_options) ? result.member_options : []);
        setSelectedFiscalYear(result.selected_fiscal_year || null);
      })
      .catch((err) => {
        setError(err.message || "組織図データの取得に失敗しました。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fiscalYearId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedOrgId) {
      const org = organizations.find((o) => o.id === selectedOrgId);
      if (org) {
        setOrgForm({
          id: org.id || "", org_name: org.org_name || "", org_type: org.org_type || "幹事会",
          parent_id: org.parent_id || "", sort_order: org.sort_order || 0,
        });
        setSelectedAssignmentId(null);
        resetAssignmentForm();
      }
    }
  }, [selectedOrgId, organizations]);

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId) || null;
  const rawAssignments = selectedOrg?.assignments;
  const assignments = Array.isArray(rawAssignments) ? rawAssignments : [];
  const activeFiscalYearId = selectedFiscalYear?.id || fiscalYearId;
  const orgTree = useMemo(() => buildOrgTree(organizations), [organizations]);

  function resetOrgForm() {
    setSelectedOrgId(null);
    setOrgForm({ id: "", org_name: "", org_type: "幹事会", parent_id: "", sort_order: 0 });
    setSelectedAssignmentId(null);
    resetAssignmentForm();
  }

  function resetAssignmentForm() {
    setSelectedAssignmentId(null);
    setAssignmentForm({ id: "", member_id: "", role: "", sort_order: 0 });
  }

  function handleFiscalYearChange(e) {
    const val = e.target.value;
    if (val) setSearchParams({ fiscalYearId: val });
    else setSearchParams({});
    resetOrgForm();
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
      resetOrgForm();
      loadData();
    } catch (err) {
      setToastMessage(err.message || "組織の削除に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAssignment(e) {
    e.preventDefault();
    if (!selectedOrgId) return;
    setSaving(true);
    try {
      await apiRequest("save-org-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...assignmentForm,
          organization_id: selectedOrgId,
          sort_order: Number(assignmentForm.sort_order) || 0,
        }),
      });
      setToastMessage("配属を保存しました。");
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
      resetAssignmentForm();
      loadData();
    } catch (err) {
      setToastMessage(err.message || "配属の削除に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  function handleSelectAssignment(a) {
    setSelectedAssignmentId(a.id);
    setAssignmentForm({
      id: a.id || "", member_id: a.member_id || "", role: a.role || "", sort_order: a.sort_order || 0,
    });
  }

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">組織図管理</h1>
          <p className="page-description">年度別の組織構成管理</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body"><LoadingSpinner /></div>
        </section>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">組織図管理</h1>
          <p className="page-description">年度別の組織構成管理</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack"><p className="message error">{error}</p></div>
        </section>
      </section>
    );
  }

  const yearLabel = selectedFiscalYear?.year_label || "";

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">組織図管理</h1>
        <p className="page-description">年度別の組織構成管理</p>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmCopy}
        title="コピー確認"
        message="前年度の組織構成をコピーしますか？"
        confirmLabel="コピーする"
        onConfirm={executeCopyFromPreviousYear}
        onCancel={() => setConfirmCopy(false)}
      />
      <ConfirmDialog
        open={confirmDeleteOrg}
        title="削除確認"
        message="この組織を削除しますか？"
        confirmLabel="削除する"
        confirmStyle={{ background: '#c53030', borderColor: '#c53030' }}
        onConfirm={executeDeleteOrg}
        onCancel={() => setConfirmDeleteOrg(false)}
      />
      <ConfirmDialog
        open={confirmDeleteAssignment}
        title="削除確認"
        message="この配属を削除しますか？"
        confirmLabel="削除する"
        confirmStyle={{ background: '#c53030', borderColor: '#c53030' }}
        onConfirm={executeDeleteAssignment}
        onCancel={() => setConfirmDeleteAssignment(false)}
      />

      {toastMessage && (
        <p className="message" aria-live="polite" style={{ marginBottom: '0.75rem' }}>{toastMessage}</p>
      )}

      <div className="master-detail-layout">
        {/* Left panel: org tree */}
        <section className="card panel-card list-panel">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>組織一覧</h2></div></div>
            {orgTree.length === 0 ? (
              <p className="muted">組織データがありません。</p>
            ) : (
              <div className="pending-list">
                {orgTree.map(({ org, depth }, idx) => (
                  <button
                    key={org.id}
                    className={`pending-item${selectedOrgId === org.id ? " is-selected" : ""}`}
                    style={{ paddingLeft: `${12 + depth * 16}px`, cursor: 'grab' }}
                    onClick={() => setSelectedOrgId(org.id)}
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
                    <span className="pending-date">
                      {displayValue(org.org_type)} / 配属 {(org.assignments || []).length}名
                    </span>
                    <strong>
                      {depth > 0 ? "└ " : ""}
                      {displayValue(org.org_name)}
                    </strong>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right panel */}
        <section className="card panel-card detail-panel">
          <div className="card-body stack">
            <div className="panel-heading">
              <div>
                <h2>組織編集</h2>
                {yearLabel && <span className="pill">{yearLabel}</span>}
              </div>
            </div>

            <div className="form-section">
              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label" htmlFor="fy-select">年度選択</label>
                  <select id="fy-select" className="field-input" value={activeFiscalYearId} onChange={handleFiscalYearChange}>
                    <option value="">-- 選択 --</option>
                    {fiscalYears.map((fy) => (
                      <option key={fy.id} value={fy.id}>
                        {fy.year_label || (fy.year ? `${fy.year}年度` : fy.id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field" style={{ display: "flex", alignItems: "flex-end" }}>
                  <button className="button ghost" type="button" onClick={() => setConfirmCopy(true)} disabled={saving || organizations.length > 0}>
                    前年度からコピー
                  </button>
                </div>
              </div>
            </div>

            <form className="form-section" onSubmit={handleSaveOrg}>
              <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="section-title" style={{ margin: 0 }}>組織フォーム</h3>
                <button className="button ghost" type="button" onClick={resetOrgForm}>新規組織</button>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label" htmlFor="org-name">組織名</label>
                  <input id="org-name" className="field-input" type="text" value={orgForm.org_name}
                    onChange={(e) => setOrgForm((prev) => ({ ...prev, org_name: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="org-type">種別</label>
                  <select id="org-type" className="field-input" value={orgForm.org_type}
                    onChange={(e) => setOrgForm((prev) => ({ ...prev, org_type: e.target.value }))}>
                    <option value="幹事会">幹事会</option>
                    <option value="委員会">委員会</option>
                    <option value="部会">部会</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="org-parent">親組織</label>
                  <select id="org-parent" className="field-input" value={orgForm.parent_id}
                    onChange={(e) => setOrgForm((prev) => ({ ...prev, parent_id: e.target.value }))}>
                    <option value="">-- なし (ルート) --</option>
                    {organizations.filter((o) => o.id !== orgForm.id).map((o) => (
                      <option key={o.id} value={o.id}>{o.org_name || "（名称未設定）"}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="org-sort">表示順</label>
                  <input id="org-sort" className="field-input" type="number" value={orgForm.sort_order}
                    onChange={(e) => setOrgForm((prev) => ({ ...prev, sort_order: e.target.value }))} />
                </div>
              </div>

              <div className="actions" style={{ marginTop: "0.75rem", gap: "0.5rem" }}>
                <button className="button" type="submit" disabled={saving}>保存</button>
                {orgForm.id && (
                  <button className="button ghost" type="button" style={{ color: "#c53030" }}
                    onClick={() => setConfirmDeleteOrg(true)} disabled={saving}>
                    削除
                  </button>
                )}
              </div>
            </form>

            {selectedOrg && (
              <div className="form-section">
                <h3 className="section-title">配属一覧 ({displayValue(selectedOrg.org_name)})</h3>
                {assignments.length === 0 ? (
                  <p className="muted">配属がありません。</p>
                ) : (
                  <div className="pending-list">
                    {assignments.map((a) => (
                      <button key={a.id}
                        className={`pending-item${selectedAssignmentId === a.id ? " is-selected" : ""}`}
                        onClick={() => handleSelectAssignment(a)}>
                        <strong>{displayValue(a.member_name)}</strong>
                        <span className="pending-date">{displayValue(a.role)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form className="form-section" onSubmit={handleSaveAssignment}>
              <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="section-title" style={{ margin: 0 }}>配属フォーム</h3>
                <button className="button ghost" type="button" onClick={resetAssignmentForm} disabled={!selectedOrgId}>新規配属</button>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label" htmlFor="assign-member">会員</label>
                  <select id="assign-member" className="field-input" value={assignmentForm.member_id}
                    onChange={(e) => setAssignmentForm((prev) => ({ ...prev, member_id: e.target.value }))}
                    disabled={!selectedOrgId}>
                    <option value="">-- 選択 --</option>
                    {memberOptions.map((m) => (
                      <option key={m.id} value={m.id}>{m.name || "（名前未設定）"}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="assign-role">役職</label>
                  <input id="assign-role" className="field-input" type="text" value={assignmentForm.role}
                    onChange={(e) => setAssignmentForm((prev) => ({ ...prev, role: e.target.value }))}
                    disabled={!selectedOrgId} />
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="assign-sort">表示順</label>
                  <input id="assign-sort" className="field-input" type="number" value={assignmentForm.sort_order}
                    onChange={(e) => setAssignmentForm((prev) => ({ ...prev, sort_order: e.target.value }))}
                    disabled={!selectedOrgId} />
                </div>
              </div>

              <div className="actions" style={{ marginTop: "0.75rem", gap: "0.5rem" }}>
                <button className="button" type="submit" disabled={saving || !selectedOrgId}>保存</button>
                {assignmentForm.id && (
                  <button className="button ghost" type="button" style={{ color: "#c53030" }}
                    onClick={() => setConfirmDeleteAssignment(true)} disabled={saving}>
                    削除
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      </div>
    </section>
  );
}
