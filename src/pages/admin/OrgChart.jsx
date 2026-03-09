import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

/**
 * Build a tree from a flat list of organizations using parent_id.
 * Returns an array of { org, depth } in display order.
 */
function buildOrgTree(orgs) {
  const result = [];
  const childrenMap = {};

  // Group by parent_id
  for (const org of orgs) {
    const pid = org.parent_id || null;
    if (!childrenMap[pid]) childrenMap[pid] = [];
    childrenMap[pid].push(org);
  }

  // Sort children by sort_order
  for (const key of Object.keys(childrenMap)) {
    childrenMap[key].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  // DFS traversal
  function walk(parentId, depth) {
    const children = childrenMap[parentId] || [];
    for (const org of children) {
      result.push({ org, depth });
      walk(org.id, depth + 1);
    }
  }

  walk(null, 0);

  // If nothing was found under null, try empty string as root
  if (result.length === 0) {
    walk("", 0);
  }

  // Fallback: if tree building found nothing (no parent structure), list flat
  if (result.length === 0) {
    for (const org of orgs) {
      result.push({ org, depth: 0 });
    }
  }

  return result;
}

export default function OrgChart() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYearId = searchParams.get("fiscalYearId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Data from API
  const [fiscalYears, setFiscalYears] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [memberOptions, setMemberOptions] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);

  // UI state
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [orgForm, setOrgForm] = useState({
    id: "",
    org_name: "",
    org_type: "役員会",
    parent_id: "",
    sort_order: 0,
  });
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    id: "",
    member_id: "",
    role: "",
    sort_order: 0,
  });

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    const query = fiscalYearId
      ? `list-organization-chart-admin?fiscalYearId=${fiscalYearId}`
      : "list-organization-chart-admin";
    apiRequest(query)
      .then((result) => {
        const rawFY = result.fiscal_years;
        setFiscalYears(Array.isArray(rawFY) ? rawFY : []);
        const rawOrgs = result.organizations;
        setOrganizations(Array.isArray(rawOrgs) ? rawOrgs : []);
        const rawMemOpts = result.member_options;
        setMemberOptions(Array.isArray(rawMemOpts) ? rawMemOpts : []);
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

  // Populate org form when selection changes
  useEffect(() => {
    if (selectedOrgId) {
      const org = organizations.find((o) => o.id === selectedOrgId);
      if (org) {
        setOrgForm({
          id: org.id || "",
          org_name: org.org_name || "",
          org_type: org.org_type || "役員会",
          parent_id: org.parent_id || "",
          sort_order: org.sort_order || 0,
        });
        setSelectedAssignmentId(null);
        resetAssignmentForm();
      }
    }
  }, [selectedOrgId, organizations]);

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId) || null;
  const assignments = selectedOrg?.assignments || [];
  const activeFiscalYearId = selectedFiscalYear?.id || fiscalYearId;
  const orgTree = buildOrgTree(organizations);

  function resetOrgForm() {
    setSelectedOrgId(null);
    setOrgForm({ id: "", org_name: "", org_type: "役員会", parent_id: "", sort_order: 0 });
    setSelectedAssignmentId(null);
    resetAssignmentForm();
  }

  function resetAssignmentForm() {
    setSelectedAssignmentId(null);
    setAssignmentForm({ id: "", member_id: "", role: "", sort_order: 0 });
  }

  function handleFiscalYearChange(e) {
    const val = e.target.value;
    if (val) {
      setSearchParams({ fiscalYearId: val });
    } else {
      setSearchParams({});
    }
    resetOrgForm();
  }

  async function handleCopyFromPreviousYear() {
    if (!window.confirm("前年度の組織構成をコピーしますか？")) return;
    setSaving(true);
    try {
      await apiRequest("copy-organizations-to-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_fiscal_year_id: activeFiscalYearId }),
      });
      alert("前年度からコピーしました。");
      loadData();
    } catch (err) {
      alert(err.message || "コピーに失敗しました。");
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
      alert("組織を保存しました。");
      loadData();
    } catch (err) {
      alert(err.message || "組織の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOrg() {
    if (!orgForm.id) return;
    if (!window.confirm("この組織を削除しますか？")) return;
    setSaving(true);
    try {
      await apiRequest("delete-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orgForm.id }),
      });
      alert("組織を削除しました。");
      resetOrgForm();
      loadData();
    } catch (err) {
      alert(err.message || "組織の削除に失敗しました。");
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
      alert("配属を保存しました。");
      loadData();
    } catch (err) {
      alert(err.message || "配属の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAssignment() {
    if (!assignmentForm.id) return;
    if (!window.confirm("この配属を削除しますか？")) return;
    setSaving(true);
    try {
      await apiRequest("delete-org-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignmentForm.id }),
      });
      alert("配属を削除しました。");
      resetAssignmentForm();
      loadData();
    } catch (err) {
      alert(err.message || "配属の削除に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  function handleSelectAssignment(a) {
    setSelectedAssignmentId(a.id);
    setAssignmentForm({
      id: a.id || "",
      member_id: a.member_id || "",
      role: a.role || "",
      sort_order: a.sort_order || 0,
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
          <div className="card-body">
            <LoadingSpinner />
          </div>
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
          <div className="card-body stack">
            <p className="message error">{error}</p>
          </div>
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

      <div className="master-detail-layout">
        {/* Left panel: org tree */}
        <section className="card panel-card list-panel">
          <div className="card-body stack">
            <div className="panel-heading">
              <div>
                <h2>組織一覧</h2>
              </div>
            </div>
            {orgTree.length === 0 ? (
              <p className="muted">組織データがありません。</p>
            ) : (
              <div className="pending-list">
                {orgTree.map(({ org, depth }) => (
                  <button
                    key={org.id}
                    className={`pending-item${selectedOrgId === org.id ? " is-selected" : ""}`}
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                    onClick={() => setSelectedOrgId(org.id)}
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

        {/* Right panel: org editor + assignments */}
        <section className="card panel-card detail-panel">
          <div className="card-body stack">
            {/* 1. Header with year pill */}
            <div className="panel-heading">
              <div>
                <h2>組織編集</h2>
                {yearLabel && <span className="pill">{yearLabel}</span>}
              </div>
            </div>

            {/* 2. Fiscal year selector + copy button */}
            <div className="form-section">
              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label" htmlFor="fy-select">
                    年度選択
                  </label>
                  <select
                    id="fy-select"
                    className="field-input"
                    value={activeFiscalYearId}
                    onChange={handleFiscalYearChange}
                  >
                    <option value="">-- 選択 --</option>
                    {fiscalYears.map((fy) => (
                      <option key={fy.id} value={fy.id}>
                        {fy.year_label || fy.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field" style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={handleCopyFromPreviousYear}
                    disabled={saving || organizations.length > 0}
                  >
                    前年度からコピー
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Organization form */}
            <form className="form-section" onSubmit={handleSaveOrg}>
              <div
                className="panel-heading"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <h3 className="section-title" style={{ margin: 0 }}>
                  組織フォーム
                </h3>
                <button className="btn btn-secondary" type="button" onClick={resetOrgForm}>
                  新規組織
                </button>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label" htmlFor="org-name">
                    組織名
                  </label>
                  <input
                    id="org-name"
                    className="field-input"
                    type="text"
                    value={orgForm.org_name}
                    onChange={(e) =>
                      setOrgForm((prev) => ({ ...prev, org_name: e.target.value }))
                    }
                  />
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="org-type">
                    種別
                  </label>
                  <select
                    id="org-type"
                    className="field-input"
                    value={orgForm.org_type}
                    onChange={(e) =>
                      setOrgForm((prev) => ({ ...prev, org_type: e.target.value }))
                    }
                  >
                    <option value="役員会">役員会</option>
                    <option value="委員会">委員会</option>
                    <option value="部会">部会</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="org-parent">
                    親組織
                  </label>
                  <select
                    id="org-parent"
                    className="field-input"
                    value={orgForm.parent_id}
                    onChange={(e) =>
                      setOrgForm((prev) => ({ ...prev, parent_id: e.target.value }))
                    }
                  >
                    <option value="">-- なし (ルート) --</option>
                    {organizations
                      .filter((o) => o.id !== orgForm.id)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.org_name || o.id}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="org-sort">
                    表示順
                  </label>
                  <input
                    id="org-sort"
                    className="field-input"
                    type="number"
                    value={orgForm.sort_order}
                    onChange={(e) =>
                      setOrgForm((prev) => ({ ...prev, sort_order: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="actions" style={{ marginTop: "0.75rem", gap: "0.5rem" }}>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  保存
                </button>
                {orgForm.id && (
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={handleDeleteOrg}
                    disabled={saving}
                  >
                    削除
                  </button>
                )}
              </div>
            </form>

            {/* 4. Assignment list for selected org */}
            {selectedOrg && (
              <div className="form-section">
                <h3 className="section-title">
                  配属一覧 ({displayValue(selectedOrg.org_name)})
                </h3>
                {assignments.length === 0 ? (
                  <p className="muted">配属がありません。</p>
                ) : (
                  <div className="pending-list">
                    {assignments.map((a) => (
                      <button
                        key={a.id}
                        className={`pending-item${
                          selectedAssignmentId === a.id ? " is-selected" : ""
                        }`}
                        onClick={() => handleSelectAssignment(a)}
                      >
                        <strong>{displayValue(a.member_name)}</strong>
                        <span className="pending-date">{displayValue(a.role)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. Assignment form */}
            <form className="form-section" onSubmit={handleSaveAssignment}>
              <div
                className="panel-heading"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <h3 className="section-title" style={{ margin: 0 }}>
                  配属フォーム
                </h3>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={resetAssignmentForm}
                  disabled={!selectedOrgId}
                >
                  新規配属
                </button>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label" htmlFor="assign-member">
                    会員
                  </label>
                  <select
                    id="assign-member"
                    className="field-input"
                    value={assignmentForm.member_id}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, member_id: e.target.value }))
                    }
                    disabled={!selectedOrgId}
                  >
                    <option value="">-- 選択 --</option>
                    {memberOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="assign-role">
                    役職
                  </label>
                  <input
                    id="assign-role"
                    className="field-input"
                    type="text"
                    value={assignmentForm.role}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, role: e.target.value }))
                    }
                    disabled={!selectedOrgId}
                  />
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="assign-sort">
                    表示順
                  </label>
                  <input
                    id="assign-sort"
                    className="field-input"
                    type="number"
                    value={assignmentForm.sort_order}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, sort_order: e.target.value }))
                    }
                    disabled={!selectedOrgId}
                  />
                </div>
              </div>

              <div className="actions" style={{ marginTop: "0.75rem", gap: "0.5rem" }}>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saving || !selectedOrgId}
                >
                  保存
                </button>
                {assignmentForm.id && (
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={handleDeleteAssignment}
                    disabled={saving}
                  >
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
