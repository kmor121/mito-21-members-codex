import { useState, useEffect, useMemo, useCallback } from 'react';
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

const TAG_BADGE = {
  "審議": { bg: "var(--color-accent-light)", color: "var(--color-accent)" },
  "協議": { bg: "var(--color-warning-light)", color: "var(--color-warning)" },
  "討議": { bg: "#fef3c7", color: "#92400e" },
  "報告": { bg: "var(--color-success-light)", color: "var(--color-success)" },
  "議案": { bg: "var(--color-accent-light)", color: "var(--color-accent)" },
};

const DECISION_BADGE = {
  "承認":   { bg: "#ecfdf5", color: "#059669" },
  "了承":   { bg: "#ecfdf5", color: "#059669" },
  "否決":   { bg: "#fee2e2", color: "#dc2626" },
  "継続審議": { bg: "#fffbeb", color: "#d97706" },
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
  const [memberOrgLabel, setMemberOrgLabel] = useState({});

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const loadData = useCallback(async () => {
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

      // Load org data for role labels
      if (m?.fiscal_year_id) {
        const [orgs, assigns] = await Promise.all([
          base44.entities.Organization.list().catch(() => []),
          base44.entities.OrgAssignment.list().catch(() => []),
        ]);
        const orgById = {};
        (orgs || []).forEach(o => { orgById[o.id] = o; });
        const orgTypePriority = { "幹事会": 0, "委員会": 1, "部会": 2, "室": 3, "その他": 4 };
        const orgLabelMap = {};
        (assigns || []).forEach(a => {
          if (a.fiscal_year_id !== m.fiscal_year_id || !mm[a.member_id]) return;
          if (a.role) {
            const org = orgById[a.organization_id];
            const orgType = org?.org_type || "その他";
            const prio = orgTypePriority[orgType] ?? 4;
            const existing = orgLabelMap[a.member_id];
            if (!existing || prio < existing.priority) {
              const orgName = orgType === "幹事会" ? "" : (org?.org_name || "");
              orgLabelMap[a.member_id] = { label: orgName ? `${orgName} ${a.role}` : a.role, priority: prio };
            }
          }
        });
        const labels = {};
        Object.entries(orgLabelMap).forEach(([mid, v]) => { labels[mid] = v.label; });
        setMemberOrgLabel(labels);
      }

      const aps = await base44.entities.Event.filter({ parent_meeting_id: meetingId, is_after_party: true }).catch(() => []);
      const ap = aps?.[0] || null;
      setAfterParty(ap);
      if (ap) {
        const apA = await base44.entities.Attendance.filter({ event_id: ap.id }).catch(() => []);
        setApAtts(apA || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [meetingId]);

  useEffect(() => { loadData(); }, [loadData]);

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

  // Resolve person display: "組織名 役職 氏名" or "手入力ラベル"
  const getPersonDisplay = useCallback((personId, personLabel) => {
    if (personId && memberMap[personId]) {
      const name = fullName(memberMap[personId]);
      const orgLabel = memberOrgLabel[personId];
      return orgLabel ? `${orgLabel} ${name}` : name;
    }
    return personLabel || '';
  }, [memberMap, memberOrgLabel]);

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
  const isCompleted = meeting.status === '完了';
  const closed = isCompleted || isAttendanceClosed(meeting);
  const attendList = attendances.filter(a => (a.response || a.status) === '出席');
  const absentList = attendances.filter(a => (a.response || a.status) === '欠席');
  const respondedCount = attendances.length;

  const ceremonyAll = Array.isArray(meeting.ceremony_items) ? [...meeting.ceremony_items].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
  const ceremonyBefore = ceremonyAll.filter(c => c.order <= 3);
  const ceremonyAfter = ceremonyAll.filter(c => c.order >= 5);
  const agendaItems = Array.isArray(meeting.agenda_items) ? [...meeting.agenda_items].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
  const moderator = meeting.moderator_id && memberMap[meeting.moderator_id] ? getPersonDisplay(meeting.moderator_id, '') : '';

  const hasAgenda = ceremonyAll.length > 0 || agendaItems.length > 0;

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
            {moderator && <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>司会: {moderator}</div>}
          </div>
        </div>
      </div>

      {/* ── Agenda (次第) ── */}
      {hasAgenda && (
        <div className="card panel-card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 20px' }}>次第</h2>

            {/* ━━ 式次第 ━━ */}
            {ceremonyAll.length > 0 && (
              <>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--color-text-tertiary)',
                  padding: '0 0 8px', borderBottom: '2px solid var(--color-border)',
                  marginBottom: 4, letterSpacing: '0.05em',
                }}>
                  式次第
                </div>

                {/* Ceremony before (1-3) */}
                {ceremonyBefore.map((c, i) => {
                  const person1 = getPersonDisplay(c.person_id, c.person_label);
                  return (
                    <div key={`cb-${i}`} style={{
                      display: 'flex', alignItems: 'flex-start', gap: isMobile ? 8 : 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--color-border)',
                    }}>
                      <span style={{
                        fontSize: 14, fontWeight: 600, color: 'var(--color-text-tertiary)',
                        minWidth: 28, textAlign: 'right', flexShrink: 0,
                      }}>
                        {c.order || i + 1}.
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {c.title}
                        </span>
                      </div>
                      {person1 && (
                        <span style={{
                          fontSize: 13, color: 'var(--color-text-secondary)',
                          whiteSpace: isMobile ? 'normal' : 'nowrap', textAlign: 'right',
                          flexShrink: isMobile ? 1 : 0,
                        }}>
                          {person1}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* 4. 議事 — inline header row */}
                {agendaItems.length > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{
                      fontSize: 14, fontWeight: 600, color: 'var(--color-text-tertiary)',
                      minWidth: 28, textAlign: 'right', flexShrink: 0,
                    }}>
                      4.
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent)' }}>
                      議事
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      （{agendaItems.length}件）
                    </span>
                  </div>
                )}

                {/* Ceremony after (5-6) */}
                {ceremonyAfter.map((c, i) => {
                  const person1 = getPersonDisplay(c.person_id, c.person_label);
                  const person2 = c.title === '監事講評' ? getPersonDisplay(c.person_id_2, c.person_label_2) : '';
                  return (
                    <div key={`ca-${i}`} style={{
                      display: 'flex', alignItems: 'flex-start', gap: isMobile ? 8 : 12,
                      padding: '12px 16px',
                      borderBottom: i < ceremonyAfter.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}>
                      <span style={{
                        fontSize: 14, fontWeight: 600, color: 'var(--color-text-tertiary)',
                        minWidth: 28, textAlign: 'right', flexShrink: 0,
                      }}>
                        {c.order}.
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {c.title}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
                        flexShrink: isMobile ? 1 : 0,
                      }}>
                        {person1 && (
                          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: isMobile ? 'normal' : 'nowrap', textAlign: 'right' }}>
                            {person1}
                          </span>
                        )}
                        {person2 && (
                          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: isMobile ? 'normal' : 'nowrap', textAlign: 'right' }}>
                            {person2}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ━━ 議事 ━━ */}
            {agendaItems.length > 0 && (
              <>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--color-text-tertiary)',
                  padding: '20px 0 8px', borderBottom: '2px solid var(--color-border)',
                  marginBottom: 12, letterSpacing: '0.05em',
                }}>
                  議事
                </div>

                {agendaItems.map((item, idx) => {
                  const tagBadge = item.tag ? (TAG_BADGE[item.tag] || { bg: 'var(--color-bg-sub)', color: 'var(--color-text-secondary)' }) : null;
                  const person = getPersonDisplay(item.person_id, item.person_label);
                  const decBadge = item.decision_status ? (DECISION_BADGE[item.decision_status] || { bg: 'var(--color-bg-sub)', color: 'var(--color-text-secondary)' }) : null;

                  return (
                    <div key={idx} style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: isMobile ? '14px 14px' : '16px 20px',
                      marginBottom: 12,
                      background: '#fff',
                    }}>
                      {/* Header: tag + title + person */}
                      <div style={{
                        display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
                        gap: 8, marginBottom: 8,
                        flexWrap: isMobile ? 'wrap' : 'nowrap',
                      }}>
                        {tagBadge && (
                          <span style={{
                            padding: '2px 10px', borderRadius: 'var(--radius-sm)',
                            fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                            background: tagBadge.bg, color: tagBadge.color,
                          }}>
                            {item.tag}
                          </span>
                        )}
                        <span style={{
                          fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)',
                          flex: 1, minWidth: 0,
                        }}>
                          {item.title}
                        </span>
                        {person && !isMobile && (
                          <span style={{
                            fontSize: 13, color: 'var(--color-text-secondary)',
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            {person}
                          </span>
                        )}
                      </div>

                      {/* Person on mobile (below title) */}
                      {person && isMobile && (
                        <div style={{
                          fontSize: 13, color: 'var(--color-text-secondary)',
                          marginBottom: 8, paddingLeft: 4,
                        }}>
                          {person}
                        </div>
                      )}

                      {/* Link */}
                      {item.link_url && (
                        <div style={{ marginBottom: 8, paddingLeft: 4 }}>
                          {item.link_url.startsWith('/') ? (
                            <Link to={item.link_url} style={{
                              fontSize: 13, color: 'var(--color-accent)', textDecoration: 'none',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              {item.link_label || '資料を見る'} →
                            </Link>
                          ) : (
                            <a href={item.link_url} target="_blank" rel="noopener noreferrer" style={{
                              fontSize: 13, color: 'var(--color-accent)', textDecoration: 'none',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              {item.link_label || '資料を見る'} →
                            </a>
                          )}
                        </div>
                      )}

                      {/* Decision result (completed meetings only) */}
                      {isCompleted && item.decision_status && item.decision_status !== '未審議' && (
                        <div style={{
                          marginTop: 12, paddingTop: 12,
                          borderTop: '1px solid var(--color-border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: item.decision ? 8 : 0 }}>
                            <span style={{
                              padding: '2px 10px', borderRadius: 'var(--radius-sm)',
                              fontSize: 12, fontWeight: 600,
                              background: decBadge?.bg || 'var(--color-bg-sub)',
                              color: decBadge?.color || 'var(--color-text-secondary)',
                            }}>
                              {item.decision_status}
                            </span>
                          </div>
                          {item.decision && (
                            <div style={{
                              fontSize: 13, color: 'var(--color-text-primary)',
                              lineHeight: 1.6,
                              padding: '8px 12px',
                              background: 'var(--color-bg-sub)',
                              borderRadius: 'var(--radius-md)',
                              whiteSpace: 'pre-wrap',
                            }}>
                              {item.decision}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Minutes (議事録) ── */}
      {isCompleted && meeting.minutes_content && (
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
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>懇親会</h2>
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

      {/* ── My Response ── */}
      <div className="card panel-card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: isMobile ? 16 : 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>あなたの回答</h2>
          {closed && (
            <div style={{ padding: '10px 14px', background: 'var(--color-bg-sub)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
              {isCompleted ? 'この幹事会は終了しました' : '出欠の受付は終了しました'}
            </div>
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
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>懇親会出欠</h2>
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
