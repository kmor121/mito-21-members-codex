import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../../api/base44Client';

const APPLICATION_DRAFT_KEY = "mito21-application-draft";

function getDraft() {
  try { return JSON.parse(sessionStorage.getItem(APPLICATION_DRAFT_KEY) || "{}"); } catch { return {}; }
}

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

function SummaryItem({ label, value }) {
  return (
    <div className="summary-item">
      <dt>{label}</dt>
      <dd>{displayValue(value)}</dd>
    </div>
  );
}

function buildFormData(draft) {
  const formData = new FormData();
  const fields = [
    "last_name","first_name","last_name_kana","first_name_kana",
    "birthday","company_name","company_position","industry",
    "company_postal_code","company_address","company_phone","company_fax","company_pr",
    "email","mobile_phone","home_postal_code","home_address","home_phone","home_fax",
    "hobbies","referrer_1","referrer_2"
  ];
  fields.forEach((k) => {
    const val = k === "company_name" ? (String(draft[k] || "").trim() || "未設定") : String(draft[k] || "");
    formData.set(k, val);
  });
  formData.set("show_company_in_directory", "false");
  formData.set("show_email_in_directory", draft.show_email_in_directory ? "true" : "false");
  formData.set("show_mobile_in_directory", draft.show_mobile_in_directory ? "true" : "false");
  const file = window.__applicationProfileImage;
  if (file) formData.set("profile_image", file, file.name);
  return formData;
}

export default function ApplyConfirm() {
  const navigate = useNavigate();
  const draft = getDraft();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const previewUrl = window.__applicationProfileImagePreview || "";

  if (!draft.last_name) {
    return (
      <section className="card">
        <div className="card-body stack">
          <p className="message error">確認する申込内容がありません。先に入力画面から進んでください。</p>
          <div className="actions">
            <Link className="button" to="/apply">入会申込へ</Link>
            <Link className="button ghost" to="/">トップへ</Link>
          </div>
        </div>
      </section>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrorMsg("");
    try {
      await apiRequest("register-member", { method: "POST", body: buildFormData(draft) });
      sessionStorage.removeItem(APPLICATION_DRAFT_KEY);
      window.__applicationProfileImage = null;
      window.__applicationProfileImagePreview = "";
      navigate("/apply/complete");
    } catch (error) {
      setErrorMsg(
        error.message === "Email already exists"
          ? "このメールアドレスでの申込はすでに受付けています。"
          : error.message || "申込の送信に失敗しました。"
      );
      setSubmitting(false);
    }
  }

  return (
    <section className="application-layout stack">
      <div className="page-header">
        <h1 className="page-title">申込内容の確認</h1>
        <p className="page-description">入力内容を確認して送信してください</p>
      </div>

      <section className="detail-card application-section application-confirm-card stack">
        <div className="panel-heading compact"><div><h2>確認内容</h2></div></div>
        <p className="upload-note">再読み込みすると画像は再選択が必要です。</p>
        {previewUrl && (
          <div className="application-image-preview confirm">
            <img src={previewUrl} alt="プロフィール画像プレビュー" />
          </div>
        )}
        <dl className="summary-grid application-summary-grid">
          <SummaryItem label="姓" value={draft.last_name} />
          <SummaryItem label="名" value={draft.first_name} />
          <SummaryItem label="セイ（フリガナ）" value={draft.last_name_kana} />
          <SummaryItem label="メイ（フリガナ）" value={draft.first_name_kana} />
          <SummaryItem label="生年月日" value={draft.birthday} />
          <SummaryItem label="プロフィール画像" value={draft.profile_image || "未選択"} />
          <SummaryItem label="会社名" value={draft.company_name || "未入力"} />
          <SummaryItem label="役職名" value={draft.company_position} />
          <SummaryItem label="業種" value={draft.industry} />
          <SummaryItem label="会社郵便番号" value={draft.company_postal_code} />
          <SummaryItem label="会社住所" value={draft.company_address} />
          <SummaryItem label="会社電話番号" value={draft.company_phone} />
          <SummaryItem label="会社FAX" value={draft.company_fax} />
          <SummaryItem label="会社の概要・PR" value={draft.company_pr} />
          <SummaryItem label="メールアドレス" value={draft.email} />
          <SummaryItem label="メール公開" value={draft.show_email_in_directory} />
          <SummaryItem label="携帯番号" value={draft.mobile_phone} />
          <SummaryItem label="携帯番号公開" value={draft.show_mobile_in_directory} />
          <SummaryItem label="自宅郵便番号" value={draft.home_postal_code} />
          <SummaryItem label="自宅住所" value={draft.home_address} />
          <SummaryItem label="自宅電話番号" value={draft.home_phone} />
          <SummaryItem label="自宅FAX" value={draft.home_fax} />
          <SummaryItem label="趣味・信条" value={draft.hobbies} />
          <SummaryItem label="紹介者1" value={draft.referrer_1} />
          <SummaryItem label="紹介者2" value={draft.referrer_2} />
        </dl>
      </section>

      <section className="detail-card application-section application-section-actions stack-sm">
        {errorMsg && <p className="message error" aria-live="polite">{errorMsg}</p>}
        <div className="actions application-actions">
          <button className="button" type="button" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "送信中..." : "この内容で送信する"}
          </button>
          <Link className="text-link subtle-link" to="/apply">入力画面</Link>
        </div>
      </section>
    </section>
  );
}
