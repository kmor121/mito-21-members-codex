import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import { Phone, Mail, ArrowLeft } from 'lucide-react';
import { MemberDetailSkeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui';
import { fullName, fullNameKana, nameInitial } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

const MEMBER_TYPE_COLORS = {
  "正会員":   { bg: "var(--color-accent-light)", color: "var(--color-accent)", border: "#c7d2fe" },
  "賛助会員": { bg: "var(--color-success-light)", color: "var(--color-success)", border: "#a7f3d0" },
  "OB会員":   { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  "名誉顧問": { bg: "var(--color-warning-light)", color: "#92400e", border: "#fde68a" },
};

function MemberImage({ src, name, initial: initialOverride, memberType }) {
  const initial = initialOverride || (name || "M").charAt(0);
  if (src) {
    return (
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius-full)', overflow: 'hidden', flexShrink: 0,
        border: '2px solid var(--color-border)',
      }}>
        <img src={src} alt={name || "プロフィール画像"} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  const typeColor = MEMBER_TYPE_COLORS[memberType];
  const bgStyle = typeColor
    ? { background: `linear-gradient(135deg, ${typeColor.bg}, ${typeColor.border})`, color: typeColor.color }
    : { background: 'var(--color-bg-sub)', color: 'var(--color-text-secondary)' };
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 'var(--radius-full)', flexShrink: 0,
      border: '2px solid var(--color-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18, fontWeight: 'var(--font-weight-semibold)', ...bgStyle,
    }}>
      {initial}
    </div>
  );
}

function InfoRow({ label, value, isMobile, isLast }) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '100px 1fr' : '120px 1fr',
      padding: '12px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>{label}</span>
      {isEmpty ? (
        <span style={{ fontSize: 14, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>未設定</span>
      ) : (
        <span style={{ fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>{String(value)}</span>
      )}
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

  const [orgAssignments, setOrgAssignments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);

  useEffect(() => { try { base44.appLogs?.logUserInApp?.('M2-会員詳細'); } catch (e) { /* analytics */ } }, []);
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
      .catch((err) => setError(err.message || "会員情報の取得に失敗しました。"))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) {
    return (
      <section className="admin-shell">
        <Link to="/directory" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={16} /> 名簿に戻る
        </Link>
        <MemberDetailSkeleton />
      </section>
    );
  }

  if (error || !member) {
    return (
      <section className="admin-shell">
        <Link to="/directory" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={16} /> 名簿に戻る
        </Link>
        <Card><p style={{ color: 'var(--color-danger)', fontSize: 14 }}>{error || "会員が見つかりませんでした"}</p></Card>
      </section>
    );
  }

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

  // Build basic info rows
  const basicRows = [
    { label: "氏名", value: fullName(member) },
    { label: "フリガナ", value: fullNameKana(member) },
    { label: "生年月日", value: member.birthday },
    ...(joinYear ? [{ label: "入会年", value: joinYear }] : []),
    { label: "会員種別", value: member.member_type },
    ...(member.email ? [{ label: "メール", value: member.email }] : []),
    ...(member.mobile_phone ? [{ label: "携帯番号", value: member.mobile_phone }] : []),
    ...(member.company_name ? [{ label: "会社名", value: member.company_name }] : []),
    ...(member.company_position ? [{ label: "役職", value: member.company_position }] : []),
    ...(member.company_postal_code ? [{ label: "会社〒", value: member.company_postal_code }] : []),
    ...(member.company_address ? [{ label: "会社住所", value: member.company_address }] : []),
    ...(member.company_phone ? [{ label: "会社電話", value: member.company_phone }] : []),
    ...(member.company_fax ? [{ label: "会社FAX", value: member.company_fax }] : []),
    ...(member.industry ? [{ label: "業種", value: member.industry }] : []),
  ];

  return (
    <section className="admin-shell">
      {/* Back link */}
      <Link to="/directory" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: 16,
      }}>
        <ArrowLeft size={16} /> 名簿に戻る
      </Link>

      {/* Profile header card */}
      <Card padding="var(--space-4)" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <MemberImage src={member.profile_image} name={fullName(member)} initial={nameInitial(member)} memberType={member.member_type} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
              {fullName(member)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 12, padding: '1px 8px', borderRadius: 'var(--radius-full)',
                background: 'var(--color-accent-light)', color: 'var(--color-accent)', fontWeight: 600,
              }}>{member.member_type}</span>
              {orgText && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{orgText}</span>}
            </div>
          </div>
        </div>
        {/* Action buttons */}
        {(member.mobile_phone || member.email) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {member.mobile_phone && (
              <a href={`tel:${member.mobile_phone}`} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                fontSize: 13, fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)',
                textDecoration: 'none', cursor: 'pointer',
              }}>
                <Phone size={15} /> 電話する
              </a>
            )}
            {member.email && (
              <a href={`mailto:${member.email}`} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                fontSize: 13, fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)',
                textDecoration: 'none', cursor: 'pointer',
              }}>
                <Mail size={15} /> メール
              </a>
            )}
          </div>
        )}
      </Card>

      {/* Tabs (flat underline) */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--space-3)',
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 14px', fontSize: 14, whiteSpace: 'nowrap', cursor: 'pointer',
                background: 'none', border: 'none',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                transition: 'color var(--transition-fast), border-color var(--transition-fast)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "basic" && (
        <Card padding="0" style={{ overflow: 'hidden' }}>
          {basicRows.map((row, idx) => (
            <InfoRow
              key={row.label}
              label={row.label}
              value={row.value}
              isMobile={isMobile}
              isLast={idx === basicRows.length - 1}
            />
          ))}
        </Card>
      )}

      {activeTab === "org" && (
        <Card padding="0" style={{ overflow: 'hidden' }}>
          <div style={{
            fontSize: 15, fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)',
            padding: '12px 16px', background: 'var(--color-bg-sub)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            所属組織 {currentFY ? `(${currentFY.year}年度)` : ""}
          </div>
          {currentAssignments.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)', margin: 0 }}>組織配属情報はありません</p>
            </div>
          ) : (
            currentAssignments.map((a, idx) => {
              const org = orgMap[a.organization_id];
              return (
                <div key={a.id || a._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: idx < currentAssignments.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 14, color: 'var(--color-text-primary)' }}>
                    {org?.org_name || "不明な組織"}
                  </span>
                  <span style={{
                    fontSize: 12, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    background: 'var(--color-accent-light)', color: 'var(--color-accent)', fontWeight: 600,
                  }}>
                    {a.role || "メンバー"}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      )}
    </section>
  );
}
