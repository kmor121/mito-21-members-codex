import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiRequest, base44, invalidateReadCache } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DatePicker from "../../components/ui/DatePicker";
import RichTextEditor from "../../components/common/RichTextEditor";
import { Modal, Button } from '../../components/ui';
import { useIsMobile } from '../../hooks/useIsMobile';

/* ═══ helpers ═══ */
function statusLabel(s) {
  return { draft: "下書き", scheduled: "予約中", sent: "送信済", cancelled: "取消", failed: "失敗" }[s] || s || "-";
}

function statusColor(s) {
  return {
    draft: { bg: "var(--color-bg-sub)", text: "var(--color-text-secondary)", border: "var(--color-border)", bar: "var(--color-text-tertiary)" },
    scheduled: { bg: "#fffbeb", text: "#92400e", border: "#fde68a", bar: "#d97706" },
    sent: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0", bar: "#059669" },
    failed: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca", bar: "#dc2626" },
    cancelled: { bg: "var(--color-bg-sub)", text: "var(--color-text-secondary)", border: "var(--color-border)", bar: "var(--color-text-tertiary)" },
  }[s] || { bg: "var(--color-bg-sub)", text: "var(--color-text-secondary)", border: "var(--color-border)", bar: "var(--color-text-tertiary)" };
}

function channelLabel(c) {
  if (c === "line") return "LINE";
  if (c === "email+line") return "メール+LINE";
  return "メール";
}

const STATUS_TABS = [
  { key: "all", label: "全て" },
  { key: "draft", label: "下書き" },
  { key: "scheduled", label: "予約中" },
  { key: "sent", label: "送信済" },
  { key: "template", label: "テンプレート" },
];

const AUDIENCE_OPTIONS = [
  { key: "all", label: "全員" },
  { key: "member_type", label: "会員種別" },
];

const MEMBER_TYPE_OPTIONS = [
  { key: "正会員", label: "正会員" },
  { key: "賛助会員", label: "賛助会員" },
];

const QUICK_TIMES = [
  { h: 9, m: 0, label: "9:00" },
  { h: 12, m: 0, label: "12:00" },
  { h: 15, m: 0, label: "15:00" },
  { h: 18, m: 0, label: "18:00" },
  { h: 21, m: 0, label: "21:00" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function pad2(n) { return String(n).padStart(2, "0"); }

function formatDateJa(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

function formatScheduleDisplay(dateStr, timeStr) {
  if (!dateStr) return "";
  const dateJa = formatDateJa(dateStr);
  if (!timeStr) return dateJa;
  return `${dateJa} ${timeStr}`;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

/* ── SVG Icons ── */
const MailIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="10" rx="2" stroke={color} strokeWidth="1.5" />
    <path d="M1 5l7 4 7-4" stroke={color} strokeWidth="1.5" />
  </svg>
);

const SendIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ClipIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M13.5 7l-5.7 5.7a3 3 0 01-4.3-4.3L9.5 2.7a2 2 0 012.8 2.8l-5.7 5.7a1 1 0 01-1.4-1.4L10.9 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const FileIcon = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M8 1H3a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5L8 1z" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 1v4h4" stroke={color} strokeWidth="1.3" />
  </svg>
);

const RefreshIcon = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M1 7a6 6 0 1011.5-2.5M12.5 1v3.5H9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Preset templates ── */
const PRESET_TEMPLATES = [
  {
    name: "月例会案内",
    title: "【水戸21の会】○月例会のご案内",
    body: "会員の皆様\n\nいつもお世話になっております。\n○月の例会について下記の通りご案内いたします。\n\n日時：\n場所：\n内容：\n\nご出欠のご連絡をお願いいたします。\n\n水戸21の会 事務局",
    channel: "email",
    audience_type: "all",
  },
  {
    name: "会費納入お願い",
    title: "【水戸21の会】会費納入のお願い",
    body: "会員各位\n\n平素より当会の活動にご理解ご協力を賜り、誠にありがとうございます。\n\n本年度の会費につきまして、まだお振込みが確認できておりません。\nお忙しいところ恐れ入りますが、下記口座へのお振込みをお願いいたします。\n\n振込先：\n金額：\n期限：\n\n何卒よろしくお願いいたします。\n\n水戸21の会 事務局",
    channel: "email",
    audience_type: "all",
  },
  {
    name: "新入会員紹介",
    title: "【水戸21の会】新入会員のご紹介",
    body: "会員の皆様\n\nこの度、新たに下記の方が入会されましたのでご紹介いたします。\n\nお名前：\nご所属：\n紹介者：\n\n今後ともよろしくお願いいたします。\n\n水戸21の会 事務局",
    channel: "email",
    audience_type: "all",
  },
];

/* ── Skeleton ── */
function SkeletonCard() {
  return (
    <div style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 3, height: 36, borderRadius: 2, background: "var(--color-bg-sub)", animation: "nlPulse 1.5s ease infinite" }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: "60%", height: 14, borderRadius: 4, background: "var(--color-bg-sub)", animation: "nlPulse 1.5s ease infinite", marginBottom: 6 }} />
        <div style={{ width: "40%", height: 10, borderRadius: 4, background: "var(--color-bg-sub)", animation: "nlPulse 1.5s ease infinite" }} />
      </div>
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div style={{ padding: 32 }}>
      <div style={{ width: "40%", height: 24, borderRadius: 4, background: "var(--color-bg-sub)", animation: "nlPulse 1.5s ease infinite", marginBottom: 24 }} />
      <div style={{ width: "100%", height: 48, borderRadius: 8, background: "var(--color-bg-sub)", animation: "nlPulse 1.5s ease infinite", marginBottom: 16 }} />
      <div style={{ width: "100%", height: 200, borderRadius: 8, background: "var(--color-bg-sub)", animation: "nlPulse 1.5s ease infinite", marginBottom: 16 }} />
      <div style={{ width: "50%", height: 14, borderRadius: 4, background: "var(--color-bg-sub)", animation: "nlPulse 1.5s ease infinite" }} />
    </div>
  );
}

