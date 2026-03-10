import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  return String(value);
}

function MemberImage({ src, name, size = "detail" }) {
  const initial = (name || "M").charAt(0);
  if (src) {
    return (
      <div className={`member-image member-image-${size}`}>
        <img src={src} alt={name || "会員プロフィール画像"} loading="lazy" />
      </div>
    );
  }
  return (
    <div className={`member-image member-image-${size} is-placeholder`} aria-label="プロフィール画像未設定">
      <span>{initial}</span>
    </div>
  );
}

export default function Directory() {
  const [members, setMembers] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [query, setQuery] = useState("");
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadMembers = useCallback(async (searchQuery, searchOrgId) => {
    setError("");
    setMessage("読み込み中...");

    try {
      const q = String(searchQuery || "").trim().toLowerCase();
      const org = String(searchOrgId || "").trim();

      const [allMembers, fiscalYears, orgs, assignments] = await Promise.all([
        base44.entities.Member.filter({ approval_status: "承認済", status: "活動中" }),
        base44.entities.FiscalYear.list(),
        base44.entities.Organization.list(),
        base44.entities.OrgAssignment.list(),
      ]);

      const currentFy = fiscalYears.find((fy) => fy.is_current === true);
      const currentFyId = currentFy?.id || "";
      const currentOrgs = currentFyId ? orgs.filter((o) => o.fiscal_year_id === currentFyId) : orgs;
      const opts = currentOrgs.map((o) => ({ id: o.id, name: o.name }));
      if (orgOptions.length === 0 && opts.length > 0) setOrgOptions(opts);

      // Build assignment map
      const currentAssignments = currentFyId ? assignments.filter((a) => a.fiscal_year_id === currentFyId) : assignments;
      const orgMap = {};
      for (const o of orgs) orgMap[o.id] = o.name || "";
      const assignMap = {};
      for (const a of currentAssignments) {
        if (!assignMap[a.member_id]) assignMap[a.member_id] = [];
        assignMap[a.member_id].push({ org_name: orgMap[a.organization_id] || "", role: a.role || "" });
      }

      // Enrich members with directory-visible data and org assignments
      let membersList = allMembers.map((m) => ({
        id: m.id,
        name_kanji: m.name_kanji,
        name_kana: m.name_kana,
        member_type: m.member_type,
        is_new: m.is_new,
        is_graduate: m.is_graduate,
        profile_image: m.profile_image,
        company_name: m.show_company_in_directory ? m.company_name : "",
        company_position: m.show_company_in_directory ? m.company_position : "",
        email: m.show_email_in_directory ? m.email : "",
        mobile_phone: m.show_mobile_in_directory ? m.mobile_phone : "",
        org_assignments: assignMap[m.id] || [],
      }));

      // Apply search filter
      if (q) {
        membersList = membersList.filter((m) => {
          const haystack = [m.name_kanji, m.name_kana, m.company_name].join(" ").toLowerCase();
          return haystack.includes(q);
        });
      }

      // Apply org filter
      if (org) {
        const memberIdsInOrg = new Set(currentAssignments.filter((a) => a.organization_id === org).map((a) => a.member_id));
        membersList = membersList.filter((m) => memberIdsInOrg.has(m.id));
      }

      membersList.sort((a, b) => (a.name_kana || "").localeCompare(b.name_kana || "", "ja"));

      setMembers(membersList);
      setMessage(`${membersList.length}件を表示中 / 対象: 承認済・活動中 / 並び順: 氏名昇順`);
    } catch (err) {
      setMembers([]);
      setError(err.message || "名簿の取得に失敗しました。");
      setMessage("");
    } finally {
      setLoading(false);
    }
  }, [orgOptions.length]);

  useEffect(() => {
    loadMembers("", "");
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    loadMembers(query, orgId);
  }

  function handleReset() {
    setQuery("");
    setOrgId("");
    setLoading(true);
    loadMembers("", "");
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">会員名簿</h1>
        <p className="page-description">承認済・活動中の会員名簿を閲覧</p>
      </div>
      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <form className="filter-grid directory-filter" noValidate onSubmit={handleSubmit}>
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
              <button className="button" type="submit">検索する</button>
              <button className="button ghost" type="button" onClick={handleReset}>リセット</button>
            </div>
          </form>

          <div className="panel-heading compact">
            <p className={`message${error ? " error" : ""}`} aria-live="polite">
              {error || message}
            </p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : members.length === 0 && !error ? (
            <p className="empty-state">表示できる会員はいません。</p>
          ) : (
            <div className="directory-grid">
              {members.map((member) => {
                const assigns = Array.isArray(member.org_assignments) ? member.org_assignments : [];
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
                      <MemberImage src={member.profile_image} name={member.name_kanji} size="thumb" />
                      <div>
                        <h3>{displayValue(member.name_kanji)}</h3>
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
          )}
        </div>
      </section>
    </section>
  );
}
