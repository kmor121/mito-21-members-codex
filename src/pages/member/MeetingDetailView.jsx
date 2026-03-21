import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import { useAuth } from '../../contexts/AuthContext';
import { fullName } from '../../utils/formatName';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AttendanceDeadlineBadge from '../../components/ui/AttendanceDeadlineBadge';
import { isAttendanceClosed } from '../../utils/attendanceUtils';
import { useIsMobile } from '../../hooks/useIsMobile';

const STATUS_BADGE = {
  "下書き": { label: "下書き", bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)" },
  "公開":   { label: "公開", bg: "#eff6ff", color: "#2563eb" },
  "完了":   { label: "完了", bg: "#ecfdf5", color: "#059669" },
};

function formatDate(dateStr, startTime, endTime) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dow = ['日','月','火','水','木','金','土'][d.getDay()];
  let s = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}（${dow}）`;
  if (startTime) s += ` ${startTime}`;
  if (endTime) s += `〜${endTime}`;
  return s;
}

export default function MeetingDetailView() {
  const { meetingId } = useParams();
  const { memberInfo } = useAuth();
  const isMobile = useIsMobile();
  const currentMemberId = memberInfo?.id || memberInfo?._id || '';

  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [members, setMembers] = useState([]);
  const [afterParty, setAfterParty] = useState(null);
  const [apAtts, setApAtts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [memberMap, setMemberMap] = useState({});

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function loadData() {
    try {
      const [m, atts, allMembers] = await Promise.all([
        base44.entities.Meeting.get(meetingId),
        base44.entities.Attendance.filter({ meeting_id: meetingId }).catch(() => []),
        base44.entities.Member.filter({ approval_status: '承認済' }).catch(() => []),
      ]);
      setMeeting(m);
      setAttendances(atts || []);
      setMembers(allMembers || []);
      const mm = {};
      (allMembers || []).forEach(mb => { mm[mb.id] = mb; });
      setMemberMap(mm);

      const aps = await base44.entities.Event.filter({ parent_meeting_id: meetingId, is_after_party: true }).catch(() => []);
      const ap = aps?.[0] || null;
      setAfterParty(ap);
      if (ap) {
        const apA = await base44.entities.Attendance.filter({ event_id: ap.id }).catch(() => []);
        setApAtts(apA || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [meetingId]);

  const attMap = useMemo(() => {
    const m = {};
    attendances.forEach(a => { m[a.member_id] = a; });
    return m;
  }, [attendances]);

  const apAttMap = useMemo(() => {
    const m = {};
    apAtts.forEach(a => { m[a.member_id] = a; });
    return m;
  }, [apAtts]);

  const myAtt = attMap[currentMemberId];
  const myResponse = myAtt?.response || '';
  const myApResponse = apAttMap[currentMemberId]?.response || '';

  async function handleResponse(targetId, response, isMeetingAtt = true) {
    if (saving) return;
    setSaving(true);
    const map = isMeetingAtt ? attMap : apAttMap;
    const existing = map[currentMemberId];
    const idField = isMeetingAtt ? { meeting_id: targetId } : { event_id: targetId };
    try {
      if (existing && existing.response === response) {
        await base44.entities.Attendance.delete(existing.id);
        invalidateReadCache('Attendance');
        showToast('回答を取り消しました');
      } else if (existing) {
        await base44.entities.Attendance.update(existing.id, { response, status: response, responded_at: new Date().toISOString() });
        invalidateReadCache('Attendance');
        showToast('回答を変更しました');
      } else {
        const check = await base44.entities.Attendance.filter({ ...idField, member_id: currentMemberId }).catch(() => []);
        if (check?.length > 0) {
          await base44.entities.Attendance.update(check[0].id, { response, status: response, responded_at: new Date().toISOString() });
        } else {
          await base44.entities.Attendance.create({ ...idField, member_id: currentMemberId, response, status: response, responded_at: new Date().toISOString() });
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
        <Link to="/meetings" className="text-link" style={{ fontSize: 13, marginBottom: 12, display: 'inline-block' }}>← 幹事会一覧に戻る</Link>
        <LoadingSpinner />
      </section>
    );
  }

  if (!meeting || meeting.status === '下書き') {
    return (
      <section className="admin-shell">
        <Link to="/meetings" className="text-link" style={{ fontSize: 13, marginBottom: 12, display: 'inline-block' }}>← 幹事会一覧に戻る</Link>
        <div className="card panel-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>この幹事会は公開されていません</p>
        </div>
      </section>
    );
  }

  const sb = STATUS_BADGE[meeting.status] || STATUS_BADGE["公開"];
  const closed = isAttendanceClosed(meeting);
  const attendList = attendances.filter(a => (a.response || a.status) === '出席');
  const absentList = attendances.filter(a => (a.response || a.status) === '欠席');
  const respondedCount = attendances.length;
  const ceremony = Array.isArray(meeting.ceremony_items) ? meeting.ceremony_items : [];
  const agenda = Array.isArray(meeting.agenda_items) ? meeting.agenda_items : [];
  const moderator = meeting.moderator_id && memberMap[meeting.moderator_id] ? fullName(memberMap[meeting.moderator_id]) : '';

  return (
    <section className="admin-shell">
      {toast && <div className="nl2-toast"><span className="nl2-toast-icon">{"\u2713"}</span><span>{toast}</span></div>}

      <Link to="/meetings" className="text-link" style={{ fontSize: 13, marginBottom: 12, display: 'inline-block' }}>← 幹事会一覧に戻る</Link>

      {/* ── Header ── */}
      <div className="card panel-card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>{meeting.title}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: sb.bg, color: sb.color }}>{sb.label}</span>
            <AttendanceDeadlineBadge deadline={meeting.attendance_deadline} closed={closed} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"/></svg>
              <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{formatDate(meeting.meeting_date, meeting.start_time, meeting.end_time)}</span>
            </div>
            {meeting.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a4 4 0 0 0-4 4c0 3.5 4 8 4 8s4-4.5 4-8a4 4 0 0 0-4-4Zm0 5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>
                <span>{meeting.location}</span>
              </div>
            )}
            {moderator && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>🎤</span><span>司会: {moderator}</span></div>}
          </div>
        </div>
      </div>

      {/* ── My Response ── */}
      <div className="card panel-card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>あなたの回答</h2>
          {closed && (
            <div style={{ padding: '10px 14px', background: 'var(--color-bg-sub)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>出欠の受付は終了しました</div>
          )}
          {myResponse && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ display: 'inline-block', padding: '6px 20px', borderRadius: 99, fontSize: 14, fontWeight: 700, background: myResponse === '出席' ? 'var(--color-success)' : 'var(--color-danger)', color: '#fff' }}>{myResponse}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['出席', '欠席'].map(opt => {
              const isSelected = myResponse === opt;
              const isAttend = opt === '出席';
              return (
                <button key={opt} type="button" disabled={closed || saving} onClick={() => handleResponse(meetingId, opt, true)}
                  style={{
                    padding: isMobile ? '10px 20px' : '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    cursor: (closed || saving) ? 'default' : 'pointer', transition: 'all 0.15s', minHeight: 44,
                    background: isSelected ? (isAttend ? 'var(--color-success)' : 'var(--color-danger)') : '#fff',
                    color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                    border: isSelected ? 'none' : '1px solid var(--color-border)',
                    opacity: (closed || saving) ? 0.5 : 1,
                  }}>{isSelected && '✓ '}{opt}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Agenda (次第) ── */}
      {(ceremony.length > 0 || agenda.length > 0) && (
        <div className="card panel-card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>次第</h2>
            {ceremony.length > 0 && (
              <div style={{ marginBottom: agenda.length > 0 ? 20 : 0 }}>
                {ceremony.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: i < ceremony.length - 1 ? '1px solid var(--color-border)' : 'none', fontSize: 14 }}>
                    <span style={{ color: 'var(--color-text-tertiary)', minWidth: 24, textAlign: 'right' }}>{c.order || i + 1}.</span>
                    <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{c.title}</span>
                    {c.person_label && <span style={{ color: 'var(--color-text-secondary)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{c.person_label}</span>}
                  </div>
                ))}
              </div>
            )}
            {agenda.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--color-border)' }}>議事</h3>
                {agenda.map((a, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: i < agenda.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {a.tag && <span style={{ padding: '1px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>{a.tag}</span>}
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{a.title}</span>
                      {a.person_label && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>{a.person_label}</span>}
                    </div>
                    {a.link_url && (
                      <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="text-link" style={{ fontSize: 12, marginTop: 4, display: 'inline-block' }}>{a.link_label || '資料を見る'} →</a>
                    )}
                    {meeting.status === '完了' && a.decision && (
                      <div style={{ marginTop: 6, padding: '6px 10px', background: 'var(--color-bg-sub)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                        {a.decision_status && <span style={{ fontWeight: 600, color: 'var(--color-accent)', marginRight: 8 }}>{a.decision_status}</span>}
                        <span style={{ color: 'var(--color-text-primary)' }}>{a.decision}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Minutes (議事録) ── */}
      {meeting.status === '完了' && meeting.minutes_content && (
        <div className="card panel-card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>議事録</h2>
            <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-secondary)' }} dangerouslySetInnerHTML={{ __html: meeting.minutes_content }} />
          </div>
        </div>
      )}

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
                <span style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: myApResponse === '出席' ? 'var(--color-success)' : 'var(--color-danger)', color: '#fff' }}>懇親会: {myApResponse}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['出席', '欠席'].map(opt => {
                const isSelected = myApResponse === opt;
                return (
                  <button key={opt} type="button" disabled={closed || saving} onClick={() => handleResponse(afterParty.id, opt, false)}
                    style={{
                      padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: (closed || saving) ? 'default' : 'pointer', transition: 'all 0.15s', minHeight: 40,
                      background: isSelected ? (opt === '出席' ? 'var(--color-success)' : 'var(--color-danger)') : '#fff',
                      color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                      border: isSelected ? 'none' : '1px solid var(--color-border)',
                      opacity: (closed || saving) ? 0.5 : 1,
                    }}>{isSelected && '✓ '}{opt}</button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance Status ── */}
      <div className="card panel-card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>出欠状況</h2>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            回答率: <strong style={{ color: 'var(--color-text-primary)' }}>{members.length > 0 ? Math.round((respondedCount / members.length) * 100) : 0}%</strong> ({respondedCount}/{members.length})
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-success-light)', border: '1px solid var(--color-border)', fontSize: 13 }}>出席 <strong style={{ color: 'var(--color-success)' }}>{attendList.length}</strong></span>
            <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-light)', border: '1px solid var(--color-border)', fontSize: 13 }}>欠席 <strong style={{ color: 'var(--color-danger)' }}>{absentList.length}</strong></span>
          </div>
          {attendList.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {attendList.map(a => {
                  const m = memberMap[a.member_id];
                  return <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 99, fontSize: 13, background: 'var(--color-success-light)', color: 'var(--color-success)', fontWeight: 500 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />{m ? fullName(m) : '不明'}</span>;
                })}
              </div>
            </div>
          )}
          {absentList.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {absentList.map(a => {
                  const m = memberMap[a.member_id];
                  return <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 99, fontSize: 13, background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontWeight: 500 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)' }} />{m ? fullName(m) : '不明'}</span>;
                })}
              </div>
            </div>
          )}
          {members.length - respondedCount > 0 && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>未回答: {members.length - respondedCount}名</p>}
        </div>
      </div>

      {/* ── AP Attendance ── */}
      {afterParty && (() => {
        const apAttendList = apAtts.filter(a => (a.response || a.status) === '出席');
        const apAbsentList = apAtts.filter(a => (a.response || a.status) === '欠席');
        return (
          <div className="card panel-card" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>🍻 懇親会出欠</h2>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                回答率: <strong style={{ color: 'var(--color-text-primary)' }}>{members.length > 0 ? Math.round((apAtts.length / members.length) * 100) : 0}%</strong> ({apAtts.length}/{members.length})
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-success-light)', border: '1px solid var(--color-border)', fontSize: 13 }}>参加 <strong style={{ color: 'var(--color-success)' }}>{apAttendList.length}</strong></span>
                <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-light)', border: '1px solid var(--color-border)', fontSize: 13 }}>不参加 <strong style={{ color: 'var(--color-danger)' }}>{apAbsentList.length}</strong></span>
              </div>
              {apAttendList.length > 0 && <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{apAttendList.map(a => { const m = memberMap[a.member_id]; return <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 99, fontSize: 13, background: 'var(--color-success-light)', color: 'var(--color-success)', fontWeight: 500 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />{m ? fullName(m) : '不明'}</span>; })}</div>}
              {apAbsentList.length > 0 && <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{apAbsentList.map(a => { const m = memberMap[a.member_id]; return <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 99, fontSize: 13, background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontWeight: 500 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)' }} />{m ? fullName(m) : '不明'}</span>; })}</div>}
              {members.length - apAtts.length > 0 && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>未回答: {members.length - apAtts.length}名</p>}
            </div>
          </div>
        );
      })()}
    </section>
  );
}