/* ── Preview Modal ── */
function PreviewModal({ form, editorMode, previewCount, onClose, onSend, sending }) {
  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="nl2-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nl2-preview-header">
          <h3>プレビュー</h3>
          <button type="button" className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="nl2-preview-body">
          <div className="nl2-preview-email">
            <div className="nl2-preview-email-header">
              <div className="nl2-preview-from">
                <span className="nl2-preview-label">差出人</span>
                <span>MITO21 事務局</span>
              </div>
              <div className="nl2-preview-subject">
                <span className="nl2-preview-label">件名</span>
                <span style={{ fontWeight: 600 }}>{form.title || "（件名なし）"}</span>
              </div>
            </div>
            <div className="nl2-preview-email-body">
              {editorMode === "rich" && form.body_html ? (
                <div dangerouslySetInnerHTML={{ __html: form.body_html }} />
              ) : (
                form.body ? form.body.split("\n").map((line, i) => (
                  <p key={i} style={{ margin: "0.3em 0" }}>{line || "\u00A0"}</p>
                )) : <p className="muted">（本文なし）</p>
              )}
            </div>
            {(form.attachment_name || form.attachment_url) && (
              <div className="nl2-preview-attachment">
                <ClipIcon size={14} /> {form.attachment_name || "添付ファイル"}
              </div>
            )}
          </div>
        </div>
        <div className="nl2-preview-footer">
          <div className="nl2-preview-info">
            <span className="nl2-preview-info-item">
              対象: {previewCount !== null ? `${previewCount}名` : "取得中..."}
            </span>
            <span className="nl2-preview-info-item">
              チャネル: {channelLabel(form.channel)}
            </span>
          </div>
          <div className="nl2-preview-actions">
            <Button variant="secondary" onClick={onClose}>閉じる</Button>
            <button type="button" className="nl2-btn-send" onClick={onSend} disabled={sending || !form.id}>
              {sending ? <span className="nl2-spinner" /> : <SendIcon size={14} color="#fff" />}
              このまま送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Send Confirm Dialog ── */
function SendConfirmDialog({ open, form, previewCount, isScheduled, scheduleDisplay, onConfirm, onCancel, sending, sendComplete }) {
  if (!open) return null;
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="nl2-send-dialog" onClick={(e) => e.stopPropagation()}>
        {sendComplete ? (
          <div className="nl2-send-complete">
            <div className="nl2-checkmark">
              <svg viewBox="0 0 52 52">
                <circle className="nl2-checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="nl2-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <p className="nl2-send-complete-text">
              {isScheduled ? "送信を予約しました" : "送信しました"}
            </p>
          </div>
        ) : (
          <>
            <div className="nl2-send-dialog-header">
              <div className="nl2-send-icon">
                {isScheduled ? <MailIcon size={28} color="var(--color-warning)" /> : <SendIcon size={28} color="var(--color-accent)" />}
              </div>
              <h3>{isScheduled ? "送信予約の確認" : "送信確認"}</h3>
            </div>
            <div className="nl2-send-dialog-body">
              {isScheduled ? (
                <p>
                  <strong>{previewCount ?? "?"}名</strong>に
                  <strong> {scheduleDisplay} </strong>
                  にメール送信を予約します。
                </p>
              ) : (
                <p><strong>{previewCount ?? "?"}名</strong>にメールを送信します。よろしいですか？</p>
              )}
              <div className="nl2-send-summary">
                <div><span className="nl2-send-summary-label">件名:</span> {form.title || "（なし）"}</div>
                <div><span className="nl2-send-summary-label">チャネル:</span> {channelLabel(form.channel)}</div>
              </div>
            </div>
            <div className="nl2-send-dialog-footer">
              <Button variant="secondary" onClick={onCancel} disabled={sending}>キャンセル</Button>
              <button type="button" className="nl2-btn-send" onClick={onConfirm} disabled={sending}>
                {sending ? <><span className="nl2-spinner" /> 送信中...</> : isScheduled ? "予約する" : "送信する"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Test Send Modal ── */
function TestSendModal({ open, newsletterId, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSend() {
    if (!email.trim()) return;
    setSending(true);
    setError("");
    try {
      const result = await apiRequest("send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletter_id: newsletterId, test_email: email.trim() }),
      });
      if (result.skipped) {
        setError(result.error || "メール送信設定が未完了です");
      } else if (!result.ok && result.error) {
        setError(result.error);
      } else {
        onSuccess("テストメールを送信しました");
        onClose();
      }
    } catch (err) {
      setError(err.message || "テスト送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><MailIcon size={18} /> テスト送信</span>} width="440px"
      footer={<>
        <Button variant="secondary" onClick={onClose}>キャンセル</Button>
        <Button variant="primary" onClick={handleSend} disabled={sending || !email.trim()}>
          {sending ? "送信中..." : "テスト送信する"}
        </Button>
      </>}
    >
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
            件名に「【テスト】」が自動的に付与されます。
          </p>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              送信先メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)", fontSize: 14,
              }}
              autoFocus
            />
          </div>
          {error && (
            <p style={{ color: "var(--color-danger)", fontSize: 13, marginTop: 12, marginBottom: 0 }}>{error}</p>
          )}
    </Modal>
  );
}

/* ── Error Dialog ── */
function ErrorDialog({ message, onClose }) {
  if (!message) return null;
  return (
    <Modal isOpen={true} onClose={onClose} title="エラー" width="420px"
      footer={<Button variant="primary" onClick={onClose}>OK</Button>}
    >
      <p style={{ margin: "0.5rem 0" }}>{message}</p>
    </Modal>
  );
}

/* ── Animated Counter ── */
function AnimatedCount({ value }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef(null);
  useEffect(() => {
    if (value === null || value === undefined) return;
    const start = display || 0;
    const diff = value - start;
    if (diff === 0) { setDisplay(value); return; }
    const duration = 400;
    const startTime = Date.now();
    function tick() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span style={{ display: "inline-block", minWidth: "1.5em", textAlign: "center", fontWeight: 700 }}>{display ?? "-"}</span>;
}

/* ── Editor Mode Tab ── */
function EditorModeTabs({ mode, onChange }) {
  return (
    <div style={{
      display: "inline-flex", borderRadius: "var(--radius-md)", overflow: "hidden",
      border: "1px solid var(--color-border)", marginBottom: 8,
    }}>
      <button
        type="button"
        onClick={() => onChange("text")}
        style={{
          padding: "6px 16px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
          background: mode === "text" ? "var(--color-accent)" : "#fff",
          color: mode === "text" ? "#fff" : "var(--color-text-secondary)",
          transition: "all 0.15s",
        }}
      >テキスト</button>
      <button
        type="button"
        onClick={() => onChange("rich")}
        style={{
          padding: "6px 16px", border: "none", borderLeft: "1px solid var(--color-border)",
          cursor: "pointer", fontSize: 12, fontWeight: 600,
          background: mode === "rich" ? "var(--color-accent)" : "#fff",
          color: mode === "rich" ? "#fff" : "var(--color-text-secondary)",
          transition: "all 0.15s",
        }}
      >リッチテキスト</button>
    </div>
  );
}


/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */
export default function Newsletters() {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [newsletters, setNewsletters] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [mobileView, setMobileView] = useState("list");

  const [editMode, setEditMode] = useState(null);
  const [sourceTemplateName, setSourceTemplateName] = useState("");
  const [editorMode, setEditorMode] = useState("text"); // "text" | "rich"

  const [form, setForm] = useState({
    id: "", title: "", body: "", body_html: "", channel: "email",
    audience_type: "all", audience_filter_json: "", audience_detail: "",
    scheduled_at: "", attachment_name: "", attachment_url: "",
    status: "", sent_at: "", sent_count: 0, is_template: false,
  });

  const [isScheduled, setIsScheduled] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedHour, setSchedHour] = useState(15);
  const [schedMin, setSchedMin] = useState(0);

  const [previewCount, setPreviewCount] = useState(null);
  const [toast, setToast] = useState(null);
  const bodyRef = useRef(null);

  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);
  const [errorDialog, setErrorDialog] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showTestSend, setShowTestSend] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState(false);

  /* ── Load list ── */
  const loadList = useCallback(() => {
    setLoading(true);
    setError("");
    base44.entities.Newsletter.list("-created_date", 100)
      .then((list) => setNewsletters(list))
      .catch((err) => setError(err.message || "配信一覧の取得に失敗しました。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  /* ── Split newsletters vs templates ── */
  const templates = useMemo(() => newsletters.filter(n => n.is_template === true), [newsletters]);
  const regularNewsletters = useMemo(() => newsletters.filter(n => !n.is_template), [newsletters]);

  /* ── Tab counts ── */
  const tabCounts = useMemo(() => ({
    all: regularNewsletters.length,
    draft: regularNewsletters.filter(n => n.status === "draft").length,
    scheduled: regularNewsletters.filter(n => n.status === "scheduled").length,
    sent: regularNewsletters.filter(n => n.status === "sent").length,
    template: templates.length,
  }), [regularNewsletters, templates]);

  /* ── Load detail ── */
  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    setPreviewCount(null);
    base44.entities.Newsletter.get(selectedId)
      .then((nl) => {
        const channelVal = nl.channel || "email";
        const newForm = {
          id: nl.id || "", title: nl.title || "", body: nl.body || "",
          body_html: nl.body_html || "",
          channel: channelVal,
          audience_type: nl.audience_type || "all",
          audience_filter_json: nl.audience_filter_json || "",
          audience_detail: "",
          scheduled_at: nl.scheduled_at || "",
          attachment_name: nl.attachment_name || (nl.attachments && nl.attachments[0]?.name) || "",
          attachment_url: nl.attachment_url || (nl.attachments && nl.attachments[0]?.url) || "",
          status: nl.status || "", sent_at: nl.sent_at || "",
          sent_count: nl.sent_count || 0, is_template: !!nl.is_template,
        };
        try {
          const fj = JSON.parse(nl.audience_filter_json || "{}");
          if (fj.member_type) newForm.audience_detail = fj.member_type;
        } catch { /* ignore */ }
        setForm(newForm);
        setEditMode(nl.is_template ? "template-edit" : "edit");
        // Set editor mode based on whether body_html exists
        setEditorMode(newForm.body_html ? "rich" : "text");
        if (newForm.scheduled_at) {
          const parts = newForm.scheduled_at.split("T");
          setSchedDate(parts[0] || "");
          if (parts[1]) {
            const [h, m] = parts[1].split(":").map(Number);
            setSchedHour(h || 0);
            setSchedMin(m || 0);
          }
          setIsScheduled(true);
        } else {
          setIsScheduled(false); setSchedDate(""); setSchedHour(15); setSchedMin(0);
        }
      })
      .catch((err) => setErrorDialog(err.message || "詳細の取得に失敗しました。"))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  /* ── Auto-resize body ── */
  useEffect(() => {
    if (bodyRef.current && editorMode === "text") {
      bodyRef.current.style.height = "auto";
      bodyRef.current.style.height = bodyRef.current.scrollHeight + "px";
    }
  }, [form.body, editorMode]);

  /* ── Toast ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg, type = "success") { setToast({ msg, type }); }

  /* ── Compose scheduled_at ── */
  useEffect(() => {
    if (isScheduled && schedDate) {
      setForm(prev => ({ ...prev, scheduled_at: `${schedDate}T${pad2(schedHour)}:${pad2(schedMin)}` }));
    } else if (!isScheduled) {
      setForm(prev => ({ ...prev, scheduled_at: "" }));
    }
  }, [isScheduled, schedDate, schedHour, schedMin]);

  /* ── Filtered list ── */
  const filteredNewsletters = useMemo(() => {
    if (activeTab === "template") return templates;
    const base = regularNewsletters;
    if (activeTab === "all") return base;
    return base.filter(nl => nl.status === activeTab);
  }, [activeTab, regularNewsletters, templates]);

  /* ── Handlers ── */
  function resetForm() {
    setSelectedId(null);
    setPreviewCount(null);
    setIsScheduled(false); setSchedDate(""); setSchedHour(15); setSchedMin(0);
    setAttachOpen(false); setSourceTemplateName("");
    setEditorMode("text");
    setForm({
      id: "", title: "", body: "", body_html: "", channel: "email",
      audience_type: "all", audience_filter_json: "", audience_detail: "",
      scheduled_at: "", attachment_name: "", attachment_url: "",
      status: "", sent_at: "", sent_count: 0, is_template: false,
    });
    setEditMode("new");
    setMobileView("detail");
  }

  function resetTemplateForm() {
    setSelectedId(null);
    setPreviewCount(null);
    setAttachOpen(false); setSourceTemplateName("");
    setEditorMode("text");
    setForm({
      id: "", title: "", body: "", body_html: "", channel: "email",
      audience_type: "all", audience_filter_json: "", audience_detail: "",
      scheduled_at: "", attachment_name: "", attachment_url: "",
      status: "", sent_at: "", sent_count: 0, is_template: true,
    });
    setEditMode("template-new");
    setMobileView("detail");
  }

  function createFromTemplate(tmpl) {
    setSelectedId(null); setPreviewCount(null);
    setIsScheduled(false); setSchedDate(""); setSchedHour(15); setSchedMin(0);
    setAttachOpen(false);
    setEditMode("from-template");
    setSourceTemplateName(tmpl.name || tmpl.title || "テンプレート");
    const hasHtml = !!(tmpl.body_html);
    setEditorMode(hasHtml ? "rich" : "text");
    setForm({
      id: "", title: tmpl.title || "", body: tmpl.body || "",
      body_html: tmpl.body_html || "",
      channel: tmpl.channel || "email",
      audience_type: tmpl.audience_type || "all",
      audience_filter_json: tmpl.audience_filter_json || "",
      audience_detail: "",
      scheduled_at: "", attachment_name: "", attachment_url: "",
      status: "", sent_at: "", sent_count: 0, is_template: false,
    });
    setMobileView("detail");
  }

  function handleSelect(id) {
    setSelectedId(id);
    setSourceTemplateName("");
    setMobileView("detail");
  }

  function handleAudiencePill(type) {
    setForm(prev => ({ ...prev, audience_type: type, audience_detail: "", audience_filter_json: "" }));
    setPreviewCount(null);
  }

  function handleAudienceDetailPill(val) {
    setForm(prev => ({
      ...prev, audience_detail: val,
      audience_filter_json: val ? JSON.stringify({ member_type: val }) : "",
    }));
    setPreviewCount(null);
  }

  function handleEditorModeChange(mode) {
    if (mode === editorMode) return;
    // When switching to rich, convert plain text to basic HTML
    if (mode === "rich" && !form.body_html && form.body) {
      const html = form.body.split("\n").map(line => `<p>${line || "&nbsp;"}</p>`).join("");
      setForm(prev => ({ ...prev, body_html: html }));
    }
    // When switching to text, we keep body_html as-is (it will be cleared on save if text mode)
    setEditorMode(mode);
  }

  async function handleSaveDraft(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const attachmentsMeta = (form.attachment_name || form.attachment_url)
        ? [{ name: form.attachment_name, url: form.attachment_url }] : [];
      const bodyHtml = editorMode === "rich" ? (form.body_html || "") : "";
      const payload = {
        title: form.title,
        body: form.body || (bodyHtml ? "(リッチテキスト)" : ""),
        body_html: bodyHtml,
        channel: form.channel || "email",
        status: form.status || "draft",
        audience_type: form.audience_type || "all",
        audience_filter_json: form.audience_filter_json || "",
        scheduled_at: form.scheduled_at || "",
        attachments_json: JSON.stringify(attachmentsMeta),
        is_template: form.is_template || false,
      };

      let result;
      if (form.id) {
        result = await base44.entities.Newsletter.update(form.id, payload);
      } else {
        result = await base44.entities.Newsletter.create(payload);
      }
      showToast(form.is_template ? "テンプレートを保存しました" : "下書きを保存しました");
      if (result.id) {
        setForm(prev => ({ ...prev, id: result.id, status: result.status || "draft" }));
        setSelectedId(result.id);
        setEditMode(form.is_template ? "template-edit" : "edit");
      }
      invalidateReadCache("Newsletter");
      loadList();
    } catch (err) {
      setErrorDialog(err.message || "保存に失敗しました。");
    } finally { setSaving(false); }
  }

  async function handleDeleteTemplate() {
    if (!form.id) return;
    setSaving(true);
    try {
      await base44.entities.Newsletter.delete(form.id);
      showToast("テンプレートを削除しました");
      resetForm(); setEditMode(null);
      invalidateReadCache("Newsletter");
      loadList();
    } catch (err) {
      setErrorDialog(err.message || "削除に失敗しました。");
    } finally { setSaving(false); setConfirmDeleteTemplate(false); }
  }

  async function handlePreview() {
    setSaving(true);
    try {
      const result = await apiRequest("preview-newsletter-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience_type: form.audience_type,
          audience_filter_json: form.audience_filter_json,
        }),
      });
      setPreviewCount(result.count ?? result.total ?? 0);
      setShowPreview(true);
    } catch (err) {
      setErrorDialog(err.message || "プレビューに失敗しました。");
    } finally { setSaving(false); }
  }

  function handleSendClick() { setConfirmSend(true); setSendComplete(false); }

  async function executeSend() {
    if (!form.id) return;
    setSending(true);
    try {
      await apiRequest("send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletter_id: form.id }),
      });
      setSendComplete(true);
      setTimeout(() => {
        setConfirmSend(false); setSendComplete(false); setShowPreview(false);
        invalidateReadCache("Newsletter");
        loadList(); setSelectedId(form.id);
      }, 2000);
    } catch (err) {
      setErrorDialog(err.message || "送信に失敗しました。");
      setConfirmSend(false);
    } finally { setSending(false); }
  }

  function handleResend() {
    setForm(prev => ({ ...prev, id: "", status: "", sent_at: "", sent_count: 0, is_template: false }));
    setSelectedId(null);
    setEditMode("new");
    setMobileView("detail");
  }

  /* ── Render helpers ── */
  const isSent = form.status === "sent";
  const isTemplate = editMode === "template-edit" || editMode === "template-new";
  const isFromTemplate = editMode === "from-template";
  const scheduleDisplay = formatScheduleDisplay(schedDate, `${pad2(schedHour)}:${pad2(schedMin)}`);
  const hasSelection = selectedId !== null || editMode === "new" || editMode === "from-template" || editMode === "template-new";
  const isNewTemplate = editMode === "template-new";

  /* ── Loading state ── */
  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header"><h1 className="page-title">配信管理</h1></div>
        <div className="nl2-layout">
          <div className="nl2-master">
            <div style={{ padding: "16px 16px 8px" }}><div style={{ width: 80, height: 18, borderRadius: 4, background: "var(--color-bg-sub)", animation: "nlPulse 1.5s ease infinite" }} /></div>
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
          <div className="nl2-detail"><SkeletonDetail /></div>
        </div>
        <style>{`@keyframes nlPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div className="page-header"><h1 className="page-title">配信管理</h1></div>
        <section className="card panel-card single-panel"><div className="card-body"><p className="message error">{error}</p></div></section>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      {/* ── Toast ── */}
      {toast && (
        <div className={`nl2-toast${toast.type === "error" ? " nl2-toast-error" : ""}`}>
          <span className="nl2-toast-icon">{toast.type === "error" ? "\u2717" : "\u2713"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Dialogs ── */}
      <ErrorDialog message={errorDialog} onClose={() => setErrorDialog("")} />
      <ConfirmDialog
        open={confirmDeleteTemplate}
        title="テンプレートを削除"
        message={`テンプレート「${form.title}」を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除する"
        confirmStyle={{ background: "#dc2626", borderColor: "#dc2626" }}
        onConfirm={handleDeleteTemplate}
        onCancel={() => setConfirmDeleteTemplate(false)}
      />
      <SendConfirmDialog
        open={confirmSend} form={form} previewCount={previewCount}
        isScheduled={isScheduled && !!schedDate} scheduleDisplay={scheduleDisplay}
        onConfirm={executeSend}
        onCancel={() => { setConfirmSend(false); setSendComplete(false); }}
        sending={sending} sendComplete={sendComplete}
      />
      {showPreview && (
        <PreviewModal
          form={form} editorMode={editorMode} previewCount={previewCount}
          onClose={() => setShowPreview(false)} onSend={handleSendClick} sending={sending}
        />
      )}
      <TestSendModal
        open={showTestSend}
        newsletterId={form.id}
        onClose={() => setShowTestSend(false)}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* ── Page header ── */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1 className="page-title" style={{ margin: 0 }}>配信管理</h1>
      </div>

      {/* Mobile tab bar */}
      <div className="nl2-mobile-tabs">
        <button className={`nl2-mobile-tab${mobileView === "list" ? " active" : ""}`} onClick={() => setMobileView("list")}>一覧</button>
        <button className={`nl2-mobile-tab${mobileView === "detail" ? " active" : ""}`} onClick={() => setMobileView("detail")}>
          {form.id ? "編集" : "新規作成"}
        </button>
      </div>

      <div className="nl2-layout" style={{ marginTop: 16 }}>
        {/* ═══ LEFT PANEL (340px) ═══ */}
        <div className={`nl2-master${mobileView === "list" ? " nl2-mobile-show" : " nl2-mobile-hide"}`} style={{ width: isMobile ? "100%" : 340, minWidth: isMobile ? 0 : 340 }}>
          <div className="nl2-master-inner">
            {/* ── Status pill tabs ── */}
            <div style={{ padding: "12px 12px 0" }}>
              <div className="nl2-pill-tabs" style={{ gap: 4 }}>
                {STATUS_TABS.map(tab => {
                  const count = tabCounts[tab.key] || 0;
                  return (
                    <button
                      key={tab.key}
                      className={`nl2-pill-tab${activeTab === tab.key ? " active" : ""}`}
                      onClick={() => setActiveTab(tab.key)}
                      style={{ fontSize: 12, padding: "4px 10px" }}
                    >
                      {tab.label}
                      {count > 0 && <span className="nl2-pill-tab-count">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Card list ── */}
            <div className="nl2-card-list" style={{ padding: "8px 0" }}>
              {activeTab === "template" ? (
                <>
                  {templates.length === 0 && PRESET_TEMPLATES.length > 0 && (
                    <div style={{ padding: "16px 12px" }}>
                      <div style={{
                        textAlign: "center", padding: "20px 16px",
                        border: "2px dashed var(--color-border)", borderRadius: "var(--radius-lg)",
                        color: "var(--color-text-secondary)",
                      }}>
                        <FileIcon size={32} color="var(--color-text-tertiary)" />
                        <p style={{ margin: "8px 0 4px", fontWeight: 600, fontSize: 13 }}>テンプレートがありません</p>
                        <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--color-text-tertiary)" }}>
                          よく使う文面をテンプレートとして保存できます
                        </p>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginTop: 16, marginBottom: 8, paddingLeft: 4 }}>
                        プリセットから作成:
                      </p>
                      {PRESET_TEMPLATES.map((pt, i) => (
                        <button
                          key={i} type="button"
                          onClick={() => createFromTemplate(pt)}
                          style={{
                            display: "block", width: "100%", textAlign: "left",
                            padding: "10px 14px", marginBottom: 4,
                            borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border)",
                            background: "#fff", cursor: "pointer", transition: "all 0.15s", fontSize: 13,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.background = "var(--color-accent-light)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.background = "#fff"; }}
                        >
                          <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>{pt.name || pt.title}</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {pt.body.slice(0, 50)}...
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {templates.map(tmpl => (
                    <div
                      key={tmpl.id}
                      style={{
                        margin: "0 12px 4px", padding: "12px 14px",
                        borderRadius: "var(--radius-md)",
                        border: selectedId === tmpl.id ? "2px solid var(--color-accent)" : "2px dashed var(--color-border)",
                        background: selectedId === tmpl.id ? "var(--color-accent-light)" : "#fff",
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                      onClick={() => handleSelect(tmpl.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <FileIcon size={14} color="var(--color-text-secondary)" />
                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tmpl.title || "（件名なし）"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                          {channelLabel(tmpl.channel)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); createFromTemplate(tmpl); }}
                          style={{
                            padding: "3px 10px", borderRadius: 999,
                            border: "1px solid var(--color-success)", background: "var(--color-success-light)",
                            color: "var(--color-success)", fontSize: 12, fontWeight: 600,
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--color-success)"; e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "var(--color-success-light)"; e.currentTarget.style.color = "var(--color-success)"; }}
                        >
                          この内容で配信作成
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                filteredNewsletters.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--color-text-secondary)" }}>
                    <MailIcon size={32} color="var(--color-text-tertiary)" />
                    <p style={{ margin: "8px 0 0", fontSize: 13 }}>配信データがありません</p>
                  </div>
                ) : (
                  filteredNewsletters.map(nl => {
                    const sc = statusColor(nl.status);
                    return (
                      <button
                        key={nl.id}
                        style={{
                          display: "flex", width: "calc(100% - 16px)", margin: "0 8px 2px",
                          padding: 0, border: "none", borderRadius: "var(--radius-md)",
                          background: selectedId === nl.id ? "var(--color-accent-light)" : "transparent",
                          cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                          overflow: "hidden",
                        }}
                        onClick={() => handleSelect(nl.id)}
                        onMouseEnter={e => { if (selectedId !== nl.id) e.currentTarget.style.background = "var(--color-bg-sub)"; }}
                        onMouseLeave={e => { if (selectedId !== nl.id) e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{
                          width: 3, minHeight: "100%", flexShrink: 0, borderRadius: "3px 0 0 3px",
                          background: selectedId === nl.id ? "var(--color-accent)" : sc.bar,
                        }} />
                        <div style={{ flex: 1, padding: "10px 12px", minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{
                              fontSize: 12, fontWeight: 600, padding: "1px 8px",
                              borderRadius: 12, background: sc.bg, color: sc.text,
                            }}>{statusLabel(nl.status)}</span>
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{channelLabel(nl.channel)}</span>
                          </div>
                          <div style={{
                            fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2,
                          }}>{nl.title || "（件名なし）"}</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                            {nl.sent_at || nl.scheduled_at || nl.updated_at || nl.created_at || "-"}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* ── Bottom fixed button ── */}
          <div style={{
            padding: "12px", borderTop: "1px solid var(--color-border)", background: "#fff",
          }}>
            {activeTab === "template" ? (
              <button
                type="button"
                onClick={resetTemplateForm}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: "var(--radius-md)",
                  border: "none", background: "var(--color-accent)", color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent)"}
              >
                <PlusIcon size={14} color="#fff" /> テンプレート作成
              </button>
            ) : (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: "var(--radius-md)",
                  border: "none", background: "var(--color-accent)", color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent)"}
              >
                <PlusIcon size={14} color="#fff" /> 新規作成
              </button>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div className={`nl2-detail${mobileView === "detail" ? " nl2-mobile-show" : " nl2-mobile-hide"}`}>
          {detailLoading ? (
            <SkeletonDetail />
          ) : !hasSelection ? (
            /* ── Empty state ── */
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              height: "100%", minHeight: 400, padding: 40, textAlign: "center",
            }}>
              <div style={{ color: "var(--color-border)", marginBottom: 20 }}>
                <MailIcon size={64} color="var(--color-border)" />
              </div>
              <h3 style={{ fontSize: 16, color: "var(--color-text-primary)", margin: "0 0 8px" }}>配信を選択してください</h3>
              <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "0 0 24px" }}>
                左の一覧から配信を選択するか、新規作成してください
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  type="button" className="btn"
                  onClick={resetForm}
                  style={{
                    background: "var(--color-accent)", color: "#fff", border: "none",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <PlusIcon size={14} color="#fff" /> 新規作成
                </button>
                {templates.length > 0 && (
                  <Button variant="secondary" onClick={() => setActiveTab("template")}>
                    <FileIcon size={14} /> テンプレートから作成
                  </Button>
                )}
              </div>
            </div>
          ) : isSent && !isTemplate ? (
            /* ── Sent view (read-only) ── */
            <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20, animation: "nlFade 0.15s ease" }}>
              <div>
                <span style={{
                  display: "inline-block", fontSize: 12, fontWeight: 600, padding: "2px 10px",
                  borderRadius: 12, background: statusColor(form.status).bg, color: statusColor(form.status).text,
                  marginBottom: 8,
                }}>{statusLabel(form.status)}</span>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{form.title || "（件名なし）"}</h2>
              </div>

              {/* Sent meta */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12, padding: 16, background: "var(--color-bg-sub)", borderRadius: "var(--radius-lg)",
              }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 2 }}>送信日時</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{form.sent_at || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 2 }}>チャネル</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{channelLabel(form.channel)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 2 }}>送信数</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{form.sent_count || 0}名</div>
                </div>
              </div>

              {/* Body */}
              <div style={{
                padding: 20, background: "#fff", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)", fontSize: 14, lineHeight: 1.7,
              }}>
                {form.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: form.body_html }} />
                ) : (
                  form.body ? form.body.split("\n").map((line, i) => (
                    <p key={i} style={{ margin: "0.25em 0" }}>{line || "\u00A0"}</p>
                  )) : <p style={{ color: "var(--color-text-tertiary)" }}>（本文なし）</p>
                )}
              </div>

              {(form.attachment_name || form.attachment_url) && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                  borderRadius: "var(--radius-md)", background: "var(--color-bg-sub)", fontSize: 13,
                }}>
                  <ClipIcon size={14} color="var(--color-text-secondary)" />
                  <span>{form.attachment_name || "添付ファイル"}</span>
                  {form.attachment_url && (
                    <a href={form.attachment_url} target="_blank" rel="noopener noreferrer" className="text-link" style={{ marginLeft: 4 }}>開く</a>
                  )}
                </div>
              )}

              <div>
                <button type="button" className="btn" onClick={handleResend}
                  style={{ background: "var(--color-accent)", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <RefreshIcon size={14} color="#fff" /> この内容で新規作成
                </button>
              </div>
            </div>
          ) : (
            /* ═══ Edit form ═══ */
            <form style={{
              display: "flex", flexDirection: "column", height: "100%",
              animation: "nlFade 0.15s ease",
            }} onSubmit={handleSaveDraft}>
              <div style={{ flex: 1, padding: 28, overflow: "visible" }}>
                {/* Banner */}
                {isTemplate && (
                  <div style={{
                    padding: "10px 16px", marginBottom: 16, borderRadius: "var(--radius-md)",
                    border: "1px solid #fde68a", background: "#fffbeb",
                    display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#92400e",
                  }}>
                    <FileIcon size={16} color="#92400e" />
                    {isNewTemplate ? "テンプレート新規作成" : "テンプレート編集中"}
                  </div>
                )}
                {isFromTemplate && (
                  <div style={{
                    padding: "10px 16px", marginBottom: 16, borderRadius: "var(--radius-md)",
                    border: "1px solid #a7f3d0", background: "#ecfdf5",
                    display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#065f46",
                  }}>
                    <FileIcon size={16} color="#065f46" />
                    テンプレート「<span style={{ fontWeight: 700 }}>{sourceTemplateName}</span>」を元に新規作成
                  </div>
                )}

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                    {isTemplate ? (isNewTemplate ? "テンプレート作成" : "テンプレート編集")
                      : isFromTemplate ? "新規配信"
                      : editMode === "new" ? "新規配信"
                      : "配信編集"}
                  </h2>
                  {!isTemplate && form.status && (
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 12,
                      background: statusColor(form.status).bg, color: statusColor(form.status).text,
                    }}>{statusLabel(form.status)}</span>
                  )}
                </div>

                {/* Subject */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.3px", marginBottom: 6 }}>
                    件名
                  </label>
                  <input
                    type="text" placeholder="件名を入力してください"
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    style={{
                      width: "100%", padding: "12px 4px", fontSize: 20, fontWeight: 600,
                      border: "none", borderBottom: "2px solid var(--color-border)",
                      background: "transparent", outline: "none", transition: "border-color 0.15s",
                    }}
                    onFocus={e => e.currentTarget.style.borderBottomColor = "var(--color-accent)"}
                    onBlur={e => e.currentTarget.style.borderBottomColor = "var(--color-border)"}
                  />
                </div>

                {/* Body - with editor mode toggle */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.3px" }}>
                      本文
                    </label>
                    <EditorModeTabs mode={editorMode} onChange={handleEditorModeChange} />
                  </div>

                  {editorMode === "rich" ? (
                    <RichTextEditor
                      content={form.body_html}
                      onChange={(html) => setForm(prev => ({ ...prev, body_html: html }))}
                      placeholder="本文を入力してください..."
                    />
                  ) : (
                    <div style={{ position: "relative" }}>
                      <textarea
                        ref={bodyRef}
                        placeholder="本文を入力してください"
                        value={form.body}
                        onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                        rows={8}
                        style={{
                          width: "100%", minHeight: 200, padding: "14px 16px", fontSize: 14,
                          lineHeight: 1.7, borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)",
                          background: "#fff", resize: "vertical", outline: "none", transition: "border-color 0.15s",
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--color-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--color-border)"}
                      />
                      <span style={{
                        position: "absolute", bottom: 10, right: 14, fontSize: 12,
                        color: "var(--color-text-tertiary)", pointerEvents: "none",
                      }}>{form.body.length}文字</span>
                    </div>
                  )}
                </div>

                {/* Channel - segment control */}
                <div style={{ marginBottom: 20, padding: "16px 0", borderTop: "1px solid var(--color-border)" }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.3px", marginBottom: 10 }}>
                    配信チャネル
                  </span>
                  <div style={{ display: "flex", gap: 0, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)", width: "fit-content" }}>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, channel: "email" }))}
                      style={{
                        padding: "8px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                        background: form.channel === "email" ? "var(--color-accent)" : "#fff",
                        color: form.channel === "email" ? "#fff" : "var(--color-text-secondary)",
                        display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                      }}
                    >
                      <MailIcon size={14} color={form.channel === "email" ? "#fff" : "var(--color-text-secondary)"} />
                      メール
                    </button>
                    <div style={{ position: "relative" }}>
                      <button type="button" disabled
                        style={{
                          padding: "8px 20px", border: "none", borderLeft: "1px solid var(--color-border)",
                          cursor: "not-allowed", fontSize: 13, fontWeight: 600,
                          background: "#f8fafc", color: "var(--color-text-tertiary)",
                          display: "flex", alignItems: "center", gap: 6, opacity: 0.6,
                        }}
                      >
                        LINE
                        <span style={{
                          fontSize: 12, padding: "1px 6px", borderRadius: 8,
                          background: "var(--color-bg-sub)", color: "var(--color-text-tertiary)",
                        }}>準備中</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audience */}
                <div style={{ marginBottom: 20, padding: "16px 0", borderTop: "1px solid var(--color-border)" }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.3px", marginBottom: 10 }}>
                    配信対象
                  </span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {AUDIENCE_OPTIONS.map(opt => (
                      <button
                        key={opt.key} type="button"
                        onClick={() => handleAudiencePill(opt.key)}
                        style={{
                          padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                          cursor: "pointer", transition: "all 0.15s",
                          background: form.audience_type === opt.key ? "var(--color-accent)" : "#fff",
                          color: form.audience_type === opt.key ? "#fff" : "var(--color-text-secondary)",
                          border: `1px solid ${form.audience_type === opt.key ? "var(--color-accent)" : "var(--color-border)"}`,
                        }}
                      >{opt.label}</button>
                    ))}
                  </div>
                  {form.audience_type === "member_type" && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      {MEMBER_TYPE_OPTIONS.map(opt => (
                        <button
                          key={opt.key} type="button"
                          onClick={() => handleAudienceDetailPill(opt.key)}
                          style={{
                            padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                            cursor: "pointer", transition: "all 0.15s",
                            background: form.audience_detail === opt.key ? "var(--color-accent-light)" : "#fff",
                            color: form.audience_detail === opt.key ? "var(--color-accent)" : "var(--color-text-secondary)",
                            border: `1px solid ${form.audience_detail === opt.key ? "var(--color-accent)" : "var(--color-border)"}`,
                          }}
                        >{opt.label}</button>
                      ))}
                    </div>
                  )}
                  {previewCount !== null && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px",
                      borderRadius: 20, background: "var(--color-accent-light)", fontSize: 13, color: "var(--color-accent)",
                    }}>
                      対象: <AnimatedCount value={previewCount} />名
                    </div>
                  )}
                </div>

                {/* Template toggle — only for new drafts */}
                {editMode === "new" && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 16px", marginBottom: 20,
                    borderRadius: "var(--radius-md)",
                    border: form.is_template ? "1px solid #fde68a" : "1px solid var(--color-border)",
                    background: form.is_template ? "#fffbeb" : "#fff",
                    transition: "all 0.15s",
                  }}>
                    <FileIcon size={16} color={form.is_template ? "#92400e" : "var(--color-text-secondary)"} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", flex: 1 }}>
                      テンプレートとして保存
                    </span>
                    <button
                      type="button"
                      className={`doc-toggle${form.is_template ? " doc-toggle-on" : ""}`}
                      onClick={() => setForm(prev => ({ ...prev, is_template: !prev.is_template }))}
                    ><span className="doc-toggle-knob" /></button>
                  </div>
                )}

                {/* Schedule toggle — not for templates */}
                {!isTemplate && !form.is_template && (
                  <div style={{ marginBottom: 20, padding: "16px 0", borderTop: "1px solid var(--color-border)" }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.3px", marginBottom: 10 }}>
                      送信タイミング
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: isScheduled ? 16 : 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>予約送信</span>
                      <button
                        type="button"
                        className={`doc-toggle${isScheduled ? " doc-toggle-on" : ""}`}
                        onClick={() => setIsScheduled(!isScheduled)}
                      ><span className="doc-toggle-knob" /></button>
                    </div>

                    {isScheduled && (
                      <div style={{
                        padding: 16, background: "var(--color-bg-sub)", borderRadius: "var(--radius-lg)",
                        display: "grid", gap: 14, animation: "nlSlide 0.2s ease",
                        overflow: "visible",
                      }}>
                        <div style={{ maxWidth: 260, position: "relative", zIndex: 10 }}>
                          <DatePicker
                            value={schedDate} onChange={setSchedDate}
                            placeholder="日付を選択"
                            minDate={todayStr()}
                          />
                        </div>

                        {/* Time quick select */}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                            送信時間
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                            {QUICK_TIMES.map(qt => (
                              <button
                                key={qt.label} type="button"
                                onClick={() => { setSchedHour(qt.h); setSchedMin(qt.m); }}
                                style={{
                                  padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                                  cursor: "pointer", transition: "all 0.15s",
                                  background: schedHour === qt.h && schedMin === qt.m ? "var(--color-accent)" : "#fff",
                                  color: schedHour === qt.h && schedMin === qt.m ? "#fff" : "var(--color-text-secondary)",
                                  border: `1px solid ${schedHour === qt.h && schedMin === qt.m ? "var(--color-accent)" : "var(--color-border)"}`,
                                }}
                              >{qt.label}</button>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <select
                              value={schedHour}
                              onChange={e => setSchedHour(Number(e.target.value))}
                              style={{ padding: "6px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", fontSize: 14 }}
                            >
                              {HOURS.map(h => <option key={h} value={h}>{pad2(h)}</option>)}
                            </select>
                            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-secondary)" }}>:</span>
                            <select
                              value={schedMin}
                              onChange={e => setSchedMin(Number(e.target.value))}
                              style={{ padding: "6px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", fontSize: 14 }}
                            >
                              {MINUTES.map(m => <option key={m} value={m}>{pad2(m)}</option>)}
                            </select>
                          </div>
                        </div>

                        {schedDate && (
                          <div style={{
                            padding: "10px 14px", borderRadius: "var(--radius-md)",
                            background: "var(--color-accent-light)", color: "var(--color-accent)",
                            fontSize: 13, fontWeight: 600,
                          }}>
                            {formatScheduleDisplay(schedDate, `${pad2(schedHour)}:${pad2(schedMin)}`)} に送信予約
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Attachment — not for templates */}
                {!isTemplate && !form.is_template && (
                  <div style={{ marginBottom: 20 }}>
                    <button
                      type="button"
                      onClick={() => setAttachOpen(!attachOpen)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--color-text-primary)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-secondary)"}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{
                        transition: "transform 0.2s", transform: attachOpen ? "rotate(90deg)" : "rotate(0)",
                      }}>
                        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <ClipIcon size={14} /> 添付ファイル
                      {(form.attachment_name || form.attachment_url) && (
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%", background: "var(--color-accent)",
                          color: "#fff", fontSize: 12, fontWeight: 700,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                        }}>1</span>
                      )}
                    </button>
                    {attachOpen && (
                      <div style={{
                        marginTop: 8, padding: 16, borderRadius: "var(--radius-lg)",
                        border: "2px dashed var(--color-border)", textAlign: "center",
                        animation: "nlSlide 0.2s ease",
                      }}>
                        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-secondary)" }}>
                          ファイルURL を入力
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, textAlign: "left" }}>
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>ファイル名</label>
                            <input type="text" placeholder="例: 案内.pdf"
                              value={form.attachment_name}
                              onChange={e => setForm(prev => ({ ...prev, attachment_name: e.target.value }))}
                              style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", fontSize: 13 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>URL</label>
                            <input type="url" placeholder="https://..."
                              value={form.attachment_url}
                              onChange={e => setForm(prev => ({ ...prev, attachment_url: e.target.value }))}
                              style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", fontSize: 13 }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ═══ Action bar (fixed bottom) ═══ */}
              <div style={{
                padding: "14px 28px", borderTop: "1px solid var(--color-border)", background: "#fff",
                display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap",
              }}>
                {isTemplate ? (
                  <>
                    <div style={{ flex: 1 }}>
                      {form.id && (
                        <button type="button" onClick={() => setConfirmDeleteTemplate(true)} disabled={saving}
                          style={{
                            padding: "7px 16px", borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-danger)", background: "var(--error-light)",
                            color: "#991b1b", fontSize: 13, fontWeight: 600, cursor: "pointer",
                          }}
                        >テンプレートを削除</button>
                      )}
                    </div>
                    <button type="submit" className="btn" disabled={saving}
                      style={{ background: "var(--color-accent)", color: "#fff", border: "none", fontSize: 13 }}
                    >{saving ? "保存中..." : isNewTemplate ? "テンプレートとして保存" : "テンプレートを更新"}</button>
                  </>
                ) : (
                  <>
                    <button type="submit" disabled={saving}
                      style={{
                        padding: "7px 16px", borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)", background: "#fff",
                        color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >{saving ? "保存中..." : form.is_template ? "テンプレートを保存" : "下書き保存"}</button>

                    {!form.is_template && (
                      <>
                        <div style={{ flex: 1 }} />
                        {form.id && (
                          <button type="button" onClick={() => setShowTestSend(true)} disabled={saving}
                            style={{
                              padding: "7px 16px", borderRadius: "var(--radius-md)",
                              border: "1px solid var(--color-accent)", background: "#fff",
                              color: "var(--color-accent)", fontSize: 13, fontWeight: 600,
                              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--color-accent-light)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
                          >
                            <MailIcon size={13} color="var(--color-accent)" /> テスト送信
                          </button>
                        )}
                        <button type="button" onClick={handlePreview} disabled={saving}
                          style={{
                            padding: "7px 16px", borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-accent)", background: "#fff",
                            color: "var(--color-accent)", fontSize: 13, fontWeight: 600,
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--color-accent-light)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
                        >プレビュー</button>
                        {form.id && (
                          <button type="button" onClick={handleSendClick} disabled={saving}
                            style={{
                              padding: "8px 24px", borderRadius: "var(--radius-md)",
                              border: "none", background: "var(--color-accent)", color: "#fff",
                              fontSize: 14, fontWeight: 700, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 6,
                              transition: "all 0.15s", boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--color-accent-hover)"; e.currentTarget.style.transform = "scale(1.02)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "var(--color-accent)"; e.currentTarget.style.transform = "scale(1)"; }}
                          >
                            <SendIcon size={14} color="#fff" />
                            {isScheduled && schedDate ? "予約する" : "送信"}
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ═══ Animations ═══ */}
      <style>{`
        @keyframes nlPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes nlFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes nlSlide { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 600px; } }
      `}</style>
    </section>
  );
}
