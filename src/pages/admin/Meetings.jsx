import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DatePicker from '../../components/ui/DatePicker';
import TimeSelect from '../../components/ui/TimeSelect';
import MemberSelector from '../../components/ui/MemberSelector';
import YearPillNav from '../../components/ui/YearPillNav';
import { Button, Card, PageHeader, Modal } from '../../components/ui';
import AttendanceDeadlineBadge from '../../components/ui/AttendanceDeadlineBadge';
import { isAttendanceClosed } from '../../utils/attendanceUtils';
import { useIsMobile } from '../../hooks/useIsMobile';

const STATUS_BADGE = {
  "下書き": { bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)" },
  "公開":   { bg: "var(--color-success-light)", color: "var(--color-success)" },
  "完了":   { bg: "var(--color-success-light)", color: "var(--color-success)" },
};

const STATUS_LABEL = { "下書き": "下書き", "公開": "公開", "完了": "完了" };

const DEFAULT_CEREMONY_ITEMS = [
  { order: 1, title: "開会のことば", person_id: "" },
  { order: 2, title: "会長挨拶", person_id: "" },
  { order: 3, title: "直前会長挨拶", person_id: "" },
  { order: 5, title: "監事講評", person_id: "" },
  { order: 6, title: "閉会のことば", person_id: "" },
];

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
    location: '', attendance_deadline: '',
  });
  const [deadlineManuallySet, setDeadlineManuallySet] = useState(false);
  const [hasAfterParty, setHasAfterParty] = useState(false);
  const [apForm, setApForm] = useState({ location: '', start_time: '21:00', end_time: '23:00', fee: '' });

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
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const filteredMeetings = useMemo(() => {
    if (!selectedFYId) return [];
    return meetings
      .filter((m) => m.fiscal_year_id === selectedFYId)
      .sort((a, b) => (a.meeting_date || '').localeCompare(b.meeting_date || ''));
  }, [meetings, selectedFYId]);

  const nextMeetingId = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = filteredMeetings
      .filter((m) => m.meeting_date >= today && m.status !== '完了')
      .sort((a, b) => (a.meeting_date || '').localeCompare(b.meeting_date || ''));
    return upcoming.length > 0 ? upcoming[0].id : null;
  }, [filteredMeetings]);

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

  function handleCopyFrom(meeting) {
    const ceremony = Array.isArray(meeting.ceremony_items)
      ? meeting.ceremony_items.map(c => ({ order: c.order, title: c.title, person_id: c.person_id || '', person_label: c.person_label || '', person_id_2: c.person_id_2 || '', person_label_2: c.person_label_2 || '' }))
      : null;
    const agenda = Array.isArray(meeting.agenda_items)
      ? meeting.agenda_items.map(a => ({ order: a.order, title: a.title, tag: a.tag || '', person_id: a.person_id || '', person_label: a.person_label || '', link_url: '', link_label: '', decision: '', decision_status: '未審議' }))
      : null;
    setCopiedCeremony(ceremony);
    setCopiedAgenda(agenda);
    setCopiedFromTitle(meeting.title || '');
    setShowCopySelector(false);
  }

  function clearCopy() { setCopiedCeremony(null); setCopiedAgenda(null); setCopiedFromTitle(''); }

  const copyableMeetings = useMemo(() => {
    return meetings
      .filter(m => Array.isArray(m.agenda_items) && m.agenda_items.length > 0)
      .sort((a, b) => (b.meeting_date || '').localeCompare(a.meeting_date || ''));
  }, [meetings]);

  async function handleCreate() {
    if (!form.title.trim() || !form.meeting_date) return;
    if (!selectedFYId) { showToast('年度が選択されていません。', 'error'); return; }
    setSaving(true);
    try {
      const memberId = memberInfo?.id || memberInfo?._id || '';
      const useCeremony = copiedCeremony || DEFAULT_CEREMONY_ITEMS.map(c => ({ ...c }));
      const useAgenda = copiedAgenda || [{ order: 1, title: 'その他', tag: '', person_id: '', person_label: '', link_url: '', link_label: '', decision: '', decision_status: '未審議' }];
      const payload = {
        title: form.title.trim(), meeting_date: form.meeting_date,
        start_time: form.start_time || '', end_time: form.end_time || '',
        location: form.location.trim(),
        attendance_deadline: form.attendance_deadline || '',
        fiscal_year_id: selectedFYId, status: '下書き',
        ceremony_items: useCeremony, agenda_items: useAgenda, minutes_note: '', created_by: memberId,
      };
      const created = await base44.entities.Meeting.create(payload);
      if (hasAfterParty && created?.id) {
        await base44.entities.Event.create({
          title: `${payload.title} 懇親会`, event_type: '懇親会', event_date: payload.meeting_date,
          start_time: apForm.start_time || payload.end_time || '', end_time: apForm.end_time || '',
          location: apForm.location || '', fee: apForm.fee ? Number(apForm.fee) : 0,
          status: 'draft', parent_meeting_id: created.id, is_after_party: true,
          response_options: ['出席', '欠席'], default_response_options: true, fiscal_year_id: selectedFYId, sort_order: 0,
        });
        invalidateReadCache('Event');
      }
      invalidateReadCache('Meeting');
      setForm({ title: '', meeting_date: '', start_time: '19:00', end_time: '21:00', location: '', attendance_deadline: '' });
      setDeadlineManuallySet(false);
      setHasAfterParty(false);
      setApForm({ location: '', start_time: '21:00', end_time: '23:00', fee: '' });
      clearCopy();
      setShowCreateModal(false);
      showToast('会議を作成しました');
      await loadData();
    } catch (err) {
      showToast(err.message || '作成に失敗しました', 'error');
    }
    setSaving(false);
  }

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
        } catch (err) { showToast(err.message || '削除に失敗しました', 'error'); }
      },
    });
  }

  if (loading) {
    return (
      <section className="admin-shell">
        <PageHeader title="幹事会管理" />
        <LoadingSpinner />
      </section>
    );
  }

  return (
    <section className="admin-shell">

      {/* ── page header ── */}
      {isMobile ? (
        <div style={{ padding: '0 0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>幹事会管理</h1>
            <button type="button" onClick={() => setShowCreateModal(true)} style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-accent)', cursor: 'pointer', color: '#fff', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      ) : (
        <PageHeader
          title="幹事会管理"
          subtitle="幹事会の次第・議事録を管理"
          actions={
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              新規作成
            </Button>
          }
        />
      )}

      {/* ── FY navigation ── */}
      {fiscalYears.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <YearPillNav fiscalYears={fiscalYears} activeFyId={selectedFYId} currentFyId={currentFyId} onChange={setSelectedFYId} />
        </div>
      )}

      {/* ── summary stats ── */}
      {isMobile ? (
        <div className="stat-chip-bar" style={{ marginBottom: 8 }}>
          <span className="stat-chip">開催済み <span className="stat-chip-value" style={{ color: 'var(--color-success)' }}>{stats.confirmed}</span></span>
          <span className="stat-chip">予定 <span className="stat-chip-value">{stats.draft}</span></span>
          <span className="stat-chip">議題合計 <span className="stat-chip-value" style={{ color: 'var(--color-text-secondary)' }}>{stats.agendaTotal}</span></span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 24 }}>
          <Card padding="14px 16px"><div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>開催済み</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-success)' }}>{stats.confirmed}</div></Card>
          <Card padding="14px 16px"><div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>予定</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-accent)' }}>{stats.draft}</div></Card>
          <Card padding="14px 16px"><div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>議題合計</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{stats.agendaTotal}</div></Card>
        </div>
      )}

      {/* ── meeting cards ── */}
      {filteredMeetings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ color: 'var(--color-text-tertiary)' }}>
            <rect x="6" y="8" width="28" height="26" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M6 16h28" stroke="currentColor" strokeWidth="2"/>
            <path d="M14 6v4M26 6v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '16px 0 20px' }}>この年度の幹事会はまだ登録されていません</p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            最初の会議を作成
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredMeetings.map((m) => {
            const { dateMain, dowLabel } = getDayParts(m.meeting_date);
            const badge = STATUS_BADGE[m.status] || STATUS_BADGE['下書き'];
            const agendaCount = Array.isArray(m.agenda_items) ? m.agenda_items.length : 0;
            const isNext = m.id === nextMeetingId;
            const timeStr = formatTimeRange(m.start_time, m.end_time);

            return (
              <Card
                key={m.id}
                onClick={() => navigate(`/admin/meetings/${m.id}`)}
                padding={isMobile ? '10px 12px' : '16px 20px'}
                style={isNext ? { border: '1.5px solid var(--color-accent)' } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16 }}>
                  <div style={{ minWidth: isMobile ? 44 : 52, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>{dateMain}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{dowLabel}</div>
                  </div>
                  <div style={{ width: 1, height: isMobile ? 32 : 40, background: 'var(--color-border)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>{m.title}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>{STATUS_LABEL[m.status] || m.status}</span>
                      {isNext && <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--color-accent-light)', color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>次回</span>}
                      <AttendanceDeadlineBadge deadline={m.attendance_deadline} closed={isAttendanceClosed(m)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, flexWrap: 'wrap', color: 'var(--color-text-secondary)' }}>
                      {m.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 1.75a3.5 3.5 0 0 0-3.5 3.5C3.5 8.75 7 12.25 7 12.25s3.5-3.5 3.5-7A3.5 3.5 0 0 0 7 1.75Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"/></svg>{m.location}</span>}
                      {timeStr && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="7" cy="7" r="5.25"/><path d="M7 4v3.5l2.25 1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>{timeStr}</span>}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M4.5 3.5h7M4.5 7h7M4.5 10.5h7M2.5 3.5h.01M2.5 7h.01M2.5 10.5h.01"/></svg>{agendaCount}議題</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    {m.status === '下書き' && (
                      <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}>削除</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── create modal ── */}
      <Modal isOpen={showCreateModal} onClose={closeCreateModal} title="新しい幹事会を作成" width="480px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 会議名 */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              会議名 <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input type="text" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例: 第6回幹事会"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* 開催日 + 場所 */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                開催日 <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input type="date" value={form.meeting_date}
                onChange={e => {
                  const v = e.target.value;
                  setForm(f => {
                    const next = { ...f, meeting_date: v };
                    if (v && !deadlineManuallySet) {
                      const d = new Date(v); d.setDate(d.getDate() - 3);
                      next.attendance_deadline = d.toISOString().split('T')[0];
                    }
                    return next;
                  });
                }}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>場所</label>
              <input type="text" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="例: よつ葉"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* 開始時刻 + 終了時刻 */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>開始時刻</label>
              <TimeSelect value={form.start_time} onChange={v => setForm(f => ({ ...f, start_time: v }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>終了時刻</label>
              <TimeSelect value={form.end_time} onChange={v => setForm(f => ({ ...f, end_time: v }))} />
            </div>
          </div>

          {/* 出欠期限 */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>出欠期限（任意）</label>
            <input type="date" value={form.attendance_deadline}
              onChange={e => { setForm(f => ({ ...f, attendance_deadline: e.target.value })); setDeadlineManuallySet(true); }}
              style={{ width: '100%', maxWidth: 220, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
            {form.meeting_date && form.attendance_deadline && !deadlineManuallySet && (
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>※ 開催日の3日前が自動設定されています</p>
            )}
          </div>

          {/* 次第コピー */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>次第のコピー</label>
            {!copiedFromTitle ? (
              <>
                <button type="button" className="mtg-copy-source-btn" onClick={() => setShowCopySelector(!showCopySelector)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  過去の次第をコピー
                </button>
                {showCopySelector && (
                  <div className="mtg-copy-list">
                    {copyableMeetings.length === 0 ? (
                      <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>コピー可能な会議がありません</div>
                    ) : copyableMeetings.map(mtg => {
                      const ac = Array.isArray(mtg.agenda_items) ? mtg.agenda_items.length : 0;
                      const dl = mtg.meeting_date ? mtg.meeting_date.replace(/-/g, '/') : '';
                      return (
                        <button key={mtg.id} type="button" className="mtg-copy-list-item" onClick={() => handleCopyFrom(mtg)}>
                          <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{mtg.title}</span>
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{dl} ・ {ac}議題</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="mtg-copy-preview">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)' }}>「{copiedFromTitle}」からコピー済み</span>
                  <Button variant="secondary" size="sm" onClick={clearCopy}>&times; クリア</Button>
                </div>
                {copiedCeremony && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>式次第</div>
                    {copiedCeremony.map((c, i) => <div key={i} style={{ fontSize: 12, color: 'var(--color-text-primary)', padding: '2px 0' }}>{c.title}{c.person_label ? ` — ${c.person_label}` : ''}</div>)}
                  </div>
                )}
                {copiedAgenda && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>議題</div>
                    {copiedAgenda.map((a, i) => <div key={i} style={{ fontSize: 12, color: 'var(--color-text-primary)', padding: '2px 0' }}>{a.tag ? `[${a.tag}] ` : ''}{a.title}{a.person_label ? ` — ${a.person_label}` : ''}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 懇親会 */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
            <input type="checkbox" checked={hasAfterParty} onChange={e => setHasAfterParty(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>懇親会あり</span>
          </label>
          {hasAfterParty && (
            <div style={{ padding: 16, background: 'var(--color-bg-sub)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>場所</label>
                <input type="text" value={apForm.location} onChange={e => setApForm(p => ({ ...p, location: e.target.value }))} placeholder="例: 居酒屋XX"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>開始時刻</label><TimeSelect value={apForm.start_time} onChange={v => setApForm(p => ({ ...p, start_time: v }))} /></div>
                <div><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>終了時刻</label><TimeSelect value={apForm.end_time} onChange={v => setApForm(p => ({ ...p, end_time: v }))} /></div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>参加費</label>
                <input type="number" min="0" placeholder="0 = 無料" value={apForm.fee} onChange={e => setApForm(p => ({ ...p, fee: e.target.value }))}
                  style={{ width: '100%', maxWidth: 160, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}

          {/* ボタン */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
            <Button variant="ghost" onClick={closeCreateModal} disabled={saving}>キャンセル</Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving || !form.title.trim() || !form.meeting_date}>
              {saving ? '作成中...' : '作成'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── confirm modal ── */}
      <Modal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} title={confirmModal?.title || ''} width="400px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmModal(null)}>キャンセル</Button>
            <Button variant="danger" onClick={confirmModal?.onConfirm} disabled={saving}>削除</Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{confirmModal?.message}</p>
      </Modal>

      {/* ── scoped styles ── */}
      <style>{`
        .mtg-label { display: block; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 6px; }
        .mtg-input {
          width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius-md);
          border: 1px solid var(--color-border); background: var(--color-bg-sub); font-size: 14px; color: var(--color-text-primary);
          outline: none; transition: border-color 0.15s, background 0.15s;
        }
        .mtg-input:focus { border-color: var(--color-accent); background: #fff; }
        .mtg-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .mtg-copy-source-btn {
          width: 100%; padding: 12px; border: 2px dashed var(--color-border);
          border-radius: var(--radius-md); background: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-size: 13px; font-weight: 500; color: var(--color-text-secondary); transition: all 0.15s;
        }
        .mtg-copy-source-btn:hover { border-color: var(--color-accent); color: var(--color-accent); background: var(--color-accent-light); }
        .mtg-copy-list {
          margin-top: 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md);
          max-height: 200px; overflow-y: auto; background: #fff;
        }
        .mtg-copy-list-item {
          width: 100%; display: flex; flex-direction: column; align-items: flex-start;
          gap: 2px; padding: 10px 14px; border: none; background: none;
          cursor: pointer; text-align: left; border-bottom: 1px solid var(--color-border); transition: background 0.1s;
        }
        .mtg-copy-list-item:last-child { border-bottom: none; }
        .mtg-copy-list-item:hover { background: var(--color-bg-sub); }
        .mtg-copy-preview {
          padding: 12px 14px; border-radius: var(--radius-md);
          background: var(--color-accent-light); border: 1px solid var(--color-border);
        }
        @media (max-width: 768px) {
          .mtg-form-2col { grid-template-columns: 1fr !important; }
          .mtg-input { font-size: 16px !important; padding: 12px 14px !important; }
          .mtg-label { font-size: 14px !important; margin-bottom: 8px !important; }
        }
      `}</style>
    </section>
  );
}
