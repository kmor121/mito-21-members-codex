import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

function MemberImage({ src, name, size = "detail" }) {
  const initial = (name || "M").charAt(0);
  if (src) return <div className={`member-image member-image-${size}`}><img src={src} alt={name || ""} loading="lazy" /></div>;
  return <div className={`member-image member-image-${size} is-placeholder`}><span>{initial}</span></div>;
}

function statusPillClass(status) {
  if (status === "承認済") return " pill-success";
  if (status === "却下") return " pill-danger";
  return " pill-warning";
}

const STATUS_TABS = [
  { key: "all", label: "すべて" },
  { key: "申請中", label: "申請中" },
  { key: "承認済", label: "承認済" },
  { key: "却下", label: "却下" },
];

export default function Applications() {
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("申請中");

  // Detail modal
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Approve form
  const [memberType, setMemberType] = useState("正会員");
  const [memberNumber, setMemberNumber] = useState("");
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [approveMessage, setApproveMessage] = useState("");
  const [approveMessageType, setApproveMessageType] = useState("");

  // Reject form
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectMessage, setRejectMessage] = useState("");
  const [rejectMessageType, setRejectMessageType] = useState("");

  // Confirmation modals
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const loadPending = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("list-pending-members");
      const raw = result.members || result.pending;
      const list = Array.isArray(raw) ? raw : [];
      list.sort((a, b) => {
        const da = a.applied_at || "";
        const db = b.applied_at || "";
        return db.localeCompare(da);
      });
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
    if (statusFilter === "all") return allMembers;
    return allMembers.filter((m) => m.approval_status === statusFilter);
  }, [allMembers, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: allMembers.length, "申請中": 0, "承認済": 0, "却下": 0 };
    for (const m of allMembers) {
      const s = m.approval_status || "";
      if (counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [allMembers]);

  async function loadDetail(id) {
    setSelectedId(id);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    setApproveMessage("");
    setRejectMessage("");
    setMemberType("正会員");
    setMemberNumber("");
    setRejectionReason("");
    setShowApproveConfirm(false);
    setShowRejectConfirm(false);
    setShowDetailModal(true);

    try {
      const result = await apiRequest(`get-member-detail?id=${encodeURIComponent(id)}`);
      const d = result.member || result;
      setDetail(d);
      try {
        const numRes = await apiRequest("generate-member-number");
        setMemberNumber(numRes.suggested_number || numRes.member_number || "");
      } catch { /* ignore */ }
    } catch (err) {
      setDetailError(err.message || "詳細の取得に失敗しました。");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetailModal() {
    setShowDetailModal(false);
    setSelectedId(null);
    setDetail(null);
  }

  function handleApproveClick(e) {
    e.preventDefault();
    setApproveMessage("");
    setApproveMessageType("");
    if (!memberNumber.trim()) {
      setApproveMessage("会員番号を入力してください。");
      setApproveMessageType("error");
      return;
    }
    setShowApproveConfirm(true);
  }

  async function confirmApprove() {
    setShowApproveConfirm(false);
    setApproveSubmitting(true);
    try {
      await apiRequest("approve-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          member_type: memberType,
          member_number: memberNumber.trim(),
        }),
      });
      setApproveMessage("承認しました。");
      setApproveMessageType("success");
      closeDetailModal();
      await loadPending();
    } catch (err) {
      setApproveMessage(err.message || "承認に失敗しました。");
      setApproveMessageType("error");
    } finally {
      setApproveSubmitting(false);
    }
  }

  function handleRejectClick(e) {
    e.preventDefault();
    setRejectMessage("");
    setRejectMessageType("");
    if (!rejectionReason.trim()) {
      setRejectMessage("却下理由を入力してください。");
      setRejectMessageType("error");
      return;
    }
    setShowRejectConfirm(true);
  }

  async function confirmReject() {
    setShowRejectConfirm(false);
    setRejectSubmitting(true);
    try {
      await apiRequest("reject-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          rejection_reason: rejectionReason.trim(),
        }),
      });
      setRejectMessage("却下しました。");
      setRejectMessageType("success");
      closeDetailModal();
      await loadPending();
    } catch (err) {
      setRejectMessage(err.message || "却下に失敗しました。");
      setRejectMessageType("error");
    } finally {
      setRejectSubmitting(false);
    }
  }

  const isPending = detail?.approval_status === "申請中";

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">入会申込管理</h1>
        <p className="page-description">入会申込の承認・却下</p>
      </div>

      {/* Approve confirmation modal */}
      {showApproveConfirm && (
        <div className="confirm-overlay" onClick={() => setShowApproveConfirm(false)}>
          <div className="modal-dialog" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>承認確認</h3>
              <button type="button" className="modal-close" onClick={() => setShowApproveConfirm(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1.05em', marginBottom: '0.75rem' }}>
                <strong>{detail?.name_kanji}</strong>さんを<strong>{memberType}</strong>として承認しますか？
              </p>
              <dl className="detail-grid" style={{ fontSize: '0.9em' }}>
                <div><dt>会員番号</dt><dd>{memberNumber}</dd></div>
                <div><dt>会員種別</dt><dd>{memberType}</dd></div>
              </dl>
            </div>
            <div className="modal-footer">
              <button className="button" type="button" onClick={confirmApprove}>承認する</button>
              <button className="button ghost" type="button" onClick={() => setShowApproveConfirm(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject confirmation modal */}
      {showRejectConfirm && (
        <div className="confirm-overlay" onClick={() => setShowRejectConfirm(false)}>
          <div className="modal-dialog" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>却下確認</h3>
              <button type="button" className="modal-close" onClick={() => setShowRejectConfirm(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1.05em', marginBottom: '0.75rem' }}>
                <strong>{detail?.name_kanji}</strong>さんの申込を却下してよろしいですか？
              </p>
              <div style={{ background: 'var(--bg)', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.9em' }}>
                <strong>却下理由:</strong>
                <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{rejectionReason}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="button" type="button" style={{ background: '#c53030', borderColor: '#c53030' }} onClick={confirmReject}>却下する</button>
              <button className="button ghost" type="button" onClick={() => setShowRejectConfirm(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* Status tab bar */}
      <div className="tab-bar" style={{ marginBottom: '1rem' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-button${statusFilter === tab.key ? " is-active" : ""}`}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
            <span className="pill" style={{ marginLeft: 6, fontSize: '0.8em' }}>{statusCounts[tab.key] || 0}</span>
          </button>
        ))}
        <button className="button ghost" type="button" onClick={loadPending} style={{ marginLeft: 'auto', fontSize: '0.85em' }}>再読込</button>
      </div>

      {loading ? (
        <section className="card panel-card single-panel"><div className="card-body"><LoadingSpinner /></div></section>
      ) : error ? (
        <section className="card panel-card single-panel"><div className="card-body"><p className="message error">{error}</p></div></section>
      ) : (
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>申込一覧 ({filteredMembers.length}件)</h2></div>
            </div>

            {filteredMembers.length === 0 ? (
              <p className="muted">該当する申込はありません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>氏名</th>
                      <th>会社名</th>
                      <th>申込日</th>
                      <th>紹介者1</th>
                      <th>紹介者2</th>
                      <th>ステータス</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((item) => (
                      <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => loadDetail(item.id)}>
                        <td><strong>{displayValue(item.name_kanji)}</strong></td>
                        <td>{displayValue(item.company_name)}</td>
                        <td>{item.applied_at ? item.applied_at.slice(0, 10) : "-"}</td>
                        <td>{displayValue(item.referrer_1)}</td>
                        <td>{displayValue(item.referrer_2)}</td>
                        <td>
                          <span className={`pill${statusPillClass(item.approval_status)}`}>
                            {displayValue(item.approval_status)}
                          </span>
                        </td>
                        <td>
                          <button className="text-link" type="button" onClick={(e) => { e.stopPropagation(); loadDetail(item.id); }}>
                            詳細
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="confirm-overlay" onClick={closeDetailModal}>
          <div className="modal-dialog" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>申込詳細</h3>
              <button type="button" className="modal-close" onClick={closeDetailModal}>&times;</button>
            </div>
            <div className="modal-body">
              {detailLoading ? (
                <LoadingSpinner />
              ) : detailError ? (
                <p className="message error">{detailError}</p>
              ) : detail ? (
                <div className="stack">
                  {/* Header card */}
                  <section className="detail-card stack-sm">
                    <div className="detail-header-row">
                      <div>
                        <h3>{displayValue(detail.name_kanji)}</h3>
                        <span className="muted" style={{ fontSize: '0.9em' }}>{displayValue(detail.name_kana)}</span>
                      </div>
                      <MemberImage src={detail.profile_image} name={detail.name_kanji} size="thumb" />
                    </div>
                    <div className="pill-row" style={{ marginTop: '0.5rem' }}>
                      <span className={`pill${statusPillClass(detail.approval_status)}`}>
                        {displayValue(detail.approval_status)}
                      </span>
                      {detail.applied_at && (
                        <span className="muted" style={{ fontSize: '0.85em' }}>
                          申込日: {detail.applied_at.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </section>

                  {/* Personal info */}
                  <section className="detail-card stack-sm">
                    <h3>個人情報</h3>
                    <dl className="detail-grid">
                      <div><dt>生年月日</dt><dd>{displayValue(detail.birthday)}</dd></div>
                      <div><dt>メール</dt><dd>{displayValue(detail.email)}</dd></div>
                      <div><dt>携帯番号</dt><dd>{displayValue(detail.mobile_phone)}</dd></div>
                    </dl>
                  </section>

                  {/* Company info */}
                  <section className="detail-card stack-sm">
                    <h3>会社情報</h3>
                    <dl className="detail-grid">
                      <div><dt>会社名</dt><dd>{displayValue(detail.company_name)}</dd></div>
                      <div><dt>役職名</dt><dd>{displayValue(detail.company_position)}</dd></div>
                      <div><dt>業種</dt><dd>{displayValue(detail.industry)}</dd></div>
                      <div><dt>会社電話</dt><dd>{displayValue(detail.company_phone)}</dd></div>
                      {detail.company_address && <div><dt>会社住所</dt><dd>{displayValue(detail.company_address)}</dd></div>}
                    </dl>
                  </section>

                  {/* Referrer matches */}
                  <section className="detail-card stack-sm">
                    <h3>紹介者照合</h3>
                    <dl className="detail-grid">
                      <div>
                        <dt>紹介者1</dt>
                        <dd>
                          {displayValue(detail.referrer_1)}{" "}
                          {(() => {
                            const m = detail.referrer_matches?.referrer_1;
                            const arr = m ? (Array.isArray(m) ? m : [m]) : [];
                            if (arr.length > 0) {
                              return <span className="pill pill-success" style={{ fontSize: '0.8em' }}>一致: {arr.map(x => x.name_kanji || "-").join(", ")}</span>;
                            }
                            return <span className="pill pill-warning" style={{ fontSize: '0.8em' }}>未マッチ</span>;
                          })()}
                        </dd>
                      </div>
                      <div>
                        <dt>紹介者2</dt>
                        <dd>
                          {displayValue(detail.referrer_2)}{" "}
                          {(() => {
                            const m = detail.referrer_matches?.referrer_2;
                            const arr = m ? (Array.isArray(m) ? m : [m]) : [];
                            if (arr.length > 0) {
                              return <span className="pill pill-success" style={{ fontSize: '0.8em' }}>一致: {arr.map(x => x.name_kanji || "-").join(", ")}</span>;
                            }
                            return <span className="pill pill-warning" style={{ fontSize: '0.8em' }}>未マッチ</span>;
                          })()}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  {/* Approve form - only show for pending */}
                  {isPending && (
                    <section className="detail-card stack-sm">
                      <h3>承認</h3>
                      <form className="editor-form" noValidate onSubmit={handleApproveClick}>
                        <div className="editor-grid">
                          <div className="field">
                            <label htmlFor="app-member-type">会員種別</label>
                            <select id="app-member-type" value={memberType} onChange={(e) => setMemberType(e.target.value)}>
                              <option value="正会員">正会員</option>
                              <option value="賛助会員">賛助会員</option>
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor="app-member-number">会員番号</label>
                            <input id="app-member-number" type="text" value={memberNumber}
                              onChange={(e) => setMemberNumber(e.target.value)} placeholder="自動採番済み" />
                          </div>
                        </div>
                        {approveMessage && (
                          <p className={`message ${approveMessageType}`} aria-live="polite">{approveMessage}</p>
                        )}
                        <div className="actions">
                          <button className="button" type="submit" disabled={approveSubmitting}>
                            {approveSubmitting ? "処理中..." : "承認する"}
                          </button>
                        </div>
                      </form>
                    </section>
                  )}

                  {/* Reject form */}
                  {isPending && (
                    <section className="detail-card stack-sm">
                      <h3>却下</h3>
                      <form className="editor-form" noValidate onSubmit={handleRejectClick}>
                        <div className="editor-grid">
                          <div className="field field-span-2">
                            <label htmlFor="app-rejection-reason">却下理由 *</label>
                            <textarea id="app-rejection-reason" rows="3" value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="却下理由を入力してください（必須）" />
                          </div>
                        </div>
                        {rejectMessage && (
                          <p className={`message ${rejectMessageType}`} aria-live="polite">{rejectMessage}</p>
                        )}
                        <div className="actions">
                          <button className="button" type="submit" disabled={rejectSubmitting} style={{ background: '#c53030', borderColor: '#c53030' }}>
                            {rejectSubmitting ? "処理中..." : "却下する"}
                          </button>
                        </div>
                      </form>
                    </section>
                  )}

                  {/* Show rejection reason */}
                  {detail.approval_status === "却下" && detail.rejection_reason && (
                    <section className="detail-card stack-sm">
                      <h3>却下理由</h3>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{detail.rejection_reason}</p>
                    </section>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
