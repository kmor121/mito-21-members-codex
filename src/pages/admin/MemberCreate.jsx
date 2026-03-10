import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, invalidateReadCache } from '../../api/base44Client';
import DatePicker from '../../components/ui/DatePicker';

const MEMBER_TYPES = ["正会員", "賛助会員", "OB会員", "名誉顧問"];
const STATUSES = ["活動中", "休会", "退会"];
const ROLES = ["member", "admin"];

const INITIAL_FORM = {
  name_kanji: "", name_kana: "", birthday: "", email: "", mobile_phone: "",
  member_type: "正会員", status: "活動中", member_number: "", join_date: "",
  role: "member", notes: "",
  company_name: "", company_position: "", company_postal_code: "",
  company_address: "", company_phone: "", company_fax: "", company_pr: "", industry: "",
  home_postal_code: "", home_address: "", home_phone: "", home_fax: "",
  hobbies: "", referrer_1: "", referrer_2: "",
  is_new: false, is_graduate: false,
  show_email_in_directory: true, show_mobile_in_directory: true, show_company_in_directory: true,
};

/* ---------- section header styles (page-specific) ---------- */
const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  borderBottom: '1px solid var(--line)',
  paddingBottom: 8,
  marginBottom: 4,
};
const sectionIconStyle = { fontSize: 20, display: 'flex', alignItems: 'center', lineHeight: 1 };
const sectionTitleStyle = { fontSize: 16, fontWeight: 700, margin: 0 };

/* ---------- toggle switch for directory settings ---------- */
function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 0' }}>
      <button
        type="button"
        className={`doc-toggle${checked ? " doc-toggle-on" : ""}`}
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
      >
        <span className="doc-toggle-knob" />
      </button>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
    </label>
  );
}

/* ---------- section header component ---------- */
function SectionHeader({ icon, title }) {
  return (
    <div className="mc-section-header" style={sectionHeaderStyle}>
      <span className="mc-section-icon" style={sectionIconStyle}>{icon}</span>
      <h2 className="mc-section-title" style={sectionTitleStyle}>{title}</h2>
    </div>
  );
}

