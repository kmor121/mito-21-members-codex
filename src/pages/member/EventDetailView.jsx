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
  "総会":   { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  "例会":   { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  "セミナー": { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  "ゴルフ": { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  "その他": { bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)", border: "var(--color-border)" },
};

const STATUS_BADGE = {
  published: { label: "公開中", bg: "#eff6ff", color: "#2563eb" },
  closed:    { label: "公開中", bg: "#eff6ff", color: "#2563eb" },
  completed: { label: "完了", bg: "#ecfdf5", color: "#059669" },
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
  const closed = isAttendanceClosed(event);
  const responseOptions = Array.isArray(event.response_options) && event.response_options.length >= 2
    ? event.response_options : ['出席', '欠席'];

  const attendList = attendances.filter(a => (a.response || a.status) === '出席');
  const absentList = attendances.filter(a => (a.response || a.status) === '欠席');
  const respondedCount = attendances.length;

  return (
    <section className="admin-shell">
      {toast && <div className="nl2-toast"><span className="nl2-toast-icon">{"\u2713"}</span><span>{toast}</span></div>}

      <Link to="/events" className="text-link" style={{ fontSize: 13, marginBottom: 12, display: 'inline-block' }}>← イベント一覧に戻る</Link>

      {/* ── Header Card ── */}
      <div className="card panel-card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>
            {event.title}
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: tb.bg, color: tb.color, border: `1px solid ${tb.border}` }}>{event.event_type}</span>
            <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: sb.bg, color: sb.color }}>{sb.label}</span>
            <AttendanceDeadlineBadge deadline={getDeadline(event)} closed={closed} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"/></svg>
              <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{formatEventDate(event.event_date, event.start_time, event.end_time)}</span>
            </div>
            {event.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a4 4 0 0 0-4 4c0 3.5 4 8 4 8s4-4.5 4-8a4 4 0 0 0-4-4Zm0 5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>
                <span>{event.location}</span>
              </div>
            )}
            {event.fee > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>💰</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>¥{Number(event.fee).toLocaleString()}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>💰</span>
                <span>無料</span>
              </div>
            )}
            {event.capacity > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>👥</span>
                <span>定員 {event.capacity}名</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      {event.description && (
        <div className="card panel-card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>詳細</h2>
            <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{event.description}</div>
          </div>
        </div>
      )}

      {/* ── My Response ── */}
      <div className="card panel-card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>あなたの回答</h2>

          {closed && (
            <div style={{ padding: '10px 14px', background: 'var(--color-bg-sub)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
              出欠の受付は終了しました
            </div>
          )}

          {myResponse && (
            <div style={{ marginBottom: 12 }}>
              <span style={{
                display: 'inline-block', padding: '6px 20px', borderRadius: 99, fontSize: 14, fontWeight: 700,
                background: myResponse === '出席' ? 'var(--color-success)' : myResponse === '欠席' ? 'var(--color-danger)' : 'var(--color-bg-sub)',
                color: (myResponse === '出席' || myResponse === '欠席') ? '#fff' : 'var(--color-text-primary)',
              }}>
                {myResponse}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {responseOptions.map(opt => {
              const isSelected = myResponse === opt;
              const isAttend = opt === '出席';
              const isAbsent = opt === '欠席';
              return (
                <button key={opt} type="button"
                  disabled={closed || saving}
                  onClick={() => handleResponse(eventId, opt)}
                  style={{
                    padding: isMobile ? '10px 20px' : '10px 24px',
                    borderRadius: 8, fontSize: 14, fontWeight: 600,
                    cursor: (closed || saving) ? 'default' : 'pointer',
                    transition: 'all 0.15s', minHeight: 44,
                    background: isSelected ? (isAttend ? 'var(--color-success)' : isAbsent ? 'var(--color-danger)' : 'var(--color-accent)') : '#fff',
                    color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                    border: isSelected ? 'none' : '1px solid var(--color-border)',
                    opacity: (closed || saving) ? 0.5 : 1,
                  }}>
                  {isSelected && '✓ '}{opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── After Party ── */}
      {afterParty && (
        <div className="card panel-card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>🍻 懇親会</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              {afterParty.location && <span>📍 {afterParty.location}</span>}
              {afterParty.start_time && <span>🕐 {afterParty.start_time}{afterParty.end_time ? `〜${afterParty.end_time}` : ''}</span>}
              {afterParty.fee > 0 ? <span>💰 ¥{Number(afterParty.fee).toLocaleString()}</span> : <span>💰 無料</span>}
            </div>

            {myApResponse && (
              <div style={{ marginBottom: 12 }}>
                <span style={{
                  display: 'inline-block', padding: '4px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                  background: myApResponse === '出席' ? 'var(--color-success)' : 'var(--color-danger)',
                  color: '#fff',
                }}>
                  懇親会: {myApResponse}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['出席', '欠席'].map(opt => {
                const isSelected = myApResponse === opt;
                return (
                  <button key={opt} type="button"
                    disabled={closed || saving}
                    onClick={() => handleResponse(afterParty.id, opt, true)}
                    style={{
                      padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: (closed || saving) ? 'default' : 'pointer',
                      transition: 'all 0.15s', minHeight: 40,
                      background: isSelected ? (opt === '出席' ? 'var(--color-success)' : 'var(--color-danger)') : '#fff',
                      color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                      border: isSelected ? 'none' : '1px solid var(--color-border)',
                      opacity: (closed || saving) ? 0.5 : 1,
                    }}>
                    {isSelected && '✓ '}{opt}
                  </button>
                );
              })}
            </div>
          </div>
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
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>🍻 懇親会出欠</h2>
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
