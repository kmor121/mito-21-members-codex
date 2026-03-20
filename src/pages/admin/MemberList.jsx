import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, base44, invalidateReadCache } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { fullName, fullNameKana } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

const MEMBER_TYPES = ["正会員", "賛助会員", "OB会員", "名誉顧問"];
const MEMBER_TYPE_FILTERS = ["全て", "正会員", "賛助会員", "OB会員", "名誉顧問", "新入会員"];
const STATUS_FILTERS = ["全て", "活動中", "休会", "退会"];
const STATUSES = ["活動中", "休会", "退会"];
const EDITABLE_FIELDS = ["company_name", "member_type", "status", "email", "mobile_phone"];
const PAGE_SIZE = 30;

const MEMBER_TYPE_BADGE = {
  "正会員": { bg: "var(--color-accent-light)", color: "var(--color-accent)" },
  "賛助会員": { bg: "#ecfdf5", color: "#059669" },
  "OB会員": { bg: "#f1f5f9", color: "#64748b" },
  "名誉顧問": { bg: "#fffbeb", color: "#d97706" },
};

const STATUS_BADGE = {
  "活動中": { bg: "#ecfdf5", color: "#059669" },
  "休会": { bg: "#fffbeb", color: "#d97706" },
  "退会": { bg: "#fee2e2", color: "#991b1b" },
};

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
  const isMobile = useIsMobile();

  const [members, setMembers] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("全て");
  const [memberType, setMemberType] = useState("全て");
  const [organizationId, setOrganizationId] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Inline editing
  const [editMode, setEditMode] = useState(false);
  const [editingRows, setEditingRows] = useState({});
  const [activeCell, setActiveCell] = useState(null);
  const [changedCells, setChangedCells] = useState(new Set());
  const saveTimerRef = useRef({});
  const cellRefs = useRef({});

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteChecked, setInviteChecked] = useState(new Set());
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  // Mobile filter toggle
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search query
  const debouncedQ = useDebounce(q, 300);

  function showToast(message) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  const loadMembers = useCallback(async (filters) => {
    setError("");
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

      // Build org options from current year's assignments
      const currentAssignments = currentFyId ? assignments.filter((a) => a.fiscal_year_id === currentFyId) : assignments;
      const orgIdsInCurrentFy = new Set(currentAssignments.map(a => a.organization_id));
      const currentOrgs = orgs.filter(o => orgIdsInCurrentFy.has(o.id));
      const opts = currentOrgs.map((o) => ({ id: o.id, name: o.org_name || o.name || '' }));
      if (opts.length > 0) setOrgOptions(opts);

      // Build assignment map: memberId -> [{org_name, role}]
      const orgMap = {};
      for (const o of orgs) orgMap[o.id] = o.org_name || o.name || "";
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
          const haystack = [m.last_name, m.first_name, m.last_name_kana, m.first_name_kana, m.company_name, m.email, m.member_number].join(" ").toLowerCase();
          return haystack.includes(qLower);
        });
      }
      if (filters.status) list = list.filter((m) => m.status === filters.status);
      if (filters.member_type) list = list.filter((m) => m.member_type === filters.member_type);
      if (filters.is_new) list = list.filter((m) => m.is_new === true);
      if (filters.organization_id) {
        const orgId = filters.organization_id;
        const memberIdsInOrg = new Set(currentAssignments.filter((a) => a.organization_id === orgId).map((a) => a.member_id));
        list = list.filter((m) => memberIdsInOrg.has(m.id));
      }

      list.sort((a, b) => (a.last_name_kana || "").localeCompare(b.last_name_kana || "", "ja"));

      setMembers(list);
    } catch (err) {
      setMembers([]);
      setError(err.message || "会員一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  function getCurrentFilters() {
    return {
      q: q.trim(),
      status: status === "全て" ? "" : status,
      member_type: memberType === "全て" ? "" : (memberType === "新入会員" ? "" : memberType),
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
    setCurrentPage(1);
  }, [status, memberType, organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pagination computations
  const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return members.slice(start, start + PAGE_SIZE);
  }, [members, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQ]);

  function handleReset() {
    setQ("");
    setStatus("全て");
    setMemberType("全て");
    setOrganizationId("");
    setCurrentPage(1);
    loadMembers({});
  }

  // Inline editing helpers
  function handleCellChange(memberId, field, value) {
    setEditingRows((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] || {}), [field]: value },
    }));
    setChangedCells((prev) => new Set(prev).add(`${memberId}:${field}`));

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

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, ...changes } : m))
      );
      setEditingRows((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      setChangedCells((prev) => {
        const next = new Set(prev);
        for (const key of prev) {
          if (key.startsWith(`${memberId}:`)) next.delete(key);
        }
        return next;
      });
      showToast("保存しました");
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
    requestAnimationFrame(() => {
      const key = `${memberId}:${field}`;
      if (cellRefs.current[key]) {
        cellRefs.current[key].focus();
        if (cellRefs.current[key].select) cellRefs.current[key].select();
      }
    });
  }

  function handleCellKeyDown(e, memberId, field) {
    const memberIdx = paginatedMembers.findIndex((m) => m.id === memberId);
    const fieldIdx = EDITABLE_FIELDS.indexOf(field);

    if (e.key === "Tab") {
      e.preventDefault();
      const nextFieldIdx = e.shiftKey ? fieldIdx - 1 : fieldIdx + 1;
      if (nextFieldIdx >= 0 && nextFieldIdx < EDITABLE_FIELDS.length) {
        handleCellClick(memberId, EDITABLE_FIELDS[nextFieldIdx]);
      } else if (!e.shiftKey && memberIdx + 1 < paginatedMembers.length) {
        handleCellClick(paginatedMembers[memberIdx + 1].id, EDITABLE_FIELDS[0]);
      } else if (e.shiftKey && memberIdx - 1 >= 0) {
        handleCellClick(paginatedMembers[memberIdx - 1].id, EDITABLE_FIELDS[EDITABLE_FIELDS.length - 1]);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (memberIdx + 1 < paginatedMembers.length) {
        handleCellClick(paginatedMembers[memberIdx + 1].id, field);
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

  // Pagination page numbers
  function getPageNumbers() {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

  function renderMemberTypeBadge(type) {
    const style = MEMBER_TYPE_BADGE[type] || { bg: "#f1f5f9", color: "#64748b" };
    return (
      <span style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        whiteSpace: "nowrap",
      }}>
        {type || "-"}
      </span>
    );
  }

  function renderStatusBadge(st) {
    const style = STATUS_BADGE[st] || { bg: "#f1f5f9", color: "#64748b" };
    return (
      <span style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        whiteSpace: "nowrap",
      }}>
        {st || "-"}
      </span>
    );
  }

  function renderEditCell(member, field) {
    const isActive = isCellActive(member.id, field);
    const isChanged = isCellChanged(member.id, field);
    const cellStyle = {
      background: isChanged ? "rgba(255, 255, 200, 0.5)" : undefined,
      padding: 0,
    };

    if (field === "member_type") {
      return (
        <td style={cellStyle} onClick={() => handleCellClick(member.id, field)}>
          <select
            ref={(el) => setCellRef(member.id, field, el)}
            value={getCellValue(member, field)}
            onChange={(e) => handleCellChange(member.id, field, e.target.value)}
            onKeyDown={(e) => handleCellKeyDown(e, member.id, field)}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "2px solid #fef3c7",
              borderRadius: "4px",
              fontSize: "13px",
              background: isChanged ? "rgba(255, 255, 200, 0.5)" : "#fffef5",
              outline: "none",
            }}
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
            value={getCellValue(member, field)}
            onChange={(e) => handleCellChange(member.id, field, e.target.value)}
            onKeyDown={(e) => handleCellKeyDown(e, member.id, field)}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "2px solid #fef3c7",
              borderRadius: "4px",
              fontSize: "13px",
              background: isChanged ? "rgba(255, 255, 200, 0.5)" : "#fffef5",
              outline: "none",
            }}
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
          style={{
            ...cellStyle,
            padding: "8px 12px",
            cursor: "cell",
            border: "2px solid transparent",
            borderRadius: "4px",
          }}
          onClick={() => handleCellClick(member.id, field)}
        >
          <span style={{ fontSize: "13px", color: getCellValue(member, field) ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
            {getCellValue(member, field) || "-"}
          </span>
        </td>
      );
    }

    const inputType = field === "email" ? "email" : field === "mobile_phone" ? "tel" : "text";
    return (
      <td style={cellStyle} onClick={() => handleCellClick(member.id, field)}>
        <input
          ref={(el) => setCellRef(member.id, field, el)}
          type={inputType}
          value={getCellValue(member, field)}
          onChange={(e) => handleCellChange(member.id, field, e.target.value)}
          onKeyDown={(e) => handleCellKeyDown(e, member.id, field)}
          onBlur={() => {
            setTimeout(() => {
              if (activeCell?.memberId === member.id && activeCell?.field === field) {
                setActiveCell(null);
              }
            }, 100);
          }}
          style={{
            width: "100%",
            padding: "8px 10px",
            border: "2px solid #fef3c7",
            borderRadius: "4px",
            fontSize: "13px",
            background: isChanged ? "rgba(255, 255, 200, 0.5)" : "#fffef5",
            outline: "none",
          }}
        />
      </td>
    );
  }

  return (
    <section className="admin-shell">
      {/* ── Header ── */}
      {isMobile ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 0 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="page-title" style={{ margin: 0 }}>会員一覧</h1>
            {!loading && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '3px 10px', borderRadius: '999px',
                background: 'var(--color-accent-light)', color: 'var(--color-accent)',
                fontSize: '13px', fontWeight: 700,
              }}>
                {members.length}名
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => setShowFilters(v => !v)} style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: showFilters ? 'var(--color-accent-light)' : '#fff', cursor: 'pointer',
              color: showFilters ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <button type="button" onClick={() => navigate("/admin/members/new")} style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-accent)', cursor: 'pointer', color: '#fff',
              fontSize: 20, fontWeight: 700,
            }}>
              +
            </button>
          </div>
        </div>
      ) : (
        <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: 20 }}>会員一覧</h1>
            {!loading && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 10px",
                borderRadius: "999px",
                background: "var(--color-accent-light)",
                color: "var(--color-accent)",
                fontSize: "13px",
                fontWeight: 700,
              }}>
                {members.length}名
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Edit mode toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: editMode ? "var(--color-accent)" : "var(--color-text-secondary)" }}>
                編集モード
              </span>
              <button
                type="button"
                className={`doc-toggle${editMode ? " doc-toggle-on" : ""}`}
                onClick={() => {
                  setEditMode((v) => !v);
                  setActiveCell(null);
                  setChangedCells(new Set());
                }}
                aria-label="編集モード切替"
              >
                <span className="doc-toggle-knob" />
              </button>
            </div>

            <button
              className="btn"
              type="button"
              onClick={() => {
                const unlinked = members.filter(m => !m.user_id && m.email);
                setInviteChecked(new Set(unlinked.map(m => m.id)));
                setInviteResult(null);
                setShowInviteModal(true);
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-primary)",
              }}
            >
              <span style={{ fontSize: "14px" }}>✉</span>
              ユーザー招待
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => navigate("/admin/members/new")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span>
              新規会員登録
            </button>
          </div>
        </div>
      )}

      {/* ── Search & Filters ── */}
      {isMobile ? (
        /* Mobile: collapsible filter panel */
        showFilters && (
          <div style={{
            padding: '12px 16px', marginBottom: 8,
            borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
            background: 'var(--color-bg-sub)',
          }}>
            {/* Search input */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }}>
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="氏名・フリガナ・会員番号・会社名で検索"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 13 }}
              />
            </div>
            {/* Member type pills */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', alignSelf: 'center', marginRight: 2 }}>種別</span>
              {MEMBER_TYPE_FILTERS.map((t) => (
                <button key={t} type="button" className={`nl2-pill-tab${memberType === t ? ' active' : ''}`} onClick={() => setMemberType(t)}>{t}</button>
              ))}
            </div>
            {/* Status pills */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', alignSelf: 'center', marginRight: 2 }}>状態</span>
              {STATUS_FILTERS.map((s) => (
                <button key={s} type="button" className={`nl2-pill-tab${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>{s}</button>
              ))}
            </div>
            {/* Organization select */}
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 13 }}>
                <option value="">全所属</option>
                {orgOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
            {/* Reset button */}
            {(memberType !== "全て" || status !== "全て" || organizationId || q) && (
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-secondary" type="button" onClick={handleReset}
                  style={{ fontSize: 12, padding: '6px 12px', width: '100%' }}>
                  リセット
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        /* Desktop: always-visible filter card */
        <div className="card panel-card single-panel" style={{ marginBottom: "20px" }}>
          <div className="card-body" style={{ padding: "20px" }}>
            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <span style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-secondary)",
                fontSize: "16px",
                pointerEvents: "none",
              }}>
                &#x1F50D;
              </span>
              <input
                type="text"
                placeholder="氏名・フリガナ・会員番号・会社名で検索"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "14px",
                  background: "#fff",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              />
            </div>

            {/* Filter pills row: Member Type */}
            <div style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginRight: "4px" }}>種別</span>
                {MEMBER_TYPE_FILTERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`nl2-pill-tab${memberType === t ? " active" : ""}`}
                    onClick={() => setMemberType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter pills row: Status */}
            <div style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginRight: "4px" }}>状態</span>
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`nl2-pill-tab${status === s ? " active" : ""}`}
                    onClick={() => setStatus(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter row: Organization dropdown + count */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>所属</span>
                <select
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "999px",
                    border: organizationId ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: organizationId ? "var(--color-accent)" : "#fff",
                    color: organizationId ? "#fff" : "var(--color-text-secondary)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    outline: "none",
                    height: "30px",
                  }}
                >
                  <option value="" style={{ color: 'var(--color-text-primary)' }}>全て</option>
                  {orgOptions.map((opt) => (
                    <option key={opt.id} value={opt.id} style={{ color: 'var(--color-text-primary)' }}>{opt.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}>
                  {members.length}件表示中
                </span>
                {(memberType !== "全て" || status !== "全て" || organizationId || q) && (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={handleReset}
                    style={{ fontSize: "12px", padding: "4px 12px" }}
                  >
                    リセット
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "var(--radius-md)",
          background: "#fee2e2",
          color: "#991b1b",
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "16px",
        }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <LoadingSpinner />
      ) : members.length === 0 && !error ? (
        <div className="card panel-card single-panel">
          <div className="card-body" style={{ padding: "60px 20px", textAlign: "center" }}>
            <p style={{ fontSize: "15px", color: "var(--color-text-secondary)", margin: 0 }}>該当する会員はいません。</p>
          </div>
        </div>
      ) : (
        <div className="card panel-card single-panel">
          {isMobile && !editMode ? (
            /* ── Mobile Card List ── */
            <div className="mobile-card-list" style={{ padding: 8 }}>
              {paginatedMembers.map((m) => {
                const assigns = Array.isArray(m.org_assignments) ? m.org_assignments : [];
                const orgText = assigns.map((a) => `${a.org_name || ""}${a.role ? " " + a.role : ""}`).join(", ");
                const companyPosition = [m.company_name, m.position].filter(Boolean).join(" / ");
                return (
                  <div key={m.id} className="mobile-card-item" onClick={() => navigate(`/admin/members/${m.id}`)} style={{ cursor: "pointer" }}>
                    <div className="mobile-card-item-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                        {m.profile_image ? (
                          <img src={m.profile_image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #e2e8f0, #f1f5f9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#475467", flexShrink: 0 }}>
                            {(fullName(m) || "M").charAt(0)}
                          </div>
                        )}
                        <span className="card-title">{displayValue(fullName(m))}</span>
                        {m.is_new && <span style={{ padding: "1px 6px", borderRadius: 4, background: "#fee2e2", color: "#dc2626", fontSize: 12, fontWeight: 700 }}>新入</span>}
                        {m.is_graduate && <span style={{ padding: "1px 6px", borderRadius: 4, background: "#f3e8ff", color: "#7c3aed", fontSize: 12, fontWeight: 700 }}>卒業</span>}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {renderMemberTypeBadge(m.member_type)}
                        {renderStatusBadge(m.status)}
                      </div>
                    </div>
                    {companyPosition && (
                      <div className="mobile-card-item-row">
                        <span className="card-label">会社</span>
                        <span className="card-value">{companyPosition}</span>
                      </div>
                    )}
                    {orgText && (
                      <div className="mobile-card-item-row">
                        <span className="card-label">所属</span>
                        <span className="card-value">{orgText}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Desktop Table ── */
            <div className="table-wrap" style={{ overflow: "auto" }}>
              <table className="data-table" style={{ minWidth: "900px" }}>
                <thead>
                  <tr>
                    <th style={{ width: "80px", whiteSpace: "nowrap" }}>会員番号</th>
                    <th style={{ minWidth: "120px" }}>氏名</th>
                    <th style={{ minWidth: "160px" }}>会社名・役職</th>
                    <th style={{ width: "90px" }}>種別</th>
                    <th style={{ width: "80px" }}>ステータス</th>
                    <th style={{ minWidth: "140px" }}>所属・役職</th>
                    <th style={{ minWidth: "160px" }}>メール</th>
                    {editMode && <th style={{ minWidth: "120px" }}>携帯</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.map((m) => {
                    const assigns = Array.isArray(m.org_assignments) ? m.org_assignments : [];
                    const orgText = assigns
                      .map((a) => `${a.org_name || ""}${a.role ? " / " + a.role : ""}`)
                      .join(", ");
                    const companyPosition = [m.company_name, m.position].filter(Boolean).join(" / ");

                    return (
                      <tr
                        key={m.id}
                        style={{
                          cursor: editMode ? "default" : "pointer",
                          transition: "background 0.12s",
                        }}
                        onClick={editMode ? undefined : () => navigate(`/admin/members/${m.id}`)}
                        onMouseEnter={(e) => {
                          if (!editMode) e.currentTarget.style.background = "var(--color-accent-light)";
                        }}
                        onMouseLeave={(e) => {
                          if (!editMode) e.currentTarget.style.background = "";
                        }}
                      >
                        <td style={{ fontVariantNumeric: "tabular-nums", fontSize: "13px", color: "var(--color-text-secondary)" }}>
                          {displayValue(m.member_number)}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            {m.profile_image ? (
                              <img src={m.profile_image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #e2e8f0, #f1f5f9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#475467", flexShrink: 0 }}>
                                {(fullName(m) || "M").charAt(0)}
                              </div>
                            )}
                            <span style={{ fontWeight: 600, fontSize: "13px" }}>
                              {displayValue(fullName(m))}
                            </span>
                            <span title={m.user_id ? "アカウント紐付け済み" : "アカウント未紐付け"} style={{
                              fontSize: 12, cursor: "default",
                              opacity: m.user_id ? 1 : 0.5,
                            }}>{m.user_id ? "\u2705" : "\u26A0\uFE0F"}</span>
                            {m.is_new && (
                              <span style={{
                                display: "inline-block",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: "#fee2e2",
                                color: "#dc2626",
                                fontSize: "12px",
                                fontWeight: 700,
                                letterSpacing: "0.5px",
                              }}>
                                新入
                              </span>
                            )}
                            {m.is_graduate && (
                              <span style={{
                                display: "inline-block",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: "#f3e8ff",
                                color: "#7c3aed",
                                fontSize: "12px",
                                fontWeight: 700,
                              }}>
                                卒業
                              </span>
                            )}
                          </div>
                          {fullNameKana(m) && (
                            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                              {fullNameKana(m)}
                            </div>
                          )}
                        </td>

                        {editMode ? (
                          <>
                            {renderEditCell(m, "company_name")}
                            {renderEditCell(m, "member_type")}
                            {renderEditCell(m, "status")}
                            <td style={{ fontSize: "13px" }}>{orgText || "-"}</td>
                            {renderEditCell(m, "email")}
                            {renderEditCell(m, "mobile_phone")}
                          </>
                        ) : (
                          <>
                            <td style={{ fontSize: "13px" }}>{companyPosition || "-"}</td>
                            <td>{renderMemberTypeBadge(m.member_type)}</td>
                            <td>{renderStatusBadge(m.status)}</td>
                            <td style={{ fontSize: "13px" }}>{orgText || "-"}</td>
                            <td style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>{displayValue(m.email)}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              padding: "16px 20px",
              borderTop: "1px solid var(--color-border)",
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                前へ
              </button>
              {getPageNumbers().map((p, idx) =>
                p === "..." ? (
                  <span key={`dot-${idx}`} style={{ padding: "6px 4px", fontSize: "13px", color: "var(--color-text-secondary)" }}>…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid transparent",
                      background: currentPage === p ? "var(--color-accent)" : "transparent",
                      color: currentPage === p ? "#fff" : "var(--color-text-primary)",
                      fontSize: "13px",
                      fontWeight: currentPage === p ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                次へ
              </button>
            </div>
          )}

          {/* Page info */}
          <div style={{
            textAlign: "center",
            padding: "0 20px 16px",
            fontSize: "12px",
            color: "var(--color-text-secondary)",
          }}>
            {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, members.length)} / {members.length}件
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="nl2-toast">
          <span className="nl2-toast-icon">&#x2713;</span>
          <span>{toast}</span>
        </div>
      )}

      {/* ── Invite Modal ── */}
      {showInviteModal && (() => {
        const unlinkedMembers = members.filter(m => !m.user_id);
        const allCheckable = unlinkedMembers.filter(m => m.email);
        const allChecked = allCheckable.length > 0 && allCheckable.every(m => inviteChecked.has(m.id));

        async function handleBulkInvite() {
          const selectedEmails = unlinkedMembers
            .filter(m => inviteChecked.has(m.id) && m.email)
            .map(m => m.email);
          if (selectedEmails.length === 0) return;
          setInviting(true);
          try {
            const res = await apiRequest("bulk-invite-app-users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ emails: selectedEmails }),
            });
            setInviteResult(res);
          } catch (err) {
            setInviteResult({ success: [], failed: selectedEmails.map(e => ({ email: e, reason: err.message })) });
          } finally {
            setInviting(false);
          }
        }

        return (
          <div className="confirm-overlay" onClick={() => setShowInviteModal(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
              <div className="modal-header">
                <h3 style={{ fontSize: "1rem" }}>ユーザー招待</h3>
                <button type="button" className="modal-close" onClick={() => setShowInviteModal(false)}>&times;</button>
              </div>
              <div className="modal-body" style={{ padding: "16px 20px" }}>
                <div style={{
                  padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                  background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af",
                  fontSize: 12, lineHeight: 1.7,
                }}>
                  選択した会員にBase44からの招待メール（英語）が送信されます。<br />
                  会員がメール内のリンクからパスワードを設定すると、次回ログイン時に自動的にアカウントが紐付けられます。
                </div>

                {inviteResult ? (
                  <div>
                    <div style={{
                      padding: "12px 14px", borderRadius: 8, marginBottom: 12,
                      background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", fontSize: 13,
                    }}>
                      送信完了: {inviteResult.success?.length || 0}件成功
                      {inviteResult.failed?.length > 0 && `、${inviteResult.failed.length}件失敗`}
                    </div>
                    {inviteResult.failed?.length > 0 && (
                      <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>
                        {inviteResult.failed.map((f, i) => (
                          <div key={i}>{f.email}: {f.reason}</div>
                        ))}
                      </div>
                    )}
                    <button className="btn" type="button" onClick={() => setShowInviteModal(false)}
                      style={{ width: "100%", background: "var(--color-accent)", color: "#fff", border: "none" }}>
                      閉じる
                    </button>
                  </div>
                ) : (
                  <>
                    {unlinkedMembers.length === 0 ? (
                      <p style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "24px 0", fontSize: 14 }}>
                        未紐付けの会員はいません
                      </p>
                    ) : (
                      <>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
                          borderBottom: "1px solid var(--color-border)", marginBottom: 8,
                        }}>
                          <input type="checkbox" checked={allChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteChecked(new Set(allCheckable.map(m => m.id)));
                              } else {
                                setInviteChecked(new Set());
                              }
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>全選択</span>
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: "auto" }}>
                            {inviteChecked.size}件選択中
                          </span>
                        </div>
                        <div style={{ maxHeight: 320, overflowY: "auto" }}>
                          {unlinkedMembers.map(m => {
                            const hasEmail = !!m.email;
                            return (
                              <label key={m.id} style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "8px 4px",
                                borderBottom: "1px solid var(--color-border)", cursor: hasEmail ? "pointer" : "default",
                                opacity: hasEmail ? 1 : 0.4,
                              }}>
                                <input type="checkbox" disabled={!hasEmail}
                                  checked={inviteChecked.has(m.id)}
                                  onChange={(e) => {
                                    const next = new Set(inviteChecked);
                                    e.target.checked ? next.add(m.id) : next.delete(m.id);
                                    setInviteChecked(next);
                                  }}
                                />
                                <span style={{ fontSize: 13, fontWeight: 500, minWidth: 80 }}>{fullName(m)}</span>
                                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                                  {m.email || "メールアドレスなし"}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <button className="btn" type="button" disabled={inviting || inviteChecked.size === 0}
                          onClick={handleBulkInvite}
                          style={{
                            width: "100%", marginTop: 16,
                            background: inviting ? "#a5b4fc" : "var(--color-accent)",
                            color: "#fff", border: "none",
                          }}>
                          {inviting ? "送信中..." : `選択した${inviteChecked.size}件を招待`}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