export default function MemberCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [generatingNumber, setGeneratingNumber] = useState(false);
  const [toast, setToast] = useState("");

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // clear field-level error on change
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
    if (!form.name_kanji.trim()) newErrors.name_kanji = "氏名（漢字）は必須です。";
    if (!form.name_kana.trim()) newErrors.name_kana = "氏名（フリガナ）は必須です。";
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
      // scroll to first error field
      const firstKey = Object.keys(fieldErrors)[0];
      const el = document.getElementById(`mc-${firstKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    try {
      await apiRequest("create-member-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  /* helper: error-aware input style */
  const fieldErrorStyle = (key) => errors[key] ? { border: '1.5px solid var(--danger, #d32f2f)' } : {};

  return (
    <section className="admin-shell">
      {/* ---- Header ---- */}
      <div className="page-header">
        <a
          href="/admin/members"
          onClick={(e) => { e.preventDefault(); navigate("/admin/members"); }}
          style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4, display: 'inline-block' }}
        >
          &larr; 会員一覧に戻る
        </a>
        <h1 className="page-title">新規会員登録</h1>
        <p className="page-description">管理者による会員の直接登録</p>
      </div>

      {/* ---- Toast ---- */}
      {toast && (
        <div
          style={{
            position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--success, #388e3c)', color: '#fff', padding: '10px 28px',
            borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 9999,
            boxShadow: '0 4px 16px rgba(0,0,0,.18)',
          }}
          role="status"
        >
          {toast}
        </div>
      )}

      {/* ---- Top-level error ---- */}
      {error && (
        <p className="message error" aria-live="polite">{error}</p>
      )}

      <form noValidate onSubmit={handleSubmit} style={{ paddingBottom: 80 }}>
        {/* ======== Section 1: 基本情報 ======== */}
        <section className="card panel-card single-panel" style={{ marginBottom: 16 }}>
          <div className="card-body stack">
            <SectionHeader icon="👤" title="基本情報" />
            <div className="editor-grid">
              {/* 氏名（漢字） */}
              <div className="field">
                <label htmlFor="mc-name_kanji">氏名（漢字）<span style={{ color: 'var(--danger, #d32f2f)' }}> *</span></label>
                <input id="mc-name_kanji" type="text" value={form.name_kanji}
                  onChange={(e) => update("name_kanji", e.target.value)}
                  style={fieldErrorStyle("name_kanji")} required />
                {errors.name_kanji && <span style={{ color: 'var(--danger, #d32f2f)', fontSize: 12, marginTop: 2 }}>{errors.name_kanji}</span>}
              </div>

              {/* 氏名（フリガナ） */}
              <div className="field">
                <label htmlFor="mc-name_kana">氏名（フリガナ）<span style={{ color: 'var(--danger, #d32f2f)' }}> *</span></label>
                <input id="mc-name_kana" type="text" value={form.name_kana}
                  onChange={(e) => update("name_kana", e.target.value)}
                  style={fieldErrorStyle("name_kana")} required />
                {errors.name_kana && <span style={{ color: 'var(--danger, #d32f2f)', fontSize: 12, marginTop: 2 }}>{errors.name_kana}</span>}
              </div>

              {/* 生年月日 */}
              <div className="field">
                <label htmlFor="mc-birthday">生年月日</label>
                <DatePicker id="mc-birthday" value={form.birthday}
                  onChange={(val) => update("birthday", val)} minYear={1940} />
              </div>

              {/* 会員種別 */}
              <div className="field">
                <label htmlFor="mc-member_type">会員種別</label>
                <select id="mc-member_type" value={form.member_type}
                  onChange={(e) => update("member_type", e.target.value)}>
                  {MEMBER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* ステータス */}
              <div className="field">
                <label htmlFor="mc-status">ステータス</label>
                <select id="mc-status" value={form.status}
                  onChange={(e) => update("status", e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* 入会日 */}
              <div className="field">
                <label htmlFor="mc-join_date">入会日</label>
                <DatePicker id="mc-join_date" value={form.join_date}
                  onChange={(val) => update("join_date", val)} />
              </div>

              {/* 会員番号 */}
              <div className="field">
                <label htmlFor="mc-member_number">会員番号</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input id="mc-member_number" type="text" value={form.member_number}
                    onChange={(e) => update("member_number", e.target.value)}
                    style={{ flex: 1 }} />
                  <button type="button" className="btn btn-secondary" onClick={handleGenerateNumber}
                    disabled={generatingNumber} style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                    {generatingNumber ? "生成中..." : "自動採番"}
                  </button>
                </div>
              </div>

              {/* 権限 */}
              <div className="field">
                <label htmlFor="mc-role">権限（role）</label>
                <select id="mc-role" value={form.role}
                  onChange={(e) => update("role", e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r === "admin" ? "管理者" : "一般会員"}</option>)}
                </select>
              </div>

              {/* 新入会員 */}
              <div className="field">
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_new}
                    onChange={(e) => update("is_new", e.target.checked)} />
                  <span>新入会員（会費自動生成）</span>
                </label>
              </div>

              {/* 卒業生 */}
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
        <section className="card panel-card single-panel" style={{ marginBottom: 16 }}>
          <div className="card-body stack">
            <SectionHeader icon="🏢" title="会社情報" />
            <div className="editor-grid">
              <div className="field">
                <label htmlFor="mc-company_name">会社名</label>
                <input id="mc-company_name" type="text" value={form.company_name}
                  onChange={(e) => update("company_name", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-company_position">役職名</label>
                <input id="mc-company_position" type="text" value={form.company_position}
                  onChange={(e) => update("company_position", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-industry">業種</label>
                <input id="mc-industry" type="text" value={form.industry}
                  onChange={(e) => update("industry", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-company_postal_code">会社郵便番号</label>
                <input id="mc-company_postal_code" type="text" value={form.company_postal_code}
                  onChange={(e) => update("company_postal_code", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-company_address">会社住所</label>
                <input id="mc-company_address" type="text" value={form.company_address}
                  onChange={(e) => update("company_address", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-company_phone">会社電話</label>
                <input id="mc-company_phone" type="tel" value={form.company_phone}
                  onChange={(e) => update("company_phone", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-company_fax">会社FAX</label>
                <input id="mc-company_fax" type="tel" value={form.company_fax}
                  onChange={(e) => update("company_fax", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-company_pr">会社PR</label>
                <textarea id="mc-company_pr" rows={3} value={form.company_pr}
                  onChange={(e) => update("company_pr", e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* ======== Section 3: 連絡先 ======== */}
        <section className="card panel-card single-panel" style={{ marginBottom: 16 }}>
          <div className="card-body stack">
            <SectionHeader icon="📧" title="連絡先" />
            <div className="editor-grid">
              <div className="field">
                <label htmlFor="mc-email">メールアドレス<span style={{ color: 'var(--danger, #d32f2f)' }}> *</span></label>
                <input id="mc-email" type="email" value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  style={fieldErrorStyle("email")} required />
                {errors.email && <span style={{ color: 'var(--danger, #d32f2f)', fontSize: 12, marginTop: 2 }}>{errors.email}</span>}
              </div>
              <div className="field">
                <label htmlFor="mc-mobile_phone">携帯番号<span style={{ color: 'var(--danger, #d32f2f)' }}> *</span></label>
                <input id="mc-mobile_phone" type="tel" value={form.mobile_phone}
                  onChange={(e) => update("mobile_phone", e.target.value)}
                  style={fieldErrorStyle("mobile_phone")} required />
                {errors.mobile_phone && <span style={{ color: 'var(--danger, #d32f2f)', fontSize: 12, marginTop: 2 }}>{errors.mobile_phone}</span>}
              </div>
            </div>
          </div>
        </section>

        {/* ======== Section 4: 自宅情報 ======== */}
        <section className="card panel-card single-panel" style={{ marginBottom: 16 }}>
          <div className="card-body stack">
            <SectionHeader icon="🏠" title="自宅情報" />
            <div className="editor-grid">
              <div className="field">
                <label htmlFor="mc-home_postal_code">自宅郵便番号</label>
                <input id="mc-home_postal_code" type="text" value={form.home_postal_code}
                  onChange={(e) => update("home_postal_code", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-home_address">自宅住所</label>
                <input id="mc-home_address" type="text" value={form.home_address}
                  onChange={(e) => update("home_address", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-home_phone">自宅電話</label>
                <input id="mc-home_phone" type="tel" value={form.home_phone}
                  onChange={(e) => update("home_phone", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-home_fax">自宅FAX</label>
                <input id="mc-home_fax" type="tel" value={form.home_fax}
                  onChange={(e) => update("home_fax", e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* ======== Section 5: その他 ======== */}
        <section className="card panel-card single-panel" style={{ marginBottom: 16 }}>
          <div className="card-body stack">
            <SectionHeader icon="📝" title="その他" />
            <div className="editor-grid">
              <div className="field field-span-2">
                <label htmlFor="mc-hobbies">趣味・信条</label>
                <textarea id="mc-hobbies" rows={3} value={form.hobbies}
                  onChange={(e) => update("hobbies", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-referrer_1">紹介者1</label>
                <input id="mc-referrer_1" type="text" value={form.referrer_1}
                  onChange={(e) => update("referrer_1", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-referrer_2">紹介者2</label>
                <input id="mc-referrer_2" type="text" value={form.referrer_2}
                  onChange={(e) => update("referrer_2", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-notes">備考（管理者用メモ）</label>
                <textarea id="mc-notes" rows={3} value={form.notes}
                  onChange={(e) => update("notes", e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* ======== Section 6: 名簿設定 ======== */}
        <section className="card panel-card single-panel" style={{ marginBottom: 24 }}>
          <div className="card-body stack">
            <SectionHeader icon="📖" title="名簿設定" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              <ToggleSwitch
                checked={form.show_email_in_directory}
                onChange={(v) => update("show_email_in_directory", v)}
                label="メールアドレスの掲載"
              />
              <ToggleSwitch
                checked={form.show_mobile_in_directory}
                onChange={(v) => update("show_mobile_in_directory", v)}
                label="携帯番号の掲載"
              />
              <ToggleSwitch
                checked={form.show_company_in_directory}
                onChange={(v) => update("show_company_in_directory", v)}
                label="会社情報の掲載"
              />
            </div>
          </div>
        </section>

        {/* ======== Sticky Action Bar ======== */}
        <div style={{
          position: 'sticky', bottom: 0, left: 0, right: 0,
          background: 'var(--surface, #fff)',
          borderTop: '1px solid var(--line)',
          padding: '12px 24px',
          display: 'flex', justifyContent: 'flex-end', gap: 12,
          zIndex: 100,
        }}>
          <button type="button" className="btn btn-secondary"
            onClick={() => navigate("/admin/members")}>
            キャンセル
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}
            style={{ minWidth: 140, fontSize: 15 }}>
            {saving ? "登録中..." : "登録する"}
          </button>
        </div>
      </form>
    </section>
  );
}
