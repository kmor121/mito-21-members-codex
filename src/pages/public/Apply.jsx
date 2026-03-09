import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const APPLICATION_DRAFT_KEY = "mito21-application-draft";
const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_ACCEPTED_TYPES = ["image/jpeg", "image/png"];

function getDraft() {
  try { return JSON.parse(sessionStorage.getItem(APPLICATION_DRAFT_KEY) || "{}"); } catch { return {}; }
}
function saveDraft(d) { sessionStorage.setItem(APPLICATION_DRAFT_KEY, JSON.stringify(d)); }

function validateDraft(draft, imageFile) {
  const errors = {};
  const required = [
    ["name_kanji", "氏名を入力してください。"],
    ["name_kana", "氏名（ふりがな）を入力してください。"],
    ["birthday", "生年月日を入力してください。"],
    ["email", "メールアドレスを入力してください。"],
    ["mobile_phone", "携帯番号を入力してください。"],
    ["referrer_1", "紹介者1を入力してください。"],
    ["referrer_2", "紹介者2を入力してください。"],
  ];
  required.forEach(([k, m]) => { if (!draft[k]) errors[k] = m; });
  if (draft.email && !draft.email.includes("@")) errors.email = "メールアドレスの形式を確認してください。";
  if (imageFile) {
    if (!PROFILE_IMAGE_ACCEPTED_TYPES.includes(imageFile.type)) errors.profile_image = "プロフィール画像は JPG / PNG のみです。";
    else if (imageFile.size > PROFILE_IMAGE_MAX_BYTES) errors.profile_image = "プロフィール画像は 5MB 以下にしてください。";
  }
  return errors;
}

function FieldError({ errors, field }) {
  return errors[field] ? <p className="field-error">{errors[field]}</p> : null;
}

