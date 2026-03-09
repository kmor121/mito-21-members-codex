import { useState, useEffect, useCallback } from 'react';
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

export default function Applications() {
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Selected item
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

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

  const loadPending = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("list-pending-members");
      const raw = result.members || result.pending;
      setPendingList(Array.isArray(raw) ? raw : []);
    } catch (err) {
      setError(err.message || "申込一覧の取得に失敗しました。");
      setPendingList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

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

    try {
      const result = await apiRequest(`get-member-detail?id=${encodeURIComponent(id)}`);
      setDetail(result.member || result);
    } catch (err) {
      setDetailError(err.message || "詳細の取得に失敗しました。");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAutoGenerate() {
    try {
      const result = await apiRequest("generate-member-number");
      setMemberNumber(result.suggested_number || result.member_number || "");
    } catch (err) {
      setApproveMessage(err.message || "番号生成に失敗しました。");
      setApproveMessageType("error");
    }
  }

  async function handleApprove(e) {
    e.preventDefault();
    setApproveMessage("");
    setApproveMessageType("");

    if (!memberNumber.trim()) {
      setApproveMessage("会員番号を入力してください。");
      setApproveMessageType("error");
      return;
    }

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
      setDetail(null);
      setSelectedId(null);
      await loadPending();
    } catch (err) {
      setApproveMessage(err.message || "承認に失敗しました。");
      setApproveMessageType("error");
    } finally {
      setApproveSubmitting(false);
    }
  }

  async function handleReject(e) {
    e.preventDefault();
    setRejectMessage("");
    setRejectMessageType("");

    if (!rejectionReason.trim()) {
      setRejectMessage("却下理由を入力してください。");
      setRejectMessageType("error");
      return;
    }

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
      setDetail(null);
      setSelectedId(null);
      await loadPending();
    } catch (err) {
      setRejectMessage(err.message || "却下に失敗しました。");
      setRejectMessageType("error");
    } finally {
      setRejectSubmitting(false);
    }
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">入会申込管理</h1>
        <p className="page-description">入会申込の承認・却下</p>
      </div>

      <div className="admin-grid admin-grid-wide">
        {/* Left panel: pending list */}
        <section className="card panel-card">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>申込一覧</h2></div>
              <button className="button ghost" type="button" onClick={loadPending}>再読込</button>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <p className="message error">{error}</p>
            ) : pendingList.length === 0 ? (
              <p className="muted">未処理の申込はありません。</p>
            ) : (
              <div className="pending-list">
                {pendingList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`basic-info-document${selectedId === item.id ? " is-active" : ""}`}
                    onClick={() => loadDetail(item.id)}
                  >
                    <div>
                      <strong>{displayValue(item.name_kanji)}</strong>
                      <span className="muted" style={{ marginLeft: "0.5rem" }}>
                        {displayValue(item.company_name)}
                      </span>
                    </div>
                    <div>
                      <span className="muted">{item.applied_at || "-"}</span>
                      <span className="pill" style={{ marginLeft: "0.5rem" }}>
                        {displayValue(item.approval_status)}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: "0.85em" }}>
                      紹介者: {displayValue(item.referrer_1)} / {displayValue(item.referrer_2)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right panel: detail */}
        <section className="card panel-card">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>申込詳細</h2></div></div>

            {!selectedId ? (
              <p className="muted">左の一覧から申込を選択してください。</p>
            ) : detailLoading ? (
              <LoadingSpinner />
            ) : detailError ? (
              <p className="message error">{detailError}</p>
            ) : detail ? (
              <>
                {/* Member info */}
                <section className="detail-card stack-sm">
                  <div className="detail-header-row">
                    <div>
                      <h3>{displayValue(detail.name_kanji)}</h3>
                    </div>
                    <MemberImage src={detail.profile_image} name={detail.name_kanji} size="thumb" />
                  </div>
                  <dl className="detail-grid">
                    <div><dt>申込日</dt><dd>{displayValue(detail.applied_at)}</dd></div>
                    <div><dt>フリガナ</dt><dd>{displayValue(detail.name_kana)}</dd></div>
                    <div><dt>生年月日</dt><dd>{displayValue(detail.birthday)}</dd></div>
                    <div><dt>会社名</dt><dd>{displayValue(detail.company_name)}</dd></div>
                    <div><dt>メール</dt><dd>{displayValue(detail.email)}</dd></div>
                    <div><dt>携帯番号</dt><dd>{displayValue(detail.mobile_phone)}</dd></div>
                    <div><dt>紹介者1</dt><dd>{displayValue(detail.referrer_1)}</dd></div>
                    <div><dt>紹介者2</dt><dd>{displayValue(detail.referrer_2)}</dd></div>
                  </dl>
                </section>

                {/* Referrer matches */}
                {detail.referrer_matches && (
                  <section className="detail-card stack-sm">
                    <h3>紹介者マッチ結果</h3>
                    {detail.referrer_matches.referrer_1 && (
                      <div>
                        <strong>紹介者1マッチ:</strong>{" "}
                        {Array.isArray(detail.referrer_matches.referrer_1)
                          ? detail.referrer_matches.referrer_1.map((m, i) => (
                              <span key={i}>
                                {m.name_kanji || "-"} ({m.company_name || "-"})
                                {i < detail.referrer_matches.referrer_1.length - 1 ? ", " : ""}
                              </span>
                            ))
                          : (
                              <span>
                                {detail.referrer_matches.referrer_1.name_kanji || "-"} ({detail.referrer_matches.referrer_1.company_name || "-"})
                              </span>
                            )
                        }
                      </div>
                    )}
                    {detail.referrer_matches.referrer_2 && (
                      <div>
                        <strong>紹介者2マッチ:</strong>{" "}
                        {Array.isArray(detail.referrer_matches.referrer_2)
                          ? detail.referrer_matches.referrer_2.map((m, i) => (
                              <span key={i}>
                                {m.name_kanji || "-"} ({m.company_name || "-"})
                                {i < detail.referrer_matches.referrer_2.length - 1 ? ", " : ""}
                              </span>
                            ))
                          : (
                              <span>
                                {detail.referrer_matches.referrer_2.name_kanji || "-"} ({detail.referrer_matches.referrer_2.company_name || "-"})
                              </span>
                            )
                        }
                      </div>
                    )}
                    {!detail.referrer_matches.referrer_1 && !detail.referrer_matches.referrer_2 && (
                      <p className="muted">マッチする紹介者が見つかりませんでした。</p>
                    )}
                  </section>
                )}

                {/* Approve form */}
                <section className="detail-card stack-sm">
                  <h3>承認</h3>
                  <form className="editor-form" noValidate onSubmit={handleApprove}>
                    <div className="editor-grid">
                      <div className="field">
                        <label htmlFor="app-member-type">会員種別</label>
                        <select
                          id="app-member-type"
                          value={memberType}
                          onChange={(e) => setMemberType(e.target.value)}
                        >
                          <option value="正会員">正会員</option>
                          <option value="賛助会員">賛助会員</option>
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor="app-member-number">会員番号</label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            id="app-member-number"
                            type="text"
                            value={memberNumber}
                            onChange={(e) => setMemberNumber(e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button
                            className="button ghost"
                            type="button"
                            onClick={handleAutoGenerate}
                          >
                            自動生成
                          </button>
                        </div>
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

                {/* Reject form */}
                <section className="detail-card stack-sm">
                  <h3>却下</h3>
                  <form className="editor-form" noValidate onSubmit={handleReject}>
                    <div className="editor-grid">
                      <div className="field field-span-2">
                        <label htmlFor="app-rejection-reason">却下理由</label>
                        <textarea
                          id="app-rejection-reason"
                          rows="3"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                        />
                      </div>
                    </div>
                    {rejectMessage && (
                      <p className={`message ${rejectMessageType}`} aria-live="polite">{rejectMessage}</p>
                    )}
                    <div className="actions">
                      <button className="button" type="submit" disabled={rejectSubmitting}>
                        {rejectSubmitting ? "処理中..." : "却下する"}
                      </button>
                    </div>
                  </form>
                </section>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
