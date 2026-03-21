import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import { fullName } from '../../utils/formatName';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useIsMobile } from '../../hooks/useIsMobile';
import YearPillNav from '../../components/ui/YearPillNav';

const DUE_STATUS_BADGE = {
  "納入済": { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
  "未納":   { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
  "未発行": { bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)", border: "var(--color-border)" },
};

const DUE_TYPE_BADGE = {
  "年会費":       { color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  "入会金":       { color: "#b45309", bg: "#fffbeb" },
  "後期入会会費": { color: "#059669", bg: "#ecfdf5" },
  "前期入会会費": { color: "var(--color-accent)", bg: "var(--color-accent-light)" },
};

const MEMBER_TYPE_BADGE = {
  "正会員":   { color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  "賛助会員": { color: "#0891b2", bg: "#ecfeff" },
};

const ELIGIBLE_MEMBER_TYPES = ["正会員", "賛助会員"];

export default function MemberDuesView() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [fiscalYears, setFiscalYears] = useState([]);
  const [dues, setDues] = useState([]);
  const [members, setMembers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [orgAssignments, setOrgAssignments] = useState([]);
  const [selectedFYId, setSelectedFYId] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [memberTypeFilter, setMemberTypeFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Custom dropdown state
  const [showMemberTypeDd, setShowMemberTypeDd] = useState(false);
  const [showOrgDd, setShowOrgDd] = useState(false);
  const memberTypeDdRef = useRef(null);
  const orgDdRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [fyList, allDues, allMembers, allOrgs, allAssignments] = await Promise.all([
        base44.entities.FiscalYear.list("-year"),
        base44.entities.Due.list(),
        base44.entities.Member.list().catch(() => []),
        base44.entities.Organization.list().catch(() => []),
        base44.entities.OrgAssignment.list().catch(() => []),
      ]);
      setFiscalYears(fyList || []);
      setDues(allDues || []);
      setMembers(allMembers || []);
      setOrganizations(allOrgs || []);
      setOrgAssignments(allAssignments || []);
      if (!selectedFYId) {
        const current = (fyList || []).find((fy) => fy.is_current);
        if (current) setSelectedFYId(current.id);
        else if (fyList && fyList.length > 0) setSelectedFYId(fyList[0].id);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedFYId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset filters when FY changes
  useEffect(() => {
    setMemberTypeFilter("all");
    setOrgFilter("all");
    setStatusFilter("all");
    setSearchText("");
  }, [selectedFYId]);

  // Outside-click for custom dropdowns
  useEffect(() => {
    if (!showMemberTypeDd && !showOrgDd) return;
    const handler = (e) => {
      if (showMemberTypeDd && memberTypeDdRef.current && !memberTypeDdRef.current.contains(e.target)) setShowMemberTypeDd(false);
      if (showOrgDd && orgDdRef.current && !orgDdRef.current.contains(e.target)) setShowOrgDd(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMemberTypeDd, showOrgDd]);

  const memberMap = useMemo(() => {
    const map = {};
    (members || []).forEach((m) => {
      const id = m.id || m._id;
      if (m.approval_status === "承認済" && ELIGIBLE_MEMBER_TYPES.includes(m.member_type)) map[id] = m;
    });
    return map;
  }, [members]);

  const orgMap = useMemo(() => {
    const map = {};
    (organizations || []).forEach((o) => { map[o.id || o._id] = o; });
    return map;
  }, [organizations]);

  const memberOrgMap = useMemo(() => {
    const map = {};
    (orgAssignments || []).forEach((a) => {
      if (a.fiscal_year_id === selectedFYId) {
        const mid = a.member_id;
        if (!map[mid]) map[mid] = [];
        const org = orgMap[a.organization_id];
        if (org) map[mid].push(org.org_name || "");
      }
    });
    return map;
  }, [orgAssignments, selectedFYId, orgMap]);

  const memberOrgIdMap = useMemo(() => {
    const map = {};
    (orgAssignments || []).forEach((a) => {
      if (a.fiscal_year_id === selectedFYId) {
        const mid = a.member_id;
        if (!map[mid]) map[mid] = new Set();
        map[mid].add(a.organization_id);
      }
    });
    return map;
  }, [orgAssignments, selectedFYId]);

  const fyOrganizations = useMemo(() => {
    const orgIds = new Set();
    (orgAssignments || []).forEach((a) => {
      if (a.fiscal_year_id === selectedFYId) orgIds.add(a.organization_id);
    });
    return (organizations || []).filter((o) => orgIds.has(o.id || o._id))
      .sort((a, b) => (a.org_name || "").localeCompare(b.org_name || ""));
  }, [orgAssignments, organizations, selectedFYId]);

  const currentFyId = useMemo(() => {
    const c = (fiscalYears || []).find(fy => fy.is_current);
    return c ? c.id : '';
  }, [fiscalYears]);

  const mergedList = useMemo(() => {
    if (!selectedFYId) return [];
    const duesByMember = {};
    (dues || []).forEach((d) => { if (d.fiscal_year_id === selectedFYId) duesByMember[d.member_id] = d; });
    const rows = [];
    Object.entries(memberMap).forEach(([memberId, member]) => {
      const due = duesByMember[memberId];
      const orgNames = memberOrgMap[memberId] || [];
      const name = fullName(member);
      rows.push({
        id: due ? (due.id || due._id) : `virtual-${memberId}`,
        member_id: memberId,
        member_name: name,
        member_type: member.member_type,
        org_name: orgNames.length > 0 ? orgNames[0] : "-",
        due_type: due?.due_type || null,
        amount: due?.amount != null ? due.amount : null,
        status: due ? (due.status || "未納") : "未発行",
        paid_date: due?.paid_date || null,
      });
    });
    return rows.sort((a, b) => a.member_name.localeCompare(b.member_name));
  }, [selectedFYId, dues, memberMap, memberOrgMap]);

  const filteredList = useMemo(() => {
    let list = mergedList;
    if (memberTypeFilter !== "all") list = list.filter((r) => r.member_type === memberTypeFilter);
    if (orgFilter !== "all") {
      list = list.filter((r) => {
        const memberOrgs = memberOrgIdMap[r.member_id];
        return memberOrgs && memberOrgs.has(orgFilter);
      });
    }
    if (statusFilter !== "all") {
      const map = { unpaid: "未納", paid: "納入済", unissued: "未発行" };
      list = list.filter((r) => r.status === map[statusFilter]);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((r) => r.member_name.toLowerCase().includes(q));
    }
    return list;
  }, [mergedList, memberTypeFilter, orgFilter, statusFilter, searchText, memberOrgIdMap]);

  const paidCount = filteredList.filter((r) => r.status === "納入済").length;
  const unpaidCount = filteredList.filter((r) => r.status === "未納").length;
  const unissuedCount = filteredList.filter((r) => r.status === "未発行").length;
  const denominator = paidCount + unpaidCount;
  const paymentRate = denominator > 0 ? Math.round((paidCount / denominator) * 100) : null;
  const totalAmount = filteredList.reduce((s, r) => s + (r.amount || 0), 0);
  const paidAmount = filteredList.filter((r) => r.status === "納入済").reduce((s, r) => s + (r.amount || 0), 0);

  // Dropdown render helper
  const renderDropdown = (ref, open, setOpen, value, setValue, label, options) => (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: 4 }}>{label}</span>
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        padding: '5px 14px', borderRadius: 999,
        border: value !== 'all' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
        background: value !== 'all' ? 'var(--color-accent)' : '#fff',
        color: value !== 'all' ? '#fff' : 'var(--color-text-secondary)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', transition: 'all 0.15s',
      }}>
        {(options.find(o => o.v === value)?.l) || 'すべて'}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100,
          background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 240, maxHeight: 240, overflowY: 'auto',
          animation: 'yearDropIn 0.12s ease',
        }}>
          {options.map(o => {
            const act = value === o.v;
            return (
              <button key={o.v} type="button" onClick={() => { setValue(o.v); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px',
                  border: 'none', background: act ? 'var(--color-accent-light)' : 'transparent',
                  color: act ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  fontSize: 12, fontWeight: act ? 600 : 400, textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!act) e.currentTarget.style.background = 'var(--color-bg-sub)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = act ? 'var(--color-accent-light)' : 'transparent'; }}
              >
                <span style={{ flex: 1 }}>{o.l}</span>
                {act ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span style={{ width: 14 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const memberTypeOptions = [{ v: 'all', l: 'すべて' }, { v: '正会員', l: '正会員' }, { v: '賛助会員', l: '賛助会員' }];
  const orgOptions = [{ v: 'all', l: 'すべて' }, ...fyOrganizations.map(o => ({ v: o.id || o._id, l: o.org_name }))];

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header"><h1 className="page-title">会費一覧</h1></div>
        <LoadingSpinner />
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div style={{ marginBottom: 8 }}>
        <button type="button" className="text-link" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/meetings'); }} style={{ fontSize: 13, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>&larr; 戻る</button>
      </div>

      {/* Page header */}
      {isMobile ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h1 className="page-title" style={{ margin: 0 }}>会費一覧</h1>
          <button type="button" onClick={() => setShowFilters((v) => !v)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: showFilters ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
              background: showFilters ? "var(--color-accent)" : "#fff",
              color: showFilters ? "#fff" : "var(--color-text-secondary)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="page-header">
          <h1 className="page-title">会費一覧</h1>
          <p className="page-description">会費の納入状況を確認できます（閲覧専用）</p>
        </div>
      )}

      {/* Year pill nav */}
      <div style={{ marginBottom: 16 }}>
        <YearPillNav fiscalYears={fiscalYears} activeFyId={selectedFYId} currentFyId={currentFyId} onChange={setSelectedFYId} />
      </div>

      {/* Summary */}
      {isMobile ? (
        <div className="stat-chip-bar" style={{ marginBottom: 8 }}>
          <div className="stat-chip"><span className="stat-chip-label">全体</span><span className="stat-chip-value">{filteredList.length}</span></div>
          <div className="stat-chip"><span className="stat-chip-label">納入済</span><span className="stat-chip-value" style={{ color: "#059669" }}>{paidCount}</span></div>
          <div className="stat-chip"><span className="stat-chip-label">未納</span><span className="stat-chip-value" style={{ color: unpaidCount > 0 ? "#dc2626" : "var(--color-text-secondary)" }}>{unpaidCount}</span></div>
          <div className="stat-chip"><span className="stat-chip-label">未発行</span><span className="stat-chip-value" style={{ color: "var(--color-text-secondary)" }}>{unissuedCount}</span></div>
          <div className="stat-chip"><span className="stat-chip-label">納入率</span><span className="stat-chip-value">{paymentRate != null ? `${paymentRate}%` : "-"}</span></div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 20 }}>
          <SummaryCard label="対象者数" value={`${filteredList.length}名`} />
          <SummaryCard label="納入済" value={`${paidCount}件`} color="#059669" />
          <SummaryCard label="未納" value={`${unpaidCount}件`} color={unpaidCount > 0 ? "#dc2626" : "var(--color-text-secondary)"} />
          <SummaryCard label="未発行" value={`${unissuedCount}件`} color="var(--color-text-secondary)" />
          <SummaryCard label="納入率" value={paymentRate != null ? `${paymentRate}%` : "-"} />
        </div>
      )}

      {/* Filters */}
      {isMobile ? (
        showFilters && (
          <div style={{ padding: '12px 16px', marginBottom: 8, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-sub)' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }}>
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input type="text" placeholder="氏名検索..." value={searchText} onChange={(e) => setSearchText(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: 2 }}>ステータス</span>
              {[{ key: 'all', label: 'すべて' }, { key: 'unpaid', label: '未納' }, { key: 'paid', label: '納入済' }, { key: 'unissued', label: '未発行' }].map(opt => (
                <button key={opt.key} type="button" className={`nl2-pill-tab${statusFilter === opt.key ? ' active' : ''}`}
                  onClick={() => setStatusFilter(opt.key)}>{opt.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {renderDropdown(memberTypeDdRef, showMemberTypeDd, setShowMemberTypeDd, memberTypeFilter, setMemberTypeFilter, '種別', memberTypeOptions)}
              <span style={{ width: 1, height: 18, background: 'var(--color-border)', flexShrink: 0 }} />
              {renderDropdown(orgDdRef, showOrgDd, setShowOrgDd, orgFilter, setOrgFilter, '所属', orgOptions)}
            </div>
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {/* Row 1: Search */}
          <div style={{ position: 'relative' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }}>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="氏名検索..." value={searchText} onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 13 }} />
          </div>
          {/* Row 2: Status pills + dropdowns */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: 4 }}>ステータス</span>
            {[{ key: 'all', label: 'すべて' }, { key: 'unpaid', label: '未納' }, { key: 'paid', label: '納入済' }, { key: 'unissued', label: '未発行' }].map(opt => (
              <button key={opt.key} type="button" className={`nl2-pill-tab${statusFilter === opt.key ? ' active' : ''}`}
                onClick={() => setStatusFilter(opt.key)}>{opt.label}</button>
            ))}
            <span style={{ width: 1, height: 18, background: 'var(--color-border)', margin: '0 6px', flexShrink: 0 }} />
            {renderDropdown(memberTypeDdRef, showMemberTypeDd, setShowMemberTypeDd, memberTypeFilter, setMemberTypeFilter, '種別', memberTypeOptions)}
            <span style={{ width: 1, height: 18, background: 'var(--color-border)', margin: '0 6px', flexShrink: 0 }} />
            {renderDropdown(orgDdRef, showOrgDd, setShowOrgDd, orgFilter, setOrgFilter, '所属', orgOptions)}
          </div>
        </div>
      )}

      {/* List / Table */}
      {filteredList.length === 0 ? (
        <section className="card panel-card">
          <div className="card-body" style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-secondary)" }}>
            <p>{Object.keys(memberMap).length === 0 ? "対象の会員がいません。" : "該当する会費データはありません。"}</p>
          </div>
        </section>
      ) : isMobile ? (
        <section className="card panel-card" style={{ padding: 0, overflow: "hidden" }}>
          <div>
            {filteredList.map((r) => {
              const statusBadge = DUE_STATUS_BADGE[r.status] || DUE_STATUS_BADGE["未発行"];
              const initial = r.member_name ? r.member_name.charAt(0) : "?";
              const amountText = r.amount != null ? `¥${r.amount.toLocaleString()}` : "";
              return (
                <div key={r.id} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--color-border)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--color-border), var(--color-bg-sub))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#475467" }}>{initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.member_name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 1 }}>{r.member_type} · {r.due_type || "-"}{amountText ? ` ${amountText}` : ""}</div>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}`, flexShrink: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusBadge.color }} />{r.status}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", padding: "10px 16px", borderTop: "1px solid var(--color-border)", fontSize: 12, color: "var(--color-text-secondary)" }}>
            対象 {filteredList.length}名 / 納入済 {paidCount}件 ¥{paidAmount.toLocaleString()} / 全体 ¥{totalAmount.toLocaleString()}
          </div>
        </section>
      ) : (
        <section className="card panel-card">
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ whiteSpace: "nowrap" }}>氏名</th>
                  <th style={{ width: 80, whiteSpace: "nowrap" }}>会員種別</th>
                  <th style={{ width: 100, whiteSpace: "nowrap" }}>所属</th>
                  <th style={{ width: 90, whiteSpace: "nowrap" }}>会費種類</th>
                  <th style={{ width: 100, textAlign: "right", whiteSpace: "nowrap" }}>金額</th>
                  <th style={{ width: 90, textAlign: "center", whiteSpace: "nowrap" }}>ステータス</th>
                  <th style={{ width: 100, whiteSpace: "nowrap" }}>入金日</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((r) => {
                  const statusBadge = DUE_STATUS_BADGE[r.status] || DUE_STATUS_BADGE["未発行"];
                  const typeBadge = r.due_type ? (DUE_TYPE_BADGE[r.due_type] || DUE_TYPE_BADGE["年会費"]) : null;
                  const mtBadge = MEMBER_TYPE_BADGE[r.member_type];
                  return (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap" }}><span style={{ fontWeight: 600, fontSize: 13 }}>{r.member_name}</span></td>
                      <td style={{ whiteSpace: "nowrap" }}>{mtBadge ? <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: mtBadge.bg, color: mtBadge.color }}>{r.member_type}</span> : <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{r.member_type || "-"}</span>}</td>
                      <td style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{r.org_name}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{typeBadge ? <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: typeBadge.bg, color: typeBadge.color }}>{r.due_type}</span> : <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>-</span>}</td>
                      <td style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.amount != null ? `¥${r.amount.toLocaleString()}` : "-"}</td>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}` }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusBadge.color }} />{r.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.paid_date ? r.paid_date.replace(/-/g, "/") : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: "center", padding: "12px 20px", borderTop: "1px solid var(--color-border)", fontSize: 12, color: "var(--color-text-secondary)" }}>
            対象 {filteredList.length}名 / 納入済 {paidCount}件 ¥{paidAmount.toLocaleString()} / 全体 ¥{totalAmount.toLocaleString()}
          </div>
        </section>
      )}
    </section>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ padding: "14px 16px", background: "#fff", borderRadius: 8, border: "1px solid var(--color-border)", textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || "var(--color-text-primary)" }}>{value}</div>
    </div>
  );
}
