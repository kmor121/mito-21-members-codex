import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DatePicker from '../../components/ui/DatePicker';
import TimeSelect from '../../components/ui/TimeSelect';
import MemberSelector from '../../components/ui/MemberSelector';
import YearPillNav from '../../components/ui/YearPillNav';
import { useIsMobile } from '../../hooks/useIsMobile';

const STATUS_BADGE = {
  "下書き": { bg: "var(--line-light)", color: "var(--text-secondary)" },
  "公開":   { bg: "var(--success-light)", color: "var(--success)" },
  "完了":   { bg: "var(--success-light)", color: "var(--success)" },
};

const STATUS_LABEL = { "下書き": "下書き", "公開": "公開", "完了": "完了" };

const DEFAULT_CEREMONY_ITEMS = [
  { order: 1, title: "開会のことば", person_id: "" },
  { order: 2, title: "会長挨拶", person_id: "" },
  { order: 3, title: "直前会長挨拶", person_id: "" },
  { order: 5, title: "監事講評", person_id: "" },
  { order: 6, title: "閉会のことば", person_id: "" },
];

/* ── AttendanceRing ── */
function AttendanceRing({ present, total, size = 44 }) {
  if (!total) return null;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? present / total : 0;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" style={{ stroke: 'var(--line)' }} strokeWidth={3} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" style={{ stroke: 'var(--success)' }} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 500, fill: 'var(--text)' }}>
        {present}/{total}
      </text>
    </svg>
  );
}

/* ── helpers ── */
function showToast(msg, type) {
  if (window.__showToast) window.__showToast(msg, type || 'success');
}

