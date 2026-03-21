import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, invalidateReadCache } from '../../api/base44Client';
import DatePicker from '../../components/ui/DatePicker';
import { Button } from '../../components/ui';
import { fullName, fullNameKana } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

const MEMBER_TYPES = ["正会員", "賛助会員", "OB会員", "名誉顧問"];
const STATUSES = ["活動中", "休会", "退会"];
const ROLES = ["member", "admin"];

const INITIAL_FORM = {
  last_name: "", first_name: "", last_name_kana: "", first_name_kana: "",
  birthday: "", email: "", mobile_phone: "",
  member_type: "正会員", status: "活動中", member_number: "", join_date: "",
  role: "member", notes: "",
  company_name: "", company_position: "", company_postal_code: "",
  company_address: "", company_phone: "", company_fax: "", company_pr: "", industry: "",
  home_postal_code: "", home_address: "", home_phone: "", home_fax: "",
  hobbies: "", referrer_1: "", referrer_2: "",
  is_new: false, is_graduate: false,
  show_email_in_directory: true, show_mobile_in_directory: true, show_company_in_directory: true,
};

const SECTION_STEPS = ["基本情報", "会社情報", "連絡先", "自宅情報", "その他", "名簿設定"];

/* ---------- SVG Icon Components ---------- */
const iconProps = { width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", style: { color: 'var(--color-accent)' } };

function UserIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 24 24">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22V12h6v10" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 24 24">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 24 24">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 24 24">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

/* ---------- Section Header ---------- */
function SectionHeader({ icon, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: '1px solid var(--color-border)',
      paddingBottom: 10, marginBottom: 4,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>{title}</h2>
    </div>
  );
}

/* ---------- Toggle Switch with description ---------- */
function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      cursor: 'pointer', padding: '12px 0',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <button
        type="button"
        className={`doc-toggle${checked ? " doc-toggle-on" : ""}`}
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        style={{ marginTop: 2, flexShrink: 0 }}
      >
        <span className="doc-toggle-knob" />
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</span>
        {description && (
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{description}</span>
        )}
      </div>
    </label>
  );
}

