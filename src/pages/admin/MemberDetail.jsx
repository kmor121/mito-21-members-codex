import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

/* ---------- helpers ---------- */

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

function formatCurrency(v) {
  const n = Number(v);
  return `¥${(Number.isFinite(n) ? n : 0).toLocaleString("ja-JP")}`;
}

function MemberImage({ src, name, size = "detail" }) {
  const initial = (name || "M").charAt(0);
  if (src) return <div className={`member-image member-image-${size}`}><img src={src} alt={name || ""} loading="lazy" /></div>;
  return <div className={`member-image member-image-${size} is-placeholder`}><span>{initial}</span></div>;
}

const FIELD_LABELS = {
  name_kanji: "氏名",
  name_kana: "フリガナ",
  birthday: "生年月日",
  company_name: "会社名",
  company_position: "役職",
  industry: "業種",
  email: "メール",
  mobile_phone: "携帯番号",
  company_phone: "会社電話",
  company_fax: "会社FAX",
  company_address: "会社住所",
  company_postal_code: "会社郵便番号",
  company_pr: "会社PR",
  home_postal_code: "自宅郵便番号",
  home_address: "自宅住所",
  home_phone: "自宅電話",
  home_fax: "自宅FAX",
  hobbies: "趣味・信条",
  profile_image: "プロフィール画像",
  show_email_in_directory: "メール公開",
  show_company_in_directory: "会社公開",
  show_mobile_in_directory: "携帯公開",
  member_number: "会員番号",
  member_type: "会員種別",
  status: "ステータス",
  is_new: "新入フラグ",
  notes: "備考",
};

const TABS = [
  { key: "basic", label: "基本情報" },
  { key: "org", label: "組織履歴" },
  { key: "dues", label: "会費履歴" },
  { key: "directory", label: "名簿設定" },
  { key: "changelog", label: "変更履歴" },
];

/* ---------- component ---------- */

