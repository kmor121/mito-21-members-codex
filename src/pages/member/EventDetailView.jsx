import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import { useAuth } from '../../contexts/AuthContext';
import { fullName } from '../../utils/formatName';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AttendanceDeadlineBadge from '../../components/ui/AttendanceDeadlineBadge';
import { isAttendanceClosed, getDeadline } from '../../utils/attendanceUtils';
import { useIsMobile } from '../../hooks/useIsMobile';

const TYPE_BADGE = {
  "懇親会": { bg: "#fdf2f8", color: "#db2777", border: "#fbcfe8" },
  "総会":   { bg: "var(--color-accent-light)", color: "var(--color-accent)", border: "#bfdbfe" },
  "例会":   { bg: "var(--color-success-light)", color: "var(--color-success)", border: "#a7f3d0" },
  "セミナー": { bg: "var(--color-warning-light)", color: "var(--color-warning)", border: "#fde68a" },
  "ゴルフ": { bg: "var(--color-success-light)", color: "var(--color-success)", border: "#bbf7d0" },
  "その他": { bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)", border: "var(--color-border)" },
};

const STATUS_BADGE = {
  published: { label: "公開中", bg: "var(--color-accent-light)", color: "var(--color-accent)" },
  closed:    { label: "公開中", bg: "var(--color-accent-light)", color: "var(--color-accent)" },
  completed: { label: "完了", bg: "var(--color-success-light)", color: "var(--color-success)" },
};