/* ---------- Pill Selector ---------- */
function PillSelector({ options, value, onChange, id }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} id={id} role="radiogroup">
      {options.map((opt) => {
        const isActive = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`nl2-pill-tab${isActive ? ' active' : ''}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Progress Indicator ---------- */
function ProgressIndicator({ currentSection, formData }) {
  // Check if required fields for each section are filled
  const sectionComplete = [
    !!(formData?.last_name && formData?.first_name && formData?.last_name_kana && formData?.first_name_kana && formData?.birthday), // 基本情報
    true, // 会社情報（全て任意）
    !!(formData?.email && formData?.mobile_phone), // 連絡先
    true, // 自宅情報（全て任意）
    !!(formData?.referrer_1 && formData?.referrer_2), // その他（紹介者必須）
    true, // 名簿設定（全て任意）
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '16px 0 8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      {SECTION_STEPS.map((step, i) => {
        const isCurrent = i === currentSection;
        const isPast = i < currentSection && sectionComplete[i];
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, lineHeight: 1,
                background: isPast ? 'var(--color-success)' : isCurrent ? 'var(--color-accent)' : 'var(--color-border)',
                color: isPast || isCurrent ? '#fff' : 'var(--color-text-secondary)',
                transition: 'var(--transition-fast)',
              }}>
                {isPast ? (
                  <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : i + 1}
              </div>
              <span style={{
                fontSize: 12, fontWeight: isCurrent ? 700 : 500,
                color: isCurrent ? 'var(--color-accent)' : isPast ? 'var(--color-success)' : 'var(--color-text-tertiary)',
                whiteSpace: 'nowrap',
              }}>
                {step}
              </span>
            </div>
            {i < SECTION_STEPS.length - 1 && (
              <div style={{
                width: 24, height: 1, margin: '0 4px',
                background: isPast ? 'var(--color-success)' : 'var(--color-border)',
                transition: 'var(--transition-fast)',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Error text component ---------- */
function FieldError({ message }) {
  if (!message) return null;
  return (
    <span style={{
      color: 'var(--color-danger)', fontSize: 12, marginTop: 4,
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </span>
  );
}

/* ========== Main Component ========== */
export default function MemberCreate() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [generatingNumber, setGeneratingNumber] = useState(false);
  const [toast, setToast] = useState("");
  const [visibleSection, setVisibleSection] = useState(0);

  // Auto-generate member number on mount
  useEffect(() => {
    (async () => {
      try {
        const result = await apiRequest("generate-member-number");
        if (result.suggested_number) {
          setForm((prev) => ({ ...prev, member_number: result.suggested_number }));
        }
      } catch { /* ignore */ }
    })();
  }, []);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
    }
  }

  async function handleGenerateNumber() {
    setGeneratingNumber(true);
    try {
      const result = await apiRequest("generate-member-number");
      if (result.suggested_number) {
        update("member_number", result.suggested_number);
      }
    } catch (err) {
      setError(err.message || "会員番号の生成に失敗しました。");
    } finally {
      setGeneratingNumber(false);
    }
  }

  function validate() {
    const newErrors = {};
    if (!form.last_name.trim()) newErrors.last_name = "姓は必須です。";
    if (!form.first_name.trim()) newErrors.first_name = "名は必須です。";
    if (!form.email.trim() || !form.email.includes("@")) newErrors.email = "有効なメールアドレスを入力してください。";
    if (!form.mobile_phone.trim()) newErrors.mobile_phone = "携帯番号は必須です。";
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const fieldErrors = validate();
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      const firstKey = Object.keys(fieldErrors)[0];
      const el = document.getElementById(`mc-${firstKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    try {
      const submitData = { ...form };
      await apiRequest("create-member-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      invalidateReadCache("Member");
      setToast("会員を登録しました");
      setTimeout(() => navigate("/admin/members"), 1200);
    } catch (err) {
      setError(err.message || "登録に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  /* Track which section is in view for the progress indicator */
  function handleSectionVisible(index) {
    setVisibleSection((prev) => Math.max(prev, index));
  }

  const fieldErrorStyle = (key) => errors[key]
    ? { border: '1.5px solid var(--color-danger)', background: 'var(--color-danger-light)' }
    : {};

  const sectionStyle = {
    marginBottom: 16,
    borderRadius: 'var(--radius-lg)',
    overflow: 'visible',
  };

  const requiredMark = <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}> *</span>;

  return (
    <section className="admin-shell">
      {/* ---- Toast ---- */}
      {toast && (
        <div className="nl2-toast" role="status">
          <span className="nl2-toast-icon">{"\u2713"}</span>
          <span>{toast}</span>
        </div>
      )}

      {/* ---- Header ---- */}
      <div className="page-header">
        <a
          href="/admin/members"
          onClick={(e) => { e.preventDefault(); navigate("/admin/members"); }}
          style={{
            fontSize: 13, color: 'var(--color-accent)', textDecoration: 'none',
            marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
            fontWeight: 500, transition: 'var(--transition-fast)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          会員一覧に戻る
        </a>
        <h1 className="page-title">新規会員登録</h1>
        <p className="page-description">管理者による会員の直接登録</p>
      </div>

      {/* ---- Progress Indicator ---- */}
      <ProgressIndicator currentSection={visibleSection} formData={form} />

      {/* ---- Top-level error ---- */}
      {error && (
        <div
          style={{
            background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius)', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 14, color: 'var(--color-danger)', marginBottom: 16,
          }}
          aria-live="polite"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} style={{ paddingBottom: 80 }}>
        {/* ======== Section 1: 基本情報 ======== */}
        <section
          className="card panel-card single-panel"
          style={sectionStyle}
          ref={() => handleSectionVisible(0)}
        >
          <div className="card-body stack">
            <SectionHeader icon={<UserIcon />} title="基本情報" />
            <div className="editor-grid">
              <div className="field">
                <label htmlFor="mc-last_name">姓{requiredMark}</label>
                <input id="mc-last_name" type="text" value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                  placeholder="例: 山田"
                  style={fieldErrorStyle("last_name")} required />
                <FieldError message={errors.last_name} />
              </div>

              <div className="field">
                <label htmlFor="mc-first_name">名{requiredMark}</label>
                <input id="mc-first_name" type="text" value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                  placeholder="例: 太郎"
                  style={fieldErrorStyle("first_name")} required />
                <FieldError message={errors.first_name} />
              </div>

              <div className="field">
                <label htmlFor="mc-last_name_kana">セイ（フリガナ）</label>
                <input id="mc-last_name_kana" type="text" value={form.last_name_kana}
                  onChange={(e) => update("last_name_kana", e.target.value)}
                  placeholder="例: ヤマダ" />
              </div>

              <div className="field">
                <label htmlFor="mc-first_name_kana">メイ（フリガナ）</label>
                <input id="mc-first_name_kana" type="text" value={form.first_name_kana}
                  onChange={(e) => update("first_name_kana", e.target.value)}
                  placeholder="例: タロウ" />
              </div>

              <div className="field" style={{ overflow: 'visible' }}>
                <label htmlFor="mc-birthday">生年月日</label>
                <DatePicker id="mc-birthday" value={form.birthday}
                  onChange={(val) => update("birthday", val)} minYear={1940} />
              </div>

              <div className="field">
                <label>会員種別</label>
                <PillSelector
                  id="mc-member_type"
                  options={MEMBER_TYPES}
                  value={form.member_type}
                  onChange={(v) => update("member_type", v)}
                />
              </div>

              <div className="field">
                <label>ステータス</label>
                <PillSelector
                  id="mc-status"
                  options={STATUSES}
                  value={form.status}
                  onChange={(v) => update("status", v)}
                />
              </div>

              <div className="field" style={{ overflow: 'visible' }}>
                <label htmlFor="mc-join_date">入会日</label>
                <DatePicker id="mc-join_date" value={form.join_date}
                  onChange={(val) => update("join_date", val)} />
              </div>

              <div className="field">
                <label htmlFor="mc-member_number">会員番号（自動採番）</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                  <input id="mc-member_number" type="text" value={form.member_number}
                    onChange={(e) => update("member_number", e.target.value)}
                    placeholder="自動採番されます"
                    style={{ flex: 1 }} />
                  <Button variant="secondary" onClick={handleGenerateNumber}
                    disabled={generatingNumber}
                    style={{
                      fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    {generatingNumber ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        生成中...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                        </svg>
                        自動採番
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="mc-role">権限（role）</label>
                <select id="mc-role" value={form.role}
                  onChange={(e) => update("role", e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r === "admin" ? "管理者" : "一般会員"}</option>)}
                </select>
              </div>

              <div className="field">
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_new}
                    onChange={(e) => update("is_new", e.target.checked)} />
                  <span>新入会員（会費自動生成）</span>
                </label>
              </div>

              <div className="field">
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_graduate}
                    onChange={(e) => update("is_graduate", e.target.checked)} />
                  <span>卒業生</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* ======== Section 2: 会社情報 ======== */}
        <section
          className="card panel-card single-panel"
          style={sectionStyle}
          ref={() => handleSectionVisible(1)}
        >
          <div className="card-body stack">
            <SectionHeader icon={<BuildingIcon />} title="会社情報" />
            <div className="editor-grid">
              <div className="field">
                <label htmlFor="mc-company_name">会社名</label>
                <input id="mc-company_name" type="text" value={form.company_name}
                  onChange={(e) => update("company_name", e.target.value)}
                  placeholder="例: 株式会社サンプル" />
              </div>
              <div className="field">
                <label htmlFor="mc-company_position">役職名</label>
                <input id="mc-company_position" type="text" value={form.company_position}
                  onChange={(e) => update("company_position", e.target.value)}
                  placeholder="例: 代表取締役" />
              </div>
              <div className="field">
                <label htmlFor="mc-industry">業種</label>
                <input id="mc-industry" type="text" value={form.industry}
                  onChange={(e) => update("industry", e.target.value)}
                  placeholder="例: IT・情報通信" />
              </div>
              <div className="field">
                <label htmlFor="mc-company_postal_code">会社郵便番号</label>
                <input id="mc-company_postal_code" type="text" value={form.company_postal_code}
                  onChange={(e) => update("company_postal_code", e.target.value)}
                  placeholder="例: 310-0000" />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-company_address">会社住所</label>
                <input id="mc-company_address" type="text" value={form.company_address}
                  onChange={(e) => update("company_address", e.target.value)}
                  placeholder="例: 茨城県水戸市..." />
              </div>
              <div className="field">
                <label htmlFor="mc-company_phone">会社電話</label>
                <input id="mc-company_phone" type="tel" value={form.company_phone}
                  onChange={(e) => update("company_phone", e.target.value)}
                  placeholder="例: 029-XXX-XXXX" />
              </div>
              <div className="field">
                <label htmlFor="mc-company_fax">会社FAX</label>
                <input id="mc-company_fax" type="tel" value={form.company_fax}
                  onChange={(e) => update("company_fax", e.target.value)}
                  placeholder="例: 029-XXX-XXXX" />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-company_pr">会社PR</label>
                <textarea id="mc-company_pr" rows={3} value={form.company_pr}
                  onChange={(e) => update("company_pr", e.target.value)}
                  placeholder="会社の紹介文をご記入ください" />
              </div>
            </div>
          </div>
        </section>

        {/* ======== Section 3: 連絡先 ======== */}
        <section
          className="card panel-card single-panel"
          style={sectionStyle}
          ref={() => handleSectionVisible(2)}
        >
          <div className="card-body stack">
            <SectionHeader icon={<MailIcon />} title="連絡先" />
            <div className="editor-grid">
              <div className="field">
                <label htmlFor="mc-email">メールアドレス{requiredMark}</label>
                <input id="mc-email" type="email" value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="例: taro@example.com"
                  style={fieldErrorStyle("email")} required />
                <FieldError message={errors.email} />
              </div>
              <div className="field">
                <label htmlFor="mc-mobile_phone">携帯番号{requiredMark}</label>
                <input id="mc-mobile_phone" type="tel" value={form.mobile_phone}
                  onChange={(e) => update("mobile_phone", e.target.value)}
                  placeholder="例: 090-XXXX-XXXX"
                  style={fieldErrorStyle("mobile_phone")} required />
                <FieldError message={errors.mobile_phone} />
              </div>
            </div>
          </div>
        </section>

        {/* ======== Section 4: 自宅情報 ======== */}
        <section
          className="card panel-card single-panel"
          style={sectionStyle}
          ref={() => handleSectionVisible(3)}
        >
          <div className="card-body stack">
            <SectionHeader icon={<HomeIcon />} title="自宅情報" />
            <div className="editor-grid">
              <div className="field">
                <label htmlFor="mc-home_postal_code">自宅郵便番号</label>
                <input id="mc-home_postal_code" type="text" value={form.home_postal_code}
                  onChange={(e) => update("home_postal_code", e.target.value)}
                  placeholder="例: 310-0000" />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-home_address">自宅住所</label>
                <input id="mc-home_address" type="text" value={form.home_address}
                  onChange={(e) => update("home_address", e.target.value)}
                  placeholder="例: 茨城県水戸市..." />
              </div>
              <div className="field">
                <label htmlFor="mc-home_phone">自宅電話</label>
                <input id="mc-home_phone" type="tel" value={form.home_phone}
                  onChange={(e) => update("home_phone", e.target.value)}
                  placeholder="例: 029-XXX-XXXX" />
              </div>
              <div className="field">
                <label htmlFor="mc-home_fax">自宅FAX</label>
                <input id="mc-home_fax" type="tel" value={form.home_fax}
                  onChange={(e) => update("home_fax", e.target.value)}
                  placeholder="例: 029-XXX-XXXX" />
              </div>
            </div>
          </div>
        </section>

        {/* ======== Section 5: その他 ======== */}
        <section
          className="card panel-card single-panel"
          style={sectionStyle}
          ref={() => handleSectionVisible(4)}
        >
          <div className="card-body stack">
            <SectionHeader icon={<NoteIcon />} title="その他" />
            <div className="editor-grid">
              <div className="field field-span-2">
                <label htmlFor="mc-hobbies">趣味・信条</label>
                <textarea id="mc-hobbies" rows={3} value={form.hobbies}
                  onChange={(e) => update("hobbies", e.target.value)}
                  placeholder="趣味や信条をご記入ください" />
              </div>
              <div className="field">
                <label htmlFor="mc-referrer_1">紹介者1</label>
                <input id="mc-referrer_1" type="text" value={form.referrer_1}
                  onChange={(e) => update("referrer_1", e.target.value)}
                  placeholder="紹介者の氏名" />
              </div>
              <div className="field">
                <label htmlFor="mc-referrer_2">紹介者2</label>
                <input id="mc-referrer_2" type="text" value={form.referrer_2}
                  onChange={(e) => update("referrer_2", e.target.value)}
                  placeholder="紹介者の氏名" />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-notes">備考（管理者用メモ）</label>
                <textarea id="mc-notes" rows={3} value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="管理者用のメモを記入できます" />
              </div>
            </div>
          </div>
        </section>

        {/* ======== Section 6: 名簿設定 ======== */}
        <section
          className="card panel-card single-panel"
          style={{ ...sectionStyle, marginBottom: 8 }}
          ref={() => handleSectionVisible(5)}
        >
          <div className="card-body stack">
            <SectionHeader icon={<BookIcon />} title="名簿設定" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 8 }}>
              <ToggleSwitch
                checked={form.show_email_in_directory}
                onChange={(v) => update("show_email_in_directory", v)}
                label="メールアドレスの掲載"
                description="会員名簿にメールアドレスを表示します"
              />
              <ToggleSwitch
                checked={form.show_mobile_in_directory}
                onChange={(v) => update("show_mobile_in_directory", v)}
                label="携帯番号の掲載"
                description="会員名簿に携帯番号を表示します"
              />
              <ToggleSwitch
                checked={form.show_company_in_directory}
                onChange={(v) => update("show_company_in_directory", v)}
                label="会社情報の掲載"
                description="会員名簿に会社情報を表示します"
              />
            </div>
          </div>
        </section>

        {/* ======== Sticky Action Bar ======== */}
        <div style={{
          position: 'sticky', bottom: 0, left: 0, right: 0,
          background: '#fff',
          borderTop: '1px solid var(--color-border)',
          padding: '16px 24px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          zIndex: 10,
        }}>
          {Object.keys(errors).length > 0 && (
            <span style={{
              fontSize: 13, color: 'var(--color-danger)',
              display: 'flex', alignItems: 'center', gap: 4, marginRight: 'auto',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {Object.keys(errors).length}件の入力エラーがあります
            </span>
          )}
          <Button variant="ghost" onClick={() => navigate("/admin/members")}>
            キャンセル
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "登録中..." : "登録する"}
          </Button>
        </div>
      </form>

      {/* Keyframe for spinner animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
      {isMobile && (
        <style>{`
          .editor-grid { grid-template-columns: 1fr !important; }
          .field-span-2 { grid-column: span 1 !important; }
        `}</style>
      )}
    </section>
  );
}