export default function MemberDetail() {
  const { memberId } = useParams();

  const [member, setMember] = useState(null);
  const [history, setHistory] = useState(null);
  const [changeLogs, setChangeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("basic");

  // Edit form
  const [formData, setFormData] = useState({});
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Directory settings form
  const [dirForm, setDirForm] = useState({
    show_email_in_directory: false,
    show_company_in_directory: false,
    show_mobile_in_directory: false,
  });
  const [dirMessage, setDirMessage] = useState("");
  const [dirMessageType, setDirMessageType] = useState("");
  const [dirSubmitting, setDirSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [detailRes, historyRes, logsRes] = await Promise.all([
        apiRequest(`get-member-detail?id=${encodeURIComponent(memberId)}`),
        apiRequest(`get-member-history?memberId=${encodeURIComponent(memberId)}`),
        apiRequest(`get-member-change-logs?memberId=${encodeURIComponent(memberId)}`),
      ]);

      const m = detailRes.member || detailRes;
      setMember(m);
      setHistory(historyRes);
      const rawLogs = logsRes.logs || logsRes.change_logs;
      setChangeLogs(Array.isArray(rawLogs) ? rawLogs : []);

      setFormData({
        name_kanji: m.name_kanji || "",
        name_kana: m.name_kana || "",
        birthday: m.birthday || "",
        company_name: m.company_name || "",
        company_position: m.company_position || "",
        industry: m.industry || "",
        email: m.email || "",
        mobile_phone: m.mobile_phone || "",
        company_phone: m.company_phone || "",
        company_fax: m.company_fax || "",
        company_postal_code: m.company_postal_code || "",
        company_address: m.company_address || "",
        company_pr: m.company_pr || "",
        home_postal_code: m.home_postal_code || "",
        home_address: m.home_address || "",
        home_phone: m.home_phone || "",
        home_fax: m.home_fax || "",
        hobbies: m.hobbies || "",
        member_number: m.member_number || "",
        member_type: m.member_type || "正会員",
        status: m.status || "活動中",
        notes: m.notes || "",
      });

      setDirForm({
        show_email_in_directory: !!m.show_email_in_directory,
        show_company_in_directory: !!m.show_company_in_directory,
        show_mobile_in_directory: !!m.show_mobile_in_directory,
      });

      // Flash message
      const flash = sessionStorage.getItem("member-edit-message");
      if (flash) {
        setFormMessage(flash);
        setFormMessageType("success");
        sessionStorage.removeItem("member-edit-message");
      }
    } catch (err) {
      setError(err.message || "会員情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateField(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  /* ---------- Basic info edit submit ---------- */
  async function handleEditSubmit(e) {
    e.preventDefault();
    setFormMessage("");
    setFormMessageType("");

    // Validate required fields
    const required = [
      { key: "name_kanji", label: "氏名" },
      { key: "name_kana", label: "フリガナ" },
      { key: "birthday", label: "生年月日" },
      { key: "email", label: "メール" },
      { key: "mobile_phone", label: "携帯番号" },
    ];
    for (const r of required) {
      if (!String(formData[r.key] || "").trim()) {
        setFormMessage(`${r.label}を入力してください。`);
        setFormMessageType("error");
        return;
      }
    }

    setSubmitting(true);

    const payload = {
      id: member.id,
      changed_by: "admin",
      changed_by_role: "admin",
    };
    // Include all editable fields
    const fields = [
      "name_kanji", "name_kana", "birthday",
      "company_name", "company_position", "industry",
      "email", "mobile_phone", "company_phone", "company_fax",
      "company_postal_code", "company_address", "company_pr",
      "home_postal_code", "home_address", "home_phone", "home_fax",
      "hobbies", "member_number", "member_type", "status", "notes",
    ];
    for (const f of fields) {
      payload[f] = typeof formData[f] === "string" ? formData[f].trim() : formData[f];
    }

    try {
      await apiRequest("update-member-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      sessionStorage.setItem("member-edit-message", "保存しました。");
      await loadData();
    } catch (err) {
      setFormMessage(err.message || "保存に失敗しました。");
      setFormMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- Directory settings submit ---------- */
  async function handleDirSubmit(e) {
    e.preventDefault();
    setDirMessage("");
    setDirMessageType("");
    setDirSubmitting(true);

    try {
      await apiRequest("update-member-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: member.id,
          allow_partial_profile_update: true,
          changed_by: "admin",
          changed_by_role: "admin",
          show_email_in_directory: dirForm.show_email_in_directory,
          show_company_in_directory: dirForm.show_company_in_directory,
          show_mobile_in_directory: dirForm.show_mobile_in_directory,
        }),
      });
      setDirMessage("名簿設定を保存しました。");
      setDirMessageType("success");
    } catch (err) {
      setDirMessage(err.message || "保存に失敗しました。");
      setDirMessageType("error");
    } finally {
      setDirSubmitting(false);
    }
  }

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">会員詳細</h1>
          <p className="page-description">
            <Link className="text-link" to="/admin/members">← 会員一覧へ戻る</Link>
          </p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body"><LoadingSpinner /></div>
        </section>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">会員詳細</h1>
          <p className="page-description">
            <Link className="text-link" to="/admin/members">← 会員一覧へ戻る</Link>
          </p>
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

  const orgHistory = history?.org_history || [];
  const duesHistory = history?.dues_history || [];

  // Group org history by year
  const orgByYear = {};
  for (const item of orgHistory) {
    const year = item.year || "不明";
    if (!orgByYear[year]) orgByYear[year] = [];
    orgByYear[year].push(item);
  }
  const orgYears = Object.keys(orgByYear).sort((a, b) => String(b).localeCompare(String(a)));

  const referrerMatches = member.referrer_matches || {};

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">会員詳細: {displayValue(member.name_kanji)}</h1>
        <p className="page-description">
          <Link className="text-link" to="/admin/members">← 会員一覧へ戻る</Link>
        </p>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-button${activeTab === tab.key ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---------- 基本情報 tab ---------- */}
      <div className={`tab-panel${activeTab === "basic" ? " is-active" : ""}`}>
        <div className="admin-grid admin-grid-wide">
          {/* Left: member detail */}
          <section className="card panel-card">
            <div className="card-body stack">
              <div className="panel-heading"><div><h2>会員情報</h2></div></div>
              <section className="detail-card stack-sm">
                <div className="detail-header-row">
                  <div><h3>{displayValue(member.name_kanji)}</h3></div>
                  <div className="pill-row">
                    <span className="pill">{displayValue(member.member_type)}</span>
                    <span className="pill">{displayValue(member.status)}</span>
                  </div>
                </div>
                <div className="member-image-wrap">
                  <MemberImage src={member.profile_image} name={member.name_kanji} size="detail" />
                </div>
                <dl className="detail-grid">
                  <div><dt>氏名</dt><dd>{displayValue(member.name_kanji)}</dd></div>
                  <div><dt>フリガナ</dt><dd>{displayValue(member.name_kana)}</dd></div>
                  <div><dt>生年月日</dt><dd>{displayValue(member.birthday)}</dd></div>
                  <div><dt>会社名</dt><dd>{displayValue(member.company_name)}</dd></div>
                  <div><dt>役職</dt><dd>{displayValue(member.company_position)}</dd></div>
                  <div><dt>業種</dt><dd>{displayValue(member.industry)}</dd></div>
                  <div><dt>メール</dt><dd>{displayValue(member.email)}</dd></div>
                  <div><dt>携帯番号</dt><dd>{displayValue(member.mobile_phone)}</dd></div>
                  <div><dt>会社電話</dt><dd>{displayValue(member.company_phone)}</dd></div>
                  <div><dt>会社FAX</dt><dd>{displayValue(member.company_fax)}</dd></div>
                  <div><dt>会社郵便番号</dt><dd>{displayValue(member.company_postal_code)}</dd></div>
                  <div><dt>会社住所</dt><dd>{displayValue(member.company_address)}</dd></div>
                  <div><dt>会社PR</dt><dd>{displayValue(member.company_pr)}</dd></div>
                  <div><dt>自宅郵便番号</dt><dd>{displayValue(member.home_postal_code)}</dd></div>
                  <div><dt>自宅住所</dt><dd>{displayValue(member.home_address)}</dd></div>
                  <div><dt>自宅電話</dt><dd>{displayValue(member.home_phone)}</dd></div>
                  <div><dt>自宅FAX</dt><dd>{displayValue(member.home_fax)}</dd></div>
                  <div><dt>趣味・信条</dt><dd>{displayValue(member.hobbies)}</dd></div>
                  <div><dt>会員番号</dt><dd>{displayValue(member.member_number)}</dd></div>
                  <div><dt>会員種別</dt><dd>{displayValue(member.member_type)}</dd></div>
                  <div><dt>ステータス</dt><dd>{displayValue(member.status)}</dd></div>
                  <div><dt>備考</dt><dd>{displayValue(member.notes)}</dd></div>
                  <div><dt>メール公開</dt><dd>{displayValue(member.show_email_in_directory)}</dd></div>
                  <div><dt>会社公開</dt><dd>{displayValue(member.show_company_in_directory)}</dd></div>
                  <div><dt>携帯公開</dt><dd>{displayValue(member.show_mobile_in_directory)}</dd></div>
                </dl>
              </section>

              {/* Referrer matches */}
              {(referrerMatches.referrer_1 || referrerMatches.referrer_2) && (
                <section className="detail-card stack-sm">
                  <h3>紹介者マッチ</h3>
                  {referrerMatches.referrer_1 && (
                    <div>
                      <strong>紹介者1:</strong> {referrerMatches.referrer_1.name_kanji || "-"} ({referrerMatches.referrer_1.company_name || "-"})
                    </div>
                  )}
                  {referrerMatches.referrer_2 && (
                    <div>
                      <strong>紹介者2:</strong> {referrerMatches.referrer_2.name_kanji || "-"} ({referrerMatches.referrer_2.company_name || "-"})
                    </div>
                  )}
                </section>
              )}
            </div>
          </section>

          {/* Right: edit form */}
          <section className="card panel-card">
            <div className="card-body stack">
              <div className="panel-heading"><div><h2>会員編集</h2></div></div>
              <form className="editor-form" noValidate onSubmit={handleEditSubmit}>
                <h4 style={{ margin: "0.5rem 0 0.25rem" }}>基本情報</h4>
                <div className="editor-grid">
                  <div className="field">
                    <label htmlFor="md-name-kanji">氏名 *</label>
                    <input id="md-name-kanji" type="text" value={formData.name_kanji} onChange={(e) => updateField("name_kanji", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-name-kana">フリガナ *</label>
                    <input id="md-name-kana" type="text" value={formData.name_kana} onChange={(e) => updateField("name_kana", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-birthday">生年月日 *</label>
                    <input id="md-birthday" type="date" value={formData.birthday} onChange={(e) => updateField("birthday", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-email">メール *</label>
                    <input id="md-email" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-mobile-phone">携帯番号 *</label>
                    <input id="md-mobile-phone" type="tel" value={formData.mobile_phone} onChange={(e) => updateField("mobile_phone", e.target.value)} />
                  </div>
                </div>

                <h4 style={{ margin: "0.5rem 0 0.25rem" }}>会社情報</h4>
                <div className="editor-grid">
                  <div className="field">
                    <label htmlFor="md-company-name">会社名</label>
                    <input id="md-company-name" type="text" value={formData.company_name} onChange={(e) => updateField("company_name", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-company-position">役職</label>
                    <input id="md-company-position" type="text" value={formData.company_position} onChange={(e) => updateField("company_position", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-industry">業種</label>
                    <input id="md-industry" type="text" value={formData.industry} onChange={(e) => updateField("industry", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-company-postal-code">会社郵便番号</label>
                    <input id="md-company-postal-code" type="text" value={formData.company_postal_code} onChange={(e) => updateField("company_postal_code", e.target.value)} />
                  </div>
                  <div className="field field-span-2">
                    <label htmlFor="md-company-address">会社住所</label>
                    <textarea id="md-company-address" rows="2" value={formData.company_address} onChange={(e) => updateField("company_address", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-company-phone">会社電話</label>
                    <input id="md-company-phone" type="tel" value={formData.company_phone} onChange={(e) => updateField("company_phone", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-company-fax">会社FAX</label>
                    <input id="md-company-fax" type="tel" value={formData.company_fax} onChange={(e) => updateField("company_fax", e.target.value)} />
                  </div>
                  <div className="field field-span-2">
                    <label htmlFor="md-company-pr">会社PR</label>
                    <textarea id="md-company-pr" rows="2" value={formData.company_pr} onChange={(e) => updateField("company_pr", e.target.value)} />
                  </div>
                </div>

                <h4 style={{ margin: "0.5rem 0 0.25rem" }}>自宅情報</h4>
                <div className="editor-grid">
                  <div className="field">
                    <label htmlFor="md-home-postal-code">自宅郵便番号</label>
                    <input id="md-home-postal-code" type="text" value={formData.home_postal_code} onChange={(e) => updateField("home_postal_code", e.target.value)} />
                  </div>
                  <div className="field field-span-2">
                    <label htmlFor="md-home-address">自宅住所</label>
                    <textarea id="md-home-address" rows="2" value={formData.home_address} onChange={(e) => updateField("home_address", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-home-phone">自宅電話</label>
                    <input id="md-home-phone" type="tel" value={formData.home_phone} onChange={(e) => updateField("home_phone", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-home-fax">自宅FAX</label>
                    <input id="md-home-fax" type="tel" value={formData.home_fax} onChange={(e) => updateField("home_fax", e.target.value)} />
                  </div>
                </div>

                <h4 style={{ margin: "0.5rem 0 0.25rem" }}>その他</h4>
                <div className="editor-grid">
                  <div className="field field-span-2">
                    <label htmlFor="md-hobbies">趣味・信条</label>
                    <textarea id="md-hobbies" rows="2" value={formData.hobbies} onChange={(e) => updateField("hobbies", e.target.value)} />
                  </div>
                </div>

                <h4 style={{ margin: "0.5rem 0 0.25rem" }}>管理情報</h4>
                <div className="editor-grid">
                  <div className="field">
                    <label htmlFor="md-member-number">会員番号</label>
                    <input id="md-member-number" type="text" value={formData.member_number} onChange={(e) => updateField("member_number", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="md-member-type">会員種別</label>
                    <select id="md-member-type" value={formData.member_type} onChange={(e) => updateField("member_type", e.target.value)}>
                      <option value="正会員">正会員</option>
                      <option value="賛助会員">賛助会員</option>
                      <option value="OB会員">OB会員</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="md-status">ステータス</label>
                    <select id="md-status" value={formData.status} onChange={(e) => updateField("status", e.target.value)}>
                      <option value="活動中">活動中</option>
                      <option value="休会">休会</option>
                      <option value="退会">退会</option>
                    </select>
                  </div>
                  <div className="field field-span-2">
                    <label htmlFor="md-notes">備考</label>
                    <textarea id="md-notes" rows="3" value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} />
                  </div>
                </div>

                {formMessage && (
                  <p className={`message ${formMessageType}`} aria-live="polite">{formMessage}</p>
                )}
                <div className="actions">
                  <button className="button" type="submit" disabled={submitting}>
                    {submitting ? "保存中..." : "保存する"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      {/* ---------- 組織履歴 tab ---------- */}
      <div className={`tab-panel${activeTab === "org" ? " is-active" : ""}`}>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>組織履歴</h2></div></div>
            {orgYears.length === 0 ? (
              <p className="muted">組織履歴はありません。</p>
            ) : (
              orgYears.map((year) => (
                <section key={year} className="detail-card stack-sm">
                  <h3>{year}年度</h3>
                  <dl className="detail-grid">
                    {orgByYear[year].map((item, idx) => (
                      <div key={idx}>
                        <dt>{item.org_name || "-"}</dt>
                        <dd>{item.role || "-"}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ---------- 会費履歴 tab ---------- */}
      <div className={`tab-panel${activeTab === "dues" ? " is-active" : ""}`}>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>会費履歴</h2></div></div>
            {duesHistory.length === 0 ? (
              <p className="muted">会費履歴はありません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>年度</th>
                      <th>金額</th>
                      <th>ステータス</th>
                      <th>納入日</th>
                      <th>備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duesHistory.map((d, idx) => (
                      <tr key={idx}>
                        <td>{displayValue(d.year)}</td>
                        <td>{formatCurrency(d.amount)}</td>
                        <td>
                          <span className={`pill${d.status === "納入済" ? " pill-success" : ""}`}>
                            {displayValue(d.status)}
                          </span>
                        </td>
                        <td>{displayValue(d.paid_date)}</td>
                        <td>{displayValue(d.notes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ---------- 名簿設定 tab ---------- */}
      <div className={`tab-panel${activeTab === "directory" ? " is-active" : ""}`}>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>名簿設定</h2></div></div>
            <form className="editor-form" noValidate onSubmit={handleDirSubmit}>
              <section className="detail-card stack-sm inset-card">
                <h3>名簿公開設定</h3>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={dirForm.show_email_in_directory}
                    onChange={(e) => setDirForm((prev) => ({ ...prev, show_email_in_directory: e.target.checked }))}
                  />
                  <span>メールを名簿に公開する</span>
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={dirForm.show_company_in_directory}
                    onChange={(e) => setDirForm((prev) => ({ ...prev, show_company_in_directory: e.target.checked }))}
                  />
                  <span>会社情報を名簿に公開する</span>
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={dirForm.show_mobile_in_directory}
                    onChange={(e) => setDirForm((prev) => ({ ...prev, show_mobile_in_directory: e.target.checked }))}
                  />
                  <span>携帯番号を名簿に公開する</span>
                </label>
              </section>
              {dirMessage && (
                <p className={`message ${dirMessageType}`} aria-live="polite">{dirMessage}</p>
              )}
              <div className="actions">
                <button className="button" type="submit" disabled={dirSubmitting}>
                  {dirSubmitting ? "保存中..." : "名簿設定を保存"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* ---------- 変更履歴 tab ---------- */}
      <div className={`tab-panel${activeTab === "changelog" ? " is-active" : ""}`}>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>変更履歴</h2></div></div>
            {changeLogs.length === 0 ? (
              <p className="muted">変更履歴はありません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>日時</th>
                      <th>変更者</th>
                      <th>項目</th>
                      <th>変更前</th>
                      <th>変更後</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeLogs.map((log, idx) => {
                      const dateStr = log.changed_at
                        ? new Date(log.changed_at).toLocaleString("ja-JP")
                        : "-";
                      const changedBy = log.changed_by
                        ? `${log.changed_by}${log.changed_by_role ? " (" + log.changed_by_role + ")" : ""}`
                        : "-";
                      const fieldLabel = FIELD_LABELS[log.field_name] || log.field_name || "-";

                      return (
                        <tr key={idx}>
                          <td>{dateStr}</td>
                          <td>{changedBy}</td>
                          <td>{fieldLabel}</td>
                          <td>{displayValue(log.old_value)}</td>
                          <td>{displayValue(log.new_value)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