function getDayParts(dateStr) {
  if (!dateStr) return { dateMain: '-', dowLabel: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { dateMain: '-', dowLabel: '' };
  const dow = ['日','月','火','水','木','金','土'][d.getDay()];
  return { dateMain: `${d.getMonth() + 1}/${d.getDate()}`, dowLabel: `${dow}曜日` };
}

function formatTimeRange(start, end) {
  if (!start && !end) return '';
  return [start, end].filter(Boolean).join(' - ');
}

/* ── main component ── */
export default function Meetings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { memberInfo } = useAuth();
  const isMobile = useIsMobile();

  const [meetings, setMeetings] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [memberRoleMap, setMemberRoleMap] = useState({});
  const [selectedFYId, setSelectedFYId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  const [form, setForm] = useState({
    title: '', meeting_date: '', start_time: '19:00', end_time: '21:00',
    location: '', moderator_id: '',
  });

  /* ── agenda copy state ── */
  const [copiedCeremony, setCopiedCeremony] = useState(null);
  const [copiedAgenda, setCopiedAgenda] = useState(null);
  const [copiedFromTitle, setCopiedFromTitle] = useState('');
  const [showCopySelector, setShowCopySelector] = useState(false);

  const currentFyId = useMemo(() => {
    const fy = fiscalYears.find(f => f.is_current);
    return fy ? fy.id : '';
  }, [fiscalYears]);

  /* ── data loading ── */
  const loadData = useCallback(async () => {
    try {
      const [fyList, meetList, members, assigns] = await Promise.all([
        base44.entities.FiscalYear.list("-year"),
        base44.entities.Meeting.list().catch(() => []),
        base44.entities.Member.list().catch(() => []),
        base44.entities.OrgAssignment.list().catch(() => []),
      ]);
      setFiscalYears(fyList || []);
      setMeetings(meetList || []);
      setAllMembers(members || []);
      const currentFY = (fyList || []).find((fy) => fy.is_current) || (fyList && fyList[0]);
      if (currentFY && assigns) {
        const rMap = {};
        assigns.forEach((a) => {
          if (a.fiscal_year_id === currentFY.id && a.role && !rMap[a.member_id]) rMap[a.member_id] = a.role;
        });
        setMemberRoleMap(rMap);
      }
      if (!selectedFYId) {
        const current = (fyList || []).find((fy) => fy.is_current);
        if (current) setSelectedFYId(current.id);
        else if (fyList && fyList.length > 0) setSelectedFYId(fyList[0].id);
      }
    } catch (err) {
      console.error('Meetings loadData error:', err);
    }
    setLoading(false);
  }, [selectedFYId]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Pattern B: receive copy state from MeetingDetail navigation ── */
  useEffect(() => {
    if (location.state?.copyAgenda) {
      const s = location.state;
      setCopiedCeremony(s.copyCeremony || null);
      setCopiedAgenda(s.copyAgenda);
      setCopiedFromTitle(s.copyFromTitle || '');
      setShowCreateModal(true);
      // clear navigation state so refresh won't re-trigger
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const filteredMeetings = useMemo(() => {
    if (!selectedFYId) return [];
    return meetings
      .filter((m) => m.fiscal_year_id === selectedFYId)
      .sort((a, b) => (a.meeting_date || '').localeCompare(b.meeting_date || ''));
  }, [meetings, selectedFYId]);

  /* ── "次回" meeting detection ── */
  const nextMeetingId = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = filteredMeetings
      .filter((m) => m.meeting_date >= today && m.status !== '完了')
      .sort((a, b) => (a.meeting_date || '').localeCompare(b.meeting_date || ''));
    return upcoming.length > 0 ? upcoming[0].id : null;
  }, [filteredMeetings]);

  /* ── summary stats ── */
  const stats = useMemo(() => {
    let confirmed = 0, draft = 0, agendaTotal = 0;
    filteredMeetings.forEach((m) => {
      if (m.status === '公開' || m.status === '完了') confirmed++;
      else draft++;
      if (Array.isArray(m.agenda_items)) agendaTotal += m.agenda_items.length;
    });
    return { confirmed, draft, agendaTotal };
  }, [filteredMeetings]);

  function closeCreateModal() {
    setShowCreateModal(false);
    setShowCopySelector(false);
    clearCopy();
  }

  /* ── copy agenda from a past meeting ── */
  function handleCopyFrom(meeting) {
    const ceremony = Array.isArray(meeting.ceremony_items)
      ? meeting.ceremony_items.map(c => ({
          order: c.order, title: c.title,
          person_id: c.person_id || '', person_label: c.person_label || '',
          person_id_2: c.person_id_2 || '', person_label_2: c.person_label_2 || '',
        }))
      : null;
    const agenda = Array.isArray(meeting.agenda_items)
      ? meeting.agenda_items.map(a => ({
          order: a.order, title: a.title, tag: a.tag || '',
          person_id: a.person_id || '', person_label: a.person_label || '',
          link_url: '', link_label: '', decision: '', decision_status: '未審議',
        }))
      : null;
    setCopiedCeremony(ceremony);
    setCopiedAgenda(agenda);
    setCopiedFromTitle(meeting.title || '');
    setShowCopySelector(false);
  }

  function clearCopy() {
    setCopiedCeremony(null);
    setCopiedAgenda(null);
    setCopiedFromTitle('');
  }

  /* ── sortable meetings for copy selector ── */
  const copyableMeetings = useMemo(() => {
    return meetings
      .filter(m => Array.isArray(m.agenda_items) && m.agenda_items.length > 0)
      .sort((a, b) => (b.meeting_date || '').localeCompare(a.meeting_date || ''));
  }, [meetings]);

  /* ── create handler ── */
  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.meeting_date) return;
    if (!selectedFYId) {
      showToast('年度が選択されていません。', 'error');
      return;
    }
    setSaving(true);
    try {
      const memberId = memberInfo?.id || memberInfo?._id || '';
      const useCeremony = copiedCeremony || DEFAULT_CEREMONY_ITEMS.map(c => ({ ...c }));
      const useAgenda = copiedAgenda || [{ order: 1, title: 'その他', tag: '', person_id: '', person_label: '', link_url: '', link_label: '', decision: '', decision_status: '未審議' }];
      const payload = {
        title: form.title.trim(),
        meeting_date: form.meeting_date,
        start_time: form.start_time || '',
        end_time: form.end_time || '',
        location: form.location.trim(),
        moderator_id: form.moderator_id || '',
        fiscal_year_id: selectedFYId,
        status: '下書き',
        ceremony_items: useCeremony,
        agenda_items: useAgenda,
        minutes_note: '',
        created_by: memberId,
      };
      await base44.entities.Meeting.create(payload);
      invalidateReadCache('Meeting');
      setForm({ title: '', meeting_date: '', start_time: '19:00', end_time: '21:00', location: '', moderator_id: '' });
      clearCopy();
      setShowCreateModal(false);
      showToast('会議を作成しました');
      await loadData();
    } catch (err) {
      console.error('Meeting create error:', err);
      showToast(err.message || '作成に失敗しました', 'error');
    }
    setSaving(false);
  }

  /* ── delete handler ── */
  function handleDelete(meetingId) {
    setConfirmModal({
      title: '会議の削除',
      message: 'この会議を削除してよろしいですか？この操作は取り消せません。',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await base44.entities.Meeting.delete(meetingId);
          invalidateReadCache('Meeting');
          showToast('削除しました');
          await loadData();
        } catch (err) {
          showToast(err.message || '削除に失敗しました', 'error');
        }
      },
    });
  }

  /* ── loading state ── */
  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header"><h1 className="page-title">幹事会管理</h1></div>
        <LoadingSpinner />
      </section>
    );
  }

  /* ── render ── */
  return (
    <section className="admin-shell">

      {/* ── page header ── */}
      {isMobile ? (
        <div style={{ padding: '0 0 12px' }}>
          {/* Row 1: Title + action button */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, marginBottom: 6,
          }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>幹事会管理</h1>
            <button type="button" onClick={() => setShowCreateModal(true)} style={{
              width: 36, height: 36, borderRadius: 'var(--radius)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--primary)', cursor: 'pointer', color: '#fff', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
          {/* Row 2: Year navigation */}
          {fiscalYears.length > 0 && (() => {
            const selectedFY = fiscalYears.find(fy => fy.id === selectedFYId);
            const idx = fiscalYears.findIndex(fy => fy.id === selectedFYId);
            const canPrev = idx < fiscalYears.length - 1;
            const canNext = idx > 0;
            const yearLabel = selectedFY ? (selectedFY.year_label || `${selectedFY.year}年度`) : '';
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button type="button" disabled={!canPrev} onClick={() => canPrev && setSelectedFYId(fiscalYears[idx + 1].id)}
                  style={{ background: 'none', border: 'none', padding: '4px', fontSize: 14, color: canPrev ? 'var(--primary)' : 'var(--text-muted)', cursor: canPrev ? 'pointer' : 'default' }}>&#9666;</button>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{yearLabel}</span>
                <button type="button" disabled={!canNext} onClick={() => canNext && setSelectedFYId(fiscalYears[idx - 1].id)}
                  style={{ background: 'none', border: 'none', padding: '4px', fontSize: 14, color: canNext ? 'var(--primary)' : 'var(--text-muted)', cursor: canNext ? 'pointer' : 'default' }}>&#9656;</button>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">幹事会管理</h1>
            <p className="page-description">幹事会の次第・議事録を管理</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            新規作成
          </button>
        </div>
      )}

      {/* ── FY navigation ── */}
      {!isMobile && fiscalYears.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <YearPillNav
            fiscalYears={fiscalYears}
            activeFyId={selectedFYId}
            currentFyId={currentFyId}
            onChange={setSelectedFYId}
          />
        </div>
      )}

      {/* ── summary stats ── */}
      {isMobile ? (
        <div className="stat-chip-bar" style={{ marginBottom: 8 }}>
          <span className="stat-chip">開催済み <span className="stat-chip-value" style={{ color: 'var(--success)' }}>{stats.confirmed}</span></span>
          <span className="stat-chip">予定 <span className="stat-chip-value">{stats.draft}</span></span>
          <span className="stat-chip">議題合計 <span className="stat-chip-value" style={{ color: 'var(--text-secondary)' }}>{stats.agendaTotal}</span></span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 24 }}>
          <div className="mtg-stat-card">
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>開催済み</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--success)' }}>{stats.confirmed}</div>
          </div>
          <div className="mtg-stat-card">
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>予定</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--primary)' }}>{stats.draft}</div>
          </div>
          <div className="mtg-stat-card">
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>議題合計</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-secondary)' }}>{stats.agendaTotal}</div>
          </div>
        </div>
      )}

      {/* ── meeting cards ── */}
      {filteredMeetings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ color: 'var(--muted)' }}>
            <rect x="6" y="8" width="28" height="26" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M6 16h28" stroke="currentColor" strokeWidth="2"/>
            <path d="M14 6v4M26 6v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '16px 0 20px' }}>この年度の幹事会はまだ登録されていません</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            最初の会議を作成
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredMeetings.map((m) => {
            const { dateMain, dowLabel } = getDayParts(m.meeting_date);
            const badge = STATUS_BADGE[m.status] || STATUS_BADGE['下書き'];
            const agendaCount = Array.isArray(m.agenda_items) ? m.agenda_items.length : 0;
            const isNext = m.id === nextMeetingId;
            const timeStr = formatTimeRange(m.start_time, m.end_time);
            const attendees = Array.isArray(m.attendees) ? m.attendees.length : 0;
            const boardCount = Object.keys(memberRoleMap).length;

            return (
              <div key={m.id}
                onClick={() => navigate(`/admin/meetings/${m.id}`)}
                className={`mtg-card${isNext ? ' mtg-card-next' : ''}`}
              >
                {/* date column */}
                <div className="mtg-date-col" style={{ minWidth: 52, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', lineHeight: 1.1 }}>{dateMain}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{dowLabel}</div>
                </div>

                {/* divider */}
                <div className="mtg-card-divider" style={{ width: 1, height: 40, background: 'var(--line)', flexShrink: 0 }} />

                {/* center info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{m.title}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                      background: badge.bg, color: badge.color, whiteSpace: 'nowrap',
                    }}>{STATUS_LABEL[m.status] || m.status}</span>
                    {isNext && (
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                        background: 'var(--primary-light)', color: 'var(--primary)', whiteSpace: 'nowrap',
                      }}>次回</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
                    {m.location && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 1.75a3.5 3.5 0 0 0-3.5 3.5C3.5 8.75 7 12.25 7 12.25s3.5-3.5 3.5-7A3.5 3.5 0 0 0 7 1.75Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"/></svg>
                        {m.location}
                      </span>
                    )}
                    {timeStr && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="7" cy="7" r="5.25"/><path d="M7 4v3.5l2.25 1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {timeStr}
                      </span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M4.5 3.5h7M4.5 7h7M4.5 10.5h7M2.5 3.5h.01M2.5 7h.01M2.5 10.5h.01"/></svg>
                      {agendaCount}議題
                    </span>
                  </div>
                </div>

                {/* attendance ring (desktop) + delete */}
                <div className="mtg-card-right" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  {attendees > 0 && <AttendanceRing present={attendees} total={boardCount || attendees} />}
                  {m.status === '下書き' && (
                    <button type="button" className="mtg-delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                    >削除</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── create modal ── */}
      {showCreateModal && (
        <div className="confirm-overlay" onClick={closeCreateModal}>
          <div className="modal-dialog" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            {/* header */}
            <div style={{
              padding: '20px 24px 16px', borderBottom: '1px solid var(--line)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text)' }}>新しい幹事会を作成</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', minWidth: 32 }}
                onClick={closeCreateModal}>&times;</button>
            </div>
            {/* form */}
            <form onSubmit={handleCreate} style={{ padding: '20px 24px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* title */}
                <div>
                  <label className="mtg-label">
                    会議名 <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input type="text" className="mtg-input" value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="例: 第3回幹事会" required
                  />
                </div>
                {/* date + location */}
                <div className="mtg-form-2col">
                  <div>
                    <label className="mtg-label">
                      開催日 <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <DatePicker value={form.meeting_date} onChange={(v) => setForm((p) => ({ ...p, meeting_date: v }))} placeholder="日付を選択" />
                  </div>
                  <div>
                    <label className="mtg-label">場所</label>
                    <input type="text" className="mtg-input" value={form.location}
                      onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder="例: よつ葉"
                    />
                  </div>
                </div>
                {/* start + end time */}
                <div className="mtg-form-2col">
                  <div>
                    <label className="mtg-label">開始時刻</label>
                    <TimeSelect value={form.start_time} onChange={(v) => setForm((p) => ({ ...p, start_time: v }))} />
                  </div>
                  <div>
                    <label className="mtg-label">終了時刻</label>
                    <TimeSelect value={form.end_time} onChange={(v) => setForm((p) => ({ ...p, end_time: v }))} />
                  </div>
                </div>
                {/* moderator */}
                <div>
                  <label className="mtg-label">司会者</label>
                  <MemberSelector value={form.moderator_id}
                    onChange={(v) => setForm((p) => ({ ...p, moderator_id: v }))}
                    members={allMembers} roleMap={memberRoleMap} placeholder="司会者を選択..." />
                </div>

                {/* ── agenda copy section ── */}
                <div>
                  <label className="mtg-label">次第のコピー</label>
                  {!copiedFromTitle ? (
                    <>
                      <button type="button" className="mtg-copy-source-btn" onClick={() => setShowCopySelector(!showCopySelector)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        過去の次第をコピー
                      </button>
                      {showCopySelector && (
                        <div className="mtg-copy-list">
                          {copyableMeetings.length === 0 ? (
                            <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>コピー可能な会議がありません</div>
                          ) : copyableMeetings.map(m => {
                            const agendaCount = Array.isArray(m.agenda_items) ? m.agenda_items.length : 0;
                            const dateLabel = m.meeting_date ? m.meeting_date.replace(/-/g, '/') : '';
                            return (
                              <button key={m.id} type="button" className="mtg-copy-list-item" onClick={() => handleCopyFrom(m)}>
                                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{m.title}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{dateLabel} ・ {agendaCount}議題</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mtg-copy-preview">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                          「{copiedFromTitle}」からコピー済み
                        </span>
                        <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 10px' }}
                          onClick={clearCopy}>&times; クリア</button>
                      </div>
                      {copiedCeremony && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>式次第</div>
                          {copiedCeremony.map((c, i) => (
                            <div key={i} style={{ fontSize: 12, color: 'var(--text)', padding: '2px 0' }}>
                              {c.title}{c.person_label ? ` — ${c.person_label}` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                      {copiedAgenda && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>議題</div>
                          {copiedAgenda.map((a, i) => (
                            <div key={i} style={{ fontSize: 12, color: 'var(--text)', padding: '2px 0' }}>
                              {a.tag ? `[${a.tag}] ` : ''}{a.title}{a.person_label ? ` — ${a.person_label}` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* footer */}
              <div style={{
                padding: '16px 0 20px', marginTop: 20, borderTop: '1px solid var(--line)',
                display: 'flex', justifyContent: 'flex-end', gap: 10,
              }}>
                <button type="button" className="btn btn-secondary" onClick={closeCreateModal}>キャンセル</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── confirm modal ── */}
      {confirmModal && (
        <div className="confirm-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-dialog" style={{ maxWidth: 400, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>{confirmModal.title}</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmModal(null)}>キャンセル</button>
              <button type="button" className="btn btn-primary" style={{ background: 'var(--error)', borderColor: 'var(--error)' }}
                onClick={confirmModal.onConfirm}>削除</button>
            </div>
          </div>
        </div>
      )}

      {/* ── scoped styles ── */}
      <style>{`
        .mtg-card {
          display: flex; align-items: center; gap: 16px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--line);
          padding: 16px 20px; cursor: pointer;
          background: #fff; transition: all 0.15s;
        }
        .mtg-card:hover {
          transform: translateY(-1px);
          background: var(--bg);
          box-shadow: var(--shadow-md);
        }
        .mtg-card-next { border: 1.5px solid var(--primary); }
        .mtg-stat-card {
          background: var(--bg);
          border-radius: var(--radius-lg);
          padding: 14px 16px;
        }
        .mtg-delete-btn {
          padding: 4px 10px; font-size: 12px; font-weight: 500;
          background: none; border: 1px solid var(--error);
          color: var(--error); border-radius: var(--radius-sm);
          cursor: pointer; transition: background 0.15s;
          opacity: 0.7;
        }
        .mtg-delete-btn:hover { background: var(--error-light); opacity: 1; }
        .mtg-label {
          display: block; font-size: 13px; font-weight: 600;
          color: var(--text-secondary); margin-bottom: 6px;
        }
        .mtg-input {
          width: 100%; box-sizing: border-box;
          padding: 10px 14px; border-radius: var(--radius);
          border: 1px solid var(--line); background: var(--bg);
          font-size: 14px; color: var(--text); outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .mtg-input:focus {
          border-color: var(--primary); background: #fff;
        }
        .mtg-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .mtg-copy-source-btn {
          width: 100%; padding: 12px; border: 2px dashed var(--line);
          border-radius: var(--radius); background: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-size: 13px; font-weight: 500; color: var(--text-secondary);
          transition: all 0.15s;
        }
        .mtg-copy-source-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
        .mtg-copy-list {
          margin-top: 8px; border: 1px solid var(--line); border-radius: var(--radius);
          max-height: 200px; overflow-y: auto; background: #fff;
        }
        .mtg-copy-list-item {
          width: 100%; display: flex; flex-direction: column; align-items: flex-start;
          gap: 2px; padding: 10px 14px; border: none; background: none;
          cursor: pointer; text-align: left; border-bottom: 1px solid var(--line);
          transition: background 0.1s;
        }
        .mtg-copy-list-item:last-child { border-bottom: none; }
        .mtg-copy-list-item:hover { background: var(--bg); }
        .mtg-copy-preview {
          padding: 12px 14px; border-radius: var(--radius);
          background: var(--primary-light); border: 1px solid var(--primary-100, var(--line));
        }
        @media (max-width: 768px) {
          .mtg-card { padding: 10px 12px !important; gap: 10px !important; }
          .mtg-card .mtg-card-right svg[width="44"] { display: none; }
          .mtg-card .mtg-date-col { min-width: 44px; }
          .mtg-card .mtg-date-col > div:first-child { font-size: 17px !important; }
          .mtg-card .mtg-card-divider { height: 32px; }
          .mtg-card-right .mtg-delete-btn { padding: 3px 8px; font-size: 11px; }
          .mtg-form-2col { grid-template-columns: 1fr !important; }
          .modal-dialog { max-width: 95vw !important; margin: 8px; }
        }
      `}</style>
    </section>
  );
}
