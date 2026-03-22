import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import { Search, X, ChevronRight, Phone, Mail } from 'lucide-react';
import { MemberListSkeleton } from '../../components/ui/Skeleton';
import { PageHeader } from '../../components/ui';
import { fullName, fullNameKana, nameInitial } from '../../utils/formatName';

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  return String(value);
}

const MEMBER_TYPE_COLORS = {
  "正会員":   { bg: "var(--color-accent-light)", color: "var(--color-accent)", border: "#c7d2fe" },
  "賛助会員": { bg: "var(--color-success-light)", color: "var(--color-success)", border: "#a7f3d0" },
  "OB会員":   { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  "名誉顧問": { bg: "var(--color-warning-light)", color: "#92400e", border: "#fde68a" },
};

function MemberImage({ src, name, initial: initialOverride, size = "detail", memberType }) {
  const initial = initialOverride || (name || "M").charAt(0);
  if (src) {
    return (
      <div className={`member-image member-image-${size}`}>
        <img src={src} alt={name || "会員プロフィール画像"} loading="lazy" />
      </div>
    );
  }
  const typeColor = MEMBER_TYPE_COLORS[memberType];
  const bgStyle = typeColor
    ? { background: `linear-gradient(135deg, ${typeColor.bg}, ${typeColor.border})`, color: typeColor.color }
    : {};
  return (
    <div className={`member-image member-image-${size} is-placeholder`} style={bgStyle} aria-label="プロフィール画像未設定">
      <span>{initial}</span>
    </div>
  );
}

const MEMBER_TYPE_CHIPS = ["全員", "正会員", "賛助会員", "OB会員", "名誉顧問"];

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

export default function Directory() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [members, setMembers] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [query, setQuery] = useState("");
  const [orgId, setOrgId] = useState("");
  const [typeFilter, setTypeFilter] = useState("全員");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allMembers, setAllMembers] = useState([]);
  const [assignMap, setAssignMap] = useState({});

  const loadMembers = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const [memberList, fiscalYears, orgs, assignments] = await Promise.all([
        base44.entities.Member.filter({ approval_status: "承認済", status: "活動中" }),
        base44.entities.FiscalYear.list(),
        base44.entities.Organization.list(),
        base44.entities.OrgAssignment.list(),
      ]);

      const currentFy = fiscalYears.find((fy) => fy.is_current === true);
      const currentFyId = currentFy?.id || "";
      const currentOrgs = currentFyId ? orgs.filter((o) => o.fiscal_year_id === currentFyId) : orgs;
      const opts = currentOrgs.map((o) => ({ id: o.id, name: o.org_name || o.name }));
      setOrgOptions(opts);

      // Build assignment map
      const currentAssignments = currentFyId ? assignments.filter((a) => a.fiscal_year_id === currentFyId) : assignments;
      const orgMap = {};
      for (const o of orgs) orgMap[o.id] = o.org_name || o.name || "";
      const aMap = {};
      for (const a of currentAssignments) {
        if (!aMap[a.member_id]) aMap[a.member_id] = [];
        aMap[a.member_id].push({ org_name: orgMap[a.organization_id] || "", role: a.role || "", org_id: a.organization_id });
      }
      setAssignMap(aMap);

      // Enrich members
      const enriched = memberList.map((m) => ({
        id: m.id,
        last_name: m.last_name,
        first_name: m.first_name,
        last_name_kana: m.last_name_kana,
        first_name_kana: m.first_name_kana,
        member_type: m.member_type,
        is_new: m.is_new,
        is_graduate: m.is_graduate,
        profile_image: m.profile_image,
        company_name: m.show_company_in_directory ? m.company_name : "",
        company_position: m.show_company_in_directory ? m.company_position : "",
        email: m.show_email_in_directory ? m.email : "",
        mobile_phone: m.show_mobile_in_directory ? m.mobile_phone : "",
        org_assignments: aMap[m.id] || [],
      }));

      enriched.sort((a, b) => fullNameKana(a).localeCompare(fullNameKana(b), "ja"));
      setAllMembers(enriched);
    } catch (err) {
      setAllMembers([]);
      setError(err.message || "名簿の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { try { base44.appLogs?.logUserInApp?.('M1-会員名簿'); } catch (e) { /* analytics */ } }, []);
  useEffect(() => { loadMembers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply filters client-side
  useEffect(() => {
    let filtered = allMembers;
    const q = query.trim().toLowerCase();

    if (q) {
      filtered = filtered.filter((m) => {
        const haystack = [m.last_name, m.first_name, m.last_name_kana, m.first_name_kana, m.company_name].join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }

    if (typeFilter !== "全員") {
      filtered = filtered.filter((m) => m.member_type === typeFilter);
    }

    if (orgId) {
      filtered = filtered.filter((m) =>
        m.org_assignments.some((a) => a.org_id === orgId)
      );
    }

    setMembers(filtered);
  }, [allMembers, query, typeFilter, orgId]);

  function handleClearSearch() {
    setQuery("");
  }

  // ── Mobile card list ──
  function MemberCardList({ members: items }) {
    return (
      <div className="mobile-card-list">
        {items.map((member, index) => {
          const assigns = member.org_assignments || [];
          const orgText = assigns.map((a) => a.org_name).filter(Boolean).join("、");

          return (
            <div
              key={member.id}
              className="mobile-member-card card-interactive"
              style={{ animationDelay: `${Math.min(index, 20) * 0.03}s` }}
              onClick={() => navigate(`/directory/members/${member.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") navigate(`/directory/members/${member.id}`); }}
            >
              <MemberImage src={member.profile_image} name={fullName(member)} initial={nameInitial(member)} size="thumb" memberType={member.member_type} />
              <div className="mobile-member-card-body">
                <div className="mobile-member-card-name">
                  {displayValue(fullName(member))}
                  {member.is_new && <span className="pill pill-info" style={{ fontSize: "0.7em", marginLeft: 6 }}>新入</span>}
                  {member.is_graduate && <span className="pill pill-warning" style={{ fontSize: "0.7em", marginLeft: 6 }}>卒業</span>}
                </div>
                <div className="mobile-member-card-meta">
                  <span className="pill" style={{ fontSize: 12, padding: "1px 6px" }}>{displayValue(member.member_type)}</span>
                  {orgText && <span className="mobile-member-card-org">{orgText}</span>}
                </div>
                {member.email && (
                  <div className="mobile-member-card-email">{member.email}</div>
                )}
              </div>
              <div className="mobile-member-card-actions">
                {member.mobile_phone && (
                  <a
                    href={`tel:${member.mobile_phone}`}
                    className="mobile-action-icon"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`${fullName(member)}に電話`}
                  >
                    <Phone size={16} />
                  </a>
                )}
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="mobile-action-icon"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`${fullName(member)}にメール`}
                  >
                    <Mail size={16} />
                  </a>
                )}
                <ChevronRight size={18} className="mobile-member-chevron" />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Desktop table/grid (existing) ──
  function MemberGrid({ members: items }) {
    return (
      <div className="directory-grid">
        {items.map((member) => {
          const assigns = member.org_assignments || [];
          const orgText = assigns
            .map((a) => `${a.org_name}${a.role ? " / " + a.role : ""}`)
            .join("、");

          return (
            <Link
              key={member.id}
              to={`/directory/members/${member.id}`}
              className="directory-card directory-card-link"
              style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <div className="directory-card-header">
                <MemberImage src={member.profile_image} name={fullName(member)} initial={nameInitial(member)} size="thumb" memberType={member.member_type} />
                <div>
                  <h3>{displayValue(fullName(member))}</h3>
                  {orgText && (
                    <p className="muted" style={{ fontSize: "0.85em", margin: "2px 0 0" }}>
                      {orgText}
                    </p>
                  )}
                </div>
                <span className="pill">{displayValue(member.member_type)}</span>
                {member.is_new && <span className="pill pill-info" style={{ marginLeft: 4, fontSize: '0.75em' }}>新入</span>}
                {member.is_graduate && <span className="pill pill-warning" style={{ marginLeft: 4, fontSize: '0.75em' }}>卒業生</span>}
              </div>
              <dl className="directory-meta">
                {member.company_name && (
                  <div>
                    <dt>会社名</dt>
                    <dd>
                      {member.company_name}
                      {member.company_position ? " / " + member.company_position : ""}
                    </dd>
                  </div>
                )}
                {member.email && (
                  <div>
                    <dt>メール</dt>
                    <dd>{member.email}</dd>
                  </div>
                )}
                {member.mobile_phone && (
                  <div>
                    <dt>携帯番号</dt>
                    <dd>{member.mobile_phone}</dd>
                  </div>
                )}
              </dl>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <section className="admin-shell">
      <PageHeader title="会員名簿" subtitle="承認済・活動中の会員名簿を閲覧" />

      {/* Search area */}
      {isMobile ? (
        <div className="mobile-search-area">
          <div className="mobile-search-bar">
            <Search size={18} className="mobile-search-icon" />
            <input
              type="text"
              placeholder="氏名・フリガナ・会社名で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mobile-search-input"
            />
            {query && (
              <button type="button" className="mobile-search-clear" onClick={handleClearSearch} aria-label="検索をクリア">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <div className="filter-grid directory-filter" style={{ alignItems: "end" }}>
              <div className="field field-span-2">
                <label htmlFor="directory-search">検索</label>
                <input
                  id="directory-search"
                  name="q"
                  type="text"
                  placeholder="氏名 / フリガナ / 公開中の会社名"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="directory-org-filter">所属</label>
                <select
                  id="directory-org-filter"
                  name="organization_id"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                >
                  <option value="">すべて</option>
                  {orgOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className="filter-actions">
                <button className="button ghost" type="button" onClick={() => { setQuery(""); setOrgId(""); setTypeFilter("全員"); }}>リセット</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filter tabs (flat underline) */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--color-border)',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        marginBottom: 'var(--space-4)',
      }}>
        {MEMBER_TYPE_CHIPS.map((chip) => {
          const isActive = typeFilter === chip;
          const count = chip === "全員" ? allMembers.length : allMembers.filter(m => m.member_type === chip).length;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => setTypeFilter(chip)}
              style={{
                padding: '8px 14px', fontSize: 14, whiteSpace: 'nowrap', cursor: 'pointer',
                background: 'none', border: 'none', borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                transition: 'color var(--transition-fast), border-color var(--transition-fast)',
                display: 'inline-flex', alignItems: 'baseline',
              }}
            >
              {chip}{count > 0 && <span style={{ fontSize: 12, marginLeft: 3, fontWeight: 'var(--font-weight-normal)' }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Results */}
      <section className={isMobile ? "" : "card panel-card single-panel"}>
        <div className={isMobile ? "" : "card-body stack"}>
          {loading ? (
            <MemberListSkeleton count={6} mobile={isMobile} />
          ) : error ? (
            <p className="message error" aria-live="polite">{error}</p>
          ) : members.length === 0 ? (
            <div className="empty-state-enhanced">
              <Search size={32} style={{ color: "var(--color-text-tertiary)", marginBottom: 8 }} />
              <p style={{ fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 4px" }}>該当する会員が見つかりませんでした</p>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>検索条件を変更してお試しください</p>
            </div>
          ) : isMobile ? (
            <MemberCardList members={members} />
          ) : (
            <MemberGrid members={members} />
          )}
        </div>
      </section>
    </section>
  );
}
