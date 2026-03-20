import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import { Phone, Mail, ArrowLeft } from 'lucide-react';
import { MemberDetailSkeleton } from '../../components/ui/Skeleton';
import { fullName, fullNameKana, nameInitial } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  return String(value);
}

const MEMBER_TYPE_COLORS = {
  "正会員":   { bg: "var(--color-accent-light)", color: "var(--color-accent)", border: "#c7d2fe" },
  "賛助会員": { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  "OB会員":   { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  "名誉顧問": { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
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

export default function MemberProfile() {
  const { memberId } = useParams();
  const isMobile = useIsMobile();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

  // Dues and org data
  const [dues, setDues] = useState([]);
  const [orgAssignments, setOrgAssignments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);

  useEffect(() => {
    if (!memberId) return;

    setLoading(true);
    setError("");

    Promise.all([
      base44.entities.Member.get(memberId),
      base44.entities.FiscalYear.list().catch(() => []),
      base44.entities.Organization.list().catch(() => []),
      base44.entities.OrgAssignment.filter({ member_id: memberId }).catch(() => []),
    ])
      .then(([m, fyList, orgList, assignList]) => {
        // Apply directory visibility rules
        if (!m.show_email_in_directory) m.email = "";
        if (!m.show_mobile_in_directory) m.mobile_phone = "";
        if (!m.show_company_in_directory) {
          m.company_name = ""; m.company_position = ""; m.company_postal_code = "";
          m.company_address = ""; m.company_phone = ""; m.company_fax = ""; m.industry = "";
        }
        setMember(m);
        setFiscalYears(fyList || []);
        setOrganizations(orgList || []);
        setOrgAssignments(assignList || []);
      })
      .catch((err) => {
        setError(err.message || "会員情報の取得に失敗しました。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [memberId]);

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">会員詳細</h1>
        </div>
        <MemberDetailSkeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">会員詳細</h1>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message error">{error}</p>
            <div className="actions">
              <Link className="text-link" to="/directory">会員名簿へ戻る</Link>
            </div>
          </div>
        </section>
      </section>
    );
  }

  if (!member) return null;

  // Build org data
  const orgMap = {};
  organizations.forEach((o) => { orgMap[o.id || o._id] = o; });
  const currentFY = fiscalYears.find((fy) => fy.is_current);
  const currentFYId = currentFY?.id || currentFY?._id;

  const currentAssignments = currentFYId
    ? orgAssignments.filter((a) => a.fiscal_year_id === currentFYId)
    : orgAssignments;

  const orgText = currentAssignments
    .map((a) => {
      const org = orgMap[a.organization_id];
      return `${org?.org_name || ""}${a.role ? " / " + a.role : ""}`;
    })
    .filter(Boolean)
    .join("、");

  const joinYear = member.join_date ? member.join_date.slice(0, 4) + "年" : "";

  const TABS = [
    { id: "basic", label: "基本情報" },
    { id: "org", label: "組織" },
  ];

  return (
    <section className="admin-shell profile-page">
      {/* Back button */}
      <Link to="/directory" className="profile-back-link">
        <ArrowLeft size={16} />
        <span>名簿に戻る</span>
      </Link>

      {/* Hero card */}
      <section className="profile-hero card">
        <div className="profile-hero-inner">
          <MemberImage src={member.profile_image} name={fullName(member)} initial={nameInitial(member)} size="detail" memberType={member.member_type} />
          <div className="profile-hero-info">
            <h1 className="profile-hero-name">{displayValue(fullName(member))}</h1>
            <div className="profile-hero-badges">
              <span className="pill">{displayValue(member.member_type)}</span>
              {orgText && <span className="profile-hero-org">{orgText}</span>}
            </div>
            {/* Action buttons */}
            <div className="profile-hero-actions">
              {member.mobile_phone && (
                <a href={`tel:${member.mobile_phone}`} className="profile-action-btn">
                  <Phone size={16} />
                  <span>電話する</span>
                </a>
              )}
              {member.email && (
                <a href={`mailto:${member.email}`} className="profile-action-btn">
                  <Mail size={16} />
                  <span>メール</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "basic" && (
        <section className="card panel-card fade-slide-in">
          <div className="card-body stack">
            <dl className="detail-grid">
              <div><dt>氏名</dt><dd>{displayValue(fullName(member))}</dd></div>
              <div><dt>フリガナ</dt><dd>{displayValue(fullNameKana(member))}</dd></div>
              <div><dt>生年月日</dt><dd>{displayValue(member.birthday)}</dd></div>
              {joinYear && <div><dt>入会年</dt><dd>{joinYear}</dd></div>}
              <div><dt>会員種別</dt><dd>{displayValue(member.member_type)}</dd></div>
              {member.email && <div><dt>メール</dt><dd>{member.email}</dd></div>}
              {member.mobile_phone && <div><dt>携帯番号</dt><dd>{member.mobile_phone}</dd></div>}
              {member.company_name && <div><dt>会社名</dt><dd>{member.company_name}</dd></div>}
              {member.company_position && <div><dt>役職</dt><dd>{member.company_position}</dd></div>}
              {member.company_postal_code && <div><dt>会社郵便番号</dt><dd>{member.company_postal_code}</dd></div>}
              {member.company_address && <div><dt>会社住所</dt><dd>{member.company_address}</dd></div>}
              {member.company_phone && <div><dt>会社電話</dt><dd>{member.company_phone}</dd></div>}
              {member.company_fax && <div><dt>会社FAX</dt><dd>{member.company_fax}</dd></div>}
              {member.industry && <div><dt>業種</dt><dd>{member.industry}</dd></div>}
            </dl>
          </div>
        </section>
      )}

      {activeTab === "org" && (
        <section className="card panel-card fade-slide-in">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>所属組織 {currentFY ? `(${currentFY.year}年度)` : ""}</h2></div></div>
            {currentAssignments.length === 0 ? (
              <p className="muted">組織配属情報はありません。</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {currentAssignments.map((a) => {
                  const aId = a.id || a._id;
                  const org = orgMap[a.organization_id];
                  return (
                    <div key={aId} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "0.6rem 1rem", borderRadius: 8,
                      background: "var(--color-border)", border: "1px solid var(--color-border)",
                    }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {org?.org_name || "不明な組織"}
                      </span>
                      <span className="pill" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                        {a.role || "メンバー"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
      {isMobile && (
        <style>{`
          .detail-grid { grid-template-columns: 1fr !important; }
          .card-body { padding: 12px !important; }
        `}</style>
      )}
    </section>
  );
}
