import { useState, useEffect, useCallback, useMemo } from 'react';
import { base44, invalidateReadCache } from '../../api/base44Client';
import { useAuth } from '../../contexts/AuthContext';
import { fullName } from '../../utils/formatName';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useIsMobile } from '../../hooks/useIsMobile';

const EVENT_TYPE_BADGE = {
  "懇親会": { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  "総会":   { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  "例会":   { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  "セミナー": { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  "その他": { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
};

const STATUS_BADGE = {
  published: { label: "公開中", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  closed:    { label: "受付終了", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  completed: { label: "完了",   color: "#059669", bg: "#ecfdf5", border: "#bbf7d0" },
};

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const dow = ['日','月','火','水','木','金','土'][dt.getDay()];
  return `${dt.getMonth() + 1}/${dt.getDate()}(${dow})`;
}

function getResponseColor(opt) {
  if (opt.includes('出席')) return { color: 'var(--success)', bg: 'var(--success-light)', border: 'var(--success)' };
  if (opt.includes('欠席')) return { color: 'var(--error)', bg: 'var(--error-light)', border: 'var(--error)' };
  return { color: 'var(--primary)', bg: 'var(--primary-light)', border: 'var(--primary)' };
}

export default function EventsView() {
  const { memberInfo } = useAuth();
  const isMobile = useIsMobile();
  const currentMemberId = memberInfo?.id || memberInfo?._id || '';

  const [events, setEvents] = useState([]);
  const [allEventsRaw, setAllEventsRaw] = useState([]);
  const [myAttendances, setMyAttendances] = useState([]);
  const [eventAttsCache, setEventAttsCache] = useState({});
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // eventId being saved
  const [tab, setTab] = useState('upcoming');
  const [expandedId, setExpandedId] = useState(null);

  function showToast(msg, type) {
    if (window.__showToast) window.__showToast(msg, type || 'success');
  }

  const loadData = useCallback(async () => {
    try {
      const [evtList, myAtt, memberList] = await Promise.all([
        base44.entities.Event.list(),
        currentMemberId ? base44.entities.Attendance.filter({ member_id: currentMemberId }).catch(() => []) : Promise.resolve([]),
        base44.entities.Member.filter({ approval_status: '承認済', status: '活動中' }).catch(() => []),
      ]);
      // Only show published/closed/completed, exclude after-party from main list
      const allEvts = evtList || [];
      setEvents(allEvts.filter(e => (e.status === 'published' || e.status === 'closed' || e.status === 'completed') && !e.is_after_party));
      setAllEventsRaw(allEvts);
      setMyAttendances(myAtt || []);
      setMembers(memberList || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [currentMemberId]);

  useEffect(() => { loadData(); }, [loadData]);

  const myAttMap = useMemo(() => {
    const map = {};
    myAttendances.forEach(a => { if (a.event_id) map[a.event_id] = a; });
    return map;
  }, [myAttendances]);

  // On-demand attendance loading per event
  async function loadEventAtts(evtId) {
    if (eventAttsCache[evtId]) return;
    try {
      const atts = await base44.entities.Attendance.filter({ event_id: evtId });
      setEventAttsCache(prev => ({ ...prev, [evtId]: atts || [] }));
    } catch { /* ignore */ }
  }

  const memberMap = useMemo(() => {
    const map = {};
    members.forEach(m => { map[m.id] = m; });
    return map;
  }, [members]);

  const afterPartyByEvent = useMemo(() => {
    const map = {};
    allEventsRaw.filter(e => e.is_after_party && e.parent_event_id).forEach(e => { map[e.parent_event_id] = e; });
    return map;
  }, [allEventsRaw]);

  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = useMemo(() =>
    events.filter(e => e.status !== 'completed' && e.event_date >= today)
      .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || '')),
  [events, today]);
  const pastEvents = useMemo(() =>
    events.filter(e => e.status === 'completed' || e.event_date < today)
      .sort((a, b) => (b.event_date || '').localeCompare(a.event_date || '')),
  [events, today]);
  const displayEvents = tab === 'upcoming' ? upcomingEvents : pastEvents;

  /* ── Response handlers ── */
  async function handleResponse(eventId, response) {
    setSaving(eventId);
    const existing = myAttMap[eventId];
    try {
      if (existing && existing.response === response) {
        // Same button → cancel
        await base44.entities.Attendance.delete(existing.id);
        invalidateReadCache('Attendance');
        showToast('回答を取り消しました');
      } else if (existing) {
        // Different button → update
        await base44.entities.Attendance.update(existing.id, {
          response, status: response, responded_at: new Date().toISOString(),
        });
        invalidateReadCache('Attendance');
        showToast('回答を変更しました');
      } else {
        // New response
        await base44.entities.Attendance.create({
          event_id: eventId, member_id: currentMemberId,
          response, status: response, responded_at: new Date().toISOString(),
        });
        invalidateReadCache('Attendance');
        showToast('出欠を回答しました');
      }
      setEventAttsCache(prev => { const n = { ...prev }; delete n[eventId]; return n; });
      await loadData();
    } catch (err) {
      showToast(err.message || '回答に失敗しました', 'error');
    }
    setSaving(null);
  }

  /* ── Render ── */
  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">イベント</h1>
          <p className="page-description">公開中のイベント・出欠回答</p>
        </div>
        <LoadingSpinner />
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">イベント</h1>
        <p className="page-description">公開中のイベント・出欠回答</p>
      </div>

      {/* Tab */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button type="button" className={`nl2-pill-tab${tab === 'upcoming' ? ' active' : ''}`}
          onClick={() => setTab('upcoming')}
          style={isMobile ? { fontSize: 12, padding: '5px 12px' } : {}}>
          今後のイベント{upcomingEvents.length > 0 && ` (${upcomingEvents.length})`}
        </button>
        <button type="button" className={`nl2-pill-tab${tab === 'past' ? ' active' : ''}`}
          onClick={() => setTab('past')}
          style={isMobile ? { fontSize: 12, padding: '5px 12px' } : {}}>
          過去のイベント
        </button>
      </div>

      {/* Event list */}
      {displayEvents.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="10" width="36" height="32" rx="4" stroke="var(--line)" strokeWidth="2" fill="var(--bg)"/><path d="M6 18h36" stroke="var(--line)" strokeWidth="2"/><line x1="16" y1="6" x2="16" y2="14" stroke="var(--line)" strokeWidth="2" strokeLinecap="round"/><line x1="32" y1="6" x2="32" y2="14" stroke="var(--line)" strokeWidth="2" strokeLinecap="round"/></svg>
          <p style={{ fontSize: 14, marginTop: 16 }}>
            {tab === 'upcoming' ? '現在公開中のイベントはありません' : '過去のイベントはありません'}
          </p>
          {tab === 'upcoming' && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>新しいイベントが公開されるとここに表示されます。</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayEvents.map(evt => {
            const sb = STATUS_BADGE[evt.status] || STATUS_BADGE.published;
            const tb = EVENT_TYPE_BADGE[evt.event_type] || EVENT_TYPE_BADGE["その他"];
            const options = (evt.response_options && evt.response_options.length >= 2) ? evt.response_options : ["出席", "欠席"];
            const myAtt = myAttMap[evt.id];
            const myResponse = myAtt?.response || '';
            const isSaving = saving === evt.id;

            const isDeadlinePassed = evt.rsvp_deadline && evt.rsvp_deadline < today;
            const isClosed = evt.status === 'closed' || evt.status === 'completed';
            const canRespond = evt.status === 'published' && !isDeadlinePassed;
            const canChange = evt.status === 'published' && !isDeadlinePassed;

            const evtAtts = eventAttsCache[evt.id] || [];
            const isExpanded = expandedId === evt.id;
            const responseCounts = {};
            options.forEach(o => { responseCounts[o] = 0; });
            evtAtts.forEach(a => {
              const r = a.response || a.status;
              if (responseCounts[r] !== undefined) responseCounts[r]++;
            });
            const notRespondedCount = Math.max(0, members.length - evtAtts.length);

            return (
              <div key={evt.id} className="mevt-card">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>{formatDate(evt.event_date)}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0 }}>{evt.title}</span>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: tb.bg, color: tb.color, border: `1px solid ${tb.border}` }}>{evt.event_type}</span>
                    <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>{sb.label}</span>
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {evt.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.75a3.5 3.5 0 0 0-3.5 3.5C3.5 8.75 7 12.25 7 12.25s3.5-3.5 3.5-7a3.5 3.5 0 0 0-3.5-3.5Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" fill="currentColor"/></svg>{evt.location}</span>}
                  {evt.start_time && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4.25V7l2.25 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>{evt.start_time}{evt.end_time ? `〜${evt.end_time}` : ''}</span>}
                  {evt.fee > 0 && <span>¥{Number(evt.fee).toLocaleString()}</span>}
                </div>

                {/* Deadline */}
                {evt.rsvp_deadline && (
                  <p style={{ fontSize: 12, color: isDeadlinePassed ? 'var(--error)' : 'var(--text-secondary)', margin: '0 0 8px' }}>
                    回答期限: {formatDate(evt.rsvp_deadline)}{isDeadlinePassed ? '（締切済み）' : ''}
                  </p>
                )}

                {/* Response buttons */}
                {evt.status !== 'completed' && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: myResponse ? 6 : 0 }}>
                    {options.map(opt => {
                      const rc = getResponseColor(opt);
                      const isSelected = myResponse === opt;
                      const disabled = isSaving || (!canRespond && !isSelected) || (isClosed && !canChange);
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={disabled}
                          onClick={() => (canRespond || canChange) && handleResponse(evt.id, opt)}
                          style={{
                            padding: isMobile ? '8px 14px' : '7px 16px',
                            borderRadius: 'var(--radius)',
                            fontSize: 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
                            transition: 'all 0.15s',
                            minHeight: 36,
                            background: isSelected ? rc.color : 'transparent',
                            color: isSelected ? '#fff' : 'var(--text-secondary)',
                            border: isSelected ? `2px solid ${rc.color}` : '1px solid var(--line)',
                            opacity: disabled && !isSelected ? 0.5 : 1,
                          }}
                        >
                          {isSelected && '✓ '}{opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Current response */}
                {myResponse && evt.status === 'completed' && (
                  <p style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, margin: '4px 0 0' }}>
                    ✓ あなたの回答: {myResponse}
                  </p>
                )}

                {/* Cannot respond message */}
                {!canRespond && !myResponse && evt.status !== 'completed' && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>回答期限が過ぎています</p>
                )}

                {/* After party section */}
                {(() => {
                  const ap = afterPartyByEvent[evt.id];
                  if (!ap) return null;
                  const apMyAtt = myAttMap[ap.id];
                  const apMyResponse = apMyAtt?.response || '';
                  const apCanRespond = evt.status === 'published' && !(ap.rsvp_deadline && ap.rsvp_deadline < today);
                  const apIsSaving = saving === ap.id;
                  return (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 14 }}>🍻</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>懇親会</span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#78350f', marginBottom: 8 }}>
                        {ap.start_time && <span>🕐 {ap.start_time}{ap.end_time ? `〜${ap.end_time}` : ''}</span>}
                        {ap.location && <span>📍 {ap.location}</span>}
                        {ap.fee > 0 && <span>¥{Number(ap.fee).toLocaleString()}</span>}
                      </div>
                      {evt.status !== 'completed' && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {['出席', '欠席'].map(opt => {
                            const isSelected = apMyResponse === opt;
                            const isAttend = opt === '出席';
                            const disabled = apIsSaving || !apCanRespond;
                            return (
                              <button key={opt} type="button" disabled={disabled}
                                onClick={() => apCanRespond && handleResponse(ap.id, opt)}
                                style={{
                                  padding: isMobile ? '8px 14px' : '7px 16px',
                                  borderRadius: 8, fontSize: 13, fontWeight: 600,
                                  cursor: disabled ? 'default' : 'pointer',
                                  transition: 'all 0.15s', minHeight: 36,
                                  background: isSelected ? (isAttend ? 'var(--success)' : 'var(--error)') : 'transparent',
                                  color: isSelected ? '#fff' : '#78350f',
                                  border: isSelected ? `2px solid ${isAttend ? 'var(--success)' : 'var(--error)'}` : '1px solid #FDE68A',
                                  opacity: disabled && !isSelected ? 0.5 : 1,
                                }}>
                                {isSelected && '✓ '}{opt}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {evt.status === 'completed' && apMyResponse && (
                        <p style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, margin: '4px 0 0' }}>✓ 懇親会: {apMyResponse}</p>
                      )}
                    </div>
                  );
                })()}

                {/* Participants toggle */}
                <div style={{ marginTop: 8, borderTop: '1px solid var(--line-light)', paddingTop: 8 }}>
                  <button type="button" onClick={() => { const next = isExpanded ? null : evt.id; setExpandedId(next); if (next) loadEventAtts(evt.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    {isExpanded ? '▾ 参加者を閉じる' : `▸ 参加者を見る`}
                  </button>
                  {isExpanded && (
                    <div style={{ marginTop: 8 }}>
                      {/* Summary with response rate */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, fontSize: 12, alignItems: 'center' }}>
                        {(() => {
                          const targetCount = evt.target_member_types?.length > 0
                            ? members.filter(m => evt.target_member_types.includes(m.member_type)).length
                            : members.length;
                          const respondedCount = evtAtts.length;
                          const rate = targetCount > 0 ? Math.round((respondedCount / targetCount) * 100) : 0;
                          return (
                            <span style={{
                              padding: '2px 10px', borderRadius: 'var(--radius)',
                              background: rate === 100 ? 'var(--success-light)' : 'var(--bg)',
                              border: `1px solid ${rate === 100 ? 'var(--success)' : 'var(--line)'}`,
                              fontWeight: 600,
                              color: rate === 100 ? 'var(--success)' : 'var(--text)',
                            }}>
                              回答率 {rate}% ({respondedCount}/{targetCount})
                            </span>
                          );
                        })()}
                        {options.map(opt => (
                          <span key={opt} style={{ color: 'var(--text-secondary)' }}>
                            {opt}: <strong style={{ color: opt.includes('出席') ? 'var(--success)' : opt.includes('欠席') ? 'var(--error)' : 'var(--text)' }}>{responseCounts[opt] || 0}名</strong>
                          </span>
                        ))}
                        <span style={{ color: 'var(--muted)' }}>未回答: <strong>{notRespondedCount}名</strong></span>
                      </div>
                      {/* List */}
                      {evtAtts.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {evtAtts.map(a => {
                            const m = memberMap[a.member_id];
                            if (!m) return null;
                            const r = a.response || a.status;
                            const rc = getResponseColor(r);
                            return (
                              <span key={a.id} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 10px', borderRadius: 999, fontSize: 12,
                                background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                              }}>
                                {fullName(m)} <span style={{ fontWeight: 600 }}>{r}</span>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>まだ回答がありません</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scoped styles */}
      <style>{`
        .mevt-card {
          background: var(--panel); border: 1px solid var(--line);
          border-radius: var(--radius-lg); padding: 16px 20px;
          box-shadow: var(--shadow-sm);
        }
        @media (max-width: 768px) {
          .mevt-card { padding: 12px 14px; }
        }
      `}</style>
    </section>
  );
}