export default function Apply() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(getDraft);
  const [errors, setErrors] = useState({});
  const [formMessage, setFormMessage] = useState("");
  const imageRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");

  function updateField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const file = imageRef.current?.files?.[0] || null;
    const d = { ...draft };
    if (file) d.profile_image = file.name;
    const errs = validateDraft(d, file);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setFormMessage("入力内容を確認してください。");
      return;
    }
    saveDraft(d);
    // Store file reference in sessionStorage is not possible; we use a global
    if (file) {
      window.__applicationProfileImage = file;
      window.__applicationProfileImagePreview = URL.createObjectURL(file);
    }
    navigate("/apply/confirm");
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      updateField("profile_image", file.name);
    }
  }

  const v = (key) => draft[key] || "";

  return (
    <section className="application-layout stack">
      <div className="page-header">
        <h1 className="page-title">入会申込</h1>
        <p className="page-description">必要事項を入力し、確認後に送信してください</p>
      </div>

      <form className="application-form stack" noValidate onSubmit={handleSubmit}>
        <section className="detail-card application-section stack">
          <div className="panel-heading compact"><div><h2>基本情報</h2></div></div>
          <div className="editor-grid">
            <div className="field">
              <div className="label-row"><label htmlFor="name_kanji">氏名</label><span className="required">必須</span></div>
              <input id="name_kanji" name="name_kanji" type="text" autoComplete="name" placeholder="例: 水戸 太郎" value={v("name_kanji")} onChange={(e) => updateField("name_kanji", e.target.value)} />
              <FieldError errors={errors} field="name_kanji" />
            </div>
            <div className="field">
              <div className="label-row"><label htmlFor="name_kana">氏名（ふりがな）</label><span className="required">必須</span></div>
              <input id="name_kana" name="name_kana" type="text" placeholder="例: みと たろう" value={v("name_kana")} onChange={(e) => updateField("name_kana", e.target.value)} />
              <FieldError errors={errors} field="name_kana" />
            </div>
            <div className="field field-compact">
              <div className="label-row"><label htmlFor="birthday">生年月日</label><span className="required">必須</span></div>
              <div className="date-input-wrap">
                <input id="birthday" className="date-input" name="birthday" type="date" value={v("birthday")} onChange={(e) => updateField("birthday", e.target.value)} />
              </div>
              <p className="field-help">カレンダーから選択できます。</p>
              <FieldError errors={errors} field="birthday" />
            </div>
            <div className="field">
              <div className="label-row"><label htmlFor="profile_image">プロフィール画像</label><span className="pill">任意</span></div>
              <input ref={imageRef} id="profile_image" name="profile_image" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={handleFileChange} />
              <p className="muted">JPG / JPEG / PNG、5MB 以下。</p>
              <p className="upload-note">再読み込みすると画像は再選択が必要です。</p>
              <FieldError errors={errors} field="profile_image" />
              {v("profile_image") && <p className="selected-file">選択中: {v("profile_image")}</p>}
              {previewUrl && <div className="application-image-preview"><img src={previewUrl} alt="プレビュー" /></div>}
            </div>
          </div>
        </section>

        <section className="detail-card application-section stack">
          <div className="panel-heading compact"><div><h2>会社情報</h2></div></div>
          <p className="muted section-note">会社名は任意です。わかる範囲で入力してください。</p>
          <div className="editor-grid">
            <div className="field">
              <div className="label-row"><label htmlFor="company_name">会社名</label><span className="pill">任意</span></div>
              <input id="company_name" name="company_name" type="text" autoComplete="organization" placeholder="例: 株式会社MITO" value={v("company_name")} onChange={(e) => updateField("company_name", e.target.value)} />
            </div>
            <div className="field">
              <div className="label-row"><label htmlFor="company_position">役職名</label><span className="pill">任意</span></div>
              <input id="company_position" name="company_position" type="text" placeholder="例: 代表取締役" value={v("company_position")} onChange={(e) => updateField("company_position", e.target.value)} />
            </div>
            <div className="field">
              <div className="label-row"><label htmlFor="industry">業種</label><span className="pill">任意</span></div>
              <input id="industry" name="industry" type="text" placeholder="例: 建設業" value={v("industry")} onChange={(e) => updateField("industry", e.target.value)} />
            </div>
            <div className="field">
              <div className="label-row"><label htmlFor="company_postal_code">会社郵便番号</label><span className="pill">任意</span></div>
              <input id="company_postal_code" name="company_postal_code" type="text" inputMode="numeric" placeholder="例: 310-0001" value={v("company_postal_code")} onChange={(e) => updateField("company_postal_code", e.target.value)} />
            </div>
            <div className="field field-span-2">
              <div className="label-row"><label htmlFor="company_address">会社住所</label><span className="pill">任意</span></div>
              <input id="company_address" name="company_address" type="text" placeholder="例: 茨城県水戸市..." value={v("company_address")} onChange={(e) => updateField("company_address", e.target.value)} />
            </div>
            <div className="field">
              <div className="label-row"><label htmlFor="company_phone">会社電話番号</label><span className="pill">任意</span></div>
              <input id="company_phone" name="company_phone" type="tel" placeholder="例: 029-000-0000" value={v("company_phone")} onChange={(e) => updateField("company_phone", e.target.value)} />
            </div>
            <div className="field">
              <div className="label-row"><label htmlFor="company_fax">会社FAX</label><span className="pill">任意</span></div>
              <input id="company_fax" name="company_fax" type="tel" placeholder="例: 029-000-0001" value={v("company_fax")} onChange={(e) => updateField("company_fax", e.target.value)} />
            </div>
            <div className="field field-span-2">
              <div className="label-row"><label htmlFor="company_pr">会社の概要・PR</label><span className="pill">任意</span></div>
              <textarea id="company_pr" name="company_pr" rows="4" placeholder="事業内容や特徴を入力してください。" value={v("company_pr")} onChange={(e) => updateField("company_pr", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="detail-card application-section application-section-contacts stack">
          <div className="panel-heading compact"><div><h2>個人連絡先</h2></div></div>
          <div className="contact-pair-grid">
            <div className="contact-field">
              <div className="field">
                <div className="label-row"><label htmlFor="email">メールアドレス</label><span className="required">必須</span></div>
                <input id="email" name="email" type="email" autoComplete="email" placeholder="例: member@example.com" value={v("email")} onChange={(e) => updateField("email", e.target.value)} />
                <FieldError errors={errors} field="email" />
              </div>
              <label className="checkbox-row checkbox-row-compact">
                <input name="show_email_in_directory" type="checkbox" checked={!!draft.show_email_in_directory} onChange={(e) => updateField("show_email_in_directory", e.target.checked)} />
                <span>メールを名簿に掲載してよい</span>
              </label>
            </div>
            <div className="contact-field">
              <div className="field">
                <div className="label-row"><label htmlFor="mobile_phone">携帯番号</label><span className="required">必須</span></div>
                <input id="mobile_phone" name="mobile_phone" type="tel" autoComplete="tel" placeholder="例: 090-1234-5678" value={v("mobile_phone")} onChange={(e) => updateField("mobile_phone", e.target.value)} />
                <FieldError errors={errors} field="mobile_phone" />
              </div>
              <label className="checkbox-row checkbox-row-compact">
                <input name="show_mobile_in_directory" type="checkbox" checked={!!draft.show_mobile_in_directory} onChange={(e) => updateField("show_mobile_in_directory", e.target.checked)} />
                <span>携帯番号を名簿に掲載してよい</span>
              </label>
            </div>
          </div>
        </section>

        <section className="detail-card application-section stack">
          <div className="panel-heading compact"><div><h2>自宅情報</h2></div></div>
          <div className="editor-grid">
            <div className="field">
              <div className="label-row"><label htmlFor="home_postal_code">自宅郵便番号</label><span className="pill">任意</span></div>
              <input id="home_postal_code" name="home_postal_code" type="text" inputMode="numeric" placeholder="例: 310-0002" value={v("home_postal_code")} onChange={(e) => updateField("home_postal_code", e.target.value)} />
            </div>
            <div className="field field-span-2">
              <div className="label-row"><label htmlFor="home_address">自宅住所</label><span className="pill">任意</span></div>
              <input id="home_address" name="home_address" type="text" placeholder="例: 茨城県水戸市..." value={v("home_address")} onChange={(e) => updateField("home_address", e.target.value)} />
            </div>
            <div className="field">
              <div className="label-row"><label htmlFor="home_phone">自宅電話番号</label><span className="pill">任意</span></div>
              <input id="home_phone" name="home_phone" type="tel" placeholder="例: 029-111-1111" value={v("home_phone")} onChange={(e) => updateField("home_phone", e.target.value)} />
            </div>
            <div className="field">
              <div className="label-row"><label htmlFor="home_fax">自宅FAX</label><span className="pill">任意</span></div>
              <input id="home_fax" name="home_fax" type="tel" placeholder="例: 029-111-1112" value={v("home_fax")} onChange={(e) => updateField("home_fax", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="detail-card application-section stack">
          <div className="panel-heading compact"><div><h2>その他</h2></div></div>
          <div className="editor-grid">
            <div className="field field-span-2">
              <div className="label-row"><label htmlFor="hobbies">趣味・信条</label><span className="pill">任意</span></div>
              <textarea id="hobbies" name="hobbies" rows="4" placeholder="例: ゴルフ、地域活動、読書" value={v("hobbies")} onChange={(e) => updateField("hobbies", e.target.value)} />
            </div>
            <div className="field">
              <div className="label-row"><label htmlFor="referrer_1">紹介者1</label><span className="required">必須</span></div>
              <input id="referrer_1" name="referrer_1" type="text" placeholder="例: 紹介 太郎" value={v("referrer_1")} onChange={(e) => updateField("referrer_1", e.target.value)} />
              <FieldError errors={errors} field="referrer_1" />
            </div>
            <div className="field">
              <div className="label-row"><label htmlFor="referrer_2">紹介者2</label><span className="required">必須</span></div>
              <input id="referrer_2" name="referrer_2" type="text" placeholder="例: 紹介 花子" value={v("referrer_2")} onChange={(e) => updateField("referrer_2", e.target.value)} />
              <FieldError errors={errors} field="referrer_2" />
            </div>
          </div>
        </section>

        <section className="detail-card application-section application-section-actions stack-sm">
          {formMessage && <p className="message error" aria-live="polite">{formMessage}</p>}
          <div className="actions application-actions">
            <button className="button" type="submit">確認画面へ進む</button>
            <Link className="text-link subtle-link" to="/">公開トップ</Link>
          </div>
        </section>
      </form>
    </section>
  );
}