function formatEventDate(dateStr, startTime, endTime) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dow = ['日','月','火','水','木','金','土'][d.getDay()];
  let s = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}（${dow}）`;
  if (startTime) s += ` ${startTime}`;
  if (endTime) s += `〜${endTime}`;
  return s;
}

export default function EventDetailView() {
  const { eventId } = useParams();
  const { memberInfo } = useAuth();
  const isMobile = useIsMobile();
  const currentMemberId = memberInfo?.id || memberInfo?._id || '';

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [members, setMembers] = useState([]);
  const [afterParty, setAfterParty] = useState(null);
  const [apAtts, setApAtts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function loadData() {
    try {
      const [evt, atts, allMembers] = await Promise.all([
        base44.entities.Event.get(eventId),
        base44.entities.Attendance.filter({ event_id: eventId }).catch(() => []),
        base44.entities.Member.filter({ approval_status: '承認済' }).catch(() => []),
      ]);
      setEvent(evt);
      setAttendances(atts || []);
      setMembers(allMembers || []);

      // Load after-party
      const aps = await base44.entities.Event.filter({ parent_event_id: eventId, is_after_party: true }).catch(() => []);
      const ap = aps?.[0] || null;
      setAfterParty(ap);
      if (ap) {
        const apA = await base44.entities.Attendance.filter({ event_id: ap.id }).catch(() => []);
        setApAtts(apA || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [eventId]);

  const memberMap = useMemo(() => {
    const m = {};
    members.forEach(mb => { m[mb.id] = mb; });
    return m;
  }, [members]);

  const attMap = useMemo(() => {
    const m = {};
    attendances.forEach(a => { m[a.member_id] = a; });
    return m;
  }, [attendances]);

  const myAtt = attMap[currentMemberId];
  const myResponse = myAtt?.response || '';

  const apAttMap = useMemo(() => {
    const m = {};
    apAtts.forEach(a => { m[a.member_id] = a; });
    return m;
  }, [apAtts]);

  const myApAtt = apAttMap[currentMemberId];
  const myApResponse = myApAtt?.response || '';

  // Response handler
  async function handleResponse(eid, response, isAp = false) {
    if (saving) return;
    setSaving(true);
    const map = isAp ? apAttMap : attMap;
    const existing = map[currentMemberId];
    try {
      if (existing && existing.response === response) {
        await base44.entities.Attendance.delete(existing.id);
        invalidateReadCache('Attendance');
        showToast('回答を取り消しました');
      } else if (existing) {
        await base44.entities.Attendance.update(existing.id, {
          response, status: response, responded_at: new Date().toISOString(),
        });
        invalidateReadCache('Attendance');
        showToast('回答を変更しました');
      } else {
        const check = await base44.entities.Attendance.filter({ event_id: eid, member_id: currentMemberId }).catch(() => []);
        if (check?.length > 0) {
          await base44.entities.Attendance.update(check[0].id, {
            response, status: response, responded_at: new Date().toISOString(),
          });
        } else {
          await base44.entities.Attendance.create({
            event_id: eid, member_id: currentMemberId,
            response, status: response, responded_at: new Date().toISOString(),
          });
        }
        invalidateReadCache('Attendance');
        showToast('出欠を回答しました');
      }
      await loadData();
    } catch (err) { showToast(err.message || '回答に失敗しました'); }
    setSaving(false);
  }

  if (loading) {
    return (
      <section className="admin-shell">
        <Link to="/events" className="text-link" style={{ fontSize: 13, marginBottom: 12, display: 'inline-block' }}>← イベント一覧に戻る</Link>
        <LoadingSpinner />
      </section>
    );
  }

  if (!event || event.status === 'draft') {
    return (
      <section className="admin-shell">
        <Link to="/events" className="text-link" style={{ fontSize: 13, marginBottom: 12, display: 'inline-block' }}>← イベント一覧に戻る</Link>
        <div className="card panel-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>このイベントは公開されていません</p>
        </div>
      </section>
    );
  }

  const tb = TYPE_BADGE[event.event_type] || TYPE_BADGE["その他"];
  const sb = STATUS_BADGE[event.status] || STATUS_BADGE.published;
  const isCompleted = event.status === 'completed';
  const closed = isCompleted || isAttendanceClosed(event);
  const responseOptions = Array.isArray(event.response_options) && event.response_options.length >= 2
    ? event.response_options : ['出席', '欠席'];

  const attendList = attendances.filter(a => (a.response || a.status) === '出席');
  const absentList = attendances.filter(a => (a.response || a.status) === '欠席');
  const respondedCount = attendances.length;

  return (
    <section className="admin-shell">
      {toast && <div className="nl2-toast"><span className="nl2-toast-icon">{"\u2713"}</span><span>{toast}</span></div>}

      <Link to="/events" className="text-link" style={{ fontSize: 13, marginBottom: 12, display: 'inline-block' }}>← イベント一覧に戻る</Link>

      {/* ── Header Card (with attendance buttons) ── */}
      <div style={{
        background: 'var(--color-bg)', borderRadius: 16, border: '1px solid var(--color-border)',
        padding: isMobile ? 20 : '28px 32px', marginBottom: 24,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 16, flexWrap: 'wrap',
        }}>
          {/* Left: event info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>
              {event.title}
            </h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: tb.bg, color: tb.color, border: `1px solid ${tb.border}` }}>{event.event_type}</span>
              <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: sb.bg, color: sb.color }}>{sb.label}</span>
              <AttendanceDeadlineBadge deadline={getDeadline(event)} closed={closed} />
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.9 }}>
              <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {formatEventDate(event.event_date, event.start_time, event.end_time)}
              </div>
              {event.location && <div>場所: {event.location}</div>}
              <div>参加費: {event.fee > 0 ? `¥${Number(event.fee).toLocaleString()}` : '無料'}</div>
              {event.capacity > 0 && <div>定員: {event.capacity}名</div>}
            </div>
          </div>

          {/* Right: attendance buttons (compact) */}
          {!isCompleted && (
            <div style={{ flexShrink: 0, textAlign: isMobile ? 'left' : 'right' }}>
              {myResponse && (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  あなたの回答
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                {responseOptions.map(opt => {
                  const sel = myResponse === opt;
                  const isAttend = opt === '出席';
                  const isAbsent = opt === '欠席';
                  return (
                    <button key={opt} type="button"
                      disabled={closed || saving}
                      onClick={() => handleResponse(eventId, opt)}
                      style={{
                        padding: '6px 16px', borderRadius: 8,
                        fontSize: 13, fontWeight: 600,
                        cursor: (closed || saving) ? 'default' : 'pointer',
                        border: sel ? 'none' : '1px solid var(--color-border)',
                        background: sel ? (isAttend ? 'var(--color-success)' : isAbsent ? 'var(--color-danger)' : 'var(--color-accent)') : 'var(--color-bg)',
                        color: sel ? '#fff' : 'var(--color-text-secondary)',
                        transition: 'all 0.15s',
                        opacity: (closed || saving) && !sel ? 0.5 : 1,
                      }}
                    >
                      {sel ? '✓ ' : ''}{opt}
                    </button>
                  );
                })}
              </div>
              {closed && !isCompleted && (
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 6 }}>受付終了</div>
              )}
            </div>
          )}
          {isCompleted && myResponse && (
            <div style={{ flexShrink: 0 }}>
              <span style={{
                display: 'inline-block',
                padding: '5px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: myResponse === '出席' ? 'var(--color-success)' : myResponse === '欠席' ? 'var(--color-danger)' : 'var(--color-accent)',
                color: '#fff',
              }}>
                {myResponse}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      {event.description && (
        <div style={{
          background: 'var(--color-bg)', borderRadius: 16, border: '1px solid var(--color-border)',
          padding: isMobile ? 20 : '28px 32px', marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>詳細</h2>
          <div className="tiptap-content-view" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-secondary)' }} dangerouslySetInnerHTML={{ __html: event.description }} />
        </div>
      )}

      {/* ── After Party (warm card, bottom) ── */}
      {afterParty && (
        <div style={{
          background: 'var(--color-warning-light)', borderRadius: 16, border: '1px solid #FDE68A',
          padding: isMobile ? 20 : '28px 32px', marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px', color: '#78350F' }}>
            懇親会
          </h2>
          <div style={{ fontSize: 14, color: '#92400E', lineHeight: 1.9, marginBottom: 16 }}>
            {afterParty.location && <div>場所: {afterParty.location}</div>}
            {afterParty.start_time && <div>時間: {afterParty.start_time}{afterParty.end_time ? `〜${afterParty.end_time}` : ''}</div>}
            <div>会費: {afterParty.fee > 0 ? `¥${Number(afterParty.fee).toLocaleString()}` : '無料'}</div>
          </div>

          {!isCompleted ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {myApResponse && (
                <span style={{ fontSize: 13, color: '#78350F', marginRight: 4 }}>あなた:</span>
              )}
              {['出席', '欠席'].map(opt => {
                const sel = myApResponse === opt;
                const attend = opt === '出席';
                return (
                  <button key={opt} type="button"
                    disabled={closed || saving}
                    onClick={() => handleResponse(afterParty.id, opt, true)}
                    style={{
                      padding: '6px 16px', borderRadius: 8,
                      fontSize: 13, fontWeight: 600,
                      cursor: (closed || saving) ? 'default' : 'pointer',
                      border: sel ? 'none' : '1px solid #FDE68A',
                      background: sel ? (attend ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-bg)',
                      color: sel ? '#fff' : '#78350F',
                      transition: 'all 0.15s',
                      opacity: (closed || saving) && !sel ? 0.5 : 1,
                    }}
                  >
                    {sel ? '✓ ' : ''}{attend ? '参加' : '不参加'}
                  </button>
                );
              })}
            </div>
          ) : myApResponse ? (
            <span style={{
              display: 'inline-block',
              padding: '5px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: myApResponse === '出席' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff',
            }}>
              {myApResponse === '出席' ? '参加' : '不参加'}
            </span>
          ) : null}
        </div>
      )}

      {/* ── Event Attendance Status ── */}
      <div className="card panel-card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>イベント出欠</h2>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            回答率: <strong style={{ color: 'var(--color-text-primary)' }}>{members.length > 0 ? Math.round((respondedCount / members.length) * 100) : 0}%</strong> ({respondedCount}/{members.length})
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-success-light)', border: '1px solid var(--color-border)', fontSize: 13 }}>
              出席 <strong style={{ color: 'var(--color-success)' }}>{attendList.length}</strong>
            </span>
            <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-light)', border: '1px solid var(--color-border)', fontSize: 13 }}>
              欠席 <strong style={{ color: 'var(--color-danger)' }}>{absentList.length}</strong>
            </span>
          </div>
          {attendList.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {attendList.map(a => {
                  const m = memberMap[a.member_id];
                  return (
                    <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 99, fontSize: 13, background: 'var(--color-success-light)', color: 'var(--color-success)', fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                      {m ? fullName(m) : '不明'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {absentList.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {absentList.map(a => {
                  const m = memberMap[a.member_id];
                  return (
                    <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 99, fontSize: 13, background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)' }} />
                      {m ? fullName(m) : '不明'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {members.length - respondedCount > 0 && (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>未回答: {members.length - respondedCount}名</p>
          )}
        </div>
      </div>

      {/* ── After Party Attendance Status ── */}
      {afterParty && (() => {
        const apAttendList = apAtts.filter(a => (a.response || a.status) === '出席');
        const apAbsentList = apAtts.filter(a => (a.response || a.status) === '欠席');
        const apRespondedCount = apAtts.length;
        return (
          <div className="card panel-card" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>懇親会出欠</h2>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                回答率: <strong style={{ color: 'var(--color-text-primary)' }}>{members.length > 0 ? Math.round((apRespondedCount / members.length) * 100) : 0}%</strong> ({apRespondedCount}/{members.length})
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-success-light)', border: '1px solid var(--color-border)', fontSize: 13 }}>
                  参加 <strong style={{ color: 'var(--color-success)' }}>{apAttendList.length}</strong>
                </span>
                <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-light)', border: '1px solid var(--color-border)', fontSize: 13 }}>
                  不参加 <strong style={{ color: 'var(--color-danger)' }}>{apAbsentList.length}</strong>
                </span>
              </div>
              {apAttendList.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {apAttendList.map(a => {
                      const m = memberMap[a.member_id];
                      return (
                        <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 99, fontSize: 13, background: 'var(--color-success-light)', color: 'var(--color-success)', fontWeight: 500 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                          {m ? fullName(m) : '不明'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {apAbsentList.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {apAbsentList.map(a => {
                      const m = memberMap[a.member_id];
                      return (
                        <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 99, fontSize: 13, background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontWeight: 500 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)' }} />
                          {m ? fullName(m) : '不明'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {members.length - apRespondedCount > 0 && (
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>未回答: {members.length - apRespondedCount}名</p>
              )}
            </div>
          </div>
        );
      })()}
    </section>
  );
}
