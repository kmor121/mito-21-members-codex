import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/base44Client';
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

export default function MemberCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [generatingNumber, setGeneratingNumber] = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name_kanji.trim()) { setError("氏名は必須です。"); return; }
    if (!form.name_kana.trim()) { setError("フリガナは必須です。"); return; }
    if (!form.email.trim() || !form.email.includes("@")) { setError("有効なメールアドレスを入力してください。"); return; }

    setSaving(true);
    try {
      await apiRequest("create-member-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      navigate("/admin/members");
    } catch (err) {
      setError(err.message || "登録に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">新規会員登録</h1>
        <p className="page-description">管理者による会員の直接登録</p>
      </div>

      {error && (
        <p className="message error" aria-live="polite">{error}</p>
      )}

      <form noValidate onSubmit={handleSubmit}>
        {/* 基本情報 */}
        <section className="card panel-card single-panel" style={{ marginBottom: '1rem' }}>
          <div className="card-body stack">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>基本情報</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="mc-name-kanji">氏名 *</label>
                <input id="mc-name-kanji" type="text" value={form.name_kanji}
                  onChange={(e) => update("name_kanji", e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="mc-name-kana">フリガナ *</label>
                <input id="mc-name-kana" type="text" value={form.name_kana}
                  onChange={(e) => update("name_kana", e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="mc-birthday">生年月日</label>
                <DatePicker id="mc-birthday" value={form.birthday}
                  onChange={(val) => update("birthday", val)} minYear={1940} />
              </div>
              <div className="field">
                <label htmlFor="mc-email">メール *</label>
                <input id="mc-email" type="email" value={form.email}
                  onChange={(e) => update("email", e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="mc-mobile">携帯電話</label>
                <input id="mc-mobile" type="tel" value={form.mobile_phone}
                  onChange={(e) => update("mobile_phone", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-member-type">会員種別</label>
                <select id="mc-member-type" value={form.member_type}
                  onChange={(e) => update("member_type", e.target.value)}>
                  {MEMBER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="mc-status">ステータス</label>
                <select id="mc-status" value={form.status}
                  onChange={(e) => update("status", e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="mc-member-number">会員番号</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input id="mc-member-number" type="text" value={form.member_number}
                    onChange={(e) => update("member_number", e.target.value)}
                    style={{ flex: 1 }} />
                  <button type="button" className="button ghost" onClick={handleGenerateNumber}
                    disabled={generatingNumber} style={{ whiteSpace: 'nowrap', fontSize: '0.85em' }}>
                    {generatingNumber ? "生成中..." : "自動採番"}
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="mc-join-date">入会日</label>
                <DatePicker id="mc-join-date" value={form.join_date}
                  onChange={(val) => update("join_date", val)} />
              </div>
              <div className="field">
                <label htmlFor="mc-role">権限</label>
                <select id="mc-role" value={form.role}
                  onChange={(e) => update("role", e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r === "admin" ? "管理者" : "一般会員"}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.is_new}
                    onChange={(e) => update("is_new", e.target.checked)} />
                  新入会員（会費自動生成）
                </label>
              </div>
              <div className="field">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.is_graduate}
                    onChange={(e) => update("is_graduate", e.target.checked)} />
                  卒業生
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* 会社情報 */}
        <section className="card panel-card single-panel" style={{ marginBottom: '1rem' }}>
          <div className="card-body stack">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>会社情報</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="mc-company-name">会社名</label>
                <input id="mc-company-name" type="text" value={form.company_name}
                  onChange={(e) => update("company_name", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-company-position">役職</label>
                <input id="mc-company-position" type="text" value={form.company_position}
                  onChange={(e) => update("company_position", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-industry">業種</label>
                <input id="mc-industry" type="text" value={form.industry}
                  onChange={(e) => update("industry", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-company-postal">会社郵便番号</label>
                <input id="mc-company-postal" type="text" value={form.company_postal_code}
                  onChange={(e) => update("company_postal_code", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-company-address">会社住所</label>
                <input id="mc-company-address" type="text" value={form.company_address}
                  onChange={(e) => update("company_address", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-company-phone">会社電話</label>
                <input id="mc-company-phone" type="tel" value={form.company_phone}
                  onChange={(e) => update("company_phone", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-company-fax">会社FAX</label>
                <input id="mc-company-fax" type="tel" value={form.company_fax}
                  onChange={(e) => update("company_fax", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-company-pr">会社PR</label>
                <textarea id="mc-company-pr" rows={3} value={form.company_pr}
                  onChange={(e) => update("company_pr", e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* 自宅情報 */}
        <section className="card panel-card single-panel" style={{ marginBottom: '1rem' }}>
          <div className="card-body stack">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>自宅情報</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="mc-home-postal">自宅郵便番号</label>
                <input id="mc-home-postal" type="text" value={form.home_postal_code}
                  onChange={(e) => update("home_postal_code", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-home-address">自宅住所</label>
                <input id="mc-home-address" type="text" value={form.home_address}
                  onChange={(e) => update("home_address", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-home-phone">自宅電話</label>
                <input id="mc-home-phone" type="tel" value={form.home_phone}
                  onChange={(e) => update("home_phone", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-home-fax">自宅FAX</label>
                <input id="mc-home-fax" type="tel" value={form.home_fax}
                  onChange={(e) => update("home_fax", e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* その他 */}
        <section className="card panel-card single-panel" style={{ marginBottom: '1rem' }}>
          <div className="card-body stack">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>その他</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="mc-referrer1">紹介者1</label>
                <input id="mc-referrer1" type="text" value={form.referrer_1}
                  onChange={(e) => update("referrer_1", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="mc-referrer2">紹介者2</label>
                <input id="mc-referrer2" type="text" value={form.referrer_2}
                  onChange={(e) => update("referrer_2", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-hobbies">趣味・特技</label>
                <input id="mc-hobbies" type="text" value={form.hobbies}
                  onChange={(e) => update("hobbies", e.target.value)} />
              </div>
              <div className="field field-span-2">
                <label htmlFor="mc-notes">備考（管理者メモ）</label>
                <textarea id="mc-notes" rows={3} value={form.notes}
                  onChange={(e) => update("notes", e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* 名簿掲載設定 */}
        <section className="card panel-card single-panel" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body stack">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>名簿掲載設定</h2>
            <div className="form-grid">
              <div className="field">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.show_email_in_directory}
                    onChange={(e) => update("show_email_in_directory", e.target.checked)} />
                  メールアドレスを名簿に掲載
                </label>
              </div>
              <div className="field">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.show_mobile_in_directory}
                    onChange={(e) => update("show_mobile_in_directory", e.target.checked)} />
                  携帯電話を名簿に掲載
                </label>
              </div>
              <div className="field">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.show_company_in_directory}
                    onChange={(e) => update("show_company_in_directory", e.target.checked)} />
                  会社情報を名簿に掲載
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="filter-actions">
          <button className="button" type="submit" disabled={saving}>
            {saving ? "登録中..." : "登録する"}
          </button>
          <button className="button ghost" type="button" onClick={() => navigate("/admin/members")}>
            キャンセル
          </button>
        </div>
      </form>
    </section>
  );
}
