import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiRequest, base44, invalidateReadCache } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DatePicker from "../../components/ui/DatePicker";

/* ── helpers ── */
function statusLabel(s) {
  return (
    { draft: "下書き", scheduled: "予約中", sent: "送信済", cancelled: "取消", failed: "失敗" }[s] || s || "-"
  );
}

function statusBg(s) {
  return {
    draft: "nl2-card--draft",
    scheduled: "nl2-card--scheduled",
    sent: "nl2-card--sent",
    failed: "nl2-card--failed",
    cancelled: "nl2-card--draft",
  }[s] || "";
}

function statusPill(s) {
  return {
    draft: "",
    scheduled: "pill-warning",
    sent: "pill-success",
    failed: "pill-danger",
    cancelled: "",
  }[s] || "";
}

function channelEmoji(c) {
  if (c === "line") return "\uD83D\uDCAC";
  if (c === "email+line") return "\uD83D\uDCE7\uD83D\uDCAC";
  return "\uD83D\uDCE7";
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
  { key: "template", label: "\uD83D\uDCCB テンプレート" },
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

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad2(n) { return String(n).padStart(2, "0"); }

function formatDateJa(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

function formatTimeJa(h, m) {
  const ampm = h < 12 ? "午前" : "午後";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${ampm} ${h12}:${pad2(m)}`;
}

function formatScheduleDisplay(dateStr, timeStr) {
  if (!dateStr) return "";
  const dateJa = formatDateJa(dateStr);
  if (!timeStr) return dateJa;
  const [h, m] = timeStr.split(":").map(Number);
  return `${dateJa} ${pad2(h)}:${pad2(m)}`;
}

/* ── Preset templates ── */
const PRESET_TEMPLATES = [
  {
    title: "【水戸21の会】○月例会のご案内",
    body: "会員の皆様\n\nいつもお世話になっております。\n○月の例会について下記の通りご案内いたします。\n\n日時：\n場所：\n内容：\n\nご出欠のご連絡をお願いいたします。\n\n水戸21の会 事務局",
    channel: "email",
    audience_type: "all",
  },
  {
    title: "【水戸21の会】会費納入のお願い",
    body: "会員各位\n\n平素より当会の活動にご理解ご協力を賜り、誠にありがとうございます。\n\n本年度の会費につきまして、まだお振込みが確認できておりません。\nお忙しいところ恐れ入りますが、下記口座へのお振込みをお願いいたします。\n\n振込先：\n金額：\n期限：\n\n何卒よろしくお願いいたします。\n\n水戸21の会 事務局",
    channel: "email",
    audience_type: "all",
  },
  {
    title: "【水戸21の会】新入会員のご紹介",
    body: "会員の皆様\n\nこの度、新たに下記の方が入会されましたのでご紹介いたします。\n\nお名前：\nご所属：\n紹介者：\n\n今後ともよろしくお願いいたします。\n\n水戸21の会 事務局",
    channel: "email",
    audience_type: "all",
  },
];

/* ── Skeleton Loading ── */
function SkeletonCard() {
  return (
    <div className="nl2-skeleton-card">
      <div className="skeleton-line" style={{ width: "40%" }}></div>
      <div className="skeleton-line" style={{ width: "80%" }}></div>
      <div className="skeleton-line short"></div>
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="nl2-skeleton-detail">
      <div className="skeleton-line" style={{ width: "30%", height: 24 }}></div>
      <div className="skeleton-block" style={{ height: 48 }}></div>
      <div className="skeleton-block" style={{ height: 200 }}></div>
      <div className="skeleton-line" style={{ width: "50%" }}></div>
    </div>
  );
}

/* ── Time Picker Component ── */
function TimePicker({ hour, minute, onChange, disabled }) {
  const [isAm, setIsAm] = useState(hour < 12);
  const hourScrollRef = useRef(null);
  const minScrollRef = useRef(null);

  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  function setHour(h12) {
    const h24 = isAm ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12);
    onChange(h24, minute);
  }

  function setMinute(m) {
    onChange(hour, m);
  }

  function toggleAmPm(am) {
    setIsAm(am);
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const h24 = am ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12);
    onChange(h24, minute);
  }

  function handleQuickTime(h, m) {
    setIsAm(h < 12);
    onChange(h, m);
  }

  return (
    <div className="nl2-time-picker">
      <div className="nl2-time-quick">
        {QUICK_TIMES.map((qt) => (
          <button
            key={qt.label}
            type="button"
            className={`nl2-time-quick-btn${hour === qt.h && minute === qt.m ? " active" : ""}`}
            onClick={() => handleQuickTime(qt.h, qt.m)}
            disabled={disabled}
          >
            {qt.label}
          </button>
        ))}
      </div>

      <div className="nl2-time-selector">
        <div className="nl2-time-ampm">
          <button
            type="button"
            className={`nl2-ampm-btn${isAm ? " active" : ""}`}
            onClick={() => toggleAmPm(true)}
            disabled={disabled}
          >
            午前
          </button>
          <button
            type="button"
            className={`nl2-ampm-btn${!isAm ? " active" : ""}`}
            onClick={() => toggleAmPm(false)}
            disabled={disabled}
          >
            午後
          </button>
        </div>

        <div className="nl2-time-wheels">
          <div className="nl2-wheel" ref={hourScrollRef}>
            <span className="nl2-wheel-label">時</span>
            <div className="nl2-wheel-items">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`nl2-wheel-item${h === displayHour ? " active" : ""}`}
                  onClick={() => setHour(h)}
                  disabled={disabled}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          <div className="nl2-time-colon">:</div>
          <div className="nl2-wheel" ref={minScrollRef}>
            <span className="nl2-wheel-label">分</span>
            <div className="nl2-wheel-items">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`nl2-wheel-item${m === minute ? " active" : ""}`}
                  onClick={() => setMinute(m)}
                  disabled={disabled}
                >
                  {pad2(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="nl2-time-display">
        {formatTimeJa(hour, minute)}
      </div>
    </div>
  );
}

/* ── Preview Modal ── */
function PreviewModal({ form, previewCount, onClose, onSend, sending }) {
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
              {form.body ? form.body.split("\n").map((line, i) => (
                <p key={i} style={{ margin: "0.3em 0" }}>{line || "\u00A0"}</p>
              )) : <p className="muted">（本文なし）</p>}
            </div>
            {(form.attachment_name || form.attachment_url) && (
              <div className="nl2-preview-attachment">
                <span>\uD83D\uDCCE {form.attachment_name || "添付ファイル"}</span>
              </div>
            )}
          </div>
        </div>
        <div className="nl2-preview-footer">
          <div className="nl2-preview-info">
            <span className="nl2-preview-info-item">
              \uD83D\uDC65 対象: {previewCount !== null ? `${previewCount}名` : "取得中..."}
            </span>
            <span className="nl2-preview-info-item">
              {channelEmoji(form.channel)} チャネル: {channelLabel(form.channel)}
            </span>
          </div>
          <div className="nl2-preview-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>閉じる</button>
            <button
              type="button"
              className="nl2-btn-send"
              onClick={onSend}
              disabled={sending || !form.id}
            >
              {sending ? <span className="nl2-spinner" /> : null}
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
              {isScheduled ? "送信を予約しました！" : "送信しました！"}
            </p>
          </div>
        ) : (
          <>
            <div className="nl2-send-dialog-header">
              <div className="nl2-send-icon">
                {isScheduled ? "\uD83D\uDCC5" : "\uD83D\uDCE8"}
              </div>
              <h3>{isScheduled ? "送信予約の確認" : "送信確認"}</h3>
            </div>
            <div className="nl2-send-dialog-body">
              {isScheduled ? (
                <p>
                  <strong>{previewCount !== null ? previewCount : "?"}名</strong>に
                  <strong> {scheduleDisplay} </strong>
                  にメール送信を予約します。
                </p>
              ) : (
                <p>
                  <strong>{previewCount !== null ? previewCount : "?"}名</strong>にメールを送信します。よろしいですか？
                </p>
              )}
              <div className="nl2-send-summary">
                <div><span className="nl2-send-summary-label">件名:</span> {form.title || "（なし）"}</div>
                <div><span className="nl2-send-summary-label">チャネル:</span> {channelLabel(form.channel)}</div>
              </div>
            </div>
            <div className="nl2-send-dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={sending}>
                キャンセル
              </button>
              <button type="button" className="nl2-btn-send" onClick={onConfirm} disabled={sending}>
                {sending ? (
                  <>
                    <span className="nl2-spinner" />
                    送信中...
                  </>
                ) : (
                  isScheduled ? "予約する" : "送信する"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Error Dialog ── */
function ErrorDialog({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>エラー</h3>
          <button type="button" className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p style={{ margin: "0.5rem 0" }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" type="button" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
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

  return <span className="nl2-count-animated">{display ?? "-"}</span>;
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */
export default function Newsletters() {
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [newsletters, setNewsletters] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  // Mobile responsive
  const [mobileView, setMobileView] = useState("list");

  // Edit mode: "new" | "edit" | "template-edit" | "from-template" | null
  const [editMode, setEditMode] = useState(null);
  const [sourceTemplateName, setSourceTemplateName] = useState("");

  const [form, setForm] = useState({
    id: "",
    title: "",
    body: "",
    channel: "email",
    channel_email: true,
    channel_line: false,
    audience_type: "all",
    audience_filter_json: "",
    audience_detail: "",
    scheduled_at: "",
    attachment_name: "",
    attachment_url: "",
    status: "",
    sent_at: "",
    sent_count: 0,
    is_template: false,
  });

  const [isScheduled, setIsScheduled] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedHour, setSchedHour] = useState(15);
  const [schedMin, setSchedMin] = useState(0);

  const [previewCount, setPreviewCount] = useState(null);
  const [toast, setToast] = useState("");
  const bodyRef = useRef(null);

  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);
  const [errorDialog, setErrorDialog] = useState("");
  const [showPreview, setShowPreview] = useState(false);
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
  const templates = useMemo(() =>
    newsletters.filter(n => n.is_template === true),
    [newsletters]
  );
  const regularNewsletters = useMemo(() =>
    newsletters.filter(n => !n.is_template),
    [newsletters]
  );

  /* ── Load detail ── */
  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    setPreviewCount(null);
    base44.entities.Newsletter.get(selectedId)
      .then((nl) => {
        const channelVal = nl.channel || "email";
        const newForm = {
          id: nl.id || "",
          title: nl.title || "",
          body: nl.body || "",
          channel: channelVal,
          channel_email: channelVal === "email" || channelVal === "email+line",
          channel_line: channelVal === "line" || channelVal === "email+line",
          audience_type: nl.audience_type || "all",
          audience_filter_json: nl.audience_filter_json || "",
          audience_detail: nl.audience_detail || "",
          scheduled_at: nl.scheduled_at || "",
          attachment_name: nl.attachment_name || (nl.attachments && nl.attachments[0]?.name) || "",
          attachment_url: nl.attachment_url || (nl.attachments && nl.attachments[0]?.url) || "",
          status: nl.status || "",
          sent_at: nl.sent_at || "",
          sent_count: nl.sent_count || 0,
          is_template: !!nl.is_template,
        };
        setForm(newForm);

        if (nl.is_template) {
          setEditMode("template-edit");
        } else {
          setEditMode("edit");
        }

        // Parse scheduled_at
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
          setIsScheduled(false);
          setSchedDate("");
          setSchedHour(15);
          setSchedMin(0);
        }
      })
      .catch((err) => setErrorDialog(err.message || "詳細の取得に失敗しました。"))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  /* ── Auto-resize body ── */
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = "auto";
      bodyRef.current.style.height = bodyRef.current.scrollHeight + "px";
    }
  }, [form.body]);

  /* ── Toast auto-hide ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Compose scheduled_at from parts ── */
  useEffect(() => {
    if (isScheduled && schedDate) {
      const val = `${schedDate}T${pad2(schedHour)}:${pad2(schedMin)}`;
      setForm((prev) => ({ ...prev, scheduled_at: val }));
    } else if (!isScheduled) {
      setForm((prev) => ({ ...prev, scheduled_at: "" }));
    }
  }, [isScheduled, schedDate, schedHour, schedMin]);

  /* ── Filtered list ── */
  const filteredNewsletters = useMemo(() => {
    if (activeTab === "template") return templates;
    const base = regularNewsletters;
    if (activeTab === "all") return base;
    return base.filter((nl) => nl.status === activeTab);
  }, [activeTab, regularNewsletters, templates]);

  /* ── Handlers ── */
  function resetForm() {
    setSelectedId(null);
    setPreviewCount(null);
    setIsScheduled(false);
    setSchedDate("");
    setSchedHour(15);
    setSchedMin(0);
    setAttachOpen(false);
    setEditMode("new");
    setSourceTemplateName("");
    setForm({
      id: "", title: "", body: "", channel: "email",
      channel_email: true, channel_line: false,
      audience_type: "all", audience_filter_json: "", audience_detail: "",
      scheduled_at: "", attachment_name: "", attachment_url: "",
      status: "", sent_at: "", sent_count: 0, is_template: false,
    });
    setMobileView("detail");
  }

  function createFromTemplate(tmpl) {
    setSelectedId(null);
    setPreviewCount(null);
    setIsScheduled(false);
    setSchedDate("");
    setSchedHour(15);
    setSchedMin(0);
    setAttachOpen(false);
    setEditMode("from-template");
    setSourceTemplateName(tmpl.title || "テンプレート");
    setForm({
      id: "",
      title: tmpl.title || "",
      body: tmpl.body || "",
      channel: tmpl.channel || "email",
      channel_email: (tmpl.channel || "email") === "email" || (tmpl.channel || "email") === "email+line",
      channel_line: (tmpl.channel || "email") === "line" || (tmpl.channel || "email") === "email+line",
      audience_type: tmpl.audience_type || "all",
      audience_filter_json: tmpl.audience_filter_json || "",
      audience_detail: "",
      scheduled_at: "",
      attachment_name: "",
      attachment_url: "",
      status: "",
      sent_at: "",
      sent_count: 0,
      is_template: false,
    });
    setMobileView("detail");
  }

  function handleSelect(id) {
    setSelectedId(id);
    setSourceTemplateName("");
    setMobileView("detail");
  }

  function deriveChannel(email, line) {
    if (email && line) return "email+line";
    if (line) return "line";
    return "email";
  }

  function handleChannelToggle(field) {
    setForm((prev) => {
      const next = { ...prev, [field]: !prev[field] };
      if (!next.channel_email && !next.channel_line) next.channel_email = true;
      next.channel = deriveChannel(next.channel_email, next.channel_line);
      return next;
    });
  }

  function handleAudiencePill(type) {
    setForm((prev) => ({
      ...prev,
      audience_type: type,
      audience_detail: "",
      audience_filter_json: "",
    }));
    setPreviewCount(null);
  }

  function handleAudienceDetailPill(val) {
    setForm((prev) => ({
      ...prev,
      audience_detail: val,
      audience_filter_json: val ? JSON.stringify({ member_type: val }) : "",
    }));
    setPreviewCount(null);
  }

  async function handleSaveDraft(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const attachments = (form.attachment_name || form.attachment_url)
        ? [{ name: form.attachment_name, url: form.attachment_url }]
        : [];
      const payload = {
        id: form.id || undefined,
        title: form.title,
        body: form.body,
        channel: form.channel,
        audience_type: form.audience_type,
        audience_filter_json: form.audience_filter_json,
        scheduled_at: form.scheduled_at || undefined,
        attachments_json: JSON.stringify(attachments),
        is_template: form.is_template || false,
      };
      const result = await apiRequest("save-newsletter-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setToast(form.is_template ? "テンプレートを保存しました" : "下書きを保存しました");
      if (result.id) {
        setForm((prev) => ({ ...prev, id: result.id, status: result.status || "draft" }));
        setSelectedId(result.id);
        if (form.is_template) {
          setEditMode("template-edit");
        } else {
          setEditMode("edit");
        }
      }
      invalidateReadCache("Newsletter");
      loadList();
    } catch (err) {
      setErrorDialog(err.message || "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!form.id) return;
    setSaving(true);
    try {
      await base44.entities.Newsletter.delete(form.id);
      setToast("テンプレートを削除しました");
      resetForm();
      setEditMode(null);
      invalidateReadCache("Newsletter");
      loadList();
    } catch (err) {
      setErrorDialog(err.message || "削除に失敗しました。");
    } finally {
      setSaving(false);
      setConfirmDeleteTemplate(false);
    }
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
    } finally {
      setSaving(false);
    }
  }

  function handleSendClick() {
    setConfirmSend(true);
    setSendComplete(false);
  }

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
        setConfirmSend(false);
        setSendComplete(false);
        setShowPreview(false);
        invalidateReadCache("Newsletter");
        loadList();
        setSelectedId(form.id);
      }, 2000);
    } catch (err) {
      setErrorDialog(err.message || "送信に失敗しました。");
      setConfirmSend(false);
    } finally {
      setSending(false);
    }
  }

  function handleResend() {
    setForm((prev) => ({
      ...prev,
      id: "",
      status: "",
      sent_at: "",
      sent_count: 0,
      is_template: false,
    }));
    setSelectedId(null);
    setEditMode("new");
    setMobileView("detail");
  }

  /* ── Render helpers ── */
  const isSent = form.status === "sent";
  const isTemplate = editMode === "template-edit";
  const isFromTemplate = editMode === "from-template";
  const scheduleDisplay = formatScheduleDisplay(schedDate, `${pad2(schedHour)}:${pad2(schedMin)}`);
  const hasSelection = selectedId !== null || editMode === "new" || editMode === "from-template";

  /* ── Loading state ── */
  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">配信管理</h1>
          <p className="page-description">メール・LINE配信の作成・管理</p>
        </div>
        <div className="nl2-layout">
          <div className="nl2-master">
            <div className="nl2-master-header"><h2>配信一覧</h2></div>
            <div style={{ padding: 20 }}><LoadingSpinner /></div>
          </div>
          <div className="nl2-detail">
            <div style={{ padding: 40, textAlign: "center" }}>
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">配信管理</h1>
          <p className="page-description">メール・LINE配信の作成・管理</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body"><p className="message error">{error}</p></div>
        </section>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">配信管理</h1>
        <p className="page-description">メール・LINE配信の作成・管理</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="nl2-toast nl2-toast-enter">
          <span className="nl2-toast-icon">\u2713</span>
          {toast}
        </div>
      )}

      {/* Error Dialog */}
      <ErrorDialog message={errorDialog} onClose={() => setErrorDialog("")} />

      {/* Delete template confirm */}
      <ConfirmDialog
        open={confirmDeleteTemplate}
        title="テンプレートを削除"
        message={`テンプレート「${form.title}」を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除する"
        confirmStyle={{ background: "#dc2626", borderColor: "#dc2626" }}
        onConfirm={handleDeleteTemplate}
        onCancel={() => setConfirmDeleteTemplate(false)}
      />

      {/* Send Confirm */}
      <SendConfirmDialog
        open={confirmSend}
        form={form}
        previewCount={previewCount}
        isScheduled={isScheduled && !!schedDate}
        scheduleDisplay={scheduleDisplay}
        onConfirm={executeSend}
        onCancel={() => { setConfirmSend(false); setSendComplete(false); }}
        sending={sending}
        sendComplete={sendComplete}
      />

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          form={form}
          previewCount={previewCount}
          onClose={() => setShowPreview(false)}
          onSend={handleSendClick}
          sending={sending}
        />
      )}

      {/* Mobile tab bar */}
      <div className="nl2-mobile-tabs">
        <button
          className={`nl2-mobile-tab${mobileView === "list" ? " active" : ""}`}
          onClick={() => setMobileView("list")}
        >
          一覧
        </button>
        <button
          className={`nl2-mobile-tab${mobileView === "detail" ? " active" : ""}`}
          onClick={() => setMobileView("detail")}
        >
          {form.id ? "編集" : "新規作成"}
        </button>
      </div>

      <div className="nl2-layout">
        {/* ═══ LEFT PANEL ═══ */}
        <div className={`nl2-master${mobileView === "list" ? " nl2-mobile-show" : " nl2-mobile-hide"}`}>
          <div className="nl2-master-inner">
            <div className="nl2-master-header">
              <h2>配信一覧</h2>
            </div>

            {/* Status pill tabs */}
            <div className="nl2-pill-tabs">
              {STATUS_TABS.map((tab) => {
                const count = tab.key === "template"
                  ? templates.length
                  : tab.key === "all"
                    ? regularNewsletters.length
                    : regularNewsletters.filter(n => n.status === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    className={`nl2-pill-tab${activeTab === tab.key ? " active" : ""}`}
                    onClick={() => { setActiveTab(tab.key); }}
                  >
                    {tab.label}
                    {tab.key !== "all" && count > 0 && (
                      <span className="nl2-pill-tab-count">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Card list */}
            <div className="nl2-card-list">
              {activeTab === "template" ? (
                /* ── Template cards ── */
                templates.length === 0 ? (
                  <div style={{ padding: "20px 16px" }}>
                    <div style={{
                      textAlign: "center", padding: "24px 16px",
                      border: "2px dashed var(--line)", borderRadius: "var(--radius-lg)",
                      color: "var(--text-secondary)",
                    }}>
                      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>{"\uD83D\uDCCB"}</div>
                      <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 13 }}>テンプレートがありません</p>
                      <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--muted)" }}>
                        よく使う文面をテンプレートとして保存できます
                      </p>
                    </div>

                    {/* Preset templates */}
                    <div style={{ marginTop: 16 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                        プリセットテンプレートから作成:
                      </p>
                      {PRESET_TEMPLATES.map((pt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => createFromTemplate({ ...pt, is_template: false })}
                          style={{
                            display: "block", width: "100%", textAlign: "left",
                            padding: "10px 14px", marginBottom: 6,
                            borderRadius: "var(--radius)", border: "1px dashed var(--line)",
                            background: "#fff", cursor: "pointer",
                            transition: "all 0.15s",
                            fontSize: 13,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "var(--primary-light)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "#fff"; }}
                        >
                          <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                            {"\uD83D\uDCCB"} {pt.title}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {pt.body.slice(0, 50)}...
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      style={{
                        margin: "0 12px 6px",
                        padding: "12px 14px",
                        borderRadius: "var(--radius)",
                        border: selectedId === tmpl.id ? "2px solid var(--primary)" : "2px dashed var(--line)",
                        background: selectedId === tmpl.id ? "var(--primary-light)" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onClick={() => handleSelect(tmpl.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 14 }}>{"\uD83D\uDCCB"}</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tmpl.title || "（件名なし）"}
                        </span>
                        <span style={{ fontSize: 12 }}>{channelEmoji(tmpl.channel)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                          {tmpl.created_date || tmpl.updated_at || "-"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); createFromTemplate(tmpl); }}
                          style={{
                            padding: "3px 10px", borderRadius: 999,
                            border: "1px solid #059669", background: "#ecfdf5",
                            color: "#059669", fontSize: 11, fontWeight: 600,
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#059669"; e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#ecfdf5"; e.currentTarget.style.color = "#059669"; }}
                        >
                          この型で作成
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                /* ── Regular newsletter cards ── */
                filteredNewsletters.length === 0 ? (
                  <div className="nl2-empty">
                    <span className="nl2-empty-icon">\uD83D\uDCEC</span>
                    <p>配信データがありません</p>
                  </div>
                ) : (
                  filteredNewsletters.map((nl) => (
                    <button
                      key={nl.id}
                      className={`nl2-card ${statusBg(nl.status)}${selectedId === nl.id ? " is-selected" : ""}`}
                      onClick={() => handleSelect(nl.id)}
                    >
                      <div className="nl2-card-accent"></div>
                      <div className="nl2-card-content">
                        <div className="nl2-card-top">
                          <span className={`pill ${statusPill(nl.status)}`} style={{ fontSize: 11 }}>
                            {statusLabel(nl.status)}
                          </span>
                          <span className="nl2-card-channel">{channelEmoji(nl.channel)}</span>
                        </div>
                        <div className="nl2-card-title">{nl.title || "（件名なし）"}</div>
                        <div className="nl2-card-bottom">
                          <span className="nl2-card-date">
                            {nl.sent_at || nl.scheduled_at || nl.updated_at || nl.created_at || "-"}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                )
              )}
            </div>
          </div>

          {/* FAB */}
          <button className="nl2-fab" onClick={resetForm} title="新規作成">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span>新規作成</span>
          </button>
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div className={`nl2-detail${mobileView === "detail" ? " nl2-mobile-show" : " nl2-mobile-hide"}`}>
          {detailLoading ? (
            <SkeletonDetail />
          ) : !hasSelection ? (
            /* Empty state */
            <div className="nl2-detail-empty">
              <div className="nl2-detail-empty-icon">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <rect x="8" y="14" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 22l24 14 24-14" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3>配信を選択するか、新規作成してください</h3>
              <p className="muted">左の一覧から配信を選択するか、新規作成ボタンをクリックしてください。</p>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={resetForm}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 4 }}>
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  新規作成
                </button>
                {templates.length > 0 && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setActiveTab("template")}
                    style={{ borderColor: "#059669", color: "#059669" }}
                  >
                    {"\uD83D\uDCCB"} テンプレートから作成
                  </button>
                )}
              </div>
            </div>
          ) : isSent && !isTemplate ? (
            /* ── Sent view (read-only) ── */
            <div className="nl2-sent-view nl2-fade-in">
              <div className="nl2-detail-header-bar">
                <div>
                  <span className={`pill ${statusPill(form.status)}`}>{statusLabel(form.status)}</span>
                  <h2 style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{form.title || "（件名なし）"}</h2>
                </div>
              </div>

              <div className="nl2-sent-meta">
                <div className="nl2-sent-meta-item">
                  <span className="nl2-sent-meta-label">\uD83D\uDCC5 送信日時</span>
                  <span>{form.sent_at || "-"}</span>
                </div>
                <div className="nl2-sent-meta-item">
                  <span className="nl2-sent-meta-label">{channelEmoji(form.channel)} チャネル</span>
                  <span>{channelLabel(form.channel)}</span>
                </div>
                <div className="nl2-sent-meta-item">
                  <span className="nl2-sent-meta-label">\uD83D\uDC65 送信数</span>
                  <span>{form.sent_count || 0}名</span>
                </div>
              </div>

              <div className="nl2-sent-body-card">
                <div className="nl2-sent-body-content">
                  {form.body ? form.body.split("\n").map((line, i) => (
                    <p key={i} style={{ margin: "0.25em 0" }}>{line || "\u00A0"}</p>
                  )) : <p className="muted">（本文なし）</p>}
                </div>
                {(form.attachment_name || form.attachment_url) && (
                  <div className="nl2-sent-attachment">
                    \uD83D\uDCCE {form.attachment_name || "添付ファイル"}
                    {form.attachment_url && (
                      <a href={form.attachment_url} target="_blank" rel="noopener noreferrer" className="text-link" style={{ marginLeft: 8 }}>
                        開く
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="nl2-sent-actions">
                <button className="btn btn-primary" onClick={handleResend}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 4 }}>
                    <path d="M1 7a6 6 0 1011.5-2.5M12.5 1v3.5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  再送信（内容をコピーして新規作成）
                </button>
              </div>
            </div>
          ) : (
            /* ── Edit form ── */
            <form className="nl2-form nl2-fade-in" onSubmit={handleSaveDraft}>
              {/* Template editing banner */}
              {isTemplate && (
                <div style={{
                  padding: "10px 16px", marginBottom: 16,
                  borderRadius: "var(--radius)", border: "1px solid #fde68a",
                  background: "#fffbeb",
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 13, fontWeight: 600, color: "#92400e",
                }}>
                  <span style={{ fontSize: 16 }}>{"\uD83D\uDCCB"}</span>
                  テンプレート編集中
                </div>
              )}

              {/* From-template banner */}
              {isFromTemplate && (
                <div style={{
                  padding: "10px 16px", marginBottom: 16,
                  borderRadius: "var(--radius)", border: "1px solid #a7f3d0",
                  background: "#ecfdf5",
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 13, fontWeight: 500, color: "#065f46",
                }}>
                  <span style={{ fontSize: 16 }}>{"\uD83D\uDCCB"}</span>
                  テンプレート「
                  <span style={{ fontWeight: 700 }}>{sourceTemplateName}</span>
                  」を元に新規作成
                </div>
              )}

              <div className="nl2-detail-header-bar">
                <h2>
                  {isTemplate
                    ? "テンプレート編集"
                    : isFromTemplate
                      ? "新規配信"
                      : editMode === "new"
                        ? "新規配信"
                        : "配信編集"
                  }
                </h2>
                {!isTemplate && form.status && (
                  <span className={`pill ${statusPill(form.status)}`}>{statusLabel(form.status)}</span>
                )}
              </div>

              {/* Subject */}
              <div className="nl2-field">
                <label className="nl2-field-label" htmlFor="nl-title">件名</label>
                <input
                  id="nl-title"
                  className="nl2-subject-input"
                  type="text"
                  placeholder="件名を入力してください"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Body */}
              <div className="nl2-field">
                <label className="nl2-field-label" htmlFor="nl-body">本文</label>
                <div className="nl2-body-wrap">
                  <textarea
                    id="nl-body"
                    ref={bodyRef}
                    className="nl2-body-textarea"
                    placeholder="本文を入力してください"
                    value={form.body}
                    onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                    rows={8}
                  />
                  <span className="nl2-char-count">{form.body.length}文字</span>
                </div>
              </div>

              {/* Channel toggles */}
              <div className="nl2-section">
                <span className="nl2-section-label">配信チャネル</span>
                <div className="nl2-channel-group">
                  <button
                    type="button"
                    className={`nl2-channel-btn${form.channel_email ? " active" : ""}`}
                    onClick={() => handleChannelToggle("channel_email")}
                  >
                    <span className="nl2-channel-icon">\uD83D\uDCE7</span>
                    メール
                  </button>
                  <div className="nl2-channel-btn-wrap">
                    <button
                      type="button"
                      className={`nl2-channel-btn${form.channel_line ? " active" : ""}`}
                      onClick={() => handleChannelToggle("channel_line")}
                    >
                      <span className="nl2-channel-icon">\uD83D\uDCAC</span>
                      LINE
                    </button>
                    {form.channel_line && (
                      <span className="nl2-tooltip">LINE連携は準備中です</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Audience segment pills */}
              <div className="nl2-section">
                <span className="nl2-section-label">配信対象</span>
                <div className="nl2-audience-pills">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`nl2-audience-pill${form.audience_type === opt.key ? " active" : ""}`}
                      onClick={() => handleAudiencePill(opt.key)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {form.audience_type === "member_type" && (
                  <div className="nl2-audience-sub">
                    {MEMBER_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`nl2-audience-pill sub${form.audience_detail === opt.key ? " active" : ""}`}
                        onClick={() => handleAudienceDetailPill(opt.key)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {previewCount !== null && (
                  <div className="nl2-audience-count">
                    対象: <AnimatedCount value={previewCount} />名
                  </div>
                )}
              </div>

              {/* Template toggle — only for new drafts or template edits */}
              {(editMode === "new" || isTemplate) && (
                <div className="nl2-section">
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 16px",
                    borderRadius: "var(--radius)",
                    border: form.is_template ? "1px solid #fde68a" : "1px solid var(--line)",
                    background: form.is_template ? "#fffbeb" : "#fff",
                    transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 16 }}>{"\uD83D\uDCCB"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", flex: 1 }}>
                      テンプレートとして保存
                    </span>
                    <button
                      type="button"
                      className={`doc-toggle${form.is_template ? " doc-toggle-on" : ""}`}
                      onClick={() => setForm(prev => ({ ...prev, is_template: !prev.is_template }))}
                      aria-label={form.is_template ? "テンプレートON" : "テンプレートOFF"}
                    >
                      <span className="doc-toggle-knob" />
                    </button>
                  </div>
                </div>
              )}

              {/* Schedule toggle — not for templates */}
              {!isTemplate && !form.is_template && (
                <div className="nl2-section">
                  <span className="nl2-section-label">送信タイミング</span>
                  <div className="nl2-schedule-toggle">
                    <button
                      type="button"
                      className={`nl2-sched-btn${!isScheduled ? " active" : ""}`}
                      onClick={() => setIsScheduled(false)}
                    >
                      即時送信
                    </button>
                    <button
                      type="button"
                      className={`nl2-sched-btn${isScheduled ? " active" : ""}`}
                      onClick={() => setIsScheduled(true)}
                    >
                      予約送信
                    </button>
                  </div>

                  {isScheduled && (
                    <div className="nl2-schedule-area nl2-slide-in">
                      <div className="nl2-schedule-date">
                        <DatePicker
                          value={schedDate}
                          onChange={setSchedDate}
                          placeholder="日付を選択"
                          minDate={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                      <TimePicker
                        hour={schedHour}
                        minute={schedMin}
                        onChange={(h, m) => { setSchedHour(h); setSchedMin(m); }}
                      />
                      {schedDate && (
                        <div className="nl2-schedule-card">
                          \uD83D\uDCC5 {formatScheduleDisplay(schedDate, `${pad2(schedHour)}:${pad2(schedMin)}`)} に送信予約
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Attachment — not for templates */}
              {!isTemplate && !form.is_template && (
                <div className="nl2-section">
                  <button
                    type="button"
                    className="nl2-attach-toggle"
                    onClick={() => setAttachOpen(!attachOpen)}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: "transform 0.2s", transform: attachOpen ? "rotate(90deg)" : "rotate(0)" }}>
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    \uD83D\uDCCE 添付ファイル
                    {(form.attachment_name || form.attachment_url) && (
                      <span className="nl2-attach-badge">1</span>
                    )}
                  </button>
                  {attachOpen && (
                    <div className="nl2-attach-area nl2-slide-in">
                      <div className="nl2-attach-drop">
                        <div className="nl2-attach-drop-icon">
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path d="M16 6v14M10 14l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M4 22v4a2 2 0 002 2h20a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <p>ファイルをドロップまたはURLを入力</p>
                        <div className="nl2-attach-fields">
                          <div className="nl2-field-sm">
                            <label className="nl2-field-label-sm">ファイル名</label>
                            <input
                              className="field-input"
                              type="text"
                              placeholder="例: 案内.pdf"
                              value={form.attachment_name}
                              onChange={(e) => setForm((prev) => ({ ...prev, attachment_name: e.target.value }))}
                            />
                          </div>
                          <div className="nl2-field-sm">
                            <label className="nl2-field-label-sm">URL</label>
                            <input
                              className="field-input"
                              type="url"
                              placeholder="https://..."
                              value={form.attachment_url}
                              onChange={(e) => setForm((prev) => ({ ...prev, attachment_url: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action bar (sticky bottom) */}
              <div className="nl2-action-bar">
                {isTemplate ? (
                  /* Template actions */
                  <>
                    <div className="nl2-action-left">
                      {form.id && (
                        <button
                          type="button"
                          style={{
                            padding: "6px 14px", borderRadius: "var(--radius)",
                            border: "1px solid #fecaca", background: "#fef2f2",
                            color: "#991b1b", fontSize: 13, fontWeight: 600,
                            cursor: "pointer",
                          }}
                          onClick={() => setConfirmDeleteTemplate(true)}
                          disabled={saving}
                        >
                          テンプレートを削除
                        </button>
                      )}
                    </div>
                    <div className="nl2-action-separator"></div>
                    <div className="nl2-action-right">
                      <button className="nl2-btn-draft" type="submit" disabled={saving}>
                        {saving ? <span className="nl2-spinner" /> : null}
                        テンプレートを更新
                      </button>
                    </div>
                  </>
                ) : (
                  /* Normal draft / newsletter actions */
                  <>
                    <div className="nl2-action-left">
                      <button
                        className="nl2-btn-draft"
                        type="submit"
                        disabled={saving}
                      >
                        {saving ? <span className="nl2-spinner" /> : null}
                        {form.is_template ? "テンプレートを保存" : "下書き保存"}
                      </button>
                    </div>
                    {!form.is_template && (
                      <>
                        <div className="nl2-action-separator"></div>
                        <div className="nl2-action-right">
                          <button
                            className="nl2-btn-preview"
                            type="button"
                            onClick={handlePreview}
                            disabled={saving}
                          >
                            プレビュー
                          </button>
                          {form.id && (
                            <button
                              className="nl2-btn-send"
                              type="button"
                              onClick={handleSendClick}
                              disabled={saving}
                            >
                              {saving ? <span className="nl2-spinner" /> : null}
                              {isScheduled && schedDate ? "予約する" : "送信"}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
