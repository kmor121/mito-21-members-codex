import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import { fullName } from '../../utils/formatName';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useIsMobile } from '../../hooks/useIsMobile';

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
const STATUS_OPTIONS = ["全て", "納入済", "未納", "未発行"];

export default function MemberDuesView() {
  const isMobile = useIsMobile();

  const [fiscalYears, setFiscalYears] = useState([]);
  const [dues, setDues] = useState([]);
  const [members, setMembers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [orgAssignments, setOrgAssignments] = useState([]);
  const [selectedFYId, setSelectedFYId] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [memberTypeFilter, setMemberTypeFilter] = useState("全種別");
  const [orgFilter, setOrgFilter] = useState("全組織");
  const [statusFilter, setStatusFilter] = useState("全て");
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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
    setMemberTypeFilter("全種別");
    setOrgFilter("全組織");
    setStatusFilter("全て");
    setSearchText("");
  }, [selectedFYId]);

  // Build member map (approved only, eligible types only)
  const memberMap = useMemo(() => {
    const map = {};
    (members || []).forEach((m) => {
      const id = m.id || m._id;
      if (m.approval_status === "承認済" && ELIGIBLE_MEMBER_TYPES.includes(m.member_type)) {
        map[id] = m;
      }
    });
    return map;
  }, [members]);

  // Build org map
  const orgMap = useMemo(() => {
    const map = {};
    (organizations || []).forEach((o) => { map[o.id || o._id] = o; });
    return map;
  }, [organizations]);

  // OrgAssignment lookup: member_id -> org names for selected FY
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

  // Member org assignment lookup for filtering: member_id -> org_id set
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

  // Organizations available for the selected FY (only those that have assignments)
  const fyOrganizations = useMemo(() => {
    const orgIds = new Set();
    (orgAssignments || []).forEach((a) => {
      if (a.fiscal_year_id === selectedFYId) orgIds.add(a.organization_id);
    });
    return (organizations || []).filter((o) => orgIds.has(o.id || o._id))
      .sort((a, b) => (a.org_name || "").localeCompare(b.org_name || ""));
  }, [orgAssignments, organizations, selectedFYId]);

  // Build merged list
  const mergedList = useMemo(() => {
    if (!selectedFYId) return [];

    // Dues for selected FY, indexed by member_id
    const duesByMember = {};
    (dues || []).forEach((d) => {
      if (d.fiscal_year_id === selectedFYId) {
        duesByMember[d.member_id] = d;
      }
    });

    const rows = [];
    Object.entries(memberMap).forEach(([memberId, member]) => {
      const due = duesByMember[memberId];
      const orgNames = memberOrgMap[memberId] || [];
      const name = fullName(member);

      if (due) {
        rows.push({
          id: due.id || due._id,
          member_id: memberId,
          member_name: name,
          member_type: member.member_type,
          org_name: orgNames.length > 0 ? orgNames[0] : "-",
          due_type: due.due_type || null,
          amount: due.amount != null ? due.amount : null,
          status: due.status || "未納",
          paid_date: due.paid_date || null,
        });
      } else {
        rows.push({
          id: `virtual-${memberId}`,
          member_id: memberId,
          member_name: name,
          member_type: member.member_type,
          org_name: orgNames.length > 0 ? orgNames[0] : "-",
          due_type: null,
          amount: null,
          status: "未発行",
          paid_date: null,
        });
      }
    });

    return rows.sort((a, b) => a.member_name.localeCompare(b.member_name));
  }, [selectedFYId, dues, memberMap, memberOrgMap]);

  // Apply filters
  const filteredList = useMemo(() => {
    let list = mergedList;

    if (memberTypeFilter !== "全種別") {
      list = list.filter((r) => r.member_type === memberTypeFilter);
    }

    if (orgFilter !== "全組織") {
      const selectedOrg = fyOrganizations.find((o) => o.org_name === orgFilter);
      if (selectedOrg) {
        const orgId = selectedOrg.id || selectedOrg._id;
        list = list.filter((r) => {
          const memberOrgs = memberOrgIdMap[r.member_id];
          return memberOrgs && memberOrgs.has(orgId);
        });
      }
    }

    if (statusFilter !== "全て") {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((r) => r.member_name.toLowerCase().includes(q));
    }

    return list;
  }, [mergedList, memberTypeFilter, orgFilter, statusFilter, searchText, fyOrganizations, memberOrgIdMap]);

  // FY navigation
  const selectedFY = fiscalYears.find((fy) => fy.id === selectedFYId);
  const sortedFYs = useMemo(() => [...fiscalYears].sort((a, b) => a.year - b.year), [fiscalYears]);
  const currentFYIndex = sortedFYs.findIndex((fy) => fy.id === selectedFYId);
  function prevFY() { if (currentFYIndex > 0) setSelectedFYId(sortedFYs[currentFYIndex - 1].id); }
  function nextFY() { if (currentFYIndex < sortedFYs.length - 1) setSelectedFYId(sortedFYs[currentFYIndex + 1].id); }

  // Summary counts (from filtered list)
  const paidCount = filteredList.filter((r) => r.status === "納入済").length;
  const unpaidCount = filteredList.filter((r) => r.status === "未納").length;
  const unissuedCount = filteredList.filter((r) => r.status === "未発行").length;
  const denominator = paidCount + unpaidCount;
  const paymentRate = denominator > 0 ? Math.round((paidCount / denominator) * 100) : null;

  // Footer totals
  const totalAmount = filteredList.reduce((s, r) => s + (r.amount || 0), 0);
  const paidAmount = filteredList.filter((r) => r.status === "納入済").reduce((s, r) => s + (r.amount || 0), 0);

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
        <Link to="/meetings" className="text-link" style={{ fontSize: 13 }}>&larr; 幹事会に戻る</Link>
      </div>

      {/* Page header */}
      {isMobile ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h1 className="page-title" style={{ margin: 0 }}>会費一覧</h1>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: showFilters ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
              background: showFilters ? "var(--color-accent)" : "#fff",
              color: showFilters ? "#fff" : "var(--color-text-secondary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
            aria-label="フィルター表示切替"
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

      {/* FY navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button className="button button-secondary" type="button" disabled={currentFYIndex <= 0} onClick={prevFY} style={{ padding: "4px 10px", fontSize: 13 }}>&laquo;</button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{selectedFY ? `${selectedFY.year}年度` : ""}</span>
        <button className="button button-secondary" type="button" disabled={currentFYIndex >= sortedFYs.length - 1} onClick={nextFY} style={{ padding: "4px 10px", fontSize: 13 }}>&raquo;</button>
      </div>

      {/* Summary — stat-chip-bar on mobile, SummaryCard grid on desktop */}
      {isMobile ? (
        <div className="stat-chip-bar" style={{ marginBottom: 8 }}>
          <div className="stat-chip">
            <span className="stat-chip-label">全体</span>
            <span className="stat-chip-value">{filteredList.length}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-label">納入済</span>
            <span className="stat-chip-value" style={{ color: "#059669" }}>{paidCount}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-label">未納</span>
            <span className="stat-chip-value" style={{ color: unpaidCount > 0 ? "#dc2626" : "var(--color-text-secondary)" }}>{unpaidCount}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-label">未発行</span>
            <span className="stat-chip-value" style={{ color: "var(--color-text-secondary)" }}>{unissuedCount}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-label">納入率</span>
            <span className="stat-chip-value">{paymentRate != null ? `${paymentRate}%` : "-"}</span>
          </div>
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

      {/* Filter bar — collapsible on mobile */}
      {isMobile ? (
        showFilters && (
          <div style={{
            padding: "12px 16px", marginBottom: 8,
            borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "var(--color-bg-sub)",
          }}>
            {/* Search */}
            <div style={{ position: "relative", marginBottom: 10 }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--color-text-tertiary)" }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="氏名検索..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  width: "100%", padding: "7px 10px 7px 32px", fontSize: 13,
                  border: "1px solid var(--color-border)", borderRadius: 6, background: "#fff",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Member type + Org dropdowns */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <select
                value={memberTypeFilter}
                onChange={(e) => setMemberTypeFilter(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", fontSize: 13, border: "1px solid var(--color-border)", borderRadius: 6, background: "#fff", cursor: "pointer" }}
              >
                <option value="全種別">会員種別: 全種別</option>
                <option value="正会員">正会員</option>
                <option value="賛助会員">賛助会員</option>
              </select>

              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", fontSize: 13, border: "1px solid var(--color-border)", borderRadius: 6, background: "#fff", cursor: "pointer" }}
              >
                <option value="全組織">所属組織: 全組織</option>
                {fyOrganizations.map((o) => (
                  <option key={o.id || o._id} value={o.org_name}>{o.org_name}</option>
                ))}
              </select>
            </div>

            {/* Status pills */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {STATUS_OPTIONS.map((opt) => {
                const isActive = statusFilter === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStatusFilter(opt)}
                    className="nl2-pill-tab"
                    style={{
                      padding: "5px 12px", fontSize: 12, fontWeight: 500, borderRadius: 999,
                      border: isActive ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
                      background: isActive ? "var(--color-accent)" : "#fff",
                      color: isActive ? "#fff" : "var(--color-text-secondary)",
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, alignItems: "center" }}>
          {/* Search input */}
          <div style={{ flex: "1 1 200px", position: "relative" }}>
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--color-text-tertiary)" }} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              placeholder="氏名検索..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: "100%", padding: "6px 10px 6px 32px", fontSize: 13,
                border: "1px solid var(--color-border)", borderRadius: 6, background: "#fff",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Member type dropdown */}
          <select
            value={memberTypeFilter}
            onChange={(e) => setMemberTypeFilter(e.target.value)}
            style={{ padding: "6px 10px", fontSize: 13, border: "1px solid var(--color-border)", borderRadius: 6, background: "#fff", cursor: "pointer" }}
          >
            <option value="全種別">会員種別: 全種別</option>
            <option value="正会員">正会員</option>
            <option value="賛助会員">賛助会員</option>
          </select>

          {/* Organization dropdown */}
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            style={{ padding: "6px 10px", fontSize: 13, border: "1px solid var(--color-border)", borderRadius: 6, background: "#fff", cursor: "pointer" }}
          >
            <option value="全組織">所属組織: 全組織</option>
            {fyOrganizations.map((o) => (
              <option key={o.id || o._id} value={o.org_name}>{o.org_name}</option>
            ))}
          </select>

          {/* Status pills */}
          <div style={{ display: "flex", gap: 4 }}>
            {STATUS_OPTIONS.map((opt) => {
              const isActive = statusFilter === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatusFilter(opt)}
                  className="nl2-pill-tab"
                  style={{
                    padding: "5px 12px", fontSize: 12, fontWeight: 500, borderRadius: 999,
                    border: isActive ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: isActive ? "var(--color-accent)" : "#fff",
                    color: isActive ? "#fff" : "var(--color-text-secondary)",
                    cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {opt}
                </button>
              );
            })}
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
        /* Mobile card list */
        <section className="card panel-card" style={{ padding: 0, overflow: "hidden" }}>
          <div>
            {filteredList.map((r) => {
              const statusBadge = DUE_STATUS_BADGE[r.status] || DUE_STATUS_BADGE["未発行"];
              const initial = r.member_name ? r.member_name.charAt(0) : "?";
              const amountText = r.amount != null ? `¥${r.amount.toLocaleString()}` : "";
              const dueTypeText = r.due_type || "-";
              const memberTypeText = r.member_type || "-";

              return (
                <div
                  key={r.id}
                  style={{
                    padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, var(--color-border), var(--color-bg-sub))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: "#475467",
                  }}>
                    {initial}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 14, color: "var(--text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {r.member_name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 1 }}>
                      {memberTypeText} · {dueTypeText}{amountText ? ` ${amountText}` : ""}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}`,
                    flexShrink: 0,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusBadge.color }} />
                    {r.status}
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
        /* Desktop table */
        <section className="card panel-card">
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>氏名</th>
                  <th style={{ width: 80 }}>会員種別</th>
                  <th style={{ width: 100 }}>所属</th>
                  <th style={{ width: 90 }}>会費種類</th>
                  <th style={{ width: 100, textAlign: "right" }}>金額</th>
                  <th style={{ width: 90, textAlign: "center" }}>ステータス</th>
                  <th style={{ width: 100 }}>入金日</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((r) => {
                  const statusBadge = DUE_STATUS_BADGE[r.status] || DUE_STATUS_BADGE["未発行"];
                  const typeBadge = r.due_type ? (DUE_TYPE_BADGE[r.due_type] || DUE_TYPE_BADGE["年会費"]) : null;
                  const mtBadge = MEMBER_TYPE_BADGE[r.member_type];
                  return (
                    <tr key={r.id}>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{r.member_name}</span>
                      </td>
                      <td>
                        {mtBadge ? (
                          <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: mtBadge.bg, color: mtBadge.color }}>
                            {r.member_type}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{r.member_type || "-"}</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {r.org_name}
                      </td>
                      <td>
                        {typeBadge ? (
                          <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: typeBadge.bg, color: typeBadge.color }}>
                            {r.due_type}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                        {r.amount != null ? `¥${r.amount.toLocaleString()}` : "-"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}`,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusBadge.color }} />
                          {r.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                        {r.paid_date ? r.paid_date.replace(/-/g, "/") : "-"}
                      </td>
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
      <div style={{ fontSize: 20, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}
