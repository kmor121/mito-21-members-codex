import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { PageHeader, Modal, Button } from '../../components/ui';
import { fullName } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

/* ──────────── constants ──────────── */

const APP_ROLE_OPTIONS = [
  { value: "admin_member", label: "管理者メンバー" },
  { value: "manager", label: "幹事会メンバー" },
  { value: "member", label: "一般メンバー" },
];

const APP_ROLE_LABELS = {
  admin_member: "管理者メンバー",
  manager: "幹事会メンバー",
  member: "一般メンバー",
};

const TEMPLATE_TABS = [
  { key: "application_receipt", label: "入会申込受付" },
  { key: "admin_notification", label: "管理者通知" },
  { key: "approval", label: "承認通知" },
  { key: "rejection", label: "却下通知" },
];

const TEMPLATE_VARIABLES = {
  application_receipt: [
    { var: "applicant_name", label: "申込者名" },
    { var: "membership_type", label: "会員種別" },
    { var: "application_date", label: "申込日" },
  ],
  admin_notification: [
    { var: "applicant_name", label: "申込者名" },
    { var: "membership_type", label: "会員種別" },
    { var: "application_date", label: "申込日" },
  ],
  approval: [
    { var: "member_name", label: "会員名" },
  ],
  rejection: [
    { var: "applicant_name", label: "申込者名" },
  ],
};

const SAMPLE_DATA = {
  applicant_name: "水戸 太郎",
  member_name: "水戸 太郎",
  membership_type: "正会員",
  application_date: "2026-03-15",
  fiscal_year: "2026",
  due_type: "年会費",
  amount: "30,000",
};

const DEFAULT_TEMPLATES = {
  template_application_receipt_subject: "【水戸21の会】入会申込を受け付けました",
  template_application_receipt_body: `{{applicant_name}} 様

この度は水戸21の会への入会をお申込みいただき、誠にありがとうございます。

以下の内容で入会申込を受け付けましたのでお知らせいたします。

お名前: {{applicant_name}}
会員種別: {{membership_type}}
申込日: {{application_date}}

今後、幹事会にて審査を行い、結果をメールにてご連絡いたします。
通常1ヶ月程度お時間をいただいておりますので、しばらくお待ちくださいますようお願いいたします。

ご不明な点がございましたら、本メールへの返信にてお問い合わせください。

──────────────────
水戸21の会 事務局
──────────────────`,

  template_admin_notification_subject: "【水戸21の会】新しい入会申込がありました（{{applicant_name}} 様）",
  template_admin_notification_body: `新しい入会申込を受け付けました。

■ 申込内容
お名前: {{applicant_name}}
会員種別: {{membership_type}}
申込日: {{application_date}}

以下のリンクから詳細を確認し、承認・却下の手続きを行ってください。
https://mito21-members-codex-da487265.base44.app/admin/applications

──────────────────
※ このメールはシステムから自動送信されています。
──────────────────`,

  template_approval_subject: "【水戸21の会】入会承認のお知らせ",
  template_approval_body: `{{member_name}} 様

この度は水戸21の会への入会をお申込みいただき、誠にありがとうございます。
幹事会にて審査を行った結果、入会を承認いたしましたのでお知らせいたします。

今後の活動やご案内については、メールおよびLINEにてお知らせいたします。
一緒に活動できることを会員一同楽しみにしております。

ご不明な点がございましたら、お気軽に事務局までお問い合わせください。

──────────────────
水戸21の会 事務局
──────────────────`,

  template_rejection_subject: "【水戸21の会】入会申込の結果について",
  template_rejection_body: `{{applicant_name}} 様

この度は水戸21の会への入会をお申込みいただき、誠にありがとうございます。

幹事会にて慎重に審査を行いましたが、誠に恐縮ながら、今回はご期待に添えない結果となりました。

ご理解いただけますと幸いです。
ご質問やご不明な点がございましたら、事務局までお問い合わせください。

──────────────────
水戸21の会 事務局
──────────────────`,

};

/* ──────────── helpers ──────────── */

