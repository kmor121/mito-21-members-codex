import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { apiRequest, base44, invalidateReadCache } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DatePicker from "../../components/ui/DatePicker";
import { Button, Modal } from '../../components/ui';
import RichTextEditor from "../../components/common/RichTextEditor";
import { useIsMobile } from '../../hooks/useIsMobile';

/* ── Inline SVG Icons ── */
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13L2 4" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

/* ── Helper Functions ── */
function statusLabel(s) {
  return { draft: "下書き", scheduled: "予約中", sent: "送信済", cancelled: "取消", failed: "失敗" }[s] || s || "-";
}

function statusColor(s) {
  return {
    draft: { bg: "#f1f5f9", text: "#64748b" },
    scheduled: { bg: "#fffbeb", text: "#92400e" },
    sent: { bg: "#ecfdf5", text: "#065f46" },
    failed: { bg: "#fef2f2", text: "#991b1b" },
  }[s] || { bg: "#f1f5f9", text: "#64748b" };
}

function channelLabel(c) {
  if (c === "line") return "LINE";
  if (c === "email+line") return "メール+LINE";
  return "メール";
}

function formatDateJa(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "-"; }
}

function formatScheduleDisplay(dateStr, hour, min) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${pad2(hour)}:${pad2(min)}`;
  } catch { return ""; }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const QUICK_TIMES = [
  { label: "9:00", h: 9, m: 0 },
  { label: "12:00", h: 12, m: 0 },
  { label: "15:00", h: 15, m: 0 },
  { label: "18:00", h: 18, m: 0 },
  { label: "21:00", h: 21, m: 0 },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const SEGMENTS = [
  { key: "all", label: "全員" },
  { key: "正会員", label: "正会員" },
  { key: "賛助会員", label: "賛助会員" },
  { key: "新入会員", label: "新入会員" },
  { key: "OB会員", label: "OB会員" },
  { key: "名誉顧問", label: "名誉顧問" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
  "image/gif",
];
const ALLOWED_EXTENSIONS = ".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png,.gif";

/* ── Animations ── */
const ANIMATIONS = `
@keyframes nlFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes nlSlide { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 600px; } }
`;

/* ── Member Search Modal ── */
function MemberSearchModal({ open, onClose, selectedMembers, onToggleMember }) {
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setLoading(true);
    base44.entities.Member.list().then((list) => {
      const active = list.filter((m) => m.approval_status === "承認済" && m.status === "活動中" && m.email);
      setMembers(active);
      setLoading(false);
    }).catch(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  if (!open) return null;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? members.filter((m) =>
        fullName(m).toLowerCase().includes(q) ||
        fullNameKana(m).toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q)
      )
    : members;

  const selectedIds = new Set(selectedMembers.map((m) => m.id));

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="会員を検索して選択"
      width="560px"
      footer={<div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "flex", alignItems: "center" }}>
          {selectedMembers.length}名 選択中
        </span>
        <Button variant="primary" onClick={onClose}>完了</Button>
      </div>}
    >
        <div style={{ padding: "0 0 12px", borderBottom: "1px solid var(--color-border)", marginBottom: 12 }}>
          <div style={{ position: "relative" }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="氏名・メールアドレスで検索..."
              style={{
                width: "100%", padding: "10px 14px 10px 36px", fontSize: 14,
                border: "1px solid var(--color-border)", borderRadius: "var(--radius)",
                boxSizing: "border-box",
              }}
            />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }}>
              <SearchIcon />
            </span>
          </div>
        </div>
        <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}><LoadingSpinner /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>
              {q ? "該当する会員が見つかりません" : "会員データがありません"}
            </div>
          ) : (
            filtered.map((m) => {
              const checked = selectedIds.has(m.id);
              return (
                <label
                  key={m.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
                    cursor: "pointer", borderBottom: "1px solid var(--color-border)",
                    background: checked ? "#eef2ff" : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleMember(m)}
                    style={{ width: 16, height: 16, accentColor: "#4f46e5", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{fullName(m)}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{m.email}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
                    {m.member_type || ""}
                  </div>
                </label>
              );
            })
          )}
        </div>
    </Modal>
  );
}

/* ── Main Component ── */
export default function NewsletterEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const fromTemplateId = searchParams.get("from");
  const pathIsTemplate = window.location.pathname.includes("/template/");
  const textareaRef = useRef(null);

  // Determine edit mode
  let editMode = "new";
  if (id && pathIsTemplate) editMode = "template-edit";
  else if (id) editMode = "edit";
  else if (fromTemplateId) editMode = "new-from-template";

  const isTemplate = editMode === "template-edit";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    id: "", title: "", body: "", body_html: "", channel: "email",
    audience_type: "all", audience_filter_json: "", audience_detail: "",
    scheduled_at: "", status: "", sent_at: "", sent_count: 0, is_template: false,
    linked_event_id: "", is_reminder: false,
    total_recipients: 0, failed_count: 0, failed_recipients_json: "",
  });
  const [editorMode, setEditorMode] = useState("text");
  const [isScheduled, setIsScheduled] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedHour, setSchedHour] = useState(15);
  const [schedMin, setSchedMin] = useState(0);
  const [previewCount, setPreviewCount] = useState(null);
  const [toast, setToast] = useState(null);
  const [errorDialog, setErrorDialog] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showTestSend, setShowTestSend] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState(false);
  const [fromTemplateName, setFromTemplateName] = useState("");

  // Audience state
  const [selectedSegment, setSelectedSegment] = useState("all");
  const [compoundOpen, setCompoundOpen] = useState(false);
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [graduateOnly, setGraduateOnly] = useState(false);
  const [filterOrgId, setFilterOrgId] = useState("");
  const [individualMode, setIndividualMode] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);

  // Event linking state
  const [publishedEvents, setPublishedEvents] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  // Attachment state
  const [attachments, setAttachments] = useState([]); // { filename, content (base64), size }
  const [attachLinks, setAttachLinks] = useState([]); // [{ url, name }]
  const fileInputRef = useRef(null);
  const [fileDragging, setFileDragging] = useState(false);
  const fileDragCounter = useRef(0);

  /* ── Toast Auto-Dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ── Load orgs for compound filter ── */
  useEffect(() => {
    base44.entities.Organization.list().then((list) => {
      setOrganizations(list || []);
    }).catch(() => {});
    // Load published events for linking
    base44.entities.Event.filter({ status: 'published' }).then((list) => {
      setPublishedEvents(list || []);
    }).catch(() => {});
  }, []);

  /* ── Build audience filter JSON from UI state ── */
  const buildAudienceFilter = useCallback(() => {
    if (individualMode) {
      return {
        type: "individual",
        json: JSON.stringify({ member_ids: selectedMembers.map((m) => m.id) }),
      };
    }
    const filter = { segment: selectedSegment };
    if (unpaidOnly) filter.unpaid_only = true;
    if (graduateOnly) filter.is_graduate = true;
    if (filterOrgId) filter.organization_id = filterOrgId;
    return {
      type: selectedSegment === "all" ? "all" : "member_type",
      json: JSON.stringify(filter),
    };
  }, [selectedSegment, unpaidOnly, graduateOnly, filterOrgId, individualMode, selectedMembers]);

  /* ── Load Data ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (id) {
        const data = await base44.entities.Newsletter.get(id);
        if (data) {
          setForm({
            id: data.id || "",
            title: data.title || "",
            body: data.body || "",
            body_html: data.body_html || "",
            channel: data.channel || "email",
            audience_type: data.audience_type || "all",
            audience_filter_json: data.audience_filter_json || "",
            audience_detail: data.audience_detail || "",
            scheduled_at: data.scheduled_at || "",
            status: data.status || "draft",
            sent_at: data.sent_at || "",
            sent_count: data.sent_count || 0,
            is_template: data.is_template || false,
            linked_event_id: data.linked_event_id || "",
            is_reminder: data.is_reminder || false,
            total_recipients: data.total_recipients || 0,
            failed_count: data.failed_count || 0,
            failed_recipients_json: data.failed_recipients_json || "",
          });
          if (data.body_html) setEditorMode("rich");
          if (data.scheduled_at) {
            setIsScheduled(true);
            try {
              const sd = new Date(data.scheduled_at);
              setSchedDate(`${sd.getFullYear()}-${pad2(sd.getMonth() + 1)}-${pad2(sd.getDate())}`);
              setSchedHour(sd.getHours());
              setSchedMin(sd.getMinutes());
            } catch { /* ignore */ }
          }
          // Restore audience UI state from filter JSON
          if (data.audience_type === "individual") {
            setIndividualMode(true);
            try {
              const fj = JSON.parse(data.audience_filter_json || "{}");
              if (Array.isArray(fj.member_ids) && fj.member_ids.length > 0) {
                // Load member details for chips
                const allMembers = await base44.entities.Member.list();
                const idSet = new Set(fj.member_ids);
                setSelectedMembers(allMembers.filter((m) => idSet.has(m.id)));
              }
            } catch { /* ignore */ }
          } else {
            try {
              const fj = JSON.parse(data.audience_filter_json || "{}");
              if (fj.segment) setSelectedSegment(fj.segment);
              else if (fj.member_type) setSelectedSegment(fj.member_type);
              if (fj.unpaid_only) { setUnpaidOnly(true); setCompoundOpen(true); }
              if (fj.is_graduate) { setGraduateOnly(true); setCompoundOpen(true); }
              if (fj.organization_id) { setFilterOrgId(fj.organization_id); setCompoundOpen(true); }
            } catch { /* ignore */ }
          }
          // Restore attachments (Base64 persisted for files ≤ 2MB)
          try {
            const aj = JSON.parse(data.attachments_json || "[]");
            if (Array.isArray(aj) && aj.length > 0) {
              const urlItems = aj.filter((a) => a.url);
              const fileItems = aj.filter((a) => !a.url);
              if (urlItems.length > 0) {
                setAttachLinks(urlItems.map((a) => ({ url: a.url || "", name: a.name || "" })));
              }
              if (fileItems.length > 0) {
                setAttachments(fileItems.map((a) => ({
                  filename: a.filename || a.name || "",
                  content: a.content || "",
                  size: a.size || 0,
                  type: a.type || "",
                  needsReselect: !a.content,
                })));
              }
            }
          } catch { /* ignore */ }
        }
      } else if (fromTemplateId) {
        const tpl = await base44.entities.Newsletter.get(fromTemplateId);
        if (tpl) {
          setFromTemplateName(tpl.title || "テンプレート");
          setForm({
            id: "", title: tpl.title || "", body: tpl.body || "", body_html: tpl.body_html || "",
            channel: tpl.channel || "email", audience_type: tpl.audience_type || "all",
            audience_filter_json: tpl.audience_filter_json || "", audience_detail: tpl.audience_detail || "",
            scheduled_at: "", status: "", sent_at: "", sent_count: 0, is_template: false,
          });
          if (tpl.body_html) setEditorMode("rich");
        }
      }
    } catch (err) {
      console.error("NewsletterEdit load error:", err);
      setErrorDialog("データの読み込みに失敗しました: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  }, [id, fromTemplateId]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    if (editorMode === "text" && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = Math.max(400, el.scrollHeight) + "px";
    }
  }, [form.body, editorMode]);

  /* ── Fetch audience count ── */
  const fetchAudienceCount = useCallback(async () => {
    const af = buildAudienceFilter();
    try {
      const result = await apiRequest("preview-newsletter-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience_type: af.type,
          audience_filter_json: af.json,
        }),
      });
      setPreviewCount(result.count ?? null);
    } catch {
      setPreviewCount(null);
    }
  }, [buildAudienceFilter]);

  useEffect(() => { fetchAudienceCount(); }, [fetchAudienceCount]);

  /* ── Update form helper ── */
  const updateForm = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* ── Build schedule ISO string ── */
  const buildScheduleAt = useCallback(() => {
    if (!isScheduled || !schedDate) return "";
    return `${schedDate}T${pad2(schedHour)}:${pad2(schedMin)}:00`;
  }, [isScheduled, schedDate, schedHour, schedMin]);

  /* ── Build attachments JSON (for draft save — include Base64 for files ≤ 2MB) ── */
  const PERSIST_THRESHOLD = 2 * 1024 * 1024; // 2MB
  const buildAttachmentsMetaJson = useCallback(() => {
    const items = [];
    attachments.forEach((a) => {
      const entry = { filename: a.filename, size: a.size, type: a.type || "" };
      if (a.content && a.size <= PERSIST_THRESHOLD) entry.content = a.content;
      items.push(entry);
    });
    attachLinks.forEach((l) => {
      if (l.url) items.push({ name: l.name || "添付", url: l.url });
    });
    return JSON.stringify(items);
  }, [attachments, attachLinks]);

  /* ── Build attachments JSON (with Base64 content, for send) ── */
  const buildAttachmentsJson = useCallback(() => {
    const items = [];
    attachments.forEach((a) => {
      items.push({ filename: a.filename, content: a.content, size: a.size });
    });
    attachLinks.forEach((l) => {
      if (l.url) items.push({ name: l.name || "添付", url: l.url });
    });
    return JSON.stringify(items);
  }, [attachments, attachLinks]);

  /* ── Build attachments JSON (meta only, no Base64 — fallback for large payloads) ── */
  const buildAttachmentsMetaOnlyJson = useCallback(() => {
    const items = [];
    attachments.forEach((a) => {
      items.push({ filename: a.filename, size: a.size, type: a.type || "" });
    });
    attachLinks.forEach((l) => {
      if (l.url) items.push({ name: l.name || "添付", url: l.url });
    });
    return JSON.stringify(items);
  }, [attachments, attachLinks]);

  /* ── Save Draft (SDK direct — no backend function needed) ── */
  /* Returns true on success, false on failure */
  const handleSaveDraft = useCallback(async (opts = {}) => {
    if (!form.title.trim()) {
      setErrorDialog("件名を入力してください");
      return false;
    }
    setSaving(true);
    try {
      const af = buildAudienceFilter();
      const payload = {
        title: form.title,
        body: form.body || (editorMode === "rich" && form.body_html ? "(リッチテキスト)" : ""),
        body_html: editorMode === "rich" ? (form.body_html || "") : "",
        channel: form.channel,
        status: opts.status || form.status || "draft",
        audience_type: af.type,
        audience_filter_json: af.json,
        scheduled_at: buildScheduleAt() || "",
        attachments_json: buildAttachmentsMetaJson(),
        is_template: form.is_template || isTemplate || false,
        linked_event_id: form.linked_event_id || "",
        is_reminder: form.is_reminder || false,
      };

      let result;
      try {
        if (form.id) {
          result = await base44.entities.Newsletter.update(form.id, payload);
        } else {
          result = await base44.entities.Newsletter.create(payload);
        }
      } catch (saveErr) {
        // Fallback: if save fails (likely Base64 too large), retry with meta only
        console.warn("Save with Base64 failed, retrying meta-only:", saveErr);
        payload.attachments_json = buildAttachmentsMetaOnlyJson();
        if (form.id) {
          result = await base44.entities.Newsletter.update(form.id, payload);
        } else {
          result = await base44.entities.Newsletter.create(payload);
        }
      }
      invalidateReadCache("Newsletter");

      if (!form.id && result.id) {
        updateForm("id", result.id);
        updateForm("status", result.status || "draft");
        if (isTemplate) {
          navigate(`/admin/newsletters/template/${result.id}/edit`, { replace: true });
        } else {
          navigate(`/admin/newsletters/${result.id}/edit`, { replace: true });
        }
      } else {
        if (result.status) updateForm("status", result.status);
      }

      if (!opts.silent) {
        setToast({ type: "success", message: isTemplate ? "テンプレートを保存しました" : "下書きを保存しました" });
      }
      return true;
    } catch (err) {
      console.error("Save error:", err);
      setErrorDialog("保存に失敗しました: " + (err.message || ""));
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, editorMode, isTemplate, buildScheduleAt, buildAudienceFilter, buildAttachmentsMetaJson, buildAttachmentsMetaOnlyJson, navigate, updateForm]);

  /* ── Build audience description for confirm modal ── */
  const buildAudienceDescription = useCallback(() => {
    if (individualMode) {
      const names = selectedMembers.map((m) => fullName(m) || "");
      const count = selectedMembers.length;
      if (count <= 4) {
        return `個人指定（${count}名）: ${names.join("、")}`;
      }
      return `個人指定（${count}名）: ${names.slice(0, 4).join("、")}、他${count - 4}名`;
    }
    const segLabel = selectedSegment === "all" ? "全員" : selectedSegment;
    const conditions = [];
    if (unpaidOnly) conditions.push("会費未納者");
    if (graduateOnly) conditions.push("卒業生");
    if (filterOrgId) {
      const org = organizations.find((o) => o.id === filterOrgId);
      conditions.push(org ? org.org_name : "特定組織");
    }
    if (conditions.length > 0) {
      return `${segLabel} + ${conditions.join(" + ")}`;
    }
    return segLabel;
  }, [individualMode, selectedMembers, selectedSegment, unpaidOnly, graduateOnly, filterOrgId, organizations]);

  /* ── Get body preview text (first 100 chars) ── */
  const getBodyPreview = useCallback(() => {
    if (editorMode === "rich" && form.body_html) {
      // Strip HTML tags
      const tmp = document.createElement("div");
      tmp.innerHTML = form.body_html;
      const text = (tmp.textContent || tmp.innerText || "").trim();
      return text.length > 100 ? text.slice(0, 100) + "..." : text;
    }
    const text = (form.body || "").trim();
    return text.length > 100 ? text.slice(0, 100) + "..." : text;
  }, [editorMode, form.body, form.body_html]);

  /* ── Preview ── */
  const handlePreview = useCallback(async () => {
    const af = buildAudienceFilter();
    try {
      const result = await apiRequest("preview-newsletter-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience_type: af.type,
          audience_filter_json: af.json,
        }),
      });
      setPreviewCount(result.count ?? 0);
      setShowPreview(true);
    } catch (err) {
      setErrorDialog("プレビューの取得に失敗しました: " + (err.message || ""));
    }
  }, [buildAudienceFilter]);

  /* ── Send ── */
  const handleSendClick = useCallback(async () => {
    if (!form.title.trim()) {
      setErrorDialog("件名を入力してください");
      return;
    }
    if (attachments.some((a) => a.needsReselect)) {
      setErrorDialog("添付ファイルを再選択してください（2MBを超えるファイルは下書きに保持されません）。");
      return;
    }
    // Auto-save if not yet persisted
    if (!form.id) {
      const ok = await handleSaveDraft({ silent: true });
      if (!ok) return;
    }
    setConfirmSend(true);
  }, [form.id, form.title, attachments, handleSaveDraft]);

  const executeSend = useCallback(async () => {
    setSending(true);
    try {
      // Save draft first (meta only, no Base64)
      const af = buildAudienceFilter();
      const draftPayload = {
        title: form.title,
        body: form.body || (editorMode === "rich" && form.body_html ? "(リッチテキスト)" : ""),
        body_html: editorMode === "rich" ? (form.body_html || "") : "",
        channel: form.channel,
        audience_type: af.type,
        audience_filter_json: af.json,
        scheduled_at: buildScheduleAt() || "",
        attachments_json: buildAttachmentsMetaJson(),
        is_template: false,
      };
      if (form.id) {
        await base44.entities.Newsletter.update(form.id, draftPayload);
      }

      // Send with full Base64 attachments
      const sendResult = await apiRequest("send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newsletter_id: form.id,
          attachments_json: buildAttachmentsJson(),
        }),
      });
      invalidateReadCache("Newsletter");
      setSendComplete(true);
      if (sendResult?.fail_count > 0) {
        setToast({ type: "error", message: `${sendResult.total_recipients}件中${sendResult.fail_count}件の送信に失敗しました。配信履歴をご確認ください。` });
      }
      setTimeout(() => { navigate("/admin/newsletters"); }, 2500);
    } catch (err) {
      console.error("Send error:", err);
      setConfirmSend(false);
      setSending(false);
      setErrorDialog("送信に失敗しました: " + (err.message || ""));
    }
  }, [form, editorMode, buildScheduleAt, buildAudienceFilter, buildAttachmentsMetaJson, buildAttachmentsJson, navigate]);

  /* ── Test Send ── */
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  const handleTestSend = useCallback(async () => {
    if (!testEmail.trim()) return;
    if (attachments.some((a) => a.needsReselect)) {
      setErrorDialog("添付ファイルを再選択してください（2MBを超えるファイルは下書きに保持されません）。");
      return;
    }
    // Auto-save if not yet persisted
    if (!form.id) {
      const ok = await handleSaveDraft({ silent: true });
      if (!ok) return;
    }
    setTestSending(true);
    try {
      // Save draft first (meta only, no Base64)
      const af = buildAudienceFilter();
      const draftPayload = {
        title: form.title,
        body: form.body || (editorMode === "rich" && form.body_html ? "(リッチテキスト)" : ""),
        body_html: editorMode === "rich" ? (form.body_html || "") : "",
        channel: form.channel,
        audience_type: af.type,
        audience_filter_json: af.json,
        attachments_json: buildAttachmentsMetaJson(),
        is_template: form.is_template || isTemplate || false,
        linked_event_id: form.linked_event_id || "",
        is_reminder: form.is_reminder || false,
      };
      if (form.id) {
        await base44.entities.Newsletter.update(form.id, draftPayload);
      }

      // Send test with full Base64 attachments
      await apiRequest("send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newsletter_id: form.id,
          test_email: testEmail.trim(),
          attachments_json: buildAttachmentsJson(),
        }),
      });
      setToast({ type: "success", message: "テスト送信しました" });
      setShowTestSend(false);
      setTestEmail("");
    } catch (err) {
      setErrorDialog("テスト送信に失敗しました: " + (err.message || ""));
    } finally {
      setTestSending(false);
    }
  }, [testEmail, form, editorMode, isTemplate, attachments, handleSaveDraft, buildAudienceFilter, buildAttachmentsMetaJson, buildAttachmentsJson]);

  /* ── Delete handler ── */
  const handleDelete = useCallback(async () => {
    if (!form.id) return;
    setDeleting(true);
    try {
      await base44.entities.Newsletter.delete(form.id);
      invalidateReadCache();
      setShowDeleteConfirm(false);
      navigate("/admin/newsletters");
      if (window.__showToast) window.__showToast("削除しました", "success");
    } catch (err) {
      console.error("Delete error:", err);
      setToast({ type: "error", message: "削除に失敗しました" });
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }, [form.id, navigate]);

  /* ── Member toggle for individual selection ── */
  const handleToggleMember = useCallback((member) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.id === member.id);
      if (exists) return prev.filter((m) => m.id !== member.id);
      return [...prev, member];
    });
  }, []);

  /* ── File attachment handlers ── */
  const processFiles = useCallback((files) => {
    const remaining = MAX_FILES - attachments.length;
    if (remaining <= 0) {
      setErrorDialog(`添付ファイルは最大${MAX_FILES}件までです`);
      return;
    }
    const toProcess = Array.from(files).slice(0, remaining);
    for (const file of toProcess) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setErrorDialog(`「${file.name}」は対応していないファイル形式です`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setErrorDialog(`「${file.name}」はファイルサイズ上限(10MB)を超えています`);
        continue;
      }
      const fileType = file.type;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1]; // Remove data:...;base64, prefix
        setAttachments((prev) => {
          if (prev.length >= MAX_FILES) return prev;
          return [...prev, { filename: file.name, content: base64, size: file.size, type: fileType, needsReselect: false }];
        });
      };
      reader.readAsDataURL(file);
    }
  }, [attachments.length]);

  const handleFileSelect = useCallback((e) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  }, [processFiles]);

  const removeAttachment = useCallback((idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  /* ── Sent State ── */
  const isSent = form.status === "sent";

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <LoadingSpinner />
      </div>
    );
  }

  /* ── Sent Read-Only View ── */
  if (isSent) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <style>{ANIMATIONS}</style>
        <div style={{
          position: "sticky", top: 0, zIndex: 20, background: "#fff",
          borderBottom: "1px solid var(--color-border)", padding: isMobile ? "12px 12px" : "12px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap",
        }}>
          <Link to="/admin/newsletters" style={{ fontSize: 13, color: "var(--color-accent)", textDecoration: "none" }}>
            &larr; 配信一覧に戻る
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(() => {
              const sc = statusColor(form.status);
              return (
                <span style={{
                  display: "inline-block", padding: "3px 10px", borderRadius: 99,
                  fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.text,
                }}>
                  {statusLabel(form.status)}
                </span>
              );
            })()}
          </div>
          <button
            className="button"
            style={{ background: "var(--color-accent)", color: "#fff", fontSize: 13 }}
            onClick={() => navigate(`/admin/newsletters/new?from=${form.id}`)}
          >
            この内容で新規作成
          </button>
        </div>

        <div className="nl-edit-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", minHeight: "calc(100vh - 120px)" }}>
          <div style={{ padding: isMobile ? 12 : 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 24px 0", color: "var(--color-text-primary)" }}>
              {form.title}
            </h2>
            <div style={{ lineHeight: 1.8, color: "var(--color-text-primary)" }}>
              {form.body_html ? (
                <div dangerouslySetInnerHTML={{ __html: form.body_html }} />
              ) : (
                (form.body || "").split("\n").map((line, i) => (
                  <p key={i} style={{ margin: "0 0 8px 0" }}>{line || "\u00A0"}</p>
                ))
              )}
            </div>
          </div>
          <div className="nl-edit-sidebar" style={{ background: "#f8f9fa", padding: 24, borderLeft: "1px solid var(--color-border)" }}>
            <div style={{ background: "#fff", borderRadius: "var(--radius)", padding: 20, border: "1px solid var(--color-border)" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 4 }}>送信日時</div>
                <div style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{formatDateJa(form.sent_at)}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 4 }}>チャネル</div>
                <div style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{channelLabel(form.channel)}</div>
              </div>
              <div style={{ marginBottom: form.total_recipients ? 16 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 4 }}>対象人数</div>
                <div style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{form.sent_count}名</div>
              </div>
              {form.total_recipients > 0 && (
                <div style={{ marginBottom: form.failed_count > 0 ? 16 : 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 4 }}>送信結果</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>成功 {form.sent_count}</span>
                    {form.failed_count > 0 && <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>失敗 {form.failed_count}</span>}
                  </div>
                </div>
              )}
              {form.failed_count > 0 && (() => {
                let failedList = [];
                try { failedList = JSON.parse(form.failed_recipients_json || '[]'); } catch { /* ignore */ }
                if (failedList.length === 0) return null;
                return (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 8 }}>送信失敗</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {failedList.map((f, i) => (
                        <div key={i} style={{ padding: '10px 12px', background: '#fef2f2', borderRadius: 'var(--radius)', border: '1px solid #fecaca' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 2 }}>{f.member_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4, wordBreak: 'break-all' }}>{f.email}</div>
                          <div style={{ fontSize: 11, color: '#dc2626', wordBreak: 'break-all' }}>{f.error}</div>
                          {f.member_id && (
                            <a href={`/admin/members/${f.member_id}`} style={{ fontSize: 11, color: 'var(--color-accent)', marginTop: 4, display: 'inline-block' }}>会員詳細を表示 →</a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) {
            .nl-edit-grid { grid-template-columns: 1fr !important; }
            .nl-edit-sidebar { border-left: none !important; border-top: 1px solid var(--color-border) !important; }
          }
        `}</style>
      </div>
    );
  }

  /* ── Editable View ── */
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <style>{ANIMATIONS}</style>

      {/* ── Toast ── */}
      {toast && (
        <div className={`nl2-toast${toast.type === "error" ? " nl2-toast-error" : ""}`}>
          <span className="nl2-toast-icon">{toast.type === "error" ? "\u2717" : "\u2713"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "nlFade 0.2s ease",
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)" }} />
          <div
            style={{
              position: "relative", zIndex: 1, width: "100%", maxWidth: 420,
              background: "#fff", borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "28px 28px 0" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>
                {isTemplate ? "このテンプレート" : "この下書き"}を削除しますか？
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: "#dc2626", fontWeight: 500 }}>
                削除すると元に戻せません。
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "20px 28px 24px" }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "9px 20px", borderRadius: 8,
                  border: "1px solid var(--line, #e2e8f0)",
                  background: "#fff", color: "var(--text, #1e293b)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "#dc2626", color: "#fff",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Header Bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20, background: "#fff",
        borderBottom: "1px solid var(--color-border)", padding: isMobile ? "12px 12px" : "12px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap",
      }}>
        <Link to="/admin/newsletters" style={{ fontSize: 13, color: "var(--color-accent)", textDecoration: "none", whiteSpace: "nowrap" }}>
          &larr; 配信一覧に戻る
        </Link>

        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {form.id && !isTemplate && form.status && (() => {
            const sc = statusColor(form.status);
            return (
              <span style={{
                display: "inline-block", padding: "3px 10px", borderRadius: 99,
                fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.text,
              }}>
                {statusLabel(form.status)}
              </span>
            );
          })()}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 8, flexWrap: "wrap" }}>
          {!isTemplate && (
            <button
              className="button ghost"
              style={{ fontSize: isMobile ? 11 : 13, padding: isMobile ? "4px 8px" : "6px 14px", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}
              onClick={() => handleSaveDraft()}
              disabled={saving}
            >
              {saving ? "保存中..." : isMobile ? "保存" : "下書き保存"}
            </button>
          )}

          {!isTemplate && (
            <button
              className="button ghost"
              style={{ fontSize: isMobile ? 11 : 13, padding: isMobile ? "4px 8px" : "6px 14px", border: "1px solid #10b981", color: "#10b981", whiteSpace: "nowrap" }}
              onClick={async () => {
                if (!form.title.trim()) { setErrorDialog("件名を入力してください"); return; }
                if (!form.id) {
                  const ok = await handleSaveDraft({ silent: true });
                  if (!ok) return;
                }
                setShowTestSend(true);
              }}
            >
              テスト
            </button>
          )}

          {!isTemplate && (
            <button
              className="button ghost"
              style={{ fontSize: isMobile ? 11 : 13, padding: isMobile ? "4px 8px" : "6px 14px", border: "1px solid #6366f1", color: "#6366f1", whiteSpace: "nowrap" }}
              onClick={handlePreview}
            >
              {isMobile ? "PV" : "プレビュー"}
            </button>
          )}

          {!isTemplate && (() => {
            const scheduled = isScheduled && schedDate;
            return (
              <button
                className="button"
                style={{
                  fontSize: isMobile ? 12 : 14, padding: isMobile ? "6px 12px" : "8px 22px",
                  background: scheduled ? "#f59e0b" : "#4f46e5",
                  color: "#fff", border: "none", borderRadius: "var(--radius)",
                  display: "flex", alignItems: "center", gap: 6, fontWeight: 600, whiteSpace: "nowrap",
                }}
                onClick={handleSendClick}
              >
                <SendIcon />
                {scheduled ? "予約する" : "送信"}
              </button>
            );
          })()}

          {isTemplate && (
            <button
              className="button"
              style={{
                fontSize: 14, padding: "8px 20px",
                background: "#4f46e5", color: "#fff", border: "none", borderRadius: "var(--radius)",
                fontWeight: 600,
              }}
              onClick={() => handleSaveDraft()}
              disabled={saving}
            >
              {saving ? "保存中..." : (form.id ? "テンプレートを更新" : "テンプレートを保存")}
            </button>
          )}

          {/* Delete button - only for existing drafts/templates */}
          {form.id && (isTemplate || form.status === "draft" || form.status === "cancelled" || form.status === "failed") && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title={isTemplate ? "テンプレートを削除" : "下書きを削除"}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 34, height: 34, borderRadius: 8,
                border: "1px solid #fecaca", background: "transparent", color: "#94a3b8",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#fca5a5"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#fecaca"; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content: 2-column ── */}
      <div className="nl-edit-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", minHeight: "calc(100vh - 120px)" }}>
        {/* ── Left Column: Content Editor ── */}
        <div style={{ padding: isMobile ? 12 : 32 }}>
          {isTemplate && (
            <div style={{
              background: "#fffbeb", border: "1px solid #fbbf24", borderRadius: "var(--radius)",
              padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
              fontSize: 14, color: "#92400e",
            }}>
              <FileIcon />
              <span style={{ fontWeight: 600 }}>{form.id ? "テンプレート編集中" : "テンプレート新規作成"}</span>
            </div>
          )}

          {fromTemplateId && fromTemplateName && !isTemplate && (
            <div style={{
              background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: "var(--radius)",
              padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
              fontSize: 14, color: "#065f46",
            }}>
              <FileIcon />
              <span>テンプレート「<strong>{fromTemplateName}</strong>」から作成</span>
            </div>
          )}

          {/* Subject input */}
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateForm("title", e.target.value)}
            placeholder="件名を入力..."
            style={{
              width: "100%", border: "none", borderBottom: "2px solid var(--color-border)",
              fontSize: 24, fontWeight: 700, padding: 16, outline: "none",
              background: "transparent", color: "var(--color-text-primary)", boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => { e.target.style.borderBottomColor = "#4f46e5"; }}
            onBlur={(e) => { e.target.style.borderBottomColor = "var(--color-border)"; }}
          />

          {/* Editor mode toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "20px 0 16px 0" }}>
            <button
              type="button"
              style={{
                padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: "1px solid var(--color-border)", borderRight: "none",
                borderRadius: "var(--radius) 0 0 var(--radius)",
                background: editorMode === "text" ? "var(--color-accent)" : "#fff",
                color: editorMode === "text" ? "#fff" : "var(--color-text-secondary)",
              }}
              onClick={() => setEditorMode("text")}
            >
              テキスト
            </button>
            <button
              type="button"
              style={{
                padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: "1px solid var(--color-border)",
                borderRadius: "0 var(--radius) var(--radius) 0",
                background: editorMode === "rich" ? "var(--color-accent)" : "#fff",
                color: editorMode === "rich" ? "#fff" : "var(--color-text-secondary)",
              }}
              onClick={() => setEditorMode("rich")}
            >
              リッチエディタ
            </button>
          </div>

          {/* Text mode */}
          {editorMode === "text" && (
            <div style={{ position: "relative" }}>
              <textarea
                ref={textareaRef}
                value={form.body}
                onChange={(e) => updateForm("body", e.target.value)}
                placeholder="本文を入力してください"
                style={{
                  width: "100%", minHeight: 400, resize: "none",
                  border: "1px solid var(--color-border)", borderRadius: "var(--radius)",
                  padding: 16, fontSize: 14, lineHeight: 1.8, outline: "none",
                  fontFamily: "inherit", color: "var(--color-text-primary)", boxSizing: "border-box",
                  background: "#fff",
                }}
              />
              <div style={{
                position: "absolute", bottom: 8, right: 12,
                fontSize: 12, color: "var(--color-text-secondary)",
              }}>
                {form.body.length}文字
              </div>
            </div>
          )}

          {/* Rich mode */}
          {editorMode === "rich" && (
            <div style={{ minHeight: 500, border: "1px solid var(--color-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
              <RichTextEditor
                content={form.body_html}
                onChange={(html) => updateForm("body_html", html)}
                placeholder="本文を入力してください（リッチテキスト）"
              />
            </div>
          )}
        </div>

        {/* ── Right Column: Settings Panel ── */}
        <div className="nl-edit-sidebar" style={{
          background: "#f8f9fa", padding: 24, borderLeft: "1px solid var(--color-border)",
        }}>
          {/* チャネル section */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 10 }}>
              チャネル
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                type="button"
                onClick={() => updateForm("channel", "email")}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: "var(--radius)", cursor: "pointer",
                  border: form.channel === "email" ? "none" : "1px solid var(--color-border)",
                  borderLeft: form.channel === "email" ? "3px solid #4f46e5" : "1px solid var(--color-border)",
                  background: form.channel === "email" ? "#eef2ff" : "#fff",
                  color: form.channel === "email" ? "#4f46e5" : "var(--color-text-primary)",
                  fontSize: 14, fontWeight: form.channel === "email" ? 600 : 400,
                  textAlign: "left",
                }}
              >
                <MailIcon /> メール
              </button>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)", background: "#f9fafb",
                color: "var(--color-text-tertiary)", fontSize: 14, cursor: "not-allowed",
              }}>
                <span>LINE</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, background: "var(--color-border)",
                  color: "var(--color-text-secondary)", padding: "2px 6px", borderRadius: 99,
                }}>
                  準備中
                </span>
              </div>
            </div>
          </div>

          {/* 対象 section */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 10 }}>
              対象
            </div>

            {/* Individual mode toggle */}
            {individualMode ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-accent)" }}>個人指定モード</span>
                  <button
                    type="button"
                    onClick={() => { setIndividualMode(false); setSelectedMembers([]); }}
                    style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  >
                    セグメントに戻す
                  </button>
                </div>

                {/* Selected members chips */}
                {selectedMembers.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {selectedMembers.map((m) => (
                      <span
                        key={m.id}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "3px 8px", borderRadius: 99, fontSize: 12,
                          background: "#eef2ff", color: "#4f46e5", fontWeight: 500,
                        }}
                      >
                        {fullName(m)}
                        <button
                          type="button"
                          onClick={() => handleToggleMember(m)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#4f46e5", display: "flex" }}
                        >
                          <XIcon />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMemberSearchOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, width: "100%",
                    padding: "10px 14px", borderRadius: "var(--radius)",
                    border: "1px dashed var(--color-accent)", background: "#fff",
                    cursor: "pointer", fontSize: 13, color: "var(--color-accent)", fontWeight: 600,
                    justifyContent: "center",
                  }}
                >
                  <PlusIcon /> 会員を追加
                </button>
              </div>
            ) : (
              <>
                {/* Segment pills */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SEGMENTS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className="nl2-pill-tab"
                      onClick={() => setSelectedSegment(opt.key)}
                      style={{
                        padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 600,
                        cursor: "pointer", border: "1px solid",
                        borderColor: selectedSegment === opt.key ? "#4f46e5" : "var(--color-border)",
                        background: selectedSegment === opt.key ? "#eef2ff" : "#fff",
                        color: selectedSegment === opt.key ? "#4f46e5" : "var(--color-text-secondary)",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Compound conditions */}
                {!compoundOpen ? (
                  <button
                    type="button"
                    onClick={() => setCompoundOpen(true)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4, marginTop: 10,
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--color-accent)", fontSize: 13, padding: 0, fontWeight: 600,
                    }}
                  >
                    <PlusIcon /> 条件を追加
                  </button>
                ) : (
                  <div style={{
                    marginTop: 10, padding: 12, background: "#fff", borderRadius: "var(--radius)",
                    border: "1px solid var(--color-border)", animation: "nlSlide 0.3s ease",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                      追加条件 (AND)
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={unpaidOnly} onChange={(e) => setUnpaidOnly(e.target.checked)}
                        style={{ width: 15, height: 15, accentColor: "#4f46e5" }} />
                      会費未納者のみ
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={graduateOnly} onChange={(e) => setGraduateOnly(e.target.checked)}
                        style={{ width: 15, height: 15, accentColor: "#4f46e5" }} />
                      卒業生のみ
                    </label>
                    <div style={{ marginBottom: 4 }}>
                      <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 4, cursor: "pointer" }}>
                        <input type="checkbox" checked={!!filterOrgId}
                          onChange={(e) => { if (!e.target.checked) setFilterOrgId(""); }}
                          style={{ width: 15, height: 15, accentColor: "#4f46e5" }} />
                        特定の組織・委員会
                      </label>
                      {filterOrgId !== "" && (
                        <select
                          value={filterOrgId}
                          onChange={(e) => setFilterOrgId(e.target.value)}
                          style={{
                            width: "100%", padding: "6px 8px", fontSize: 12,
                            border: "1px solid var(--color-border)", borderRadius: "var(--radius)",
                            marginLeft: 23,
                          }}
                        >
                          <option value="">組織を選択...</option>
                          {organizations.map((org) => (
                            <option key={org.id} value={org.id}>{org.org_name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCompoundOpen(false); setUnpaidOnly(false); setGraduateOnly(false); setFilterOrgId(""); }}
                      style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 12, padding: 0 }}
                    >
                      条件をクリア
                    </button>
                  </div>
                )}

                {/* Individual mode link */}
                <button
                  type="button"
                  onClick={() => { setIndividualMode(true); setMemberSearchOpen(true); }}
                  style={{
                    display: "block", marginTop: 10,
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--color-text-secondary)", fontSize: 12, padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  個人を指定して送信
                </button>
              </>
            )}

            {/* Count display */}
            {previewCount !== null && (
              <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: "#4f46e5" }}>
                対象: {previewCount}名
              </div>
            )}
          </div>

          {/* イベント紐付け section */}
          {!isTemplate && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 10 }}>
                イベント紐付け（任意）
              </div>
              {form.linked_event_id ? (() => {
                const evt = publishedEvents.find(e => e.id === form.linked_event_id);
                return (
                  <div style={{
                    padding: "10px 14px", borderRadius: "var(--radius)",
                    background: "#f5f3ff", border: "1px solid #ddd6fe",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#534AB7" }}>
                        {evt ? `${evt.title}（${evt.event_date?.slice(5).replace("-", "/")}）` : form.linked_event_id}
                      </span>
                      <button type="button" onClick={() => { updateForm("linked_event_id", ""); updateForm("is_reminder", false); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#534AB7", fontSize: 16, padding: 0 }}>&times;</button>
                    </div>
                    <p style={{ fontSize: 12, color: "#7c3aed", margin: "6px 0 0" }}>メール本文に出欠回答リンクが自動挿入されます</p>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={form.is_reminder} onChange={e => updateForm("is_reminder", e.target.checked)}
                        style={{ width: 15, height: 15, accentColor: "#4f46e5" }} />
                      リマインドメールとして送信（未回答者のみ）
                    </label>
                  </div>
                );
              })() : (
                <select
                  value=""
                  onChange={e => { if (e.target.value) updateForm("linked_event_id", e.target.value); }}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "var(--radius)",
                    border: "1px solid var(--color-border)", background: "#fff", fontSize: 13,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <option value="">紐付けなし</option>
                  {publishedEvents.map(e => (
                    <option key={e.id} value={e.id}>{e.title}（{e.event_date?.slice(5).replace("-", "/")}）</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 予約送信 section */}
          {!isTemplate && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 10 }}>
                予約送信
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isScheduled ? 12 : 0 }}>
                <div
                  className={isScheduled ? "doc-toggle doc-toggle-on" : "doc-toggle"}
                  onClick={() => {
                    const next = !isScheduled;
                    setIsScheduled(next);
                    if (next && !schedDate) setSchedDate(todayStr());
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="doc-toggle-knob" />
                </div>
                <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>
                  {isScheduled ? "予約する" : "即時送信"}
                </span>
              </div>

              {isScheduled && (
                <div style={{ animation: "nlSlide 0.3s ease", overflow: "visible" }}>
                  <div style={{ position: "relative", zIndex: 10, marginBottom: 12 }}>
                    <DatePicker value={schedDate} onChange={(v) => setSchedDate(v)} placeholder="送信日を選択" />
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                    {QUICK_TIMES.map((qt) => (
                      <button
                        key={qt.label}
                        type="button"
                        onClick={() => { setSchedHour(qt.h); setSchedMin(qt.m); }}
                        style={{
                          padding: "4px 10px", fontSize: 12, borderRadius: "var(--radius)",
                          border: "1px solid var(--color-border)", cursor: "pointer",
                          background: schedHour === qt.h && schedMin === qt.m ? "#4f46e5" : "#fff",
                          color: schedHour === qt.h && schedMin === qt.m ? "#fff" : "var(--color-text-primary)",
                        }}
                      >
                        {qt.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                      value={schedHour}
                      onChange={(e) => setSchedHour(Number(e.target.value))}
                      style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: 14 }}
                    >
                      {HOURS.map((h) => (<option key={h} value={h}>{pad2(h)}時</option>))}
                    </select>
                    <span style={{ color: "var(--color-text-secondary)" }}>:</span>
                    <select
                      value={schedMin}
                      onChange={(e) => setSchedMin(Number(e.target.value))}
                      style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: 14 }}
                    >
                      {MINUTES.map((m) => (<option key={m} value={m}>{pad2(m)}分</option>))}
                    </select>
                  </div>
                  {schedDate && (
                    <div style={{
                      marginTop: 12, padding: "10px 14px",
                      background: "#eef2ff", borderRadius: "var(--radius)",
                      fontSize: 13, color: "#4f46e5", fontWeight: 600,
                    }}>
                      {formatScheduleDisplay(schedDate, schedHour, schedMin)} に送信予定
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 添付 section */}
          {!isTemplate && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 10 }}>
                添付ファイル
              </div>

              {/* Existing file attachments list */}
              {attachments.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {attachments.map((att, idx) => (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      background: att.needsReselect ? "#fffbeb" : "#fff",
                      border: `1px solid ${att.needsReselect ? "#f59e0b" : "var(--color-border)"}`,
                      borderRadius: "var(--radius)",
                      marginBottom: 4,
                    }}>
                      <ClipIcon />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {att.filename}
                        </div>
                        <div style={{ fontSize: 12, color: att.needsReselect ? "#d97706" : "var(--color-text-tertiary)" }}>
                          {att.needsReselect ? "2MB超のため再選択が必要です" : formatFileSize(att.size)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)", padding: 2, display: "flex" }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* File upload area */}
              {attachments.length < MAX_FILES && (
                <div
                  style={{
                    border: fileDragging ? "2px dashed var(--color-accent)" : "1px dashed var(--color-border)",
                    borderRadius: "var(--radius)",
                    padding: "16px 12px",
                    textAlign: "center",
                    background: fileDragging ? "#eef2ff" : "#fff",
                    transition: "all 0.15s",
                    cursor: "pointer",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); fileDragCounter.current++; setFileDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); fileDragCounter.current--; if (fileDragCounter.current === 0) setFileDragging(false); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setFileDragging(false); fileDragCounter.current = 0; if (e.dataTransfer?.files) processFiles(e.dataTransfer.files); }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_EXTENSIONS}
                    multiple
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                  <div style={{ color: "var(--color-accent)", marginBottom: 4 }}><ClipIcon /></div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                    ファイルをドロップまたはクリックして選択
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                    PDF, Excel, Word, 画像 (最大10MB, {MAX_FILES}件まで)
                  </div>
                </div>
              )}

              {/* ── 添付リンク section ── */}
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 10, marginTop: 20 }}>
                添付リンク
              </div>

              {attachLinks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {attachLinks.map((link, idx) => (
                    <div key={idx} style={{
                      padding: "10px 12px", borderRadius: "var(--radius)",
                      background: "var(--color-border)", border: "1px solid var(--color-border)",
                      position: "relative",
                    }}>
                      <button
                        type="button"
                        onClick={() => setAttachLinks((prev) => prev.filter((_, i) => i !== idx))}
                        style={{
                          position: "absolute", top: 8, right: 8,
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--color-text-tertiary)", padding: 2, display: "flex",
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-danger)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
                      >
                        <XIcon />
                      </button>
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 }}>リンク名</label>
                        <input
                          type="text"
                          value={link.name}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAttachLinks((prev) => prev.map((l, i) => i === idx ? { ...l, name: v } : l));
                          }}
                          placeholder="例: 議事録"
                          style={{
                            width: "100%", padding: "6px 10px", fontSize: 13,
                            border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)",
                            boxSizing: "border-box", background: "#fff",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 }}>URL</label>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAttachLinks((prev) => prev.map((l, i) => i === idx ? { ...l, url: v } : l));
                          }}
                          placeholder="https://..."
                          style={{
                            width: "100%", padding: "6px 10px", fontSize: 13,
                            border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)",
                            boxSizing: "border-box", background: "#fff",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setAttachLinks((prev) => [...prev, { url: "", name: "" }])}
                style={{
                  display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
                  padding: "8px 14px", borderRadius: "var(--radius)",
                  border: "1px dashed var(--color-border)", background: "transparent",
                  color: "var(--color-accent)", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", width: "100%", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.background = "var(--color-accent-light)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.background = "transparent"; }}
              >
                <PlusIcon /> リンクを追加
              </button>
            </div>
          )}

          {/* テンプレート section */}
          {editMode === "new" && !isTemplate && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 10 }}>
                テンプレート
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className={form.is_template ? "doc-toggle doc-toggle-on" : "doc-toggle"}
                  onClick={() => updateForm("is_template", !form.is_template)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="doc-toggle-knob" />
                </div>
                <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>
                  テンプレートとして保存
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Member Search Modal ── */}
      <MemberSearchModal
        open={memberSearchOpen}
        onClose={() => setMemberSearchOpen(false)}
        selectedMembers={selectedMembers}
        onToggleMember={handleToggleMember}
      />

      {/* ── Preview Modal ── */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="プレビュー"
        width="900px"
        footer={<>
          <Button variant="ghost" onClick={() => setShowPreview(false)}>閉じる</Button>
          {form.id && (
            <Button variant="primary" onClick={() => { setShowPreview(false); handleSendClick(); }}
              style={{ background: "#4f46e5" }}>
              このまま送信
            </Button>
          )}
        </>}
      >
        <div style={{
          border: "1px solid var(--color-border)", borderRadius: "var(--radius)",
          overflow: "hidden",
        }}>
          <div style={{
            background: "#f8f9fa", padding: "14px 20px",
            borderBottom: "1px solid var(--color-border)",
          }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              From: <strong style={{ color: "var(--color-text-primary)" }}>MITO21 事務局</strong>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              Subject: <strong style={{ color: "var(--color-text-primary)" }}>{form.title || "(件名なし)"}</strong>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              対象: {previewCount ?? "?"}名
              {(attachments.length > 0 || attachLinks.filter((l) => l.url).length > 0) && (
                <span style={{ marginLeft: 12 }}>添付: {attachments.length + attachLinks.filter((l) => l.url).length}件</span>
              )}
            </div>
          </div>
          <div style={{ padding: "20px", minHeight: 200, lineHeight: 1.8 }}>
            {editorMode === "rich" && form.body_html ? (
              <div dangerouslySetInnerHTML={{ __html: form.body_html }} />
            ) : (
              (form.body || "(本文なし)").split("\n").map((line, i) => (
                <p key={i} style={{ margin: "0 0 8px 0" }}>{line || "\u00A0"}</p>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* ── Send Confirm Dialog ── */}
      {confirmSend && (() => {
        const scheduled = isScheduled && schedDate;
        const audienceDesc = buildAudienceDescription();
        const countStr = previewCount !== null ? `${previewCount}名` : "対象者";
        const bodyPreview = getBodyPreview();
        const schedDisplay = scheduled ? formatScheduleDisplay(schedDate, schedHour, schedMin) : "";
        const modalItemStyle = { marginBottom: 14 };
        const labelStyle = { fontSize: 12, color: "#6b7280", marginBottom: 3 };
        const valueStyle = { fontSize: 14, color: "#111827" };
        const dividerStyle = { borderTop: "1px solid #e5e7eb", margin: "16px 0" };

        return (
          <div className="confirm-overlay" onClick={() => { if (!sending) setConfirmSend(false); }}>
            <div style={{
              background: "#fff", borderRadius: 16, maxWidth: 520, width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)", animation: "nlFade 0.2s ease",
            }} onClick={(e) => e.stopPropagation()}>
              {sendComplete ? (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <svg width="64" height="64" viewBox="0 0 64 64" style={{ margin: "0 auto 16px" }}>
                    <circle cx="32" cy="32" r="30" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" />
                    <path d="M20 32l8 8 16-16" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <animate attributeName="stroke-dasharray" from="0 50" to="50 0" dur="0.5s" fill="freeze" />
                    </path>
                  </svg>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
                    {scheduled ? "予約しました" : "送信しました"}
                  </div>
                  <div style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>配信一覧に戻ります...</div>
                </div>
              ) : (
                <div style={{ padding: "24px 28px" }}>
                  {/* 件名 */}
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 20, lineHeight: 1.4 }}>
                    {form.title}
                  </div>

                  {/* 配信チャネル */}
                  <div style={modalItemStyle}>
                    <div style={labelStyle}>配信チャネル</div>
                    <div style={{ ...valueStyle, display: "flex", alignItems: "center", gap: 6 }}>
                      <MailIcon /> {channelLabel(form.channel)}
                    </div>
                  </div>

                  {/* 配信対象 */}
                  <div style={modalItemStyle}>
                    <div style={labelStyle}>配信対象</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#4f46e5" }}>
                      {audienceDesc}（{countStr}）
                    </div>
                  </div>

                  {/* 添付ファイル */}
                  <div style={modalItemStyle}>
                    <div style={labelStyle}>添付ファイル</div>
                    {attachments.length > 0 || attachLinks.filter((l) => l.url).length > 0 ? (
                      <div>
                        {attachments.length > 0 && (
                          <div>
                            <span style={valueStyle}>ファイル {attachments.length}件: </span>
                            <span style={{ fontSize: 13, color: "#6b7280" }}>
                              {attachments.map((a) => a.filename).join("、")}
                            </span>
                          </div>
                        )}
                        {attachLinks.filter((l) => l.url).length > 0 && (
                          <div>
                            <span style={valueStyle}>リンク {attachLinks.filter((l) => l.url).length}件: </span>
                            <span style={{ fontSize: 13, color: "#6b7280" }}>
                              {attachLinks.filter((l) => l.url).map((l) => l.name || l.url).join("、")}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={valueStyle}>なし</div>
                    )}
                  </div>

                  {/* 予約日時 (scheduled only) */}
                  {scheduled && (
                    <div style={modalItemStyle}>
                      <div style={labelStyle}>予約日時</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#4f46e5" }}>
                        {(() => {
                          try {
                            const d = new Date(schedDate);
                            const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
                            return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）${pad2(schedHour)}:${pad2(schedMin)}`;
                          } catch { return schedDisplay; }
                        })()}
                      </div>
                    </div>
                  )}

                  {/* 本文プレビュー */}
                  {bodyPreview && (
                    <div style={modalItemStyle}>
                      <div style={labelStyle}>本文プレビュー</div>
                      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{bodyPreview}</div>
                    </div>
                  )}

                  {/* 区切り線 */}
                  <div style={dividerStyle} />

                  {/* 注意文 */}
                  <div style={{ fontSize: 14, color: "#dc2626", fontWeight: 600, marginBottom: 20, lineHeight: 1.5 }}>
                    {scheduled
                      ? `${countStr}に ${schedDisplay} に${channelLabel(form.channel) === "メール" ? "メール" : ""}送信を予約します。`
                      : `${countStr}に${channelLabel(form.channel) === "メール" ? "メール" : ""}を配信します。この操作は取り消せません。`}
                  </div>

                  {/* ボタン */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button
                      onClick={() => setConfirmSend(false)} disabled={sending}
                      style={{
                        padding: "10px 20px", fontSize: 14, borderRadius: 8, cursor: "pointer",
                        background: "#fff", border: "1px solid #d1d5db", color: "#374151",
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={executeSend} disabled={sending}
                      style={{
                        padding: "10px 28px", fontSize: 15, fontWeight: 700, borderRadius: 8, cursor: "pointer",
                        background: scheduled ? "#f59e0b" : "#4f46e5",
                        color: "#fff", border: "none",
                        display: "flex", alignItems: "center", gap: 6,
                        opacity: sending ? 0.7 : 1,
                      }}
                    >
                      {sending ? "送信中..." : scheduled ? "予約する" : (<><SendIcon /> 送信する</>)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Test Send Modal ── */}
      {showTestSend && (() => {
        const labelStyle = { fontSize: 12, color: "#6b7280", marginBottom: 3 };
        const valueStyle = { fontSize: 14, color: "#111827" };
        const dividerStyle = { borderTop: "1px solid #e5e7eb", margin: "16px 0" };

        return (
          <div className="confirm-overlay" onClick={() => { if (!testSending) setShowTestSend(false); }}>
            <div style={{
              background: "#fff", borderRadius: 16, maxWidth: 520, width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)", animation: "nlFade 0.2s ease",
              padding: "24px 28px",
            }} onClick={(e) => e.stopPropagation()}>
              {/* 件名 */}
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 20, lineHeight: 1.4 }}>
                {"【テスト】" + form.title}
              </div>

              {/* 送信先 */}
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>送信先メールアドレス</div>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  style={{
                    width: "100%", padding: "10px 12px", fontSize: 14,
                    border: "1px solid #d1d5db", borderRadius: 8,
                    boxSizing: "border-box", marginTop: 4,
                  }}
                />
              </div>

              {/* 添付ファイル */}
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>添付ファイル</div>
                <div style={valueStyle}>
                  {attachments.length > 0 || attachLinks.filter((l) => l.url).length > 0
                    ? [
                        attachments.length > 0 ? `ファイル${attachments.length}件` : "",
                        attachLinks.filter((l) => l.url).length > 0 ? `リンク${attachLinks.filter((l) => l.url).length}件` : "",
                      ].filter(Boolean).join("、")
                    : "なし"}
                </div>
              </div>

              {/* 区切り線 */}
              <div style={dividerStyle} />

              {/* 説明文 */}
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 20 }}>
                テストメールを1通送信します。
              </div>

              {/* ボタン */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setShowTestSend(false)} disabled={testSending}
                  style={{
                    padding: "10px 20px", fontSize: 14, borderRadius: 8, cursor: "pointer",
                    background: "#fff", border: "1px solid #d1d5db", color: "#374151",
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleTestSend} disabled={testSending || !testEmail.trim()}
                  style={{
                    padding: "10px 28px", fontSize: 15, fontWeight: 700, borderRadius: 8, cursor: "pointer",
                    background: "#10b981", color: "#fff", border: "none",
                    opacity: (testSending || !testEmail.trim()) ? 0.7 : 1,
                  }}
                >
                  {testSending ? "送信中..." : "テスト送信する"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Error Dialog ── */}
      <ConfirmDialog
        open={!!errorDialog}
        title="エラー"
        message={errorDialog}
        confirmLabel="OK"
        onConfirm={() => setErrorDialog("")}
        onCancel={() => setErrorDialog("")}
      />

      {/* ── Responsive Styles ── */}
      <style>{`
        @media (max-width: 900px) {
          .nl-edit-grid { grid-template-columns: 1fr !important; }
          .nl-edit-sidebar { border-left: none !important; border-top: 1px solid var(--color-border) !important; }
        }
      `}</style>
    </div>
  );
}
