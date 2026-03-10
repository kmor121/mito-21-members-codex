import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiRequest, base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  return String(value);
}

function normalizeMemberStatus(value) {
  return value === "active" ? "活動中" : String(value ?? "").trim();
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

function buildFormDataFromMember(m) {
  return {
    email: m.email || "",
    mobile_phone: m.mobile_phone || "",
    company_name: m.company_name || "",
    company_position: m.company_position || "",
    industry: m.industry || "",
    company_postal_code: m.company_postal_code || "",
    company_address: m.company_address || "",
    company_phone: m.company_phone || "",
    company_fax: m.company_fax || "",
    company_pr: m.company_pr || "",
    home_postal_code: m.home_postal_code || "",
    home_address: m.home_address || "",
    home_phone: m.home_phone || "",
    home_fax: m.home_fax || "",
    hobbies: m.hobbies || "",
    show_email_in_directory: !!m.show_email_in_directory,
    show_company_in_directory: !!m.show_company_in_directory,
    show_mobile_in_directory: !!m.show_mobile_in_directory,
  };
}

export default function MyPage() {
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get("memberId") || "";

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({});
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    base44.entities.Member.get(memberId)
      .then((m) => {
        setMember(m);
        setFormData(buildFormDataFromMember(m));

        // Check for flash message
        const flash = sessionStorage.getItem("mypage-message") || "";
        if (flash) {
          setFormMessage(flash);
          setFormMessageType("success");
          sessionStorage.removeItem("mypage-message");
        }
      })
      .catch((err) => {
        setError(err.message || "会員情報の取得に失敗しました。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [memberId]);

  function updateField(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleStartEdit() {
    setFormMessage("");
    setFormMessageType("");
    setIsEditing(true);
  }

  function handleCancelEdit() {
    if (member) {
      setFormData(buildFormDataFromMember(member));
    }
    setFormMessage("");
    setFormMessageType("");
    setIsEditing(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormMessage("");
    setFormMessageType("");

    const email = String(formData.email || "").trim();

    if (!email) {
      setFormMessage("メールを入力してください。");
      setFormMessageType("error");
      return;
    }

    if (!email.includes("@")) {
      setFormMessage("メールアドレスの形式を確認してください。");
      setFormMessageType("error");
      return;
    }

    setSubmitting(true);

    const payload = {
      id: member.id,
      allow_partial_profile_update: true,
      changed_by: member.name_kanji || "会員",
      changed_by_role: "member",
      email: email,
      mobile_phone: String(formData.mobile_phone || "").trim(),
      company_name: String(formData.company_name || "").trim(),
      company_position: String(formData.company_position || "").trim(),
      industry: String(formData.industry || "").trim(),
      company_postal_code: String(formData.company_postal_code || "").trim(),
      company_address: String(formData.company_address || "").trim(),
      company_phone: String(formData.company_phone || "").trim(),
      company_fax: String(formData.company_fax || "").trim(),
      company_pr: String(formData.company_pr || "").trim(),
      home_postal_code: String(formData.home_postal_code || "").trim(),
      home_address: String(formData.home_address || "").trim(),
      home_phone: String(formData.home_phone || "").trim(),
      home_fax: String(formData.home_fax || "").trim(),
      hobbies: String(formData.hobbies || "").trim(),
      show_email_in_directory: !!formData.show_email_in_directory,
      show_company_in_directory: !!formData.show_company_in_directory,
      show_mobile_in_directory: !!formData.show_mobile_in_directory,
    };

    try {
      await apiRequest("update-member-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      sessionStorage.setItem("mypage-message", "保存しました。");
      window.location.assign(`/mypage?memberId=${encodeURIComponent(memberId)}`);
    } catch (err) {
      if (err.message === "Email already exists") {
        setFormMessage("このメールアドレスは別の申込または会員ですでに使われています。");
      } else {
        setFormMessage(err.message || "保存に失敗しました。");
      }
      setFormMessageType("error");
      setSubmitting(false);
    }
  }

  // No memberId provided
  if (!memberId) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">マイページ</h1>
          <p className="page-description">自分の情報と名簿公開設定を管理</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message">例: <code>/mypage?memberId=YOUR_MEMBER_ID</code></p>
            <div className="actions">
              <Link className="text-link" to="/directory">会員名簿へ</Link>
              <Link className="text-link" to="/info">基本情報へ</Link>
              <Link className="text-link" to="/organization">組織図へ</Link>
              <Link className="text-link" to="/manual">運用マニュアルへ</Link>
            </div>
          </div>
        </section>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">マイページ</h1>
          <p className="page-description">自分の情報と名簿公開設定を管理</p>
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
          <h1 className="page-title">マイページ</h1>
          <p className="page-description">自分の情報と名簿公開設定を管理</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message error">{error}</p>
            <div className="actions">
              <Link className="text-link" to="/directory">会員名簿へ</Link>
              <Link className="text-link" to="/info">基本情報へ</Link>
              <Link className="text-link" to="/organization">組織図へ</Link>
              <Link className="text-link" to="/manual">運用マニュアルへ</Link>
            </div>
          </div>
        </section>
      </section>
    );
  }

  if (!member) return null;

  // ── VIEW MODE ──
  if (!isEditing) {
    return (
      <section className="admin-shell">
        <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="page-title">マイページ</h1>
            <p className="page-description">自分の情報と名簿公開設定を管理</p>
          </div>
          <button className="button" type="button" onClick={handleStartEdit}>編集する</button>
        </div>

        {formMessage && (
          <p className={`message ${formMessageType}`} aria-live="polite">{formMessage}</p>
        )}

        {/* Header card */}
        <section className="card panel-card">
          <div className="card-body stack">
            <section className="detail-card stack-sm">
              <div className="detail-header-row">
                <div>
                  <h3>{displayValue(member.name_kanji)}</h3>
                </div>
                <div className="pill-row">
                  <span className="pill">{displayValue(member.member_type)}</span>
                  <span className="pill">{displayValue(normalizeMemberStatus(member.status))}</span>
                </div>
              </div>
              <div className="member-image-wrap">
                <MemberImage src={member.profile_image} name={member.name_kanji} size="detail" />
              </div>
              <dl className="detail-grid">
                <div><dt>氏名</dt><dd>{displayValue(member.name_kanji)}</dd></div>
                <div><dt>フリガナ</dt><dd>{displayValue(member.name_kana)}</dd></div>
                <div><dt>会員番号</dt><dd>{displayValue(member.member_number)}</dd></div>
                <div><dt>会員種別</dt><dd>{displayValue(member.member_type)}</dd></div>
                <div><dt>ステータス</dt><dd>{displayValue(normalizeMemberStatus(member.status))}</dd></div>
              </dl>
            </section>
          </div>
        </section>

        {/* 個人連絡先 */}
        <section className="card panel-card">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>個人連絡先</h2></div></div>
            <dl className="detail-grid">
              <div><dt>メール</dt><dd>{displayValue(member.email)}</dd></div>
              <div><dt>携帯番号</dt><dd>{displayValue(member.mobile_phone)}</dd></div>
            </dl>
          </div>
        </section>

        {/* 会社情報 */}
        <section className="card panel-card">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>会社情報</h2></div></div>
            <dl className="detail-grid">
              <div><dt>会社名</dt><dd>{displayValue(member.company_name)}</dd></div>
              <div><dt>役職</dt><dd>{displayValue(member.company_position)}</dd></div>
              <div><dt>業種</dt><dd>{displayValue(member.industry)}</dd></div>
              <div><dt>会社郵便番号</dt><dd>{displayValue(member.company_postal_code)}</dd></div>
              <div><dt>会社住所</dt><dd>{displayValue(member.company_address)}</dd></div>
              <div><dt>会社電話</dt><dd>{displayValue(member.company_phone)}</dd></div>
              <div><dt>会社FAX</dt><dd>{displayValue(member.company_fax)}</dd></div>
              <div><dt>会社PR</dt><dd>{displayValue(member.company_pr)}</dd></div>
            </dl>
          </div>
        </section>

        {/* 自宅情報 */}
        <section className="card panel-card">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>自宅情報</h2></div></div>
            <dl className="detail-grid">
              <div><dt>自宅郵便番号</dt><dd>{displayValue(member.home_postal_code)}</dd></div>
              <div><dt>自宅住所</dt><dd>{displayValue(member.home_address)}</dd></div>
              <div><dt>自宅電話</dt><dd>{displayValue(member.home_phone)}</dd></div>
              <div><dt>自宅FAX</dt><dd>{displayValue(member.home_fax)}</dd></div>
            </dl>
          </div>
        </section>

        {/* その他 */}
        <section className="card panel-card">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>その他</h2></div></div>
            <dl className="detail-grid">
              <div><dt>趣味・信条</dt><dd>{displayValue(member.hobbies)}</dd></div>
            </dl>
          </div>
        </section>

        {/* 名簿公開設定 */}
        <section className="card panel-card">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>名簿公開設定</h2></div></div>
            <dl className="detail-grid">
              <div><dt>メールを名簿に公開する</dt><dd>{displayValue(!!member.show_email_in_directory)}</dd></div>
              <div><dt>会社情報を名簿に公開する</dt><dd>{displayValue(!!member.show_company_in_directory)}</dd></div>
              <div><dt>携帯番号を名簿に公開する</dt><dd>{displayValue(!!member.show_mobile_in_directory)}</dd></div>
            </dl>
          </div>
        </section>
      </section>
    );
  }

  // ── EDIT MODE ──
  return (
    <section className="admin-shell">
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">マイページ - 編集</h1>
          <p className="page-description">自分の情報と名簿公開設定を管理</p>
        </div>
      </div>

      <section className="card panel-card">
        <div className="card-body stack">
          <p className="muted">名簿に出るのは公開フラグをオンにした項目です。氏名・フリガナ・生年月日・会員番号は管理者のみ変更可能です。</p>
          <form className="editor-form" noValidate onSubmit={handleSubmit}>
            <h4 style={{ margin: "0.5rem 0 0.25rem" }}>個人連絡先</h4>
            <div className="editor-grid">
              <div className="field">
                <label htmlFor="mypage-email">メール</label>
                <input
                  id="mypage-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="mypage-mobile-phone">携帯番号</label>
                <input
                  id="mypage-mobile-phone"
                  name="mobile_phone"
                  type="tel"
                  value={formData.mobile_phone}
                  onChange={(e) => updateField("mobile_phone", e.target.value)}
                />
              </div>
            </div>

            <h4 style={{ margin: "0.5rem 0 0.25rem" }}>会社情報</h4>
            <div className="editor-grid">
              <div className="field">
                <label htmlFor="mypage-company-name">会社名</label>
                <input id="mypage-company-name" name="company_name" type="text" value={formData.company_name} onChange={(e) => updateField("company_name", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mypage-company-position">役職</label>
                <input id="mypage-company-position" name="company_position" type="text" value={formData.company_position} onChange={(e) => updateField("company_position", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mypage-industry">業種</label>
                <input id="mypage-industry" name="industry" type="text" value={formData.industry} onChange={(e) => updateField("industry", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mypage-company-postal-code">会社郵便番号</label>
                <input id="mypage-company-postal-code" name="company_postal_code" type="text" value={formData.company_postal_code} onChange={(e) => updateField("company_postal_code", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mypage-company-address">会社住所</label>
                <textarea id="mypage-company-address" name="company_address" rows="2" value={formData.company_address} onChange={(e) => updateField("company_address", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mypage-company-phone">会社電話</label>
                <input id="mypage-company-phone" name="company_phone" type="tel" value={formData.company_phone} onChange={(e) => updateField("company_phone", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mypage-company-fax">会社FAX</label>
                <input id="mypage-company-fax" name="company_fax" type="tel" value={formData.company_fax} onChange={(e) => updateField("company_fax", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mypage-company-pr">会社PR</label>
                <textarea id="mypage-company-pr" name="company_pr" rows="2" value={formData.company_pr} onChange={(e) => updateField("company_pr", e.target.value)} />
              </div>
            </div>

            <h4 style={{ margin: "0.5rem 0 0.25rem" }}>自宅情報</h4>
            <div className="editor-grid">
              <div className="field">
                <label htmlFor="mypage-home-postal-code">自宅郵便番号</label>
                <input id="mypage-home-postal-code" name="home_postal_code" type="text" value={formData.home_postal_code} onChange={(e) => updateField("home_postal_code", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mypage-home-address">自宅住所</label>
                <textarea id="mypage-home-address" name="home_address" rows="2" value={formData.home_address} onChange={(e) => updateField("home_address", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mypage-home-phone">自宅電話</label>
                <input id="mypage-home-phone" name="home_phone" type="tel" value={formData.home_phone} onChange={(e) => updateField("home_phone", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mypage-home-fax">自宅FAX</label>
                <input id="mypage-home-fax" name="home_fax" type="tel" value={formData.home_fax} onChange={(e) => updateField("home_fax", e.target.value)} />
              </div>
            </div>

            <h4 style={{ margin: "0.5rem 0 0.25rem" }}>その他</h4>
            <div className="editor-grid">
              <div className="field field-span-2">
                <label htmlFor="mypage-hobbies">趣味・信条</label>
                <textarea id="mypage-hobbies" name="hobbies" rows="2" value={formData.hobbies} onChange={(e) => updateField("hobbies", e.target.value)} />
              </div>
            </div>

            <section className="detail-card stack-sm inset-card">
              <div><h3>名簿公開設定</h3></div>
              <label className="checkbox-row">
                <input
                  name="show_email_in_directory"
                  type="checkbox"
                  checked={formData.show_email_in_directory}
                  onChange={(e) => updateField("show_email_in_directory", e.target.checked)}
                />
                <span>メールを名簿に公開する</span>
              </label>
              <label className="checkbox-row">
                <input
                  name="show_company_in_directory"
                  type="checkbox"
                  checked={formData.show_company_in_directory}
                  onChange={(e) => updateField("show_company_in_directory", e.target.checked)}
                />
                <span>会社情報を名簿に公開する</span>
              </label>
              <label className="checkbox-row">
                <input
                  name="show_mobile_in_directory"
                  type="checkbox"
                  checked={formData.show_mobile_in_directory}
                  onChange={(e) => updateField("show_mobile_in_directory", e.target.checked)}
                />
                <span>携帯番号を名簿に公開する</span>
              </label>
            </section>

            {formMessage && (
              <p className={`message ${formMessageType}`} aria-live="polite">{formMessage}</p>
            )}
            <div className="actions">
              <button className="button" type="submit" disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </button>
              <button className="button button-secondary" type="button" onClick={handleCancelEdit} disabled={submitting}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </section>
    </section>
  );
}