function renderPreview(template, vars) {
  let result = template || "";
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function RoleBadge({ appRole }) {
  const styles = {
    admin_member: { background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa" },
    manager: { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" },
    member: { background: "#f8fafc", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" },
  };
  const s = styles[appRole] || styles.member;
  const label = APP_ROLE_LABELS[appRole] || appRole || "未設定";
  return <span className="pill" style={{ ...s, fontSize: Math.max(12, s.fontSize || 12) }}>{label}</span>;
}

/* ──────────── main component ──────────── */

export default function Settings() {
  const isMobile = useIsMobile();

  // Top-level tab: "general" | "email"
  const [mainTab, setMainTab] = useState("general");

  // ---- General tab state ----
  const [appUsers, setAppUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [userSaving, setUserSaving] = useState(false);

  // ---- Email tab state ----
  const [emailSettings, setEmailSettings] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailDirty, setEmailDirty] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState("application_receipt");
  const [showPreview, setShowPreview] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const bodyRef = useRef(null);

  const showToast = useCallback((msg, type) => {
    if (window.__showToast) window.__showToast(msg, type || "success");
  }, []);

  /* ---- General: load users ---- */
  const loadAppUsers = useCallback(async () => {
    setUsersError("");
    setUsersLoading(true);
    try {
      const members = await base44.entities.Member.list();
      setAppUsers(members || []);
    } catch (err) {
      setUsersError(err.message || "ユーザー一覧の取得に失敗しました");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => { try { base44.appLogs?.logUserInApp?.('A9-設定'); } catch (e) { /* analytics */ } }, []);
  useEffect(() => { loadAppUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Email: load settings (direct entity access) ---- */
  const loadEmailSettings = useCallback(async () => {
    setEmailLoading(true);
    try {
      const list = await base44.entities.AppSettings.list();
      if (list.length > 0) {
        // Merge defaults for any missing fields
        const record = { ...list[0] };
        for (const [key, defaultValue] of Object.entries(DEFAULT_TEMPLATES)) {
          if (!record[key]) record[key] = defaultValue;
        }
        if (!record.sender_name) record.sender_name = "水戸２１の会 事務局";
        setEmailSettings(record);
      } else {
        // Auto-create singleton with defaults
        const created = await base44.entities.AppSettings.create({
          sender_name: "水戸２１の会 事務局",
          ...DEFAULT_TEMPLATES,
        });
        invalidateReadCache("AppSettings");
        setEmailSettings(created);
      }
    } catch (err) {
      showToast("メール設定の読み込みに失敗しました", "error");
      console.error("loadEmailSettings error:", err);
    } finally {
      setEmailLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (mainTab === "email" && !emailSettings) {
      loadEmailSettings();
    }
  }, [mainTab, emailSettings, loadEmailSettings]);

  /* ---- Email: save (direct entity access) ---- */
  async function saveEmailSettings() {
    if (!emailSettings) return;
    setEmailSaving(true);
    try {
      const settingsId = emailSettings.id || emailSettings._id;
      const payload = { ...emailSettings };
      delete payload.id;
      delete payload._id;
      delete payload.created_date;

      if (settingsId) {
        await base44.entities.AppSettings.update(settingsId, payload);
      } else {
        const created = await base44.entities.AppSettings.create(payload);
        setEmailSettings(created);
      }
      invalidateReadCache("AppSettings");
      showToast("メール設定を保存しました");
      setEmailDirty(false);
    } catch (err) {
      showToast("保存に失敗しました", "error");
      console.error("saveEmailSettings error:", err);
    } finally {
      setEmailSaving(false);
    }
  }

  /* ---- Email: update field ---- */
  function updateField(key, value) {
    setEmailSettings((prev) => ({ ...prev, [key]: value }));
    setEmailDirty(true);
  }

  /* ---- Email: insert variable at cursor ---- */
  function insertVariable(varName) {
    const ta = bodyRef.current;
    if (!ta) return;
    const tag = `{{${varName}}}`;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const bodyKey = `template_${activeTemplate}_body`;
    const current = emailSettings?.[bodyKey] || "";
    const newVal = current.substring(0, start) + tag + current.substring(end);
    updateField(bodyKey, newVal);
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + tag.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  /* ---- Email: reset to default ---- */
  function resetTemplate() {
    const subjectKey = `template_${activeTemplate}_subject`;
    const bodyKey = `template_${activeTemplate}_body`;
    setEmailSettings((prev) => ({
      ...prev,
      [subjectKey]: DEFAULT_TEMPLATES[subjectKey] || "",
      [bodyKey]: DEFAULT_TEMPLATES[bodyKey] || "",
    }));
    setEmailDirty(true);
    setConfirmReset(false);
    showToast("デフォルトに戻しました（保存をクリックして確定してください）");
  }

  /* ---- General: role change ---- */
  function handleRoleChangeRequest(memberId, memberName, newRole) {
    setConfirmDialog({ memberId, memberName, newRole });
  }

  async function handleRoleChangeConfirm() {
    if (!confirmDialog) return;
    const { memberId, newRole } = confirmDialog;
    setUserSaving(true);
    setUsersError("");
    try {
      await base44.entities.Member.update(memberId, { app_role: newRole });
      invalidateReadCache("Member");
      // Update local state directly so UI reflects the change immediately
      const targetId = String(memberId);
      setAppUsers((prev) =>
        prev.map((m) =>
          String(m.id || m._id) === targetId ? { ...m, app_role: newRole } : m
        )
      );
      showToast("ロールを変更しました");
    } catch (err) {
      setUsersError(err.message || "ロール変更に失敗しました");
    } finally {
      setUserSaving(false);
      setConfirmDialog(null);
    }
  }

  /* ---- current template values ---- */
  const subjectKey = `template_${activeTemplate}_subject`;
  const bodyKey = `template_${activeTemplate}_body`;
  const currentSubject = emailSettings?.[subjectKey] || "";
  const currentBody = emailSettings?.[bodyKey] || "";
  const variables = TEMPLATE_VARIABLES[activeTemplate] || [];

  return (
    <section className="admin-shell">
      <PageHeader title="設定" subtitle={!isMobile ? "管理者設定" : undefined} />

      {/* Main tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, overflowX: isMobile ? "auto" : undefined, WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <button
          type="button"
          className={`nl2-pill-tab${mainTab === "general" ? " active" : ""}`}
          style={isMobile ? { fontSize: 13, whiteSpace: "nowrap" } : undefined}
          onClick={() => setMainTab("general")}
        >
          一般設定
        </button>
        <button
          type="button"
          className={`nl2-pill-tab${mainTab === "email" ? " active" : ""}`}
          style={isMobile ? { fontSize: 13, whiteSpace: "nowrap" } : undefined}
          onClick={() => setMainTab("email")}
        >
          メールテンプレート
        </button>
      </div>

      {/* ════════════ General Tab ════════════ */}
      {mainTab === "general" && (
        <>
          <div className="settings-grid" style={isMobile ? { gridTemplateColumns: "1fr" } : undefined}>
            {/* Admin links card */}
            <section className="card detail-card stack-sm">
              <div className="card-body stack">
                <div className="panel-heading">
                  <div><h2>管理画面へのリンク</h2></div>
                </div>
                <div className="dashboard-metrics">
                  <Link className="metric-card" to="/admin/fiscal-years">年度管理</Link>
                  <Link className="metric-card" to="/admin/dues-management">会費管理</Link>
                  <Link className="metric-card" to="/admin/documents">資料管理</Link>
                  <Link className="metric-card" to="/admin/newsletters">配信管理</Link>
                  <Link className="metric-card" to="/admin/applications">申込管理</Link>
                  <Link className="metric-card" to="/admin/organization-chart">組織図管理</Link>
                </div>
              </div>
            </section>

            {/* Email settings card */}
            <section className="card detail-card stack-sm">
              <div className="card-body stack">
                <div className="panel-heading">
                  <div><h2>メール配信設定</h2></div>
                </div>
                <div className="info-block">
                  <p><span className="muted">配信エンジン:</span> Resend API</p>
                  <p><span className="muted">送信元:</span> env</p>
                  <p><span className="muted">APIキー:</span> env</p>
                  <p>
                    <span className="muted">ステータス:</span>{" "}
                    <span className="pill pill-success" style={{ fontSize: 12 }}>設定済み</span>
                  </p>
                  <p style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setMainTab("email")}
                      style={{ fontSize: 13 }}
                    >
                      メールテンプレートを編集 &rarr;
                    </button>
                  </p>
                </div>
              </div>
            </section>

            {/* LINE settings card */}
            <section className="card detail-card stack-sm">
              <div className="card-body stack">
                <div className="panel-heading">
                  <div><h2>LINE連携設定</h2></div>
                </div>
                <p>
                  <span className="pill pill-warning" style={{ fontSize: 12 }}>準備中</span>
                </p>
                <p className="muted">LINE連携機能は現在準備中です。今後のアップデートで対応予定です。</p>
              </div>
            </section>
          </div>

          {/* User management section */}
          <div style={{ marginTop: "2rem" }}>
            <section className="card detail-card">
              <div className="card-body stack">
                <div className="panel-heading">
                  <div><h2>ユーザー管理</h2></div>
                </div>

                {usersError && (
                  <p className="message error" aria-live="polite">{usersError}</p>
                )}

                {usersLoading ? (
                  <LoadingSpinner />
                ) : appUsers.length === 0 ? (
                  <p className="empty-state">ユーザーが見つかりません。</p>
                ) : isMobile ? (
                  <div className="mobile-card-list">
                    {appUsers.map((m) => {
                      const memberId = m.id || m._id;
                      const currentAppRole = m.app_role || "member";
                      return (
                        <div className="mobile-card-item" key={memberId}>
                          <div className="mobile-card-item-header">
                            <strong style={{ fontSize: 14 }}>{fullName(m) || "-"}</strong>
                            <RoleBadge appRole={currentAppRole} />
                          </div>
                          <div className="mobile-card-item-row">
                            <span className="mobile-card-item-label">メールアドレス</span>
                            <span style={{ fontSize: 13, color: "#475569", wordBreak: "break-all" }}>{m.email || "-"}</span>
                          </div>
                          <div className="mobile-card-item-row">
                            <span className="mobile-card-item-label">アカウント</span>
                            <span style={{ fontSize: 16 }}>{m.user_id ? "\u2705" : "\u26A0\uFE0F"}</span>
                          </div>
                          <div className="mobile-card-item-actions">
                            <select
                              value={currentAppRole}
                              onChange={(e) => handleRoleChangeRequest(memberId, fullName(m) || m.email, e.target.value)}
                              style={{
                                padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)",
                                fontSize: 13, color: "#334155", background: "#fff", cursor: "pointer",
                                width: "100%",
                              }}
                            >
                              {APP_ROLE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "2px solid var(--color-border)", fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}>会員名</th>
                          <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "2px solid var(--color-border)", fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}>メールアドレス</th>
                          <th style={{ textAlign: "center", padding: "10px 12px", borderBottom: "2px solid var(--color-border)", fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}>ロール</th>
                          <th style={{ textAlign: "center", padding: "10px 12px", borderBottom: "2px solid var(--color-border)", fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}>アカウント</th>
                          <th style={{ textAlign: "center", padding: "10px 12px", borderBottom: "2px solid var(--color-border)", fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appUsers.map((m) => {
                          const memberId = m.id || m._id;
                          const currentAppRole = m.app_role || "member";
                          return (
                            <tr key={memberId} style={{ borderBottom: "1px solid var(--color-bg-sub)" }}>
                              <td style={{ padding: "10px 12px", fontSize: 14 }}>
                                <strong>{fullName(m) || "-"}</strong>
                              </td>
                              <td style={{ padding: "10px 12px", fontSize: 13, color: "#475569" }}>
                                {m.email || "-"}
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                <RoleBadge appRole={currentAppRole} />
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 16 }}>
                                {m.user_id ? "\u2705" : "\u26A0\uFE0F"}
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                <select
                                  value={currentAppRole}
                                  onChange={(e) => handleRoleChangeRequest(memberId, fullName(m) || m.email, e.target.value)}
                                  style={{
                                    padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-border)",
                                    fontSize: 13, color: "#334155", background: "#fff", cursor: "pointer",
                                  }}
                                >
                                  {APP_ROLE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </td>
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
        </>
      )}

      {/* ════════════ Email Template Tab ════════════ */}
      {mainTab === "email" && (
        <>
          {emailLoading ? (
            <LoadingSpinner />
          ) : !emailSettings ? (
            <section className="card panel-card">
              <div className="card-body" style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <p className="muted">メール設定を読み込めませんでした。</p>
                <button className="button" style={{ marginTop: 12 }} onClick={loadEmailSettings}>再試行</button>
              </div>
            </section>
          ) : (
            <>
              {/* Common settings */}
              <section className="card detail-card" style={{ marginBottom: 20 }}>
                <div className="card-body">
                  <div className="panel-heading" style={{ marginBottom: 16 }}>
                    <div><h2>共通設定</h2></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, maxWidth: 480 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                      送信者名
                      <input
                        type="text"
                        value={emailSettings.sender_name || ""}
                        onChange={(e) => updateField("sender_name", e.target.value)}
                        style={{
                          display: "block", width: "100%", marginTop: 4,
                          padding: "8px 12px", border: "1px solid var(--color-border)", borderRadius: 8,
                          fontSize: 14,
                        }}
                      />
                    </label>
                  </div>
                </div>
              </section>

              {/* Template editor */}
              <section className="card detail-card">
                <div className="card-body">
                  <div className="panel-heading" style={{ marginBottom: 16, ...(isMobile ? { flexDirection: "column", alignItems: "flex-start", gap: 8 } : {}) }}>
                    <div><h2>テンプレート編集</h2></div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>デフォルトに戻す</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowPreview(true)}>プレビュー</Button>
                    </div>
                  </div>

                  {/* Template tabs */}
                  <div style={{
                    display: "flex", gap: 4, marginBottom: 20,
                    ...(isMobile
                      ? { overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none", flexWrap: "nowrap" }
                      : { flexWrap: "wrap" }),
                  }}>
                    {TEMPLATE_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        className={`nl2-pill-tab${activeTemplate === tab.key ? " active" : ""}`}
                        style={isMobile ? { fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 } : undefined}
                        onClick={() => setActiveTemplate(tab.key)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Variable insertion */}
                  <div style={{ marginBottom: 16, ...(isMobile ? { overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" } : {}) }}>
                    <span style={{ fontSize: 12, color: "#6b7280", marginRight: 8 }}>変数を挿入:</span>
                    {variables.map((v) => (
                      <button
                        key={v.var}
                        type="button"
                        onClick={() => insertVariable(v.var)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "3px 10px", margin: "2px 4px 2px 0",
                          borderRadius: 6, border: "1px solid var(--color-border)",
                          background: "#f8fafc", fontSize: 12, color: "#475569",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontFamily: "monospace", color: "#2563eb" }}>{`{{${v.var}}}`}</span>
                        <span style={{ color: "var(--color-text-tertiary)" }}>{v.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Subject */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", display: "block", marginBottom: 4 }}>
                      件名
                    </label>
                    <input
                      type="text"
                      value={currentSubject}
                      onChange={(e) => updateField(subjectKey, e.target.value)}
                      style={{
                        width: "100%", padding: "8px 12px",
                        border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 14,
                      }}
                    />
                  </div>

                  {/* Body */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", display: "block", marginBottom: 4 }}>
                      本文
                    </label>
                    <textarea
                      ref={bodyRef}
                      value={currentBody}
                      onChange={(e) => updateField(bodyKey, e.target.value)}
                      rows={14}
                      style={{
                        width: "100%", padding: "10px 12px",
                        border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 13,
                        fontFamily: "monospace", lineHeight: 1.6, resize: "vertical",
                      }}
                    />
                  </div>

                  {/* Save button */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, ...(isMobile ? { flexDirection: "column", alignItems: "stretch" } : {}) }}>
                    {emailDirty && (
                      <span style={{ alignSelf: isMobile ? "flex-start" : "center", fontSize: 12, color: "#d97706" }}>
                        未保存の変更があります
                      </span>
                    )}
                    <Button variant="primary" disabled={emailSaving || !emailDirty} onClick={saveEmailSettings}>
                      {emailSaving ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </div>
              </section>
            </>
          )}
        </>
      )}

      {/* ════════════ Preview modal ════════════ */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)}
        title={`プレビュー: ${TEMPLATE_TABS.find((t) => t.key === activeTemplate)?.label || ''}`}
        style={{ maxWidth: 600 }}
      >
        <div style={{
          background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", borderRadius: 8, padding: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>
            件名: {renderPreview(currentSubject, SAMPLE_DATA)}
          </p>
          <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "8px 0" }} />
          <pre style={{
            fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word",
            fontFamily: "inherit", lineHeight: 1.7, color: "var(--color-text-primary)", margin: 0,
          }}>
            {renderPreview(currentBody, SAMPLE_DATA)}
          </pre>
        </div>
        <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 12 }}>
          ※ サンプルデータによるプレビューです。実際の送信時は各変数が実データに置換されます。
        </p>
      </Modal>

      {/* ════════════ Reset confirm dialog ════════════ */}
      <Modal isOpen={confirmReset} onClose={() => setConfirmReset(false)} title="テンプレートをデフォルトに戻す">
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          「{TEMPLATE_TABS.find((t) => t.key === activeTemplate)?.label}」テンプレートをデフォルトに戻しますか？
          現在の内容は上書きされます。
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>キャンセル</Button>
          <Button variant="primary" onClick={resetTemplate}>デフォルトに戻す</Button>
        </div>
      </Modal>

      {/* ════════════ Role change confirm dialog ════════════ */}
      <Modal isOpen={!!confirmDialog} onClose={() => !userSaving && setConfirmDialog(null)} title="ロール変更の確認">
        {confirmDialog && (
          <>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              <strong>{confirmDialog.memberName}</strong> のロールを
              <strong> {APP_ROLE_LABELS[confirmDialog.newRole] || confirmDialog.newRole}</strong> に変更しますか？
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <Button variant="ghost" disabled={userSaving} onClick={() => setConfirmDialog(null)}>キャンセル</Button>
              <Button variant="primary" disabled={userSaving} onClick={handleRoleChangeConfirm}>
                {userSaving ? "変更中..." : "変更する"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
