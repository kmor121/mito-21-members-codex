import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest, base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

function statusPillClass(status) {
  if (status === "承認済") return " pill-success";
  if (status === "却下") return " pill-danger";
  return " pill-warning";
}

function MemberImage({ src, name, size = "detail" }) {
  const initial = (name || "M").charAt(0);
  if (src) return <div className={`member-image member-image-${size}`}><img src={src} alt={name || ""} loading="lazy" /></div>;
  return <div className={`member-image member-image-${size} is-placeholder`}><span>{initial}</span></div>;
}

export default function ApplicationDetail() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

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
          id: applicationId,
          member_type: memberType,
          member_number: memberNumber.trim(),
        }),
      });
      setApproveMessage("承認しました。");
      setApproveMessageType("success");
      setTimeout(() => navigate("/admin/applications"), 1500);
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
          id: applicationId,
          rejection_reason: rejectionReason.trim(),
        }),
      });
      setRejectMessage("却下しました。");
      setRejectMessageType("success");
      setTimeout(() => navigate("/admin/applications"), 1500);
    } catch (err) {
      setRejectMessage(err.message || "却下に失敗しました。");
      setRejectMessageType("error");
    } finally {
      setRejectSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">申込詳細</h1>
          <p className="page-description">
            <Link className="text-link" to="/admin/applications">&larr; 申込一覧へ戻る</Link>
          </p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body"><LoadingSpinner /></div>
        </section>
      </section>
    );
  }

  if (error || !detail) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">申込詳細</h1>
          <p className="page-description">
            <Link className="text-link" to="/admin/applications">&larr; 申込一覧へ戻る</Link>
          </p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body"><p className="message error">{error || "データを取得できませんでした"}</p></div>
        </section>
      </section>
    );
  }

  const isPending = detail.approval_status === "申請中";

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">申込詳細</h1>
        <p className="page-description">
          <Link className="text-link" to="/admin/applications">&larr; 申込一覧へ戻る</Link>
        </p>
      </div>

      {/* Approve confirmation modal */}
      {showApproveConfirm && (
        <div className="confirm-overlay" style={{ zIndex: 10001 }} onClick={() => setShowApproveConfirm(false)}>
          <div className="modal-dialog" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>承認確認</h3>
              <button type="button" className="modal-close" onClick={() => setShowApproveConfirm(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1.05em', marginBottom: '0.75rem' }}>
                <strong>{detail.name_kanji}</strong>さんを<strong>{memberType}</strong>として承認しますか？
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
        <div className="confirm-overlay" style={{ zIndex: 10001 }} onClick={() => setShowRejectConfirm(false)}>
          <div className="modal-dialog" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>却下確認</h3>
              <button type="button" className="modal-close" onClick={() => setShowRejectConfirm(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1.05em', marginBottom: '0.75rem' }}>
                <strong>{detail.name_kanji}</strong>さんの申込を却下してよろしいですか？
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

      {/* Header card */}
      <section className="card panel-card" style={{ marginBottom: '1rem' }}>
        <div className="card-body stack">
          <section className="detail-card stack-sm">
            <div className="detail-header-row">
              <div>
                <h3>{displayValue(detail.name_kanji)}</h3>
                <span className="muted" style={{ fontSize: '0.9em' }}>{displayValue(detail.name_kana)}</span>
              </div>
              <MemberImage src={detail.profile_image} name={detail.name_kanji} size="thumb" />
            </div>
            <div className="pill-row" style={{ marginTop: '0.5rem', justifyContent: 'flex-start' }}>
              <span className={`pill${statusPillClass(detail.approval_status)}`}>
                {displayValue(detail.approval_status)}
              </span>
              {detail.company_name && <span className="muted" style={{ fontSize: '0.85em' }}>{detail.company_name}</span>}
              {detail.applied_at && (
                <span className="muted" style={{ fontSize: '0.85em' }}>
                  申込日: {detail.applied_at.slice(0, 10)}
                </span>
              )}
            </div>
          </section>
        </div>
      </section>

      {/* Personal info */}
      <section className="card panel-card" style={{ marginBottom: '1rem' }}>
        <div className="card-body stack">
          <div className="panel-heading"><div><h2>個人情報</h2></div></div>
          <dl className="detail-grid">
            <div><dt>氏名</dt><dd>{displayValue(detail.name_kanji)}</dd></div>
            <div><dt>フリガナ</dt><dd>{displayValue(detail.name_kana)}</dd></div>
            <div><dt>生年月日</dt><dd>{displayValue(detail.birthday)}</dd></div>
            <div><dt>メール</dt><dd>{displayValue(detail.email)}</dd></div>
            <div><dt>携帯番号</dt><dd>{displayValue(detail.mobile_phone)}</dd></div>
          </dl>
        </div>
      </section>

      {/* Company info */}
      <section className="card panel-card" style={{ marginBottom: '1rem' }}>
        <div className="card-body stack">
          <div className="panel-heading"><div><h2>会社情報</h2></div></div>
          <dl className="detail-grid">
            <div><dt>会社名</dt><dd>{displayValue(detail.company_name)}</dd></div>
            <div><dt>役職名</dt><dd>{displayValue(detail.company_position)}</dd></div>
            <div><dt>業種</dt><dd>{displayValue(detail.industry)}</dd></div>
            <div><dt>会社電話</dt><dd>{displayValue(detail.company_phone)}</dd></div>
            {detail.company_postal_code && <div><dt>会社郵便番号</dt><dd>{displayValue(detail.company_postal_code)}</dd></div>}
            {detail.company_address && <div><dt>会社住所</dt><dd>{displayValue(detail.company_address)}</dd></div>}
          </dl>
        </div>
      </section>

      {/* Referrer matches */}
      <section className="card panel-card" style={{ marginBottom: '1rem' }}>
        <div className="card-body stack">
          <div className="panel-heading"><div><h2>紹介者照合</h2></div></div>
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
        </div>
      </section>

      {/* Approve form - only for pending */}
      {isPending && (
        <section className="card panel-card" style={{ marginBottom: '1rem' }}>
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>承認</h2></div></div>
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
          </div>
        </section>
      )}

      {/* Reject form */}
      {isPending && (
        <section className="card panel-card" style={{ marginBottom: '1rem' }}>
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>却下</h2></div></div>
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
          </div>
        </section>
      )}

      {/* Show rejection reason for rejected */}
      {detail.approval_status === "却下" && detail.rejection_reason && (
        <section className="card panel-card">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>却下理由</h2></div></div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{detail.rejection_reason}</p>
          </div>
        </section>
      )}
    </section>
  );
}
