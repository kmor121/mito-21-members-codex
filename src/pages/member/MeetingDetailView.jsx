import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import { useAuth } from '../../contexts/AuthContext';
import { fullName } from '../../utils/formatName';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AttendanceDeadlineBadge from '../../components/ui/AttendanceDeadlineBadge';
import { isAttendanceClosed } from '../../utils/attendanceUtils';
import { useIsMobile } from '../../hooks/useIsMobile';

/* ── Constants ── */

const STATUS_BADGE = {
  "公開": { label: "公開", bg: "#eff6ff", color: "#2563eb" },
  "完了": { label: "完了", bg: "var(--color-bg-sub)", color: "var(--color-text-tertiary)" },
};

const TAG_COLORS = {
  "審議": { bg: "#EEF2FF", color: "#4338CA", border: "#C7D2FE" },
  "協議": { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  "討議": { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
  "報告": { bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
  "議案": { bg: "#EEF2FF", color: "#4338CA", border: "#C7D2FE" },
};

const DECISION_COLORS = {
  "承認":   { bg: "#ECFDF5", color: "#059669" },
  "了承":   { bg: "#ECFDF5", color: "#059669" },
  "否決":   { bg: "#FEF2F2", color: "#DC2626" },
  "継続審議": { bg: "#FFFBEB", color: "#D97706" },
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

/* ── Main Component ── */

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

  /* ── Data Loading ── */

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

      // Build org role labels (same logic as admin MeetingDetail)
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
              orgLabelMap[a.member_id] = {
                label: orgName ? `${orgName} ${a.role}` : a.role,
                priority: prio,
              };
            }
          }
        });
        const labels = {};
        Object.entries(orgLabelMap).forEach(([mid, v]) => { labels[mid] = v.label; });
        setMemberOrgLabel(labels);
      }

      // After party
      const aps = await base44.entities.Event.filter({
        parent_meeting_id: meetingId, is_after_party: true,
      }).catch(() => []);
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

  /* ── Derived State ── */

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

  const myResponse = attMap[currentMemberId]?.response || '';
  const myApResponse = apAttMap[currentMemberId]?.response || '';

  // "組織名 役職 氏名" or person_label or ""
  const getPersonDisplay = useCallback((personId, personLabel) => {
    if (personId && memberMap[personId]) {
      const name = fullName(memberMap[personId]);
      const orgLabel = memberOrgLabel[personId];
      return orgLabel ? `${orgLabel} ${name}` : name;
    }
    return personLabel || '';
  }, [memberMap, memberOrgLabel]);

  /* ── Response Handler ── */

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
        await base44.entities.Attendance.update(existing.id, {
          response, status: response, responded_at: new Date().toISOString(),
        });
        invalidateReadCache('Attendance');
        showToast('回答を変更しました');
      } else {
        const check = await base44.entities.Attendance.filter({
          ...idField, member_id: currentMemberId,
        }).catch(() => []);
        if (check?.length > 0) {
          await base44.entities.Attendance.update(check[0].id, {
            response, status: response, responded_at: new Date().toISOString(),
          });
        } else {
          await base44.entities.Attendance.create({
            ...idField, member_id: currentMemberId,
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

  /* ── Loading / Not Found ── */

  if (loading) {
    return (
      <section className="admin-shell">
        <Link to="/meetings" className="text-link" style={{ fontSize: 13, marginBottom: 12, display: 'inline-block' }}>
          ← 幹事会一覧に戻る
        </Link>
        <LoadingSpinner />
      </section>
    );
  }

  if (!meeting || meeting.status === '下書き') {
    return (
      <section className="admin-shell">
        <Link to="/meetings" className="text-link" style={{ fontSize: 13, marginBottom: 12, display: 'inline-block' }}>
          ← 幹事会一覧に戻る
        </Link>
        <div className="card panel-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>この幹事会は公開されていません</p>
        </div>
      </section>
    );
  }

  /* ── Computed Values ── */

  const sb = STATUS_BADGE[meeting.status] || STATUS_BADGE["公開"];
  const isCompleted = meeting.status === '完了';
  const closed = isCompleted || isAttendanceClosed(meeting);

  const attendList = attendances.filter(a => (a.response || a.status) === '出席');
  const absentList = attendances.filter(a => (a.response || a.status) === '欠席');
  const respondedCount = attendances.length;

  // Ceremony: order 1-3 before agenda, order 5+ after agenda
  const ceremonyAll = Array.isArray(meeting.ceremony_items)
    ? [...meeting.ceremony_items].sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];
  const ceremonyBefore = ceremonyAll.filter(c => (c.order || 0) <= 3);
  const ceremonyAfter = ceremonyAll.filter(c => (c.order || 0) >= 5);

  // Agenda items (inserted at position 4 in the ceremony flow)
  const agendaItems = Array.isArray(meeting.agenda_items)
    ? [...meeting.agenda_items].sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  const moderator = meeting.moderator_id
    ? getPersonDisplay(meeting.moderator_id, '')
    : '';

  const hasAgenda = ceremonyAll.length > 0 || agendaItems.length > 0;

  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid var(--color-border)',
    padding: isMobile ? 20 : '28px 32px',
    marginBottom: 24,
  };

  /* ── Render ── */

  return (
    <section className="admin-shell">
      {toast && (
        <div className="nl2-toast">
          <span className="nl2-toast-icon">{"\u2713"}</span>
          <span>{toast}</span>
        </div>
      )}

      <Link to="/meetings" className="text-link" style={{ fontSize: 13, marginBottom: 12, display: 'inline-block' }}>
        ← 幹事会一覧に戻る
      </Link>

      {/* ━━━━━━━━━━ HEADER ━━━━━━━━━━ */}
      <div style={cardStyle}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 16, flexWrap: 'wrap',
        }}>
          {/* Left: meeting info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            {isCompleted && (
              <div style={{
                fontSize: 12, fontWeight: 700, letterSpacing: '0.15em',
                color: 'var(--color-text-tertiary)', marginBottom: 6,
              }}>
                議 事 録
              </div>
            )}
            <h1 style={{
              fontSize: isMobile ? 20 : 24, fontWeight: 700,
              color: 'var(--color-text-primary)', margin: '0 0 10px',
            }}>
              {meeting.title}
            </h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{
                padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: sb.bg, color: sb.color,
              }}>
                {sb.label}
              </span>
              <AttendanceDeadlineBadge deadline={meeting.attendance_deadline} closed={closed} />
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.9 }}>
              <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {formatDate(meeting.meeting_date, meeting.start_time, meeting.end_time)}
              </div>
              {meeting.location && (
                <div>場所: {meeting.location}</div>
              )}
              {moderator && (
                <div>司会: {moderator}</div>
              )}
            </div>
          </div>

          {/* Right: attendance buttons (compact) */}
          {!isCompleted && (
            <div style={{ flexShrink: 0, textAlign: isMobile ? 'left' : 'right' }}>
              {myResponse && (
                <div style={{
                  fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6,
                }}>
                  あなたの回答
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                {['出席', '欠席'].map(opt => {
                  const sel = myResponse === opt;
                  const attend = opt === '出席';
                  return (
                    <button key={opt} type="button"
                      disabled={closed || saving}
                      onClick={() => handleResponse(meetingId, opt, true)}
                      style={{
                        padding: '6px 16px', borderRadius: 8,
                        fontSize: 13, fontWeight: 600,
                        cursor: (closed || saving) ? 'default' : 'pointer',
                        border: sel ? 'none' : '1px solid var(--color-border)',
                        background: sel ? (attend ? 'var(--color-success)' : 'var(--color-danger)') : '#fff',
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
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 6 }}>
                  受付終了
                </div>
              )}
            </div>
          )}
          {isCompleted && myResponse && (
            <div style={{ flexShrink: 0 }}>
              <span style={{
                display: 'inline-block',
                padding: '5px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: myResponse === '出席' ? 'var(--color-success)' : 'var(--color-danger)',
                color: '#fff',
              }}>
                {myResponse}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ━━━━━━━━━━ 次第 ━━━━━━━━━━ */}
      {hasAgenda && (
        <div style={cardStyle}>
          <h2 style={{
            fontSize: 18, fontWeight: 700, margin: '0 0 20px',
            color: 'var(--color-text-primary)',
          }}>
            次第
          </h2>

          {/* Ceremony before agenda (order 1-3) */}
          {ceremonyBefore.map((c, i) => {
            const person = getPersonDisplay(c.person_id, c.person_label);
            return (
              <div key={`cb-${i}`} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 0',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <span style={{
                  fontSize: 14, fontWeight: 500, color: 'var(--color-text-tertiary)',
                  minWidth: 32, textAlign: 'right', lineHeight: '1.5', flexShrink: 0,
                }}>
                  {c.order}.
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: '1.5' }}>
                    {c.title}
                  </div>
                  {person && (
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                      {person}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* 4. 議事 — header + agenda cards */}
          {agendaItems.length > 0 && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px 0 12px',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <span style={{
                  fontSize: 14, fontWeight: 500, color: 'var(--color-text-tertiary)',
                  minWidth: 32, textAlign: 'right', lineHeight: '1.5', flexShrink: 0,
                }}>
                  4.
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-accent)' }}>
                  議事
                </span>
              </div>

              {/* Agenda item cards */}
              <div style={{ padding: '16px 0 8px', paddingLeft: isMobile ? 0 : 44 }}>
                {agendaItems.map((item, idx) => {
                  const tc = item.tag ? (TAG_COLORS[item.tag] || { bg: 'var(--color-bg-sub)', color: 'var(--color-text-secondary)', border: 'var(--color-border)' }) : null;
                  const person = getPersonDisplay(item.person_id, item.person_label);
                  const dc = item.decision_status ? (DECISION_COLORS[item.decision_status] || { bg: 'var(--color-bg-sub)', color: 'var(--color-text-secondary)' }) : null;
                  const isSimple = !item.tag && item.title === 'その他';

                  // "その他" item without tag — render as simple row
                  if (isSimple) {
                    return (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 0',
                        borderBottom: idx < agendaItems.length - 1 ? '1px solid var(--color-border)' : 'none',
                      }}>
                        <span style={{
                          fontSize: 13, fontWeight: 500, color: 'var(--color-text-tertiary)',
                          minWidth: 24, textAlign: 'right', flexShrink: 0,
                        }}>
                          {idx + 1})
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          {item.title}
                        </span>
                      </div>
                    );
                  }

                  // Agenda card
                  const hasDecision = isCompleted && item.decision_status && item.decision_status !== '未審議';

                  return (
                    <div key={idx} style={{
                      border: `1px solid ${tc?.border || 'var(--color-border)'}`,
                      borderRadius: 12,
                      padding: isMobile ? '16px 14px' : '20px 24px',
                      marginBottom: 12,
                      background: '#fff',
                    }}>
                      {/* Decision result badge at top (completed only) */}
                      {hasDecision && (
                        <div style={{ marginBottom: 12 }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '5px 16px', borderRadius: 6,
                            fontSize: 14, fontWeight: 700,
                            background: dc?.bg || 'var(--color-bg-sub)',
                            color: dc?.color || 'var(--color-text-secondary)',
                          }}>
                            {item.decision_status}
                          </span>
                        </div>
                      )}

                      {/* Header: number + tag + title */}
                      <div style={{
                        display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
                        gap: 8, marginBottom: 6, flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--color-text-tertiary)',
                        }}>
                          {idx + 1})
                        </span>
                        {tc && (
                          <span style={{
                            padding: '3px 12px', borderRadius: 6,
                            fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
                            background: tc.bg, color: tc.color,
                          }}>
                            {item.tag}
                          </span>
                        )}
                        <span style={{
                          fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)',
                          flex: 1, minWidth: 0,
                        }}>
                          {item.title}
                        </span>
                      </div>

                      {/* Person */}
                      {person && (
                        <div style={{
                          fontSize: 13, color: 'var(--color-text-secondary)',
                          marginBottom: 8, paddingLeft: 2,
                        }}>
                          {person}
                        </div>
                      )}

                      {/* Link */}
                      {item.link_url && (
                        <div style={{ marginBottom: 8, paddingLeft: 2 }}>
                          {item.link_url.startsWith('/') ? (
                            <Link to={item.link_url} style={{
                              fontSize: 13, color: 'var(--color-accent)', textDecoration: 'none',
                              fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}>
                              {item.link_label || '資料を見る'} →
                            </Link>
                          ) : (
                            <a href={item.link_url} target="_blank" rel="noopener noreferrer" style={{
                              fontSize: 13, color: 'var(--color-accent)', textDecoration: 'none',
                              fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}>
                              {item.link_label || '資料を見る'} →
                            </a>
                          )}
                        </div>
                      )}

                      {/* Decision details (completed only) */}
                      {hasDecision && item.decision && (
                        <div style={{
                          marginTop: 12, paddingTop: 12,
                          borderTop: '1px solid var(--color-border)',
                        }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)',
                            marginBottom: 6,
                          }}>
                            決定事項
                          </div>
                          <div style={{
                            fontSize: 14, color: 'var(--color-text-primary)',
                            lineHeight: 1.7,
                            padding: '12px 16px',
                            background: 'var(--color-bg-sub)',
                            borderRadius: 8,
                            whiteSpace: 'pre-wrap',
                          }}>
                            {item.decision}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Ceremony after agenda (order 5+) */}
          {ceremonyAfter.map((c, i) => {
            const person1 = getPersonDisplay(c.person_id, c.person_label);
            const person2 = c.title === '監事講評'
              ? getPersonDisplay(c.person_id_2, c.person_label_2)
              : '';
            return (
              <div key={`ca-${i}`} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 0',
                borderBottom: i < ceremonyAfter.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}>
                <span style={{
                  fontSize: 14, fontWeight: 500, color: 'var(--color-text-tertiary)',
                  minWidth: 32, textAlign: 'right', lineHeight: '1.5', flexShrink: 0,
                }}>
                  {c.order}.
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: '1.5' }}>
                    {c.title}
                  </div>
                  {person1 && (
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                      {person1}
                    </div>
                  )}
                  {person2 && (
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {person2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━━━━━━━━ 議事録補足 (completed only) ━━━━━━━━━━ */}
      {isCompleted && meeting.minutes_content && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text-primary)' }}>
            議事録補足
          </h2>
          <div
            style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-primary)' }}
            dangerouslySetInnerHTML={{ __html: meeting.minutes_content }}
          />
        </div>
      )}

      {/* ━━━━━━━━━━ 出欠状況 ━━━━━━━━━━ */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: 'var(--color-text-primary)' }}>
          出欠状況
        </h2>

        {/* Meeting attendance */}
        <div style={{ marginBottom: afterParty ? 24 : 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              幹事会
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              回答率 {members.length > 0 ? Math.round((respondedCount / members.length) * 100) : 0}%
              ({respondedCount}/{members.length})
            </span>
            <span style={{
              padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: 'var(--color-success-light)', color: 'var(--color-success)',
            }}>
              出席 {attendList.length}
            </span>
            <span style={{
              padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: 'var(--color-danger-light)', color: 'var(--color-danger)',
            }}>
              欠席 {absentList.length}
            </span>
          </div>

          {/* Attendee names */}
          {attendList.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {attendList.map(a => {
                const m = memberMap[a.member_id];
                return (
                  <span key={a.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 12px', borderRadius: 99, fontSize: 13,
                    background: 'var(--color-success-light)', color: 'var(--color-success)', fontWeight: 500,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                    {m ? fullName(m) : '不明'}
                  </span>
                );
              })}
            </div>
          )}
          {absentList.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {absentList.map(a => {
                const m = memberMap[a.member_id];
                return (
                  <span key={a.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 12px', borderRadius: 99, fontSize: 13,
                    background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontWeight: 500,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)' }} />
                    {m ? fullName(m) : '不明'}
                  </span>
                );
              })}
            </div>
          )}
          {members.length - respondedCount > 0 && (
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              未回答: {members.length - respondedCount}名
            </div>
          )}
        </div>

        {/* After party attendance */}
        {afterParty && (() => {
          const apAttendList = apAtts.filter(a => (a.response || a.status) === '出席');
          const apAbsentList = apAtts.filter(a => (a.response || a.status) === '欠席');
          const apRespondedCount = apAtts.length;
          return (
            <div style={{ paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  懇親会
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  回答率 {members.length > 0 ? Math.round((apRespondedCount / members.length) * 100) : 0}%
                  ({apRespondedCount}/{members.length})
                </span>
                <span style={{
                  padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: 'var(--color-success-light)', color: 'var(--color-success)',
                }}>
                  参加 {apAttendList.length}
                </span>
                <span style={{
                  padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: 'var(--color-danger-light)', color: 'var(--color-danger)',
                }}>
                  不参加 {apAbsentList.length}
                </span>
              </div>
              {apAttendList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {apAttendList.map(a => {
                    const m = memberMap[a.member_id];
                    return (
                      <span key={a.id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 12px', borderRadius: 99, fontSize: 13,
                        background: 'var(--color-success-light)', color: 'var(--color-success)', fontWeight: 500,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                        {m ? fullName(m) : '不明'}
                      </span>
                    );
                  })}
                </div>
              )}
              {apAbsentList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {apAbsentList.map(a => {
                    const m = memberMap[a.member_id];
                    return (
                      <span key={a.id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 12px', borderRadius: 99, fontSize: 13,
                        background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontWeight: 500,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)' }} />
                        {m ? fullName(m) : '不明'}
                      </span>
                    );
                  })}
                </div>
              )}
              {members.length - apRespondedCount > 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  未回答: {members.length - apRespondedCount}名
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ━━━━━━━━━━ 懇親会 (bottom, warm) ━━━━━━━━━━ */}
      {afterParty && (
        <div style={{
          background: '#FFFBEB',
          borderRadius: 16,
          border: '1px solid #FDE68A',
          padding: isMobile ? 20 : '28px 32px',
          marginBottom: 24,
        }}>
          <h2 style={{
            fontSize: 18, fontWeight: 700, margin: '0 0 12px',
            color: '#78350F',
          }}>
            懇親会
          </h2>
          <div style={{ fontSize: 14, color: '#92400E', lineHeight: 1.9, marginBottom: 16 }}>
            {afterParty.location && (
              <div>場所: {afterParty.location}</div>
            )}
            {afterParty.start_time && (
              <div>時間: {afterParty.start_time}{afterParty.end_time ? `〜${afterParty.end_time}` : ''}</div>
            )}
            <div>会費: {afterParty.fee > 0 ? `¥${Number(afterParty.fee).toLocaleString()}` : '無料'}</div>
          </div>

          {/* AP response buttons */}
          {!isCompleted ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {myApResponse && (
                <span style={{
                  fontSize: 13, color: '#78350F', marginRight: 4,
                }}>
                  あなた:
                </span>
              )}
              {['出席', '欠席'].map(opt => {
                const sel = myApResponse === opt;
                const attend = opt === '出席';
                return (
                  <button key={opt} type="button"
                    disabled={closed || saving}
                    onClick={() => handleResponse(afterParty.id, opt, false)}
                    style={{
                      padding: '6px 16px', borderRadius: 8,
                      fontSize: 13, fontWeight: 600,
                      cursor: (closed || saving) ? 'default' : 'pointer',
                      border: sel ? 'none' : '1px solid #FDE68A',
                      background: sel ? (attend ? 'var(--color-success)' : 'var(--color-danger)') : '#fff',
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
    </section>
  );
}
