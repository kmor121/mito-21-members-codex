import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

const MEMBER_TYPES = ["正会員", "賛助会員", "OB会員", "名誉顧問"];
const STATUSES = ["活動中", "休会", "退会"];

const EDITABLE_FIELDS = ["company_name", "member_type", "status", "email", "mobile_phone"];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function MemberList() {
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Filter state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [memberType, setMemberType] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [organizationId, setOrganizationId] = useState("");

  // Inline editing
  const [editMode, setEditMode] = useState(false);
  const [editingRows, setEditingRows] = useState({});
  const [activeCell, setActiveCell] = useState(null); // { memberId, field }
  const [changedCells, setChangedCells] = useState(new Set()); // "memberId:field"
  const saveTimerRef = useRef({});
  const cellRefs = useRef({});

  // Debounced search query
  const debouncedQ = useDebounce(q, 300);

  const loadMembers = useCallback(async (filters) => {
    setError("");
    setMessage("読み込み中...");
    setLoading(true);

    try {
      const [allMembers, fiscalYears, orgs, assignments] = await Promise.all([
        base44.entities.Member.filter({ approval_status: "承認済" }),
        base44.entities.FiscalYear.list(),
        base44.entities.Organization.list(),
        base44.entities.OrgAssignment.list(),
      ]);

      const currentFy = fiscalYears.find((fy) => fy.is_current === true);
      const currentFyId = currentFy?.id || "";

      // Build org options
      const currentOrgs = currentFyId ? orgs.filter((o) => o.fiscal_year_id === currentFyId) : orgs;
      const opts = currentOrgs.map((o) => ({ id: o.id, name: o.name }));
      if (opts.length > 0) setOrgOptions(opts);

      // Build assignment map: memberId -> [{org_name, role}]
      const currentAssignments = currentFyId ? assignments.filter((a) => a.fiscal_year_id === currentFyId) : assignments;
      const orgMap = {};
      for (const o of orgs) orgMap[o.id] = o.name || "";
      const assignMap = {};
      for (const a of currentAssignments) {
        if (!assignMap[a.member_id]) assignMap[a.member_id] = [];
        assignMap[a.member_id].push({ org_name: orgMap[a.organization_id] || "", role: a.role || "" });
      }

      // Enrich and filter
      let list = allMembers.map((m) => ({
        ...m,
        org_assignments: assignMap[m.id] || [],
      }));

      // Apply filters
      if (filters.q) {
        const qLower = filters.q.toLowerCase();
        list = list.filter((m) => {
          const haystack = [m.name_kanji, m.name_kana, m.company_name, m.email, m.member_number].join(" ").toLowerCase();
          return haystack.includes(qLower);
        });
      }
      if (filters.status) list = list.filter((m) => m.status === filters.status);
      if (filters.member_type) list = list.filter((m) => m.member_type === filters.member_type);
      if (filters.approval_status) list = list.filter((m) => m.approval_status === filters.approval_status);
      if (filters.is_new) list = list.filter((m) => m.is_new === true);
      if (filters.organization_id) {
        const orgId = filters.organization_id;
        const memberIdsInOrg = new Set(currentAssignments.filter((a) => a.organization_id === orgId).map((a) => a.member_id));
        list = list.filter((m) => memberIdsInOrg.has(m.id));
      }

      list.sort((a, b) => (a.name_kana || "").localeCompare(b.name_kana || "", "ja"));

      setMembers(list);
      setMessage(`${list.length}件の会員を表示中`);
    } catch (err) {
      setMembers([]);
      setError(err.message || "会員一覧の取得に失敗しました。");
      setMessage("");
    } finally {
      setLoading(false);
    }
  }, []);

  function getCurrentFilters() {
    return {
      q: q.trim(),
      status,
      member_type: memberType === "新入会員" ? "" : memberType,
      approval_status: approvalStatus,
      organization_id: organizationId,
      is_new: memberType === "新入会員" ? true : undefined,
    };
  }

  useEffect(() => {
    loadMembers({});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMembers(getCurrentFilters());
  }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMembers(getCurrentFilters());
  }, [status, memberType, approvalStatus, organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleReset() {
    setQ("");
    setStatus("");
    setMemberType("");
    setApprovalStatus("");
    setOrganizationId("");
    loadMembers({});
  }

  // Inline editing helpers
  function handleCellChange(memberId, field, value) {
    setEditingRows((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] || {}), [field]: value },
    }));
    setChangedCells((prev) => new Set(prev).add(`${memberId}:${field}`));

    // Debounced auto-save (1 second)
    if (saveTimerRef.current[memberId]) {
      clearTimeout(saveTimerRef.current[memberId]);
    }
    saveTimerRef.current[memberId] = setTimeout(() => {
      saveRow(memberId);
    }, 1000);
  }

  async function saveRow(memberId) {
    const changes = editingRows[memberId];
    if (!changes || Object.keys(changes).length === 0) return;

    try {
      await apiRequest("update-member-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: memberId,
          allow_partial_profile_update: true,
          changed_by: "管理者",
          changed_by_role: "admin",
          ...changes,
        }),
      });

      // Update local state
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, ...changes } : m))
      );
      setEditingRows((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      // Clear changed indicators for this member
      setChangedCells((prev) => {
        const next = new Set(prev);
        for (const key of prev) {
          if (key.startsWith(`${memberId}:`)) next.delete(key);
        }
        return next;
      });
    } catch (err) {
      setError(`保存に失敗: ${err.message}`);
    }
  }

  function getCellValue(member, field) {
    if (editingRows[member.id] && field in editingRows[member.id]) {
      return editingRows[member.id][field];
    }
    return member[field] || "";
  }

  function handleCellClick(memberId, field) {
    if (!editMode) return;
    setActiveCell({ memberId, field });
    // Focus the input after render
    requestAnimationFrame(() => {
      const key = `${memberId}:${field}`;
      if (cellRefs.current[key]) {
        cellRefs.current[key].focus();
        if (cellRefs.current[key].select) cellRefs.current[key].select();
      }
    });
  }

  function handleCellKeyDown(e, memberId, field) {
    const memberIdx = members.findIndex((m) => m.id === memberId);
    const fieldIdx = EDITABLE_FIELDS.indexOf(field);

    if (e.key === "Tab") {
      e.preventDefault();
      const nextFieldIdx = e.shiftKey ? fieldIdx - 1 : fieldIdx + 1;
      if (nextFieldIdx >= 0 && nextFieldIdx < EDITABLE_FIELDS.length) {
        handleCellClick(memberId, EDITABLE_FIELDS[nextFieldIdx]);
      } else if (!e.shiftKey && memberIdx + 1 < members.length) {
        handleCellClick(members[memberIdx + 1].id, EDITABLE_FIELDS[0]);
      } else if (e.shiftKey && memberIdx - 1 >= 0) {
        handleCellClick(members[memberIdx - 1].id, EDITABLE_FIELDS[EDITABLE_FIELDS.length - 1]);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (memberIdx + 1 < members.length) {
        handleCellClick(members[memberIdx + 1].id, field);
      }
    } else if (e.key === "Escape") {
      setActiveCell(null);
    }
  }

  function isCellActive(memberId, field) {
    return activeCell?.memberId === memberId && activeCell?.field === field;
  }

  function isCellChanged(memberId, field) {
    return changedCells.has(`${memberId}:${field}`);
  }

  function setCellRef(memberId, field, el) {
    cellRefs.current[`${memberId}:${field}`] = el;
  }

  function renderEditCell(member, field) {
    const isActive = isCellActive(member.id, field);
    const isChanged = isCellChanged(member.id, field);
    const cellStyle = {
      background: isChanged ? 'rgba(255, 255, 200, 0.5)' : undefined,
      padding: 0,
    };

    if (field === "member_type") {
      return (
        <td style={cellStyle} onClick={() => handleCellClick(member.id, field)}>
          <select
            ref={(el) => setCellRef(member.id, field, el)}
            className="inline-edit-input"
            value={getCellValue(member, field)}
            onChange={(e) => handleCellChange(member.id, field, e.target.value)}
            onKeyDown={(e) => handleCellKeyDown(e, member.id, field)}
            style={{ background: isChanged ? 'rgba(255, 255, 200, 0.5)' : undefined }}
          >
            {MEMBER_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </td>
      );
    }
    if (field === "status") {
      return (
        <td style={cellStyle} onClick={() => handleCellClick(member.id, field)}>
          <select
            ref={(el) => setCellRef(member.id, field, el)}
            className="inline-edit-input"
            value={getCellValue(member, field)}
            onChange={(e) => handleCellChange(member.id, field, e.target.value)}
            onKeyDown={(e) => handleCellKeyDown(e, member.id, field)}
            style={{ background: isChanged ? 'rgba(255, 255, 200, 0.5)' : undefined }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </td>
      );
    }

    // Text/email/tel input
    if (!isActive) {
      return (
        <td
          style={{ ...cellStyle, padding: '0.5rem 0.75rem', cursor: 'cell' }}
          onClick={() => handleCellClick(member.id, field)}
        >
          {getCellValue(member, field) || "-"}
        </td>
      );
    }

    const inputType = field === "email" ? "email" : field === "mobile_phone" ? "tel" : "text";
    return (
      <td style={cellStyle} onClick={() => handleCellClick(member.id, field)}>
        <input
          ref={(el) => setCellRef(member.id, field, el)}
          type={inputType}
          className="inline-edit-input"
          value={getCellValue(member, field)}
          onChange={(e) => handleCellChange(member.id, field, e.target.value)}
          onKeyDown={(e) => handleCellKeyDown(e, member.id, field)}
          onBlur={() => {
            // Small delay to allow Tab to work
            setTimeout(() => {
              if (activeCell?.memberId === member.id && activeCell?.field === field) {
                setActiveCell(null);
              }
            }, 100);
          }}
          style={{ background: isChanged ? 'rgba(255, 255, 200, 0.5)' : undefined }}
        />
      </td>
    );
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">会員一覧</h1>
          <p className="page-description">全会員の検索・管理</p>
        </div>
        <button className="button" type="button" onClick={() => navigate("/admin/members/new")}>
          新規会員登録
        </button>
      </div>

      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <div className="filter-grid">
            <div className="field field-span-2">
              <label htmlFor="ml-search">検索</label>
              <input
                id="ml-search"
                name="q"
                type="text"
                placeholder="氏名 / フリガナ / 会社名 / メール"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="ml-status">ステータス</label>
              <select id="ml-status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">すべて</option>
                <option value="活動中">活動中</option>
                <option value="休会">休会</option>
                <option value="退会">退会</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ml-member-type">会員種別</label>
              <select id="ml-member-type" name="member_type" value={memberType} onChange={(e) => setMemberType(e.target.value)}>
                <option value="">すべて</option>
                <option value="正会員">正会員</option>
                <option value="賛助会員">賛助会員</option>
                <option value="OB会員">OB会員</option>
                <option value="名誉顧問">名誉顧問</option>
                <option value="新入会員">新入会員</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ml-approval-status">承認状態</label>
              <select id="ml-approval-status" name="approval_status" value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)}>
                <option value="">すべて</option>
                <option value="承認済">承認済</option>
                <option value="申請中">申請中</option>
                <option value="却下">却下</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ml-org">所属</label>
              <select id="ml-org" name="organization_id" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                <option value="">すべて</option>
                {orgOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-actions">
              <button className="button ghost" type="button" onClick={handleReset}>リセット</button>
              <button
                className={`button${editMode ? "" : " ghost"}`}
                type="button"
                onClick={() => { setEditMode((v) => !v); setActiveCell(null); setChangedCells(new Set()); }}
              >
                {editMode ? "編集モード ON" : "編集モード"}
              </button>
            </div>
          </div>

          <div className="panel-heading compact">
            <p className={`message${error ? " error" : ""}`} aria-live="polite">
              {error || message}
            </p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : members.length === 0 && !error ? (
            <p className="empty-state">該当する会員はいません。</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>番号</th>
                    <th>氏名</th>
                    <th>会社名</th>
                    <th>所属・役職</th>
                    <th>会員種別</th>
                    <th>ステータス</th>
                    <th>メール</th>
                    <th>携帯</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const assigns = Array.isArray(m.org_assignments) ? m.org_assignments : [];
                    const orgText = assigns
                      .map((a) => `${a.org_name || ""}${a.role ? "/" + a.role : ""}`)
                      .join(", ");

                    return (
                      <tr
                        key={m.id}
                        className={editMode ? "" : "clickable-row"}
                        style={{ cursor: editMode ? "default" : "pointer" }}
                        onClick={editMode ? undefined : () => navigate(`/admin/members/${m.id}`)}
                      >
                        <td>{displayValue(m.member_number)}</td>
                        <td>
                          {displayValue(m.name_kanji)}
                          {m.is_new && <span className="pill pill-info" style={{ marginLeft: 4, fontSize: '0.75em' }}>新入</span>}
                          {m.is_graduate && <span className="pill pill-warning" style={{ marginLeft: 4, fontSize: '0.75em' }}>卒業生</span>}
                        </td>
                        {editMode ? (
                          <>
                            {renderEditCell(m, "company_name")}
                            <td>{orgText || "-"}</td>
                            {renderEditCell(m, "member_type")}
                            {renderEditCell(m, "status")}
                            {renderEditCell(m, "email")}
                            {renderEditCell(m, "mobile_phone")}
                          </>
                        ) : (
                          <>
                            <td>{displayValue(m.company_name)}</td>
                            <td>{orgText || "-"}</td>
                            <td><span className="pill">{displayValue(m.member_type)}</span></td>
                            <td><span className="pill">{displayValue(m.status)}</span></td>
                            <td>{displayValue(m.email)}</td>
                            <td>{displayValue(m.mobile_phone)}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
