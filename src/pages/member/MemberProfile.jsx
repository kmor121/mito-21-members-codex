import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../../api/base44Client';
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

export default function MemberProfile() {
  const { memberId } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!memberId) return;

    setLoading(true);
    setError("");

    apiRequest(`get-directory-member-detail?id=${encodeURIComponent(memberId)}`)
      .then((result) => {
        setMember(result.member || result);
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
          <p className="page-description">公開設定に応じた会員情報を表示</p>
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
          <h1 className="page-title">会員詳細</h1>
          <p className="page-description">公開設定に応じた会員情報を表示</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message error">{error}</p>
            <div className="actions">
              <Link className="text-link" to="/directory">名簿閲覧へ戻る</Link>
            </div>
          </div>
        </section>
      </section>
    );
  }

  if (!member) return null;

  const assigns = member.org_assignments || [];
  const orgText = assigns
    .map((a) => `${a.org_name}${a.role ? " / " + a.role : ""}`)
    .join("、");
  const joinYear = member.join_date ? member.join_date.slice(0, 4) + "年" : "";

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">会員詳細</h1>
        <p className="page-description">公開設定に応じた会員情報を表示</p>
      </div>
      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <div className="panel-heading">
            <div><h2>{displayValue(member.name_kanji)}</h2></div>
            <span className="pill">{displayValue(member.member_type)}</span>
          </div>
          <section className="detail-card stack-sm">
            <div className="member-image-wrap">
              <MemberImage src={member.profile_image} name={member.name_kanji} size="detail" />
            </div>
            <dl className="detail-grid">
              <div><dt>氏名</dt><dd>{displayValue(member.name_kanji)}</dd></div>
              {orgText && <div><dt>委員会・役職</dt><dd>{orgText}</dd></div>}
              <div><dt>生年月日</dt><dd>{displayValue(member.birthday)}</dd></div>
              {joinYear && <div><dt>入会年</dt><dd>{joinYear}</dd></div>}
              <div><dt>会員種別</dt><dd>{displayValue(member.member_type)}</dd></div>
              {member.company_name && <div><dt>会社名</dt><dd>{member.company_name}</dd></div>}
              {member.company_position && <div><dt>役職</dt><dd>{member.company_position}</dd></div>}
              {member.company_postal_code && <div><dt>会社郵便番号</dt><dd>{member.company_postal_code}</dd></div>}
              {member.company_address && <div><dt>会社住所</dt><dd>{member.company_address}</dd></div>}
              {member.company_phone && <div><dt>会社電話</dt><dd>{member.company_phone}</dd></div>}
              {member.company_fax && <div><dt>会社FAX</dt><dd>{member.company_fax}</dd></div>}
              {member.industry && <div><dt>業種</dt><dd>{member.industry}</dd></div>}
              {member.email && <div><dt>メール</dt><dd>{member.email}</dd></div>}
              {member.mobile_phone && <div><dt>携帯番号</dt><dd>{member.mobile_phone}</dd></div>}
            </dl>
          </section>
          <div className="actions">
            <Link className="text-link subtle-link" to="/directory">名簿</Link>
            <Link className="text-link subtle-link" to="/organization">組織図</Link>
          </div>
        </div>
      </section>
    </section>
  );
}
