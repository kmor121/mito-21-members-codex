import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest, base44, invalidateReadCache } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DatePicker from '../../components/ui/DatePicker';
import { fullName, fullNameKana } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

/* ---------- constants ---------- */

const MEMBER_TYPE_BADGE = {
  "正会員": { bg: "var(--primary-light)", color: "var(--primary)" },
  "賛助会員": { bg: "#ecfdf5", color: "#059669" },
  "OB会員": { bg: "#f1f5f9", color: "#64748b" },
  "名誉顧問": { bg: "#fffbeb", color: "#d97706" },
};

const STATUS_BADGE = {
  "活動中": { bg: "#ecfdf5", color: "#059669" },
  "休会": { bg: "#fffbeb", color: "#d97706" },
  "退会": { bg: "#fee2e2", color: "#991b1b" },
};

const FIELD_LABELS = {
  last_name: "姓", first_name: "名", last_name_kana: "セイ（フリガナ）", first_name_kana: "メイ（フリガナ）",
  birthday: "生年月日",
  company_name: "会社名", company_position: "役職", industry: "業種",
  email: "メール", mobile_phone: "携帯番号",
  company_phone: "会社電話", company_fax: "会社FAX",
  company_address: "会社住所", company_postal_code: "会社郵便番号",
  company_pr: "会社PR", home_postal_code: "自宅郵便番号",
  home_address: "自宅住所", home_phone: "自宅電話", home_fax: "自宅FAX",
  hobbies: "趣味・信条", profile_image: "プロフィール画像",
  show_email_in_directory: "メール公開", show_company_in_directory: "会社公開",
  show_mobile_in_directory: "携帯公開", member_number: "会員番号",
  member_type: "会員種別", status: "ステータス", is_new: "新入フラグ", notes: "備考",
};

const TABS = [
  { key: "basic", label: "基本情報" },
  { key: "org", label: "組織履歴" },
  { key: "dues", label: "会費履歴" },
  { key: "directory", label: "名簿設定" },
  { key: "changelog", label: "変更履歴" },
];

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

