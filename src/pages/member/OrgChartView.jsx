import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  return String(value);
}

function formatFiscalYearLabel(fiscalYear) {
  if (!fiscalYear || !fiscalYear.year) return "年度未設定";
  return `${fiscalYear.year}年度`;
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

function OrganizationAssignment({ assignment }) {
  const member = assignment.member || {};
  return (
    <li className="organization-assignment">
      <MemberImage src={member.profile_image} name={member.name_kanji} size="thumb" />
      <div className="org-assignment-info">
        <strong>{displayValue(assignment.role)}</strong>
        <Link className="text-link" to={`/directory/members/${encodeURIComponent(member.id || "")}`}>
          {displayValue(member.name_kanji)}
        </Link>
      </div>
      {member.member_type && <span className="pill">{member.member_type}</span>}
    </li>
  );
}

function OrganizationCard({ organization, isChild }) {
  const assignments = Array.isArray(organization.assignments) ? organization.assignments : [];
  const children = Array.isArray(organization.children) ? organization.children : [];

  return (
    <article className={`organization-card${isChild ? " org-child" : ""}`}>
      <div className="panel-heading">
        <div>
          <span className="pill">{displayValue(organization.org_type || "組織")}</span>
          <h2>{displayValue(organization.org_name)}</h2>
        </div>
        <span className="muted">{assignments.length}名</span>
      </div>
      {assignments.length ? (
        <ul className="organization-assignment-list">
          {assignments.map((assignment, idx) => (
            <OrganizationAssignment key={idx} assignment={assignment} />
          ))}
        </ul>
      ) : (
        <p className="empty-state">この組織にはまだ配属データがありません。</p>
      )}
      {children.length > 0 && (
        <div className="org-children">
          {children.map((child) => (
            <OrganizationCard key={child.id} organization={child} isChild />
          ))}
        </div>
      )}
    </article>
  );
}

function buildTree(organizations) {
  const orgById = new Map();
  organizations.forEach((org) => {
    orgById.set(org.id, { ...org, children: [] });
  });
  const roots = [];
  orgById.forEach((org) => {
    const parentId = org.parent_id || "";
    if (parentId && orgById.has(parentId)) {
      orgById.get(parentId).children.push(org);
    } else {
      roots.push(org);
    }
  });
  return roots;
}

export default function OrgChartView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYearIdParam = searchParams.get("fiscalYearId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [years, setYears] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [orgTree, setOrgTree] = useState([]);
  const [organizationsCount, setOrganizationsCount] = useState(0);
  const [assignmentsCount, setAssignmentsCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");

    (async () => {
      try {
        const [yearsList, allOrgs, allAssignments, allMembers] = await Promise.all([
          base44.entities.FiscalYear.list("-year"),
          base44.entities.Organization.list("sort_order"),
          base44.entities.OrgAssignment.list("sort_order"),
          base44.entities.Member.filter({ approval_status: "承認済", status: "活動中" }),
        ]);

        const currentFy = yearsList.find((fy) => fy.is_current === true);
        const effectiveId = fiscalYearIdParam || currentFy?.id || "";
        const selectedFy = yearsList.find((fy) => fy.id === effectiveId) || null;

        const memberMap = {};
        for (const m of allMembers) memberMap[m.id] = m;

        const fyOrgs = allOrgs.filter((o) => o.fiscal_year_id === effectiveId);
        const fyAssignments = allAssignments.filter((a) => a.fiscal_year_id === effectiveId);

        const organizations = fyOrgs.map((org) => ({
          ...org,
          assignments: fyAssignments
            .filter((a) => a.organization_id === org.id)
            .map((a) => ({
              ...a,
              member: memberMap[a.member_id] || {},
            })),
        }));

        setYears(yearsList);
        setSelectedFiscalYear(selectedFy);
        setOrganizationsCount(fyOrgs.length);
        setAssignmentsCount(fyAssignments.length);
        setOrgTree(buildTree(organizations));
      } catch (err) {
        setError(err.message || "組織図の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [fiscalYearIdParam]);

  function handleFiscalYearChange(e) {
    const value = String(e.target.value || "").trim();
    if (value) {
      setSearchParams({ fiscalYearId: value });
    } else {
      setSearchParams({});
    }
  }

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">組織図</h1>
          <p className="page-description">年度ごとの組織と配属を一覧表示</p>
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
          <h1 className="page-title">組織図</h1>
          <p className="page-description">年度ごとの組織と配属を一覧表示</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message error">{error}</p>
            <div className="actions">
              <Link className="text-link" to="/directory">会員名簿へ</Link>
              <Link className="text-link" to="/mypage">マイページへ</Link>
              <Link className="text-link" to="/info">基本情報へ</Link>
              <Link className="text-link" to="/manual">運用マニュアルへ</Link>
            </div>
          </div>
        </section>
      </section>
    );
  }

  const selectedFiscalYearId = selectedFiscalYear?.id || "";

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">組織図</h1>
        <p className="page-description">年度ごとの組織と配属を一覧表示</p>
      </div>
      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <div className="panel-heading">
            <div>
              <h2>
                {selectedFiscalYear
                  ? `${formatFiscalYearLabel(selectedFiscalYear)}の組織図`
                  : "組織図"}
              </h2>
            </div>
          </div>

          <form className="basic-info-filter" noValidate>
            <div className="field">
              <label htmlFor="organization-fiscal-year">年度</label>
              <select
                id="organization-fiscal-year"
                name="fiscal_year_id"
                value={selectedFiscalYearId}
                onChange={handleFiscalYearChange}
              >
                {years.length ? (
                  years.map((fy) => (
                    <option key={fy.id} value={fy.id}>
                      {formatFiscalYearLabel(fy)}{fy.is_current ? "（現在年度）" : ""}
                    </option>
                  ))
                ) : (
                  <option value="">年度データ未登録</option>
                )}
              </select>
            </div>
          </form>

          {!years.length && (
            <p className="empty-state">
              年度が未登録のため、表示対象の年度を決められません。管理画面で年度を登録すると切替表示できます。
            </p>
          )}

          {years.length > 0 && organizationsCount === 0 && (
            <p className="empty-state">この年度の組織データはまだ登録されていません。</p>
          )}

          {years.length > 0 && organizationsCount > 0 && assignmentsCount === 0 && (
            <p className="empty-state">この年度の配属データはまだ登録されていません。</p>
          )}

          <div className="organization-tree">
            {orgTree.map((org) => (
              <OrganizationCard key={org.id} organization={org} isChild={false} />
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
