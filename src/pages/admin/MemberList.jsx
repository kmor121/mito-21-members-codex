import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, base44, invalidateReadCache } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { fullName, fullNameKana } from '../../utils/formatName';
import { Modal, Button } from '../../components/ui';
import { useIsMobile } from '../../hooks/useIsMobile';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

const MEMBER_TYPES = ["正会員", "賛助会員", "OB会員", "名誉顧問"];
const MEMBER_TYPE_FILTERS = ["すべて", "正会員", "賛助会員", "OB会員", "名誉顧問", "新入会員"];
const STATUS_FILTERS = ["すべて", "活動中", "休会", "退会"];
const STATUSES = ["活動中", "休会", "退会"];
const EDITABLE_FIELDS = ["company_name", "member_type", "status", "email", "mobile_phone"];
const PAGE_SIZE = 30;

const MEMBER_TYPE_BADGE = {
  "正会員": { bg: "var(--color-accent-light)", color: "var(--color-accent)" },
  "賛助会員": { bg: "var(--color-success-light)", color: "var(--color-success)" },
  "OB会員": { bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)" },
  "名誉顧問": { bg: "var(--color-warning-light)", color: "var(--color-warning)" },
};

const STATUS_BADGE = {
  "活動中": { bg: "var(--color-success-light)", color: "var(--color-success)" },
  "休会": { bg: "var(--color-warning-light)", color: "var(--color-warning)" },
  "退会": { bg: "var(--color-danger-light)", color: "var(--color-danger)" },
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
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("すべて");
  const [memberType, setMemberType] = useState("すべて");
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
      status: status === "すべて" ? "" : status,
      member_type: memberType === "すべて" ? "" : (memberType === "新入会員" ? "" : memberType),
      organization_id: organizationId,
      is_new: memberType === "新入会員" ? true : undefined,
    };
  }

  useEffect(() => { try { base44.appLogs?.logUserInApp?.('A2-会員一覧'); } catch (e) { /* analytics */ } }, []);
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
    setStatus("すべて");
    setMemberType("すべて");
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
    const style = MEMBER_TYPE_BADGE[type] || { bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)" };
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
    const style = STATUS_BADGE[st] || { bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)" };
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
              border: "2px solid var(--color-warning-light)",
              borderRadius: "4px",
              fontSize: "13px",
              background: isChanged ? "rgba(255, 255, 200, 0.5)" : "var(--color-warning-light)",
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
              border: "2px solid var(--color-warning-light)",
              borderRadius: "4px",
              fontSize: "13px",
              background: isChanged ? "rgba(255, 255, 200, 0.5)" : "var(--color-warning-light)",
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
            border: "2px solid var(--color-warning-light)",
            borderRadius: "4px",
            fontSize: "13px",
            background: isChanged ? "rgba(255, 255, 200, 0.5)" : "var(--color-warning-light)",
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
          minHeight: 36,
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
              background: showFilters ? 'var(--color-accent-light)' : 'var(--color-bg)', cursor: 'pointer',
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

            <Button variant="primary" onClick={() => navigate("/admin/members/new")}>
              <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span>
              新規会員登録
            </Button>
          </div>
        </div>
      )}

      {/* ── Search & Filters ── */}
      {isMobile ? (
        /* Mobile: collapsible filter panel */
        showFilters && (
          <div style={{
            padding: '12px 16px', marginBottom: 8,
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
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
                style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 14, background: 'var(--color-bg)' }}
              />
            </div>
            {/* Member type pills */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', alignSelf: 'center', marginRight: 2 }}>種別</span>
              {MEMBER_TYPE_FILTERS.map((t) => (
                <button key={t} type="button" className={`nl2-pill-tab${memberType === t ? ' active' : ''}`} onClick={() => setMemberType(t)}>{t}</button>
              ))}
            </div>
            {/* Status pills + Organization dropdown (same row) */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', alignSelf: 'center', marginRight: 2 }}>状態</span>
              {STATUS_FILTERS.map((s) => (
                <button key={s} type="button" className={`nl2-pill-tab${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>{s}</button>
              ))}
              <span style={{ width: 1, height: 18, background: 'var(--color-border)', margin: '0 4px', flexShrink: 0 }} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: 2 }}>所属</span>
                <button type="button" onClick={() => setShowOrgDropdown(v => !v)}
                  style={{
                    padding: '5px 14px', borderRadius: 999,
                    border: organizationId ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    background: organizationId ? 'var(--color-accent)' : 'var(--color-bg)',
                    color: organizationId ? '#fff' : 'var(--color-text-secondary)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}>
                  {organizationId ? (orgOptions.find(o => o.id === organizationId)?.name || '選択中') : 'すべて'}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showOrgDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {showOrgDropdown && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowOrgDropdown(false)} />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100,
                      background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
                      minWidth: 240, maxHeight: 240, overflowY: 'auto',
                      animation: 'yearDropIn 0.12s ease',
                    }}>
                      <button type="button" onClick={() => { setOrganizationId(''); setShowOrgDropdown(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', border: 'none', background: !organizationId ? 'var(--color-accent-light)' : 'transparent', color: !organizationId ? 'var(--color-accent)' : 'var(--color-text-primary)', fontSize: 12, fontWeight: !organizationId ? 600 : 400, textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (organizationId) e.currentTarget.style.background = 'var(--color-bg-sub)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = !organizationId ? 'var(--color-accent-light)' : 'transparent'; }}
                      >
                        <span style={{ flex: 1 }}>すべて</span>
                        {!organizationId ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span style={{ width: 14 }} />}
                      </button>
                      {orgOptions.map(opt => {
                        const isActive = organizationId === opt.id;
                        return (
                          <button key={opt.id} type="button" onClick={() => { setOrganizationId(opt.id); setShowOrgDropdown(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', border: 'none', background: isActive ? 'var(--color-accent-light)' : 'transparent', color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)', fontSize: 12, fontWeight: isActive ? 600 : 400, textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s' }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-bg-sub)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'var(--color-accent-light)' : 'transparent'; }}
                          >
                            <span style={{ flex: 1 }}>{opt.name}</span>
                            {isActive ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span style={{ width: 14 }} />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* Reset button */}
            {(memberType !== "すべて" || status !== "すべて" || organizationId || q) && (
              <div style={{ marginTop: 10 }}>
                <Button variant="secondary" size="sm" onClick={handleReset}
                  style={{ width: '100%' }}>
                  リセット
                </Button>
              </div>
            )}
          </div>
        )
      ) : (
        /* Desktop: always-visible filter card */
        <div className="card panel-card single-panel" style={{ marginBottom: "20px", overflow: "visible" }}>
          <div className="card-body" style={{ padding: "20px", overflow: "visible" }}>
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
                  background: "var(--color-bg)",
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

            {/* Filter pills row: Status + Organization (same row) */}
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

              {/* Separator */}
              <span style={{ width: 1, height: 18, background: "var(--color-border)", margin: "0 6px", flexShrink: 0 }} />

              {/* Organization dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", position: "relative" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginRight: "4px" }}>所属</span>
                <button type="button" onClick={() => setShowOrgDropdown(v => !v)}
                  style={{
                    padding: "5px 14px", borderRadius: "999px",
                    border: organizationId ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: organizationId ? "var(--color-accent)" : "var(--color-bg)",
                    color: organizationId ? "#fff" : "var(--color-text-secondary)",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap", transition: "all 0.15s",
                  }}>
                  {organizationId ? (orgOptions.find(o => o.id === organizationId)?.name || '選択中') : 'すべて'}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showOrgDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {showOrgDropdown && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowOrgDropdown(false)} />
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
                      background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
                      minWidth: 240, maxHeight: 240, overflowY: "auto",
                      animation: "yearDropIn 0.12s ease",
                    }}>
                      <button type="button" onClick={() => { setOrganizationId(''); setShowOrgDropdown(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: !organizationId ? "var(--color-accent-light)" : "transparent", color: !organizationId ? "var(--color-accent)" : "var(--color-text-primary)", fontSize: "12px", fontWeight: !organizationId ? 600 : 400, textAlign: "left", cursor: "pointer", transition: "background 0.1s" }}
                        onMouseEnter={e => { if (organizationId) e.currentTarget.style.background = "var(--color-bg-sub)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = !organizationId ? "var(--color-accent-light)" : "transparent"; }}
                      >
                        <span style={{ flex: 1 }}>すべて</span>
                        {!organizationId ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span style={{ width: 14 }} />}
                      </button>
                      {orgOptions.map(opt => {
                        const isActive = organizationId === opt.id;
                        return (
                          <button key={opt.id} type="button" onClick={() => { setOrganizationId(opt.id); setShowOrgDropdown(false); }}
                            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: isActive ? "var(--color-accent-light)" : "transparent", color: isActive ? "var(--color-accent)" : "var(--color-text-primary)", fontSize: "12px", fontWeight: isActive ? 600 : 400, textAlign: "left", cursor: "pointer", transition: "background 0.1s" }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--color-bg-sub)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isActive ? "var(--color-accent-light)" : "transparent"; }}
                          >
                            <span style={{ flex: 1 }}>{opt.name}</span>
                            {isActive ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span style={{ width: 14 }} />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Count + Reset (right-aligned) */}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  {members.length}件表示中
                </span>
                {(memberType !== "すべて" || status !== "すべて" || organizationId || q) && (
                  <Button variant="secondary" size="sm" onClick={handleReset}>
                    リセット
                  </Button>
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
          background: "var(--color-danger-light)",
          color: "var(--color-danger)",
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
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--color-border), var(--color-bg-sub))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                            {(fullName(m) || "M").charAt(0)}
                          </div>
                        )}
                        <span className="card-title">{displayValue(fullName(m))}</span>
                        {m.is_new && <span style={{ padding: "1px 6px", borderRadius: 4, background: "var(--color-danger-light)", color: "var(--color-danger)", fontSize: 12, fontWeight: 700 }}>新入</span>}
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
                    <th style={{ minWidth: "120px", whiteSpace: "nowrap" }}>氏名</th>
                    <th style={{ minWidth: "160px", whiteSpace: "nowrap" }}>会社名・役職</th>
                    <th style={{ width: "90px", whiteSpace: "nowrap" }}>種別</th>
                    <th style={{ width: "80px", whiteSpace: "nowrap" }}>ステータス</th>
                    <th style={{ minWidth: "140px", whiteSpace: "nowrap" }}>所属・役職</th>
                    <th style={{ minWidth: "160px", whiteSpace: "nowrap" }}>メール</th>
                    {editMode && <th style={{ minWidth: "120px", whiteSpace: "nowrap" }}>携帯</th>}
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
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--color-border), var(--color-bg-sub))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", flexShrink: 0 }}>
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
                                background: "var(--color-danger-light)",
                                color: "var(--color-danger)",
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
              <Button variant="secondary" size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                前へ
              </Button>
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
              <Button variant="secondary" size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                次へ
              </Button>
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

    </section>
  );
}
