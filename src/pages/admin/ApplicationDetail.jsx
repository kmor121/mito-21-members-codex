import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest, base44, invalidateReadCache } from '../../api/base44Client';
import DatePicker from '../../components/ui/DatePicker';
import { Button, Modal } from '../../components/ui';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { fullName, fullNameKana, nameInitial } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

/* ── helpers ── */
function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}
function boolMark(v) { return v ? "○" : "×"; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function formatDate(d) {
  if (!d) return "-";
  const s = d.slice(0, 10);
  const [y, m, day] = s.split("-");
  return `${y}年${Number(m)}月${Number(day)}日`;
}

/* ── SVG Icons ── */
const iconBase = { width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const UserIcon = () => (
  <svg style={{ ...iconBase, color: 'var(--color-accent)' }} viewBox="0 0 24 24">
    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const BuildingIcon = () => (
  <svg style={{ ...iconBase, color: 'var(--color-accent)' }} viewBox="0 0 24 24">
    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const MailIcon = () => (
  <svg style={{ ...iconBase, color: 'var(--color-accent)' }} viewBox="0 0 24 24">
    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const HomeIcon = () => (
  <svg style={{ ...iconBase, color: 'var(--color-accent)' }} viewBox="0 0 24 24">
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
  </svg>
);
const NoteIcon = () => (
  <svg style={{ ...iconBase, color: 'var(--color-accent)' }} viewBox="0 0 24 24">
    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const UsersIcon = () => (
  <svg style={{ ...iconBase, color: 'var(--color-accent)' }} viewBox="0 0 24 24">
    <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const CheckIcon = () => (
  <svg style={{ ...iconBase, color: 'currentColor' }} viewBox="0 0 24 24">
    <path d="M5 13l4 4L19 7" />
  </svg>
);
const XIcon = () => (
  <svg style={{ ...iconBase, color: 'currentColor' }} viewBox="0 0 24 24">
    <path d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ── Status badge ── */
const STATUS_BADGE = {
  "申請中": { bg: "var(--color-warning-light)", color: "var(--color-warning)" },
  "承認済": { bg: "var(--color-success-light)", color: "var(--color-success)" },
  "却下":   { bg: "var(--color-danger-light)", color: "var(--color-danger)" },
};

function StatusBadge({ status, large }) {
  const s = STATUS_BADGE[status] || { bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)" };
  return (
    <span style={{
      display: "inline-block", padding: large ? "5px 14px" : "3px 10px",
      borderRadius: "999px", fontSize: large ? 13 : 12, fontWeight: 600,
      background: s.bg, color: s.color, whiteSpace: "nowrap",
    }}>
      {status || "-"}
    </span>
  );
}

/* ── Section card ── */
function SectionCard({ title, icon, children }) {
  return (
    <div className="card" style={{ overflow: "visible" }}>
      <div className="card-header" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px" }}>
        {icon}
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h3>
      </div>
      <div className="card-body" style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Info grid (label/value pairs) ── */
function InfoGrid({ items, singleColumn }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: singleColumn ? "1fr" : "repeat(2, 1fr)", gap: 12 }}>
      {items.map((item, i) => item && (
        <div key={i} style={{
          padding: "10px 12px", borderRadius: "var(--radius)",
          background: "var(--color-bg-sub)", border: "1px solid var(--color-border)",
          gridColumn: item.span2 ? "span 2" : undefined,
        }}>
          <dt style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            {item.label}
          </dt>
          <dd style={{ fontSize: 13, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{item.value || "-"}</span>
            {item.badge}
          </dd>
        </div>
      ))}
    </div>
  );
}

/* ── Member type pill selector ── */
const MEMBER_TYPE_OPTIONS = [
  { value: "正会員", color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  { value: "賛助会員", color: "var(--color-success)", bg: "var(--color-success-light)" },
  { value: "名誉顧問", color: "var(--color-warning)", bg: "var(--color-warning-light)" },
];

function MemberTypePills({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {MEMBER_TYPE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "8px 20px", borderRadius: "999px", fontSize: 14, fontWeight: 600,
              border: active ? "2px solid " + opt.color : "2px solid var(--color-border)",
              background: active ? opt.bg : "var(--color-bg)",
              color: active ? opt.color : "var(--color-text-secondary)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {opt.value}
          </button>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════ */
export default function ApplicationDetail() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* approve state */
  const [memberType, setMemberType] = useState("正会員");
  const [memberNumber, setMemberNumber] = useState("");
  const [joinDate, setJoinDate] = useState(todayStr());
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  /* reject state */
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  /* referrer edit state */
  const [refEditing, setRefEditing] = useState(false);
  const [refForm, setRefForm] = useState({ referrer_1: '', referrer_2: '' });
  const [refSaving, setRefSaving] = useState(false);

  /* messages */
  const [toast, setToast] = useState(null);
  const [fieldError, setFieldError] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [d, numRes] = await Promise.all([
        base44.entities.Member.get(applicationId),
        apiRequest("generate-member-number").catch(() => ({})),
      ]);
      setDetail(d);
      setMemberNumber(numRes.suggested_number || numRes.member_number || "");
    } catch (err) {
      setError(err.message || "詳細の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  function showToastMsg(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function saveReferrers() {
    setRefSaving(true);
    try {
      await base44.entities.Member.update(applicationId, {
        referrer_1: refForm.referrer_1.trim(),
        referrer_2: refForm.referrer_2.trim(),
      });
      invalidateReadCache('Member');
      setRefEditing(false);
      showToastMsg('紹介者を更新しました');
      await loadDetail();
    } catch (err) {
      showToastMsg(err.message || '更新に失敗しました');
    }
    setRefSaving(false);
  }

  /* ── Approve flow ── */
  function openApproveModal() {
    setFieldError("");
    if (!memberNumber.trim()) {
      setFieldError("会員番号を入力してください。");
      return;
    }
    setShowApproveModal(true);
  }

  async function confirmApprove() {
    setShowApproveModal(false);
    setApproveSubmitting(true);
    try {
      await apiRequest("approve-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: applicationId,
          member_type: memberType,
          member_number: memberNumber.trim(),
        }),
      });
      showToastMsg("承認しました");
      setTimeout(() => navigate("/admin/applications"), 1500);
    } catch (err) {
      setFieldError(err.message || "承認に失敗しました。");
    } finally {
      setApproveSubmitting(false);
    }
  }

  /* ── Reject flow ── */
  function openRejectModal() {
    if (!rejectionReason.trim()) return;
    setShowRejectModal(true);
  }

  async function confirmReject() {
    setShowRejectModal(false);
    setRejectSubmitting(true);
    try {
      await apiRequest("reject-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applicationId, rejection_reason: rejectionReason.trim() }),
      });
      showToastMsg("却下しました");
      setTimeout(() => navigate("/admin/applications"), 1500);
    } catch (err) {
      setFieldError(err.message || "却下に失敗しました。");
    } finally {
      setRejectSubmitting(false);
    }
  }

  /* ── Loading / Error states ── */
  if (loading) return (
    <section className="admin-shell" style={{ maxWidth: 1080, margin: "0 auto" }}>
      <LoadingSpinner />
    </section>
  );

  if (error || !detail) return (
    <section className="admin-shell" style={{ maxWidth: 1080, margin: "0 auto" }}>
      <a
        href="/admin/applications"
        onClick={(e) => { e.preventDefault(); navigate("/admin/applications"); }}
        style={{ fontSize: 13, color: "var(--color-accent)", textDecoration: "none", fontWeight: 600, marginBottom: 16, display: "inline-block" }}
      >
        &larr; 申込一覧に戻る
      </a>
      <div style={{
        background: "var(--color-danger-light)", border: "1px solid #fecaca",
        borderRadius: "var(--radius)", padding: 24, color: "var(--color-danger)", fontSize: 14,
      }}>
        {error || "データを取得できませんでした"}
      </div>
    </section>
  );

  const isPending = detail.approval_status === "申請中";
  const isApproved = detail.approval_status === "承認済";
  const isRejected = detail.approval_status === "却下";

  /* ── Referrer badge ── */
  function renderRefBadge(key) {
    const m = detail.referrer_matches?.[key];
    const arr = m ? (Array.isArray(m) ? m : [m]) : [];
    if (arr.length > 0) {
      return (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 10px", borderRadius: "var(--radius-sm)",
          background: "var(--color-success-light)", color: "var(--color-success)", fontSize: 12, fontWeight: 600,
        }}>
          <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
          {arr.map(x => `${x.last_name || ""}${x.first_name ? " " + x.first_name : ""}${!x.last_name && !x.first_name ? (x.name_kanji || "-") : ""}${x.member_number ? " (" + x.member_number + ")" : ""}`).join(", ")} と一致
        </span>
      );
    }
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 10px", borderRadius: "var(--radius-sm)",
        background: "var(--color-warning-light)", color: "var(--color-warning)", fontSize: 12, fontWeight: 600,
      }}>
        <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        一致する会員が見つかりません
      </span>
    );
  }

  return (
    <section className="admin-shell" style={{ maxWidth: 1080, margin: "0 auto", paddingBottom: isPending ? 100 : 24 }}>
      {/* Toast */}
      {toast && (
        <div className="nl2-toast">
          <span className="nl2-toast-icon">&#x2713;</span>
          <span>{toast}</span>
        </div>
      )}

      {/* ══ Approve Modal ══ */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="入会を承認"
        width="500px"
        footer={<>
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>キャンセル</Button>
          <Button variant="primary" onClick={confirmApprove} disabled={approveSubmitting}>
            {approveSubmitting ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> 承認中...</>
            ) : "承認する"}
          </Button>
        </>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>{detail ? fullName(detail) : ""}</p>
          {/* Member type pills */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>会員種別</label>
            <MemberTypePills value={memberType} onChange={setMemberType} />
          </div>
          {/* Member number */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>会員番号</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={memberNumber}
                onChange={(e) => setMemberNumber(e.target.value)}
                style={{ flex: 1 }}
                placeholder="自動採番済み"
              />
              <Button
                variant="primary"
                size="sm"
                style={{ whiteSpace: "nowrap" }}
                onClick={async () => {
                  try {
                    const res = await apiRequest("generate-member-number");
                    setMemberNumber(res.suggested_number || res.member_number || memberNumber);
                  } catch {}
                }}
              >
                自動採番
              </Button>
            </div>
          </div>
          {/* Join date */}
          <div style={{ overflow: "visible" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>入会日</label>
            <DatePicker value={joinDate} onChange={setJoinDate} />
          </div>
        </div>
      </Modal>

      {/* ══ Reject Modal ══ */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="入会申込を却下"
        width="500px"
        footer={<>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>キャンセル</Button>
          <Button
            variant="danger"
            onClick={confirmReject}
            disabled={rejectSubmitting || !rejectionReason.trim()}
            style={{ background: "var(--color-danger)", color: "#fff", border: "none" }}
          >
            {rejectSubmitting ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} /> 却下中...</>
            ) : "却下する"}
          </Button>
        </>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>{detail ? fullName(detail) : ""}</p>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              却下理由 <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="却下理由を入力してください（申込者に通知されます）"
              style={{ width: "100%", fontFamily: "inherit", resize: "vertical" }}
            />
            <div style={{ textAlign: "right", fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>
              {rejectionReason.length} 文字
            </div>
          </div>
        </div>
      </Modal>

      {/* ══ Back link ══ */}
      <a
        href="/admin/applications"
        onClick={(e) => { e.preventDefault(); navigate("/admin/applications"); }}
        style={{ fontSize: 13, color: "var(--color-accent)", textDecoration: "none", fontWeight: 600, marginBottom: 16, display: "inline-block" }}
      >
        &larr; 申込一覧に戻る
      </a>

      {/* ══ Approved / Rejected banner ══ */}
      {isApproved && (
        <div style={{
          background: "var(--color-success-light)", border: "1px solid #a7f3d0", borderRadius: "var(--radius)",
          padding: "14px 20px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "var(--color-success)", flexWrap: "wrap",
        }}>
          <svg style={{ width: 20, height: 20, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
          </svg>
          承認済み{detail.approved_at ? `（${formatDate(detail.approved_at)}）` : ""}
          {detail.member_number && <span style={{ marginLeft: 8 }}>会員番号: {detail.member_number}</span>}
          {detail.member_type && <span>/ {detail.member_type}</span>}
        </div>
      )}
      {isRejected && (
        <div style={{
          background: "var(--color-danger-light)", border: "1px solid #fecaca", borderRadius: "var(--radius)",
          padding: "14px 20px", marginBottom: 20,
          display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, fontWeight: 600, color: "var(--color-danger)",
        }}>
          <svg style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
          </svg>
          <div>
            却下{detail.rejected_at ? `（${formatDate(detail.rejected_at)}）` : ""}
            {detail.rejection_reason && (
              <div style={{ fontWeight: 400, fontSize: 13, marginTop: 4, color: "var(--color-text-primary)", lineHeight: 1.6 }}>
                理由: {detail.rejection_reason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ Page Header ══ */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
            <h1 className="page-title" style={{ margin: 0 }}>{displayValue(fullName(detail))}</h1>
            <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>{displayValue(fullNameKana(detail))}</span>
            <StatusBadge status={detail.approval_status} large />
          </div>
          {detail.applied_at && (
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
              {formatDate(detail.applied_at)} 申込
            </p>
          )}
        </div>
      </div>

      {/* ══ Personal info card ══ */}
      <SectionCard title="個人情報" icon={<UserIcon />}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Profile image */}
          <div style={{ flexShrink: 0 }}>
            {detail.profile_image ? (
              <img src={detail.profile_image} alt="" style={{
                width: 80, height: 80, borderRadius: "50%", objectFit: "cover",
                border: "2px solid var(--color-border)",
              }} />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--color-accent-light), var(--color-accent-light))",
                border: "2px solid var(--color-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, fontWeight: 700, color: "var(--color-accent)",
              }}>
                {nameInitial(detail)}
              </div>
            )}
          </div>
          {/* Info grid */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <InfoGrid singleColumn={isMobile} items={[
              { label: "氏名", value: displayValue(fullName(detail)) },
              { label: "フリガナ", value: displayValue(fullNameKana(detail)) },
              { label: "生年月日", value: displayValue(detail.birthday) },
            ]} />
          </div>
        </div>
      </SectionCard>

      {/* ══ Company info card ══ */}
      <SectionCard title="会社情報" icon={<BuildingIcon />}>
        <InfoGrid singleColumn={isMobile} items={[
          { label: "会社名", value: displayValue(detail.company_name) },
          { label: "役職", value: displayValue(detail.company_position) },
          { label: "業種", value: displayValue(detail.industry) },
          { label: "電話 / FAX", value: [detail.company_phone, detail.company_fax].filter(Boolean).join(" / ") || "-" },
          (detail.company_postal_code || detail.company_address) ? {
            label: "会社住所", span2: true,
            value: [detail.company_postal_code ? `〒${detail.company_postal_code}` : "", detail.company_address].filter(Boolean).join(" "),
          } : null,
          detail.company_pr ? { label: "会社PR", value: detail.company_pr, span2: true } : null,
          { label: "会社情報の名簿掲載", value: boolMark(detail.show_company_in_directory) },
        ].filter(Boolean)} />
      </SectionCard>

      {/* ══ Contact card ══ */}
      <SectionCard title="連絡先" icon={<MailIcon />}>
        <InfoGrid singleColumn={isMobile} items={[
          { label: "メールアドレス", value: displayValue(detail.email) },
          { label: "携帯番号", value: displayValue(detail.mobile_phone) },
          { label: "メール掲載", value: boolMark(detail.show_email_in_directory) },
          { label: "携帯掲載", value: boolMark(detail.show_mobile_in_directory) },
        ]} />
      </SectionCard>

      {/* ══ Home info card ══ */}
      {(detail.home_address || detail.home_phone || detail.home_postal_code) && (
        <SectionCard title="自宅情報" icon={<HomeIcon />}>
          <InfoGrid singleColumn={isMobile} items={[
            (detail.home_postal_code || detail.home_address) ? {
              label: "住所", span2: true,
              value: [detail.home_postal_code ? `〒${detail.home_postal_code}` : "", detail.home_address].filter(Boolean).join(" "),
            } : null,
            { label: "電話", value: displayValue(detail.home_phone) },
            { label: "FAX", value: displayValue(detail.home_fax) },
          ].filter(Boolean)} />
        </SectionCard>
      )}

      {/* ══ Other card ══ */}
      {detail.hobbies && (
        <SectionCard title="その他" icon={<NoteIcon />}>
          <InfoGrid singleColumn={isMobile} items={[
            { label: "趣味・信条", value: detail.hobbies, span2: true },
          ]} />
        </SectionCard>
      )}

      {/* ══ Referrer matching card ══ */}
      <SectionCard title="紹介者照合" icon={<UsersIcon />}>
        {refEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>紹介者 1</label>
              <input type="text" value={refForm.referrer_1} onChange={e => setRefForm(f => ({ ...f, referrer_1: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>紹介者 2</label>
              <input type="text" value={refForm.referrer_2} onChange={e => setRefForm(f => ({ ...f, referrer_2: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" onClick={() => setRefEditing(false)}>キャンセル</Button>
              <Button variant="primary" disabled={refSaving} onClick={saveReferrers}>{refSaving ? '保存中...' : '保存'}</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {/* Referrer 1 */}
            <div style={{
              padding: "14px 16px", borderRadius: "var(--radius)",
              background: detail.referrer_matches?.referrer_1 ? "var(--color-success-light)" : "var(--color-warning-light)",
              border: `1px solid ${detail.referrer_matches?.referrer_1 ? "#bbf7d0" : "#fde68a"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 2 }}>紹介者 1</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{displayValue(detail.referrer_1)}</div>
              </div>
              {detail.referrer_1 && renderRefBadge("referrer_1")}
            </div>
            {/* Referrer 2 */}
            {detail.referrer_2 && (
              <div style={{
                padding: "14px 16px", borderRadius: "var(--radius)",
                background: detail.referrer_matches?.referrer_2 ? "var(--color-success-light)" : "var(--color-warning-light)",
                border: `1px solid ${detail.referrer_matches?.referrer_2 ? "#bbf7d0" : "#fde68a"}`,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 2 }}>紹介者 2</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{displayValue(detail.referrer_2)}</div>
                </div>
                {renderRefBadge("referrer_2")}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" size="sm"
                onClick={() => { setRefForm({ referrer_1: detail.referrer_1 || '', referrer_2: detail.referrer_2 || '' }); setRefEditing(true); }}>
                紹介者を編集
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ══ Error message ══ */}
      {fieldError && (
        <div style={{
          padding: "12px 16px", borderRadius: "var(--radius)",
          background: "var(--color-danger-light)", color: "var(--color-danger)", fontSize: 13, fontWeight: 600,
        }}>
          {fieldError}
        </div>
      )}

      {/* ══ Fixed Action Bar (pending only) ══ */}
      {isPending && (
        <div style={{
          position: "sticky", bottom: 0, zIndex: 10,
          background: "var(--color-bg)", borderTop: "1px solid var(--color-border)",
          padding: "16px 24px",
          paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
          display: "flex", justifyContent: "flex-end", gap: 12,
        }}>
          <Button
            variant="danger"
            onClick={() => {
              if (!rejectionReason.trim()) {
                setFieldError("却下する場合は、先に却下理由を入力してください。");
                return;
              }
              openRejectModal();
            }}
            disabled={rejectSubmitting}
          >
            却下する
          </Button>
          <Button variant="primary" onClick={openApproveModal} disabled={approveSubmitting}>
            承認する
          </Button>
        </div>
      )}

      {/* ══ Reject reason textarea (shown inline when pending) ══ */}
      {isPending && (
        <div className="card" style={{ marginTop: 4 }}>
          <div className="card-body" style={{ padding: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              却下理由（却下する場合に入力）
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => { setRejectionReason(e.target.value); setFieldError(""); }}
              placeholder="却下理由を入力してください（申込者に通知されます）"
              style={{ width: "100%", fontFamily: "inherit", resize: "vertical" }}
            />
            <div style={{ textAlign: "right", fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>
              {rejectionReason.length} 文字
            </div>
          </div>
        </div>
      )}

      {/* fadeIn keyframe */}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`}</style>
    </section>
  );
}