function Badge({ label, styleMap }) {
  const s = styleMap?.[label] || { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span
      className="pill"
      style={{
        backgroundColor: s.bg,
        color: s.color,
        fontWeight: 600,
        fontSize: "0.8rem",
        padding: "0.25rem 0.75rem",
        borderRadius: "9999px",
        lineHeight: 1.4,
      }}
    >
      {label}
    </span>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
      <span style={{ fontSize: "1.15rem" }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--text-primary, #1e293b)" }}>{title}</h3>
    </div>
  );
}

function InfoRow({ label, value }) {
  const v = displayValue(value);
  const isEmpty = v === "-";
  return (
    <div style={{ display: "flex", gap: "1rem", padding: "0.4rem 0.5rem", minWidth: 0 }}>
      <dt style={{ minWidth: "8rem", flexShrink: 0, color: "var(--text-secondary, #64748b)", fontSize: "0.875rem", fontWeight: 500 }}>{label}</dt>
      <dd style={{ margin: 0, color: isEmpty ? "var(--text-tertiary, #94a3b8)" : "var(--text-primary, #1e293b)", fontSize: "0.875rem", wordBreak: "break-word" }}>{v}</dd>
    </div>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="nl2-toast">
      <span className="nl2-toast-icon">{"\u2713"}</span>
      <span>{message}</span>
    </div>
  );
}

function buildFormData(m) {
  return {
    last_name: m.last_name || "", first_name: m.first_name || "",
    last_name_kana: m.last_name_kana || "", first_name_kana: m.first_name_kana || "",
    birthday: m.birthday || "",
    company_name: m.company_name || "", company_position: m.company_position || "",
    industry: m.industry || "", email: m.email || "", mobile_phone: m.mobile_phone || "",
    company_phone: m.company_phone || "", company_fax: m.company_fax || "",
    company_postal_code: m.company_postal_code || "", company_address: m.company_address || "",
    company_pr: m.company_pr || "", home_postal_code: m.home_postal_code || "",
    home_address: m.home_address || "", home_phone: m.home_phone || "",
    home_fax: m.home_fax || "", hobbies: m.hobbies || "",
    member_number: m.member_number || "", member_type: m.member_type || "正会員",
    status: m.status || "活動中", notes: m.notes || "",
  };
}

/* ---------- component ---------- */

export default function MemberDetail() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [member, setMember] = useState(null);
  const [history, setHistory] = useState(null);
  const [changeLogs, setChangeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("basic");
  const [isEditing, setIsEditing] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState("");

  // Unlink confirmation modal
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  // Delete member
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteRelatedCounts, setDeleteRelatedCounts] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  function reloadData() {
    invalidateReadCache("Member");
    invalidateReadCache("MemberChangeLog");
    loadData();
  }

  const loadData = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const m = await base44.entities.Member.get(memberId);
      if (!m || !m.id) throw new Error("会員データが見つかりません。");
      setMember(m);

      // Load history data in parallel
      const [fiscalYears, dues, orgAssignments, organizations, changeLogs] = await Promise.all([
        base44.entities.FiscalYear.list("-year"),
        base44.entities.Due.filter({ member_id: memberId }),
        base44.entities.OrgAssignment.filter({ member_id: memberId }),
        base44.entities.Organization.list(),
        base44.entities.MemberChangeLog.filter({ member_id: memberId }, "-changed_at"),
      ]);

      // Build history
      const orgMap = {};
      for (const o of organizations) orgMap[o.id] = o.name || "";
      const fyMap = {};
      for (const fy of fiscalYears) fyMap[fy.id] = fy.year ? `${fy.year}年度` : fy.id;

      const orgHistory = orgAssignments.map((a) => ({
        ...a,
        org_name: orgMap[a.organization_id] || "",
        fiscal_year_label: fyMap[a.fiscal_year_id] || "",
      }));
      const dueHistory = dues.map((d) => ({
        ...d,
        fiscal_year_label: fyMap[d.fiscal_year_id] || "",
      }));

      setHistory({ org_history: orgHistory, due_history: dueHistory });
      setChangeLogs(changeLogs);

      setFormData(buildFormData(m));

      setDirForm({
        show_email_in_directory: !!m.show_email_in_directory,
        show_company_in_directory: !!m.show_company_in_directory,
        show_mobile_in_directory: !!m.show_mobile_in_directory,
      });

      const flash = sessionStorage.getItem("member-edit-message");
      if (flash) {
        setToastMessage(flash);
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

  const orgHistory = useMemo(() => Array.isArray(history?.org_history) ? history.org_history : [], [history]);
  const duesHistory = useMemo(() => Array.isArray(history?.due_history) ? history.due_history : [], [history]);

  const { orgByYear, orgYears } = useMemo(() => {
    const byYear = {};
    for (const item of orgHistory) {
      const year = item.fiscal_year_label || "不明";
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(item);
    }
    const years = Object.keys(byYear).sort((a, b) => String(b).localeCompare(String(a)));
    return { orgByYear: byYear, orgYears: years };
  }, [orgHistory]);

  const referrerMatches = member?.referrer_matches || {};

  function updateField(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleStartEdit() {
    setFormMessage("");
    setFormMessageType("");
    setActiveTab("basic");
    setIsEditing(true);
  }

  function handleCancelEdit() {
    if (member) setFormData(buildFormData(member));
    setFormMessage("");
    setFormMessageType("");
    setIsEditing(false);
  }

  /* ---------- Basic info edit submit ---------- */
  async function handleEditSubmit(e) {
    e.preventDefault();
    setFormMessage("");
    setFormMessageType("");

    const required = [
      { key: "last_name", label: "姓" },
      { key: "first_name", label: "名" },
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

    const payload = { id: member.id, changed_by: "admin", changed_by_role: "admin" };
    const fields = [
      "last_name", "first_name", "last_name_kana", "first_name_kana",
      "birthday",
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
      sessionStorage.setItem("member-edit-message", "保存しました");
      setIsEditing(false);
      await reloadData();
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

  /* ---------- Delete member ---------- */
  async function prepareDelete() {
    const [assignments, dues, logs] = await Promise.all([
      base44.entities.OrgAssignment.filter({ member_id: member.id }).catch(() => []),
      base44.entities.Due.filter({ member_id: member.id }).catch(() => []),
      base44.entities.MemberChangeLog.filter({ member_id: member.id }).catch(() => []),
    ]);
    setDeleteRelatedCounts({
      assignments: assignments.length,
      dues: dues.length,
      logs: logs.length,
    });
    setShowDeleteConfirm(true);
  }

  async function handleDeleteMember() {
    setDeleting(true);
    try {
      await apiRequest("delete-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id }),
      });
      invalidateReadCache("Member");
      invalidateReadCache("OrgAssignment");
      invalidateReadCache("Due");
      invalidateReadCache("MemberChangeLog");
      sessionStorage.setItem("member-list-message", "会員を削除しました");
      navigate("/admin/members");
    } catch (err) {
      setShowDeleteConfirm(false);
      setToastMessage(err.message || "削除に失敗しました。");
    } finally {
      setDeleting(false);
    }
  }

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <p className="page-description">
            <Link className="text-link" to="/admin/members">&larr; 会員一覧に戻る</Link>
          </p>
          <h1 className="page-title">会員詳細</h1>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body"><LoadingSpinner /></div>
        </section>
      </section>
    );
  }

  if (error || !member) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <p className="page-description">
            <Link className="text-link" to="/admin/members">&larr; 会員一覧に戻る</Link>
          </p>
          <h1 className="page-title">会員詳細</h1>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message error">{error || "データを取得できませんでした"}</p>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      {/* Toast notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />

      {/* Unlink confirmation modal */}
      {showUnlinkConfirm && (
        <div className="confirm-overlay" onClick={() => setShowUnlinkConfirm(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, borderRadius: "var(--radius-xl)", animation: "fadeIn 0.15s ease" }}>
            <div className="modal-header" style={{ padding: "20px 24px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>アカウント紐付けを解除しますか？</h3>
            </div>
            <div className="modal-body" style={{ padding: "0 24px 24px" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                このメンバーのBase44ユーザーアカウントとの紐付けを解除します。
                解除するとログインしてもメンバー情報にアクセスできなくなります。
              </p>
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px" }}>
              <button className="btn btn-secondary" onClick={() => setShowUnlinkConfirm(false)}>キャンセル</button>
              <button
                className="btn"
                style={{ background: "var(--error)", color: "#fff", border: "none" }}
                onClick={async () => {
                  setShowUnlinkConfirm(false);
                  try {
                    await apiRequest("update-member-detail", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: member.id, user_id: "" }),
                    });
                    invalidateReadCache("Member");
                    setMember(prev => ({ ...prev, user_id: "" }));
                    window.__showToast?.("紐付けを解除しました", "success");
                  } catch (err) {
                    window.__showToast?.(err.message || "解除に失敗しました", "error");
                  }
                }}
              >
                解除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, borderRadius: "var(--radius-xl)", animation: "fadeIn 0.15s ease" }}>
            <div className="modal-header" style={{ padding: "20px 24px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>この会員を削除しますか？</h3>
            </div>
            <div className="modal-body" style={{ padding: "0 24px 24px" }}>
              <p style={{ fontSize: 14, color: "var(--text-primary)", margin: "0 0 12px 0", fontWeight: 500 }}>
                会員名: {fullName(member)}
              </p>
              {deleteRelatedCounts && (
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  <p style={{ margin: "0 0 4px 0" }}>以下のデータも同時に削除されます:</p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    <li>組織配属 {deleteRelatedCounts.assignments}件</li>
                    <li>会費記録 {deleteRelatedCounts.dues}件</li>
                    <li>変更ログ {deleteRelatedCounts.logs}件</li>
                  </ul>
                </div>
              )}
              <p style={{ fontSize: 13, color: "var(--error, #dc2626)", margin: "12px 0 0 0", fontWeight: 500 }}>
                この操作は取り消せません。
              </p>
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px" }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>キャンセル</button>
              <button
                className="btn"
                style={{ background: "var(--error)", color: "#fff", border: "none" }}
                onClick={handleDeleteMember}
                disabled={deleting}
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <div style={{ marginBottom: "0.75rem" }}>
        <Link className="text-link" to="/admin/members" style={{ fontSize: "0.875rem", textDecoration: "none", color: "var(--primary, #2563eb)" }}>
          &larr; 会員一覧に戻る
        </Link>
      </div>

      {/* ===== Profile Header Card ===== */}
      <section className="card panel-card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-body" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {/* Profile image */}
            <div style={{ flexShrink: 0 }}>
              <MemberImage src={member.profile_image} name={fullName(member)} size="detail" />
            </div>

            {/* Name + badges */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary, #1e293b)" }}>
                  {displayValue(fullName(member))}
                </h1>
                {member.member_number && (
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary, #64748b)" }}>
                    No. {member.member_number}
                  </span>
                )}
              </div>
              {fullNameKana(member) && (
                <p style={{ margin: "0 0 0.625rem 0", fontSize: "0.875rem", color: "var(--text-secondary, #64748b)" }}>
                  {fullNameKana(member)}
                </p>
              )}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {member.member_type && <Badge label={member.member_type} styleMap={MEMBER_TYPE_BADGE} />}
                {member.status && <Badge label={member.status} styleMap={STATUS_BADGE} />}
                {member.is_new && (
                  <span className="pill" style={{ backgroundColor: "#dbeafe", color: "#1d4ed8", fontWeight: 600, fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "9999px" }}>
                    新入
                  </span>
                )}
                {member.is_graduate && (
                  <span className="pill" style={{ backgroundColor: "#fef3c7", color: "#92400e", fontWeight: 600, fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "9999px" }}>
                    卒業生
                  </span>
                )}
              </div>
            </div>

            {/* Edit button */}
            {!isEditing && (
              <div style={{ flexShrink: 0 }}>
                <button className="btn btn-primary" type="button" onClick={handleStartEdit} style={{ whiteSpace: "nowrap" }}>
                  編集する
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Tab bar ===== */}
      <div className="tab-bar" style={{ marginBottom: "1rem" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-button${activeTab === tab.key ? " is-active" : ""}`}
            onClick={() => { if (!isEditing || tab.key === "basic") setActiveTab(tab.key); }}
            style={isEditing && tab.key !== "basic" ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== 基本情報 tab ========== */}
      <div className={`tab-panel${activeTab === "basic" ? " is-active" : ""}`}>
        {!isEditing ? (
          /* ── VIEW MODE ── */
          <div className="stack" style={{ gap: "1rem" }}>
            {formMessage && (
              <p className={`message ${formMessageType}`} aria-live="polite">{formMessage}</p>
            )}

            {/* 個人連絡先 */}
            <section className="card panel-card">
              <div className="card-body" style={{ padding: "1.25rem" }}>
                <SectionHeader icon="📱" title="個人連絡先" />
                <dl className="detail-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.25rem 2rem", padding: "0 0.5rem" }}>
                  <InfoRow label="メール" value={member.email} />
                  <InfoRow label="携帯番号" value={member.mobile_phone} />
                  <InfoRow label="生年月日" value={member.birthday} />
                </dl>
              </div>
            </section>

            {/* 会社情報 */}
            <section className="card panel-card">
              <div className="card-body" style={{ padding: "1.25rem" }}>
                <SectionHeader icon="🏢" title="会社情報" />
                <dl className="detail-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.25rem 2rem", padding: "0 0.5rem" }}>
                  <InfoRow label="会社名" value={member.company_name} />
                  <InfoRow label="役職" value={member.company_position} />
                  <InfoRow label="業種" value={member.industry} />
                  <InfoRow label="会社郵便番号" value={member.company_postal_code} />
                  <InfoRow label="会社住所" value={member.company_address} />
                  <InfoRow label="会社電話" value={member.company_phone} />
                  <InfoRow label="会社FAX" value={member.company_fax} />
                  <InfoRow label="会社PR" value={member.company_pr} />
                </dl>
              </div>
            </section>

            {/* 自宅情報 */}
            <section className="card panel-card">
              <div className="card-body" style={{ padding: "1.25rem" }}>
                <SectionHeader icon="🏠" title="自宅情報" />
                <dl className="detail-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.25rem 2rem", padding: "0 0.5rem" }}>
                  <InfoRow label="自宅郵便番号" value={member.home_postal_code} />
                  <InfoRow label="自宅住所" value={member.home_address} />
                  <InfoRow label="自宅電話" value={member.home_phone} />
                  <InfoRow label="自宅FAX" value={member.home_fax} />
                </dl>
              </div>
            </section>

            {/* その他 */}
            <section className="card panel-card">
              <div className="card-body" style={{ padding: "1.25rem" }}>
                <SectionHeader icon="📝" title="その他" />
                <dl className="detail-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.25rem 2rem", padding: "0 0.5rem" }}>
                  <InfoRow label="趣味・信条" value={member.hobbies} />
                  <InfoRow label="備考" value={member.notes} />
                  {(referrerMatches.referrer_1 || referrerMatches.referrer_2) && (
                    <>
                      {referrerMatches.referrer_1 && (
                        <InfoRow
                          label="紹介者1"
                          value={`${referrerMatches.referrer_1.last_name || ""}${referrerMatches.referrer_1.first_name ? " " + referrerMatches.referrer_1.first_name : ""}${!referrerMatches.referrer_1.last_name && !referrerMatches.referrer_1.first_name ? (referrerMatches.referrer_1.name_kanji || "-") : ""} (${referrerMatches.referrer_1.company_name || "-"})`}
                        />
                      )}
                      {referrerMatches.referrer_2 && (
                        <InfoRow
                          label="紹介者2"
                          value={`${referrerMatches.referrer_2.last_name || ""}${referrerMatches.referrer_2.first_name ? " " + referrerMatches.referrer_2.first_name : ""}${!referrerMatches.referrer_2.last_name && !referrerMatches.referrer_2.first_name ? (referrerMatches.referrer_2.name_kanji || "-") : ""} (${referrerMatches.referrer_2.company_name || "-"})`}
                        />
                      )}
                    </>
                  )}
                </dl>
              </div>
            </section>

            {/* アカウント紐付け */}
            <section className="card panel-card">
              <div className="card-body" style={{ padding: "1.25rem" }}>
                <SectionHeader icon="🔗" title="アカウント紐付け" />
                {member.user_id ? (
                  <div style={{ padding: "0 0.5rem" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                      background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
                      fontSize: 13, color: "#15803d", marginBottom: 12,
                    }}>
                      <span>✅</span>
                      <span>Base44ユーザーと紐付け済み</span>
                      <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>ID: {member.user_id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowUnlinkConfirm(true)}
                      style={{
                        background: "none", border: "1px solid #fca5a5", borderRadius: 6,
                        padding: "6px 14px", fontSize: 13, color: "#dc2626", cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      紐付け解除
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: "0 0.5rem" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                      background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8,
                      fontSize: 13, color: "#92400e", marginBottom: 12,
                    }}>
                      <span>⚠️</span>
                      <span>Base44ユーザーと未紐付け（ログイン時にメールアドレスで自動紐付けされます）</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                      会員にアプリURLを案内し、新規登録してもらってください。
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          /* ── EDIT MODE ── */
          <section className="card panel-card">
            <div className="card-body" style={{ padding: "1.25rem" }}>
              <form className="editor-form" noValidate onSubmit={handleEditSubmit}>
                <SectionHeader icon="✏️" title="基本情報を編集" />

                <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary, #1e293b)" }}>基本情報</h4>
                <div className="editor-grid">
                  <div className="field">
                    <label htmlFor="md-last-name">姓 *</label>
                    <input id="md-last-name" type="text" value={formData.last_name} onChange={(e) => updateField("last_name", e.target.value)} placeholder="例: 山田" />
                  </div>
                  <div className="field">
                    <label htmlFor="md-first-name">名 *</label>
                    <input id="md-first-name" type="text" value={formData.first_name} onChange={(e) => updateField("first_name", e.target.value)} placeholder="例: 太郎" />
                  </div>
                  <div className="field">
                    <label htmlFor="md-last-name-kana">セイ（フリガナ）</label>
                    <input id="md-last-name-kana" type="text" value={formData.last_name_kana} onChange={(e) => updateField("last_name_kana", e.target.value)} placeholder="例: ヤマダ" />
                  </div>
                  <div className="field">
                    <label htmlFor="md-first-name-kana">メイ（フリガナ）</label>
                    <input id="md-first-name-kana" type="text" value={formData.first_name_kana} onChange={(e) => updateField("first_name_kana", e.target.value)} placeholder="例: タロウ" />
                  </div>
                  <div className="field">
                    <label htmlFor="md-birthday">生年月日 *</label>
                    <DatePicker id="md-birthday" value={formData.birthday} onChange={(val) => updateField("birthday", val)} minYear={1940} />
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

                <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary, #1e293b)" }}>会社情報</h4>
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

                <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary, #1e293b)" }}>自宅情報</h4>
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

                <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary, #1e293b)" }}>その他</h4>
                <div className="editor-grid">
                  <div className="field field-span-2">
                    <label htmlFor="md-hobbies">趣味・信条</label>
                    <textarea id="md-hobbies" rows="2" value={formData.hobbies} onChange={(e) => updateField("hobbies", e.target.value)} />
                  </div>
                </div>

                <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary, #1e293b)" }}>管理情報</h4>
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
                      <option value="名誉顧問">名誉顧問</option>
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
                  <p className={`message ${formMessageType}`} aria-live="polite" style={{ marginTop: "0.75rem" }}>{formMessage}</p>
                )}
              </form>
            </div>

            {/* Sticky bottom bar */}
            <div style={{
              position: "sticky",
              bottom: 0,
              backgroundColor: "var(--surface, #fff)",
              borderTop: "1px solid var(--border, #e5e7eb)",
              padding: "0.75rem 1.25rem",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              zIndex: 10,
            }}>
              <button className="btn btn-secondary" type="button" onClick={handleCancelEdit} disabled={submitting}>
                キャンセル
              </button>
              <button className="btn btn-primary" type="submit" disabled={submitting} onClick={handleEditSubmit}>
                {submitting ? "保存中..." : "保存"}
              </button>
            </div>
          </section>
        )}
      </div>

      {/* ========== 組織履歴 tab ========== */}
      <div className={`tab-panel${activeTab === "org" ? " is-active" : ""}`}>
        <section className="card panel-card single-panel">
          <div className="card-body" style={{ padding: "1.25rem" }}>
            <SectionHeader icon="🏛️" title="組織履歴" />
            {orgYears.length === 0 ? (
              <p style={{ color: "var(--text-tertiary, #94a3b8)", fontSize: "0.875rem" }}>組織履歴はありません。</p>
            ) : (
              <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
                {/* Vertical timeline line */}
                <div style={{
                  position: "absolute",
                  left: "0.45rem",
                  top: "0.25rem",
                  bottom: "0.25rem",
                  width: "2px",
                  backgroundColor: "var(--border, #e5e7eb)",
                }} />
                {orgYears.map((year, yi) => (
                  <div key={year} style={{ position: "relative", marginBottom: yi < orgYears.length - 1 ? "1.5rem" : 0 }}>
                    {/* Timeline dot */}
                    <div style={{
                      position: "absolute",
                      left: "-1.5rem",
                      top: "0.15rem",
                      width: "0.75rem",
                      height: "0.75rem",
                      borderRadius: "50%",
                      backgroundColor: "var(--primary, #2563eb)",
                      border: "2px solid var(--surface, #fff)",
                      boxShadow: "0 0 0 2px var(--primary, #2563eb)",
                      transform: "translateX(0.075rem)",
                    }} />
                    <div>
                      <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary, #1e293b)" }}>
                        {year}
                      </h4>
                      {orgByYear[year].map((item, idx) => (
                        <div key={idx} style={{
                          display: "flex",
                          gap: "0.75rem",
                          alignItems: "center",
                          padding: "0.35rem 0",
                          fontSize: "0.875rem",
                        }}>
                          <span style={{ color: "var(--text-primary, #1e293b)", fontWeight: 500 }}>{item.org_name || "-"}</span>
                          <span style={{ color: "var(--text-secondary, #64748b)" }}>{item.role || "-"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ========== 会費履歴 tab ========== */}
      <div className={`tab-panel${activeTab === "dues" ? " is-active" : ""}`}>
        <section className="card panel-card single-panel">
          <div className="card-body" style={{ padding: "1.25rem" }}>
            <SectionHeader icon="💰" title="会費履歴" />
            {duesHistory.length === 0 ? (
              <p style={{ color: "var(--text-tertiary, #94a3b8)", fontSize: "0.875rem" }}>会費履歴はありません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>年度</th>
                      <th>種類</th>
                      <th>金額</th>
                      <th>ステータス</th>
                      <th>入金日</th>
                      <th>振込名</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duesHistory.map((d, idx) => {
                      const statusStyle = d.status === "納入済"
                        ? { backgroundColor: "#ecfdf5", color: "#059669" }
                        : d.status === "未納"
                          ? { backgroundColor: "#fee2e2", color: "#991b1b" }
                          : { backgroundColor: "#f1f5f9", color: "#64748b" };
                      return (
                        <tr key={idx}>
                          <td>{displayValue(d.fiscal_year_label)}</td>
                          <td>{displayValue(d.due_type)}</td>
                          <td>{formatCurrency(d.amount)}</td>
                          <td>
                            <span
                              className="pill"
                              style={{
                                ...statusStyle,
                                fontWeight: 600,
                                fontSize: "0.78rem",
                                padding: "0.2rem 0.6rem",
                                borderRadius: "9999px",
                              }}
                            >
                              {displayValue(d.status)}
                            </span>
                          </td>
                          <td>{displayValue(d.paid_date)}</td>
                          <td>{displayValue(d.payer_name)}</td>
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

      {/* ========== 名簿設定 tab ========== */}
      <div className={`tab-panel${activeTab === "directory" ? " is-active" : ""}`}>
        <section className="card panel-card single-panel">
          <div className="card-body" style={{ padding: "1.25rem" }}>
            <SectionHeader icon="📖" title="名簿設定" />
            <form className="editor-form" noValidate onSubmit={handleDirSubmit}>
              <section style={{ padding: "1rem", backgroundColor: "var(--bg-subtle, #f8fafc)", borderRadius: "0.5rem", border: "1px solid var(--border, #e5e7eb)" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: 600 }}>名簿公開設定</h4>
                <label className="checkbox-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0", cursor: "pointer" }}>
                  <input type="checkbox" checked={dirForm.show_email_in_directory}
                    onChange={(e) => setDirForm((prev) => ({ ...prev, show_email_in_directory: e.target.checked }))} />
                  <span style={{ fontSize: "0.875rem" }}>メールを名簿に公開する</span>
                </label>
                <label className="checkbox-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0", cursor: "pointer" }}>
                  <input type="checkbox" checked={dirForm.show_company_in_directory}
                    onChange={(e) => setDirForm((prev) => ({ ...prev, show_company_in_directory: e.target.checked }))} />
                  <span style={{ fontSize: "0.875rem" }}>会社情報を名簿に公開する</span>
                </label>
                <label className="checkbox-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0", cursor: "pointer" }}>
                  <input type="checkbox" checked={dirForm.show_mobile_in_directory}
                    onChange={(e) => setDirForm((prev) => ({ ...prev, show_mobile_in_directory: e.target.checked }))} />
                  <span style={{ fontSize: "0.875rem" }}>携帯番号を名簿に公開する</span>
                </label>
              </section>
              {dirMessage && (
                <p className={`message ${dirMessageType}`} aria-live="polite" style={{ marginTop: "0.75rem" }}>{dirMessage}</p>
              )}
              <div style={{ marginTop: "1rem" }}>
                <button className="btn btn-primary" type="submit" disabled={dirSubmitting}>
                  {dirSubmitting ? "保存中..." : "名簿設定を保存"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* ========== 変更履歴 tab ========== */}
      <div className={`tab-panel${activeTab === "changelog" ? " is-active" : ""}`}>
        <section className="card panel-card single-panel">
          <div className="card-body" style={{ padding: "1.25rem" }}>
            <SectionHeader icon="📋" title="変更履歴" />
            {changeLogs.length === 0 ? (
              <p style={{ color: "var(--text-tertiary, #94a3b8)", fontSize: "0.875rem" }}>変更履歴はありません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>日時</th>
                      <th>変更者</th>
                      <th>フィールド名</th>
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
                          <td style={{ whiteSpace: "nowrap" }}>{dateStr}</td>
                          <td>{changedBy}</td>
                          <td>{fieldLabel}</td>
                          <td style={{ color: "var(--text-secondary, #64748b)" }}>{displayValue(log.old_value)}</td>
                          <td style={{ fontWeight: 500 }}>{displayValue(log.new_value)}</td>
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

      {/* ========== Danger zone ========== */}
      {!isEditing && (
        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border, #e5e7eb)" }}>
          <button
            type="button"
            onClick={prepareDelete}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-tertiary, #94a3b8)",
              fontSize: "0.8rem",
              cursor: "pointer",
              padding: "0.25rem 0",
              textDecoration: "underline",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--error, #dc2626)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary, #94a3b8)"; }}
          >
            会員を削除
          </button>
        </div>
      )}
      {isMobile && (
        <style>{`
          .editor-grid { grid-template-columns: 1fr !important; }
          .field-span-2 { grid-column: span 1 !important; }
          .tab-panel .card-body { padding: 12px !important; }
        `}</style>
      )}
    </section>
  );
}
