import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, base44 } from '../../api/base44Client';
import { useAuth } from '../../contexts/AuthContext';
import { MyPageSkeleton } from '../../components/ui/Skeleton';
import { fullName, fullNameKana, greetingName, nameInitial } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  return String(value);
}

function normalizeMemberStatus(value) {
  return value === "active" ? "活動中" : String(value ?? "").trim();
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];

function MemberImage({ src, name, initial: initialOverride, size = "detail", editable, onImageClick }) {
  const initial = initialOverride || (name || "M").charAt(0);
  const content = src ? (
    <img src={src} alt={name || "会員プロフィール画像"} loading="lazy" />
  ) : (
    <span>{initial}</span>
  );

  return (
    <div
      className={`member-image member-image-${size} ${!src ? "is-placeholder" : ""} ${editable ? "member-image-editable" : ""}`}
      aria-label={src ? name : "プロフィール画像未設定"}
      onClick={editable ? onImageClick : undefined}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={editable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onImageClick(); } } : undefined}
    >
      {content}
      {editable && (
        <div className="member-image-overlay">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      )}
    </div>
  );
}

function buildFormDataFromMember(m) {
  return {
    last_name: m.last_name || "",
    first_name: m.first_name || "",
    last_name_kana: m.last_name_kana || "",
    first_name_kana: m.first_name_kana || "",
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "おはようございます";
  if (h < 18) return "こんにちは";
  return "こんばんは";
}

export default function MyPage() {
  const { memberInfo, user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Dashboard data
  const [dues, setDues] = useState([]);
  const [orgAssignments, setOrgAssignments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);

  // Form state
  const [formData, setFormData] = useState({});
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Profile image upload state
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Load member from AuthContext
  useEffect(() => { base44.appLogs.logUserInApp('M3-マイページ'); }, []);
  useEffect(() => {
    if (authLoading) return;

    if (!memberInfo) {
      setLoading(false);
      return;
    }

    const memberId = memberInfo.id || memberInfo._id;
    // Fetch fresh member data
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
        // Fallback: use memberInfo directly
        setMember(memberInfo);
        setFormData(buildFormDataFromMember(memberInfo));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authLoading, memberInfo]);

  // Load dashboard data (dues, org assignments)
  const loadDashboardData = useCallback(async (memberId) => {
    try {
      const [fyList, dueList, orgList, assignList] = await Promise.all([
        base44.entities.FiscalYear.list().catch(() => []),
        base44.entities.Due.filter({ member_id: memberId }).catch(() => []),
        base44.entities.Organization.list().catch(() => []),
        base44.entities.OrgAssignment.filter({ member_id: memberId }).catch(() => []),
      ]);
      setFiscalYears(fyList || []);
      setDues(dueList || []);
      setOrganizations(orgList || []);
      setOrgAssignments(assignList || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!memberInfo) return;
    const memberId = memberInfo.id || memberInfo._id;
    if (memberId) loadDashboardData(memberId);
  }, [memberInfo, loadDashboardData]);

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
    setImagePreview(null);
    setImageFile(null);
    setIsEditing(false);
  }

  function handleImageClick() {
    fileInputRef.current?.click();
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFormMessage("JPGまたはPNG形式の画像を選択してください。");
      setFormMessageType("error");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFormMessage("画像サイズは5MB以下にしてください。");
      setFormMessageType("error");
      return;
    }

    setFormMessage("");
    setFormMessageType("");
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleImageUpload() {
    if (!imageFile || !member) return;
    setUploadingImage(true);
    setFormMessage("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
      const memberId = member.id || member._id;
      await apiRequest("update-member-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: memberId,
          allow_partial_profile_update: true,
          changed_by: fullName(member) || "会員",
          changed_by_role: "member",
          profile_image: file_url,
        }),
      });
      setMember((prev) => ({ ...prev, profile_image: file_url }));
      setImagePreview(null);
      setImageFile(null);
      setFormMessage("プロフィール画像を更新しました。");
      setFormMessageType("success");
    } catch (err) {
      setFormMessage(err.message || "画像のアップロードに失敗しました。");
      setFormMessageType("error");
    } finally {
      setUploadingImage(false);
    }
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

    // Upload image if selected
    let profileImageUrl = undefined;
    if (imageFile) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
        profileImageUrl = file_url;
      } catch (err) {
        setFormMessage("画像のアップロードに失敗しました。");
        setFormMessageType("error");
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      id: member.id || member._id,
      allow_partial_profile_update: true,
      changed_by: fullName(member) || "会員",
      changed_by_role: "member",
      ...(profileImageUrl !== undefined && { profile_image: profileImageUrl }),
      last_name: String(formData.last_name || "").trim(),
      first_name: String(formData.first_name || "").trim(),
      last_name_kana: String(formData.last_name_kana || "").trim(),
      first_name_kana: String(formData.first_name_kana || "").trim(),
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
      window.location.assign("/mypage");
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

  // No member linked
  if (!authLoading && !memberInfo) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">マイページ</h1>
          <p className="page-description">自分の情報と名簿公開設定を管理</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message">会員情報が紐付けられていません。管理者にお問い合わせください。</p>
            <div className="actions">
              <Link className="text-link" to="/directory">会員名簿へ</Link>
              <Link className="text-link" to="/info">基本情報へ</Link>
            </div>
          </div>
        </section>
      </section>
    );
  }

  if (loading || authLoading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">マイページ</h1>
          <p className="page-description">自分の情報と名簿公開設定を管理</p>
        </div>
        <MyPageSkeleton />
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
          </div>
        </section>
      </section>
    );
  }

  if (!member) return null;

  // ── Dashboard helpers ──
  const currentFY = fiscalYears.find((fy) => fy.is_current);
  const currentFYId = currentFY?.id || currentFY?._id;

  // Dues for current FY
  const currentDues = currentFYId
    ? dues.filter((d) => d.fiscal_year_id === currentFYId)
    : [];
  const unpaidDues = currentDues.filter((d) => d.status === "未納");
  const paidDues = currentDues.filter((d) => d.status === "納入済");

  // Org assignments for current FY
  const currentAssignments = currentFYId
    ? orgAssignments.filter((a) => a.fiscal_year_id === currentFYId)
    : [];
  const orgMap = {};
  organizations.forEach((o) => { orgMap[o.id || o._id] = o; });

  // ── EDIT MODE ──
  if (isEditing) {
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
            <p className="muted">名簿に出るのは公開フラグをオンにした項目です。生年月日・会員番号は管理者のみ変更可能です。</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: "none" }}
              onChange={handleImageSelect}
            />
            <form className="editor-form" noValidate onSubmit={handleSubmit}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <MemberImage
                  src={imagePreview || member.profile_image}
                  name={fullName(member)}
                  initial={nameInitial(member)}
                  size="detail"
                  editable
                  onImageClick={handleImageClick}
                />
                <div>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                    クリックして写真を変更（JPG/PNG、5MB以下）
                  </p>
                  {imageFile && (
                    <p style={{ fontSize: 13, color: "var(--color-success)", margin: "4px 0 0" }}>
                      新しい画像が選択されています（保存時にアップロードされます）
                    </p>
                  )}
                </div>
              </div>
              <h4 style={{ margin: "0.5rem 0 0.25rem" }}>氏名</h4>
              <div className="editor-grid">
                <div className="field">
                  <label htmlFor="mypage-last-name">姓</label>
                  <input id="mypage-last-name" name="last_name" type="text" value={formData.last_name} onChange={(e) => updateField("last_name", e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="mypage-first-name">名</label>
                  <input id="mypage-first-name" name="first_name" type="text" value={formData.first_name} onChange={(e) => updateField("first_name", e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="mypage-last-name-kana">セイ（フリガナ）</label>
                  <input id="mypage-last-name-kana" name="last_name_kana" type="text" value={formData.last_name_kana} onChange={(e) => updateField("last_name_kana", e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="mypage-first-name-kana">メイ（フリガナ）</label>
                  <input id="mypage-first-name-kana" name="first_name_kana" type="text" value={formData.first_name_kana} onChange={(e) => updateField("first_name_kana", e.target.value)} />
                </div>
              </div>

              <h4 style={{ margin: "0.5rem 0 0.25rem" }}>個人連絡先</h4>
              <div className="editor-grid">
                <div className="field">
                  <label htmlFor="mypage-email">メール</label>
                  <input id="mypage-email" name="email" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="mypage-mobile-phone">携帯番号</label>
                  <input id="mypage-mobile-phone" name="mobile_phone" type="tel" value={formData.mobile_phone} onChange={(e) => updateField("mobile_phone", e.target.value)} />
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
                  <input name="show_email_in_directory" type="checkbox" checked={formData.show_email_in_directory} onChange={(e) => updateField("show_email_in_directory", e.target.checked)} />
                  <span>メールを名簿に公開する</span>
                </label>
                <label className="checkbox-row">
                  <input name="show_company_in_directory" type="checkbox" checked={formData.show_company_in_directory} onChange={(e) => updateField("show_company_in_directory", e.target.checked)} />
                  <span>会社情報を名簿に公開する</span>
                </label>
                <label className="checkbox-row">
                  <input name="show_mobile_in_directory" type="checkbox" checked={formData.show_mobile_in_directory} onChange={(e) => updateField("show_mobile_in_directory", e.target.checked)} />
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

  // ── VIEW MODE (Dashboard) ──
  return (
    <section className="admin-shell">
      {/* Greeting header */}
      <div className="page-header" style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: isMobile ? 18 : undefined }}>{getGreeting()}、{greetingName(member) || "会員さん"}</h1>
          <p className="page-description">マイページ</p>
        </div>
        <button className="button" type="button" onClick={handleStartEdit} style={isMobile ? { fontSize: 12, padding: "6px 12px" } : {}}>
          {isMobile ? "編集" : "プロフィールを編集"}
        </button>
      </div>

      {formMessage && (
        <p className={`message ${formMessageType}`} aria-live="polite">{formMessage}</p>
      )}

      {/* Dashboard grid */}
      <div className="settings-grid">
        {/* Basic info card */}
        <section className="card detail-card">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>基本情報</h2></div></div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: "none" }}
              onChange={handleImageSelect}
            />
            <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                <MemberImage
                  src={imagePreview || member.profile_image}
                  name={fullName(member)}
                  initial={nameInitial(member)}
                  size="detail"
                  editable
                  onImageClick={handleImageClick}
                />
                {imageFile && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="button"
                      type="button"
                      disabled={uploadingImage}
                      onClick={handleImageUpload}
                      style={{ fontSize: 12, padding: "4px 12px" }}
                    >
                      {uploadingImage ? "保存中..." : "写真を保存"}
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      style={{ fontSize: 12, padding: "4px 12px" }}
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <dl className="detail-grid">
                  <div><dt>氏名</dt><dd>{displayValue(fullName(member))}</dd></div>
                  <div><dt>フリガナ</dt><dd>{displayValue(fullNameKana(member))}</dd></div>
                  <div><dt>会員番号</dt><dd>{displayValue(member.member_number)}</dd></div>
                  <div><dt>会員種別</dt><dd><span className="pill">{displayValue(member.member_type)}</span></dd></div>
                  <div><dt>ステータス</dt><dd><span className="pill">{displayValue(normalizeMemberStatus(member.status))}</span></dd></div>
                  <div><dt>入会日</dt><dd>{displayValue(member.join_date)}</dd></div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Dues status card */}
        <section className="card detail-card">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>会費状況 {currentFY ? `(${currentFY.year}年度)` : ""}</h2></div>
            </div>
            {currentDues.length === 0 ? (
              <p className="muted">今年度の会費データはありません。</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {currentDues.map((d) => {
                  const dueId = d.id || d._id;
                  const isPaid = d.status === "納入済";
                  return (
                    <div key={dueId} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      flexWrap: "wrap", gap: 8,
                      padding: "0.75rem 1rem", borderRadius: 8,
                      background: isPaid ? "#f0fdf4" : "#fef2f2",
                      border: isPaid ? "1px solid #bbf7d0" : "1px solid #fecaca",
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{d.due_type || "年会費"}</span>
                        <span style={{ marginLeft: 12, fontSize: 14, color: "var(--color-text-secondary)" }}>
                          {d.amount != null ? `¥${Number(d.amount).toLocaleString()}` : "-"}
                        </span>
                      </div>
                      <span className="pill" style={{
                        background: isPaid ? "#dcfce7" : "#fee2e2",
                        color: isPaid ? "#16a34a" : "#dc2626",
                        border: isPaid ? "1px solid #86efac" : "1px solid #fca5a5",
                      }}>
                        {d.status}
                      </span>
                    </div>
                  );
                })}
                {unpaidDues.length > 0 && (
                  <p style={{ fontSize: 13, color: "#dc2626", marginTop: 4 }}>
                    未納の会費が{unpaidDues.length}件あります。
                  </p>
                )}
                {unpaidDues.length === 0 && paidDues.length > 0 && (
                  <p style={{ fontSize: 13, color: "#16a34a", marginTop: 4 }}>
                    今年度の会費はすべて納入済みです。
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Org assignments card */}
        <section className="card detail-card">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>所属組織 {currentFY ? `(${currentFY.year}年度)` : ""}</h2></div>
            </div>
            {currentAssignments.length === 0 ? (
              <p className="muted">今年度の組織配属はありません。</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {currentAssignments.map((a) => {
                  const aId = a.id || a._id;
                  const org = orgMap[a.organization_id];
                  return (
                    <div key={aId} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      flexWrap: "wrap", gap: 6,
                      padding: "0.6rem 1rem", borderRadius: 8,
                      background: "#f8fafc", border: "1px solid var(--color-border)",
                    }}>
                      <span style={{ fontWeight: 600, fontSize: 14, minWidth: 0 }}>
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

        {/* Contact info card */}
        <section className="card detail-card">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>連絡先</h2></div></div>
            <dl className="detail-grid">
              <div><dt>メール</dt><dd>{displayValue(member.email)}</dd></div>
              <div><dt>携帯番号</dt><dd>{displayValue(member.mobile_phone)}</dd></div>
              <div><dt>会社名</dt><dd>{displayValue(member.company_name)}</dd></div>
              <div><dt>役職</dt><dd>{displayValue(member.company_position)}</dd></div>
            </dl>
          </div>
        </section>

        {/* Directory visibility card */}
        <section className="card detail-card">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>名簿公開設定</h2></div></div>
            <dl className="detail-grid">
              <div>
                <dt>メール公開</dt>
                <dd><span className={`pill ${member.show_email_in_directory ? "pill-success" : ""}`}>{member.show_email_in_directory ? "公開" : "非公開"}</span></dd>
              </div>
              <div>
                <dt>会社情報公開</dt>
                <dd><span className={`pill ${member.show_company_in_directory ? "pill-success" : ""}`}>{member.show_company_in_directory ? "公開" : "非公開"}</span></dd>
              </div>
              <div>
                <dt>携帯番号公開</dt>
                <dd><span className={`pill ${member.show_mobile_in_directory ? "pill-success" : ""}`}>{member.show_mobile_in_directory ? "公開" : "非公開"}</span></dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      {/* Quick links */}
      <section className="card detail-card" style={{ marginTop: "1.5rem" }}>
        <div className="card-body stack">
          <div className="panel-heading"><div><h2>クイックリンク</h2></div></div>
          <div className="dashboard-metrics">
            <Link className="metric-card" to="/directory">会員名簿</Link>
            <Link className="metric-card" to="/organization">組織図</Link>
            <Link className="metric-card" to="/info">基本情報</Link>
            <Link className="metric-card" to="/manual">運用マニュアル</Link>
          </div>
        </div>
      </section>
    </section>
  );
}
