import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { base44, apiRequest } from '../../api/base44Client';
import { SkeletonCard } from '../../components/ui/Skeleton';
import DatePicker from '../../components/ui/DatePicker';
import { Button, PageHeader, Modal } from '../../components/ui';
import { fullName, fullNameKana } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

const STATUS_TABS = [
  { key: "申請中", label: "申請中" },
  { key: "承認済", label: "承認済" },
  { key: "却下", label: "却下" },
  { key: "all", label: "すべて" },
];

const STATUS_BADGE = {
  "申請中": { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  "承認済": { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  "却下":   { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
};

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function renderStatusBadge(status) {
  const style = STATUS_BADGE[status] || { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: "999px",
      fontSize: "12px", fontWeight: 600,
      background: style.bg, color: style.color,
      border: `1px solid ${style.border}`,
      whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: style.color, flexShrink: 0,
      }} />
      {status || "-"}
    </span>
  );
}

/* ── Member type selector pills ── */
const MEMBER_TYPE_OPTIONS = [
  { value: "正会員", color: "#4f46e5", bg: "#eef2ff" },
  { value: "賛助会員", color: "#059669", bg: "#ecfdf5" },
  { value: "名誉顧問", color: "#d97706", bg: "#fffbeb" },
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
              border: active ? `2px solid ${opt.color}` : "2px solid var(--color-border)",
              background: active ? opt.bg : "#fff",
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

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Applications() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isViewMode = searchParams.get('mode') === 'view';
  const isMobile = useIsMobile();
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("申請中");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  /* toast */
  const [toast, setToast] = useState(null);
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* approve modal state */
  const [approveTarget, setApproveTarget] = useState(null);
  const [memberType, setMemberType] = useState("正会員");
  const [memberNumber, setMemberNumber] = useState("");
  const [joinDate, setJoinDate] = useState(todayStr());
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [approveError, setApproveError] = useState("");

  /* reject modal state */
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  /* mobile filter toggle */
  const [showFilters, setShowFilters] = useState(false);

  const loadPending = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const list = await base44.entities.Member.filter(
        { approval_status: { "$in": ["申請中", "承認済", "却下"] } },
        "-created_date"
      );
      setAllMembers(list);
    } catch (err) {
      setError(err.message || "申込一覧の取得に失敗しました。");
      setAllMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const filteredMembers = useMemo(() => {
    return allMembers.filter((m) => {
      const statusPass = statusFilter === "all" || m.approval_status === statusFilter;
      const q = debouncedSearch.toLowerCase();
      const searchPass = !q || [m.last_name, m.first_name, m.last_name_kana, m.first_name_kana, m.company_name].some(v => v && String(v).toLowerCase().includes(q));
      return statusPass && searchPass;
    });
  }, [allMembers, statusFilter, debouncedSearch]);

  const statusCounts = useMemo(() => {
    const counts = { all: allMembers.length, "申請中": 0, "承認済": 0, "却下": 0 };
    for (const m of allMembers) {
      const s = m.approval_status || "";
      if (counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [allMembers]);

  /* ── Open approve modal ── */
  async function openApproveModal(item, e) {
    e.stopPropagation();
    setApproveError("");
    setMemberType(item.member_type || "正会員");
    setJoinDate(todayStr());
    try {
      const res = await apiRequest("generate-member-number").catch(() => ({}));
      setMemberNumber(res.suggested_number || res.member_number || "");
    } catch {
      setMemberNumber("");
    }
    setApproveTarget(item);
  }

  async function confirmApprove() {
    if (!memberNumber.trim()) {
      setApproveError("会員番号を入力してください。");
      return;
    }
    setApproveSubmitting(true);
    setApproveError("");
    try {
      await apiRequest("approve-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: approveTarget.id,
          member_type: memberType,
          member_number: memberNumber.trim(),
        }),
      });
      showToast("承認しました");
      setApproveTarget(null);
      loadPending();
    } catch (err) {
      setApproveError(err.message || "承認に失敗しました。");
    } finally {
      setApproveSubmitting(false);
    }
  }

  /* ── Open reject modal ── */
  function openRejectModal(item, e) {
    e.stopPropagation();
    setRejectionReason("");
    setRejectTarget(item);
  }

  async function confirmReject() {
    setRejectSubmitting(true);
    try {
      await apiRequest("reject-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectTarget.id, rejection_reason: rejectionReason.trim() }),
      });
      showToast("却下しました");
      setRejectTarget(null);
      loadPending();
    } catch (err) {
      showToast(err.message || "却下に失敗しました。", "error");
    } finally {
      setRejectSubmitting(false);
    }
  }

  return (
    <section className="admin-shell">
      {/* Toast */}
      {toast && (
        <div className={`nl2-toast${toast.type === "error" ? " nl2-toast-error" : ""}`}>
          <span className="nl2-toast-icon">{toast.type === "error" ? "\u2717" : "\u2713"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ══ Approve Modal ══ */}
      <Modal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="入会申込を承認しますか？"
        width="480px"
        footer={<>
          <Button variant="secondary" onClick={() => setApproveTarget(null)}>キャンセル</Button>
          <Button variant="primary" onClick={confirmApprove} disabled={approveSubmitting}>
            {approveSubmitting ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> 承認中...</>
            ) : "承認する"}
          </Button>
        </>}
      >
        {approveTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Applicant summary */}
              <div style={{
                padding: "12px 16px", borderRadius: "var(--radius)",
                background: "var(--color-border)", border: "1px solid var(--color-border)",
                display: "grid", gap: 4,
              }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: "var(--color-text-secondary)", marginRight: 8 }}>申込者:</span>
                  <span style={{ fontWeight: 600 }}>{fullName(approveTarget)}</span>
                </div>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: "var(--color-text-secondary)", marginRight: 8 }}>メール:</span>
                  <span>{approveTarget.email || "-"}</span>
                </div>
              </div>

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

              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>
                ※ 承認すると会員として登録され、会費レコードが自動生成されます。
              </p>

              {approveError && (
                <div style={{ padding: "8px 12px", borderRadius: "var(--radius)", background: "#fee2e2", color: "#991b1b", fontSize: 13 }}>
                  {approveError}
                </div>
              )}
          </div>
        )}
      </Modal>

      {/* ══ Reject Modal ══ */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="入会申込を却下しますか？"
        width="480px"
        footer={<>
          <Button variant="secondary" onClick={() => setRejectTarget(null)}>キャンセル</Button>
          <Button
            variant="danger"
            onClick={confirmReject}
            disabled={rejectSubmitting}
            style={{ background: "var(--color-danger)", color: "#fff", border: "none" }}
          >
            {rejectSubmitting ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} /> 却下中...</>
            ) : "却下する"}
          </Button>
        </>}
      >
        {rejectTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                padding: "12px 16px", borderRadius: "var(--radius)",
                background: "var(--color-border)", border: "1px solid var(--color-border)",
                fontSize: 13,
              }}>
                <span style={{ color: "var(--color-text-secondary)", marginRight: 8 }}>申込者:</span>
                <span style={{ fontWeight: 600 }}>{fullName(rejectTarget)}</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  却下理由（任意）
                </label>
                <textarea
                  rows={3}
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
        )}
      </Modal>

      {/* Page Header */}
      {isViewMode && (
        <div style={{ marginBottom: 8 }}>
          <Link to="/admin/meetings" className="text-link" style={{ fontSize: 13 }}>&larr; 幹事会に戻る</Link>
        </div>
      )}
      {isMobile ? (
        <div style={{ padding: '0 0 12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              <h1 className="page-title" style={{ margin: 0, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                入会申込管理{isViewMode ? "（閲覧）" : ""}
              </h1>
              {!loading && statusCounts["申請中"] > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '3px 10px', borderRadius: '999px',
                  background: '#fee2e2', color: '#dc2626',
                  fontSize: '12px', fontWeight: 700, flexShrink: 0,
                }}>
                  {statusCounts["申請中"]}
                </span>
              )}
            </div>
            <button type="button" onClick={() => setShowFilters(v => !v)} style={{
              width: 36, height: 36, borderRadius: 'var(--radius)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: showFilters ? 'var(--color-accent-light)' : '#fff', cursor: 'pointer',
              color: showFilters ? 'var(--color-accent)' : 'var(--color-text-secondary)', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      ) : (
        <PageHeader
          title={<>{`入会申込管理${isViewMode ? "（閲覧モード）" : ""}`}{!loading && statusCounts["申請中"] > 0 && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 12px",
                borderRadius: "999px",
                background: "#fee2e2",
                color: "#dc2626",
                fontSize: "13px",
                fontWeight: 700,
                marginLeft: 12,
              }}>
                {statusCounts["申請中"]}件 未処理
              </span>
            )}</>}
        />
      )}

      {/* Search + Filters */}
      {isMobile ? (
        showFilters && (
          <div style={{
            padding: '12px 16px', marginBottom: 8,
            borderRadius: 'var(--radius)', border: '1px solid var(--color-border)',
            background: 'var(--bg)',
          }}>
            {/* Search bar */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }}>
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="氏名・会社名で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', fontSize: 13 }}
              />
            </div>
            {/* Status pills */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`nl2-pill-tab${statusFilter === tab.key ? ' active' : ''}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                  <span className="nl2-pill-tab-count">{statusCounts[tab.key] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="card panel-card single-panel" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ padding: 20 }}>
            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <svg style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                width: 16, height: 16, color: "var(--color-text-secondary)", pointerEvents: "none",
              }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="氏名・会社名で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius)",
                  fontSize: "14px",
                  background: "#fff",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              />
            </div>

            {/* Pill tabs */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginRight: 4 }}>ステータス</span>
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`nl2-pill-tab${statusFilter === tab.key ? " active" : ""}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                  <span className="nl2-pill-tab-count">{statusCounts[tab.key] || 0}</span>
                </button>
              ))}

              <span style={{
                marginLeft: "auto",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-text-secondary)",
              }}>
                {filteredMembers.length}件表示中
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "var(--radius)",
          background: "#fee2e2",
          color: "#991b1b",
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "16px",
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ display: "grid", gap: 12 }}>
          <SkeletonCard height={56} />
          <SkeletonCard height={56} />
          <SkeletonCard height={56} />
        </div>
      ) : !error && filteredMembers.length === 0 ? (
        <div className="card panel-card single-panel">
          <div className="card-body" style={{ padding: "60px 20px", textAlign: "center" }}>
            <svg style={{ width: 48, height: 48, color: "var(--color-text-tertiary)", margin: "0 auto 16px", display: "block", opacity: 0.4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)", margin: 0 }}>該当する申込はありません。</p>
          </div>
        </div>
      ) : !error && isMobile ? (
        /* ── Mobile: Card List ── */
        <>
          <div className="mobile-card-list">
            {filteredMembers.map((item) => {
              const isPending = item.approval_status === "申請中";
              return (
                <div
                  className="mobile-card-item"
                  key={item.id}
                  onClick={() => navigate(`/admin/applications/${item.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="mobile-card-item-header">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{displayValue(fullName(item))}</span>
                    {renderStatusBadge(item.approval_status)}
                  </div>
                  <div className="mobile-card-item-row">
                    <span className="mobile-card-item-label">フリガナ</span>
                    <span>{displayValue(fullNameKana(item))}</span>
                  </div>
                  <div className="mobile-card-item-row">
                    <span className="mobile-card-item-label">申込日</span>
                    <span>{item.applied_at ? item.applied_at.slice(0, 10).replace(/-/g, '/') : "-"}</span>
                  </div>
                  <div className="mobile-card-item-row">
                    <span className="mobile-card-item-label">会社名</span>
                    <span>{displayValue(item.company_name)}</span>
                  </div>
                  <div className="mobile-card-item-row">
                    <span className="mobile-card-item-label">紹介者</span>
                    <span>
                      {displayValue(item.referrer_1)}
                      {item.referrer_2 ? `, ${item.referrer_2}` : ""}
                    </span>
                  </div>
                  <div className="mobile-card-item-actions" onClick={(e) => e.stopPropagation()}>
                    {isPending && !isViewMode && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => openApproveModal(item, e)}
                          style={{
                            padding: "6px 16px", borderRadius: "var(--radius-sm)",
                            fontSize: 13, fontWeight: 600,
                            background: "#ecfdf5", color: "#059669",
                            border: "1px solid #a7f3d0",
                            cursor: "pointer",
                          }}
                        >
                          承認
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openRejectModal(item, e)}
                          style={{
                            padding: "6px 16px", borderRadius: "var(--radius-sm)",
                            fontSize: 13, fontWeight: 600,
                            background: "#fff", color: "#991b1b",
                            border: "1px solid #fecaca",
                            cursor: "pointer",
                          }}
                        >
                          却下
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/applications/${item.id}`); }}
                      style={{
                        padding: "6px 16px", borderRadius: "var(--radius-sm)",
                        fontSize: 13, fontWeight: 500,
                        background: "transparent", color: "var(--color-accent)",
                        border: "none", cursor: "pointer",
                      }}
                    >
                      詳細
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{
            textAlign: "center",
            padding: "12px 20px",
            fontSize: 12,
            color: "var(--color-text-secondary)",
            marginTop: 8,
          }}>
            全 {filteredMembers.length} 件
          </div>
        </>
      ) : !error && (
        /* ── Desktop: Table ── */
        <div className="card panel-card single-panel">
          <div className="table-wrap" style={{ overflow: "auto" }}>
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ width: 100, whiteSpace: "nowrap" }}>申込日</th>
                  <th style={{ minWidth: 120 }}>氏名</th>
                  <th style={{ minWidth: 100 }}>フリガナ</th>
                  <th style={{ minWidth: 140 }}>会社名</th>
                  <th style={{ minWidth: 100 }}>紹介者</th>
                  <th style={{ width: 90 }}>ステータス</th>
                  <th style={{ width: 180, whiteSpace: "nowrap", textAlign: "right" }}>アクション</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((item) => {
                  const isPending = item.approval_status === "申請中";
                  return (
                    <tr
                      key={item.id}
                      style={{ cursor: "pointer", transition: "background 0.12s" }}
                      onClick={() => navigate(`/admin/applications/${item.id}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-accent-light)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                    >
                      <td style={{ fontVariantNumeric: "tabular-nums", fontSize: 13, color: "var(--color-text-secondary)" }}>
                        {item.applied_at ? item.applied_at.slice(0, 10).replace(/-/g, '/') : "-"}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          {displayValue(fullName(item))}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                        {displayValue(fullNameKana(item))}
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {displayValue(item.company_name)}
                      </td>
                      <td style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                        {displayValue(item.referrer_1)}
                        {item.referrer_2 ? `, ${item.referrer_2}` : ""}
                      </td>
                      <td>
                        {renderStatusBadge(item.approval_status)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                          {isPending && !isViewMode && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => openApproveModal(item, e)}
                                style={{
                                  padding: "4px 12px", height: 30, borderRadius: "var(--radius-sm)",
                                  fontSize: 12, fontWeight: 600,
                                  background: "#ecfdf5", color: "#059669",
                                  border: "1px solid #a7f3d0",
                                  cursor: "pointer", transition: "all 0.15s",
                                  whiteSpace: "nowrap",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#d1fae5"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "#ecfdf5"; }}
                              >
                                承認
                              </button>
                              <button
                                type="button"
                                onClick={(e) => openRejectModal(item, e)}
                                style={{
                                  padding: "4px 12px", height: 30, borderRadius: "var(--radius-sm)",
                                  fontSize: 12, fontWeight: 600,
                                  background: "#fff", color: "#991b1b",
                                  border: "1px solid #fecaca",
                                  cursor: "pointer", transition: "all 0.15s",
                                  whiteSpace: "nowrap",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                              >
                                却下
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/applications/${item.id}`); }}
                            style={{
                              padding: "4px 12px", height: 30, borderRadius: "var(--radius-sm)",
                              fontSize: 12, fontWeight: 500,
                              background: "transparent", color: "var(--color-accent)",
                              border: "none", cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            詳細
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{
            textAlign: "center",
            padding: "12px 20px",
            borderTop: "1px solid var(--color-border)",
            fontSize: 12,
            color: "var(--color-text-secondary)",
          }}>
            全 {filteredMembers.length} 件
          </div>
        </div>
      )}

      {/* fadeIn keyframe */}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`}</style>
    </section>
  );
}
