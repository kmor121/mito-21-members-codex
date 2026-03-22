import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DatePicker from '../../components/ui/DatePicker';
import TimeSelect from '../../components/ui/TimeSelect';
import YearPillNav from '../../components/ui/YearPillNav';
import { Button, Card, PageHeader, Modal } from '../../components/ui';
import AttendanceDeadlineBadge from '../../components/ui/AttendanceDeadlineBadge';
import { isAttendanceClosed, getDeadline } from '../../utils/attendanceUtils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fullName } from '../../utils/formatName';

const EVENT_TYPE_BADGE = {
  "懇親会": { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  "総会":   { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  "例会":   { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  "セミナー": { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  "その他": { color: "var(--color-text-secondary)", bg: "var(--color-bg-sub)", border: "var(--color-border)" },
};

const STATUS_BADGE = {
  draft:     { label: "下書き", color: "var(--color-text-secondary)", bg: "var(--color-bg-sub)", border: "var(--color-border)" },
  published: { label: "公開中", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  closed:    { label: "受付終了", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  completed: { label: "完了",   color: "#059669", bg: "#ecfdf5", border: "#bbf7d0" },
};

function getDayParts(dateStr) {
  if (!dateStr) return { dateMain: '-', dowLabel: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { dateMain: '-', dowLabel: '' };
  const dow = ['日','月','火','水','木','金','土'][d.getDay()];
  return { dateMain: `${d.getMonth() + 1}/${d.getDate()}`, dowLabel: `${dow}曜日` };
}

const DEFAULT_OPTIONS = ["出席", "欠席"];
const DETAIL_OPTIONS = ["出席", "欠席", "遅刻参加", "オンライン参加", "未定"];
const MEMBER_TYPES = ["正会員", "賛助会員", "OB会員", "名誉顧問"];

export default function Events() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedFYId, setSelectedFYId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', event_type: '例会', event_date: '', start_time: '18:00', end_time: '20:00',
    location: '', capacity: '', fee: '', rsvp_deadline: '',
    response_options: [...DEFAULT_OPTIONS],
    target_member_types: ['正会員', '賛助会員'],
  });
  const [hasAfterParty, setHasAfterParty] = useState(false);
  const [apForm, setApForm] = useState({ location: '', start_time: '20:00', end_time: '22:00', fee: '' });
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef(null);

  useEffect(() => { try { base44.appLogs?.logUserInApp?.('A12-イベント管理'); } catch (e) { /* analytics */ } }, []);
  useEffect(() => {
    if (!typeDropdownOpen) return;
    const handler = (e) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) setTypeDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [typeDropdownOpen]);

  function showToast(msg, type) {
    if (window.__showToast) window.__showToast(msg, type || 'success');
  }

  const loadData = useCallback(async () => {
    try {
      const [fyList, evtList] = await Promise.all([
        base44.entities.FiscalYear.list('-year'),
        base44.entities.Event.list(),
      ]);
      setFiscalYears(fyList || []);
      setEvents(evtList || []);
      if (!selectedFYId) {
        const current = (fyList || []).find(fy => fy.is_current);
        if (current) setSelectedFYId(current.id);
        else if (fyList.length > 0) setSelectedFYId(fyList[0].id);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedFYId]);

  useEffect(() => { loadData(); }, [loadData]);

  const currentFyId = useMemo(() => {
    const c = fiscalYears.find(fy => fy.is_current);
    return c?.id || '';
  }, [fiscalYears]);

  const filteredEvents = useMemo(() => {
    if (!selectedFYId) return [];
    return events
      .filter(e => e.fiscal_year_id === selectedFYId && !e.is_after_party)
      .sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''));
  }, [events, selectedFYId]);

  const stats = useMemo(() => {
    let completed = 0, published = 0, draft = 0;
    filteredEvents.forEach(e => {
      if (e.status === 'completed') completed++;
      else if (e.status === 'published' || e.status === 'closed') published++;
      else draft++;
    });
    return { completed, published, draft };
  }, [filteredEvents]);

  const nextEventId = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = filteredEvents
      .filter(e => e.event_date >= today && e.status !== 'completed')
      .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''));
    return upcoming.length > 0 ? upcoming[0].id : null;
  }, [filteredEvents]);

  /* ── Create handler ── */
  async function handleCreate() {
    if (!form.title.trim() || !form.event_date) return;
    if (!selectedFYId) { showToast('年度が選択されていません', 'error'); return; }
    setSaving(true);
    try {
      const opts = form.response_options.filter(o => o.trim());
      const payload = {
        title: form.title.trim(),
        event_type: form.event_type,
        event_date: form.event_date,
        start_time: form.start_time || '',
        end_time: form.end_time || '',
        location: form.location.trim(),
        capacity: form.capacity ? Number(form.capacity) : 0,
        fee: form.fee ? Number(form.fee) : 0,
        rsvp_deadline: form.rsvp_deadline || '',
        status: 'draft',
        fiscal_year_id: selectedFYId,
        response_options: opts.length >= 2 ? opts : DEFAULT_OPTIONS,
        default_response_options: opts.length < 2 || (opts.length === 2 && opts[0] === '出席' && opts[1] === '欠席'),
        target_member_types: form.target_member_types,
        sort_order: 0,
      };
      const created = await base44.entities.Event.create(payload);
      if (hasAfterParty && created?.id && form.event_type !== '懇親会') {
        await base44.entities.Event.create({
          title: `${payload.title} 懇親会`,
          event_type: '懇親会',
          event_date: payload.event_date,
          start_time: apForm.start_time || payload.end_time || '',
          end_time: apForm.end_time || '',
          location: apForm.location || '',
          fee: apForm.fee ? Number(apForm.fee) : 0,
          status: 'draft',
          parent_event_id: created.id,
          is_after_party: true,
          response_options: ['出席', '欠席'],
          default_response_options: true,
          fiscal_year_id: selectedFYId,
          sort_order: 0,
        });
      }
      invalidateReadCache('Event');
      setForm({
        title: '', event_type: '例会', event_date: '', start_time: '18:00', end_time: '20:00',
        location: '', capacity: '', fee: '', rsvp_deadline: '',
        response_options: [...DEFAULT_OPTIONS], target_member_types: ['正会員', '賛助会員'],
      });
      setHasAfterParty(false);
      setApForm({ location: '', start_time: '20:00', end_time: '22:00', fee: '' });
      setShowCreateModal(false);
      showToast('イベントを作成しました');
      await loadData();
    } catch (err) {
      showToast(err.message || '作成に失敗しました', 'error');
    }
    setSaving(false);
  }

  /* ── Response options helpers ── */
  function addOption() {
    setForm(f => ({ ...f, response_options: [...f.response_options, ''] }));
  }
  function removeOption(idx) {
    setForm(f => {
      const opts = [...f.response_options];
      if (opts.length <= 2) return f;
      opts.splice(idx, 1);
      return { ...f, response_options: opts };
    });
  }
  function updateOption(idx, val) {
    setForm(f => {
      const opts = [...f.response_options];
      opts[idx] = val;
      return { ...f, response_options: opts };
    });
  }
  function applyPreset(preset) {
    setForm(f => ({ ...f, response_options: [...preset] }));
  }

  /* ── Render ── */
  if (loading) {
    return (
      <section className="admin-shell">
        <PageHeader title="イベント管理" />
        <LoadingSpinner />
      </section>
    );
  }

  return (
    <section className="admin-shell">
      {/* ── Header ── */}
      {isMobile ? (
        <div style={{ padding: '0 0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>イベント管理</h1>
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
          title="イベント管理"
          subtitle="イベントの作成・出欠管理"
          actions={
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              新規作成
            </Button>
          }
        />
      )}

      {/* ── Year Nav ── */}
      {fiscalYears.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <YearPillNav fiscalYears={fiscalYears} activeFyId={selectedFYId} currentFyId={currentFyId} onChange={setSelectedFYId} />
        </div>
      )}

      {/* ── Stats ── */}
      {isMobile ? (
        <div className="stat-chip-bar" style={{ marginBottom: 8 }}>
          <span className="stat-chip">完了 <span className="stat-chip-value" style={{ color: 'var(--color-success)' }}>{stats.completed}</span></span>
          <span className="stat-chip">公開中 <span className="stat-chip-value" style={{ color: 'var(--color-accent)' }}>{stats.published}</span></span>
          <span className="stat-chip">下書き <span className="stat-chip-value">{stats.draft}</span></span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 24 }}>
          <Card padding="14px 16px"><div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>完了</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-success)' }}>{stats.completed}</div></Card>
          <Card padding="14px 16px"><div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>公開中</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-accent)' }}>{stats.published}</div></Card>
          <Card padding="14px 16px"><div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>下書き</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{stats.draft}</div></Card>
        </div>
      )}

      {/* ── Event List ── */}
      {filteredEvents.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '40px 20px' : '60px 20px', color: 'var(--color-text-secondary)' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="10" width="36" height="32" rx="4" stroke="var(--color-border)" strokeWidth="2" fill="var(--color-bg-sub)"/><path d="M6 18h36" stroke="var(--color-border)" strokeWidth="2"/><line x1="16" y1="6" x2="16" y2="14" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round"/><line x1="32" y1="6" x2="32" y2="14" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round"/></svg>
          <p style={{ fontSize: 14, marginTop: 16, textAlign: 'center' }}>イベントはまだありません。「新規作成」から最初のイベントを作成しましょう。</p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)} style={{ marginTop: 12 }}>
            + 新規作成
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredEvents.map(evt => {
            const dp = getDayParts(evt.event_date);
            const sb = STATUS_BADGE[evt.status] || STATUS_BADGE.draft;
            const tb = EVENT_TYPE_BADGE[evt.event_type] || EVENT_TYPE_BADGE["その他"];
            const isNext = evt.id === nextEventId;

            return (
              <Card
                key={evt.id}
                onClick={() => navigate(`/admin/events/${evt.id}`)}
                padding={isMobile ? '10px 12px' : '16px 20px'}
                style={isNext ? { border: '1.5px solid var(--color-accent)' } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16 }}>
                  {/* Date */}
                  <div style={{ minWidth: isMobile ? 44 : 52, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>{dp.dateMain}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{dp.dowLabel}</div>
                  </div>
                  <div style={{ width: 1, height: isMobile ? 32 : 40, background: 'var(--color-border)', flexShrink: 0 }} />
                  {/* Center */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>{evt.title}</span>
                      <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: tb.bg, color: tb.color, border: `1px solid ${tb.border}` }}>{evt.event_type}</span>
                      <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>{sb.label}</span>
                      {isNext && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'var(--color-accent-light)', color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>次回</span>}
                      <AttendanceDeadlineBadge deadline={getDeadline(evt)} closed={isAttendanceClosed(evt)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, flexWrap: 'wrap', color: 'var(--color-text-secondary)' }}>
                      {evt.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 1.75a3.5 3.5 0 0 0-3.5 3.5C3.5 8.75 7 12.25 7 12.25s3.5-3.5 3.5-7A3.5 3.5 0 0 0 7 1.75Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"/></svg>{evt.location}</span>}
                      {evt.start_time && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="7" cy="7" r="5.25"/><path d="M7 4v3.5l2.25 1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>{evt.start_time}{evt.end_time ? `〜${evt.end_time}` : ''}</span>}
                      {evt.fee > 0 && <span style={{ fontSize: 13 }}>¥{Number(evt.fee).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create Modal ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新規イベント作成"
        width="520px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Title + Type */}
          <div>
            <label className="evt-label">イベント名 <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input className="evt-input" type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="evt-label">イベント種別 <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            {(() => {
              const typeOptions = ["例会", "セミナー", "総会", "懇親会", "その他"];
              return (
                <div ref={typeDropdownRef} style={{ position: 'relative' }}>
                  <button type="button" onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                    className={`dp-trigger${typeDropdownOpen ? ' dp-trigger--open' : ''}`}
                    style={{ height: 38 }}
                  >
                    <span className="dp-trigger-text">{form.event_type}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                      style={{ transition: 'transform 0.15s ease', transform: typeDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0, color: 'var(--color-text-tertiary)' }}
                    >
                      <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </svg>
                  </button>
                  {typeDropdownOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                      background: '#fff', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
                      zIndex: 100, overflow: 'hidden',
                      animation: 'yearDropIn 0.12s ease',
                    }}>
                      {typeOptions.map(t => {
                        const isActive = form.event_type === t;
                        return (
                          <button key={t} type="button"
                            onClick={() => { setForm(f => ({ ...f, event_type: t })); setTypeDropdownOpen(false); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              width: '100%', padding: '10px 14px',
                              border: 'none', background: isActive ? 'var(--color-accent-light)' : 'transparent',
                              fontSize: 13, fontWeight: isActive ? 600 : 400,
                              color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                              cursor: 'pointer', transition: 'background 0.1s', textAlign: 'left',
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-bg-sub)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'var(--color-accent-light)' : 'transparent'; }}
                          >
                            <span style={{ flex: 1 }}>{t}</span>
                            {isActive && (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M3.5 7l2.5 2.5L10.5 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          {/* Date + Times */}
          <div className="evt-form-2col">
            <div>
              <label className="evt-label">開催日 <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <DatePicker value={form.event_date} onChange={v => {
                setForm(f => {
                  const next = { ...f, event_date: v };
                  if (v && !f.rsvp_deadline) {
                    const d = new Date(v); d.setDate(d.getDate() - 3);
                    next.rsvp_deadline = d.toISOString().split('T')[0];
                  }
                  return next;
                });
              }} />
            </div>
            <div>
              <label className="evt-label">出欠回答期限</label>
              <DatePicker value={form.rsvp_deadline} onChange={v => setForm(f => ({ ...f, rsvp_deadline: v }))} />
            </div>
          </div>
          <div className="evt-form-2col">
            <div>
              <label className="evt-label">開始時刻</label>
              <TimeSelect value={form.start_time} onChange={v => setForm(f => ({ ...f, start_time: v }))} />
            </div>
            <div>
              <label className="evt-label">終了時刻</label>
              <TimeSelect value={form.end_time} onChange={v => setForm(f => ({ ...f, end_time: v }))} />
            </div>
          </div>
          {/* Location */}
          <div>
            <label className="evt-label">開催場所</label>
            <input className="evt-input" type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          {/* Capacity + Fee */}
          <div className="evt-form-2col">
            <div>
              <label className="evt-label">定員</label>
              <input className="evt-input" type="number" min="0" placeholder="0 = 制限なし" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div>
              <label className="evt-label">参加費</label>
              <input className="evt-input" type="number" min="0" placeholder="0 = 無料" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
            </div>
          </div>
          {/* Response options */}
          <div>
            <label className="evt-label">回答選択肢</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <Button variant="secondary" size="sm" onClick={() => applyPreset(DEFAULT_OPTIONS)}>基本</Button>
              <Button variant="secondary" size="sm" onClick={() => applyPreset(DETAIL_OPTIONS)}>詳細</Button>
            </div>
            {form.response_options.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <input className="evt-input" style={{ flex: 1 }} type="text" value={opt} onChange={e => updateOption(idx, e.target.value)} placeholder={`選択肢${idx + 1}`} />
                {form.response_options.length > 2 && (
                  <Button variant="secondary" size="sm" style={{ color: 'var(--color-danger)' }} onClick={() => removeOption(idx)}>&times;</Button>
                )}
              </div>
            ))}
            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }} onClick={addOption}>+ 選択肢を追加</button>
          </div>
          {/* Target members — chip toggle */}
          <div>
            <label className="evt-label">対象会員種別</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MEMBER_TYPES.map(mt => {
                const isOn = form.target_member_types.includes(mt);
                return (
                  <button key={mt} type="button"
                    onClick={() => {
                      if (isOn) {
                        if (form.target_member_types.length <= 1) { showToast('対象会員種別は最低1つ選択してください', 'error'); return; }
                        setForm(f => ({ ...f, target_member_types: f.target_member_types.filter(t => t !== mt) }));
                      } else {
                        setForm(f => ({ ...f, target_member_types: [...f.target_member_types, mt] }));
                      }
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                      border: isOn ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                      background: isOn ? 'var(--color-accent-light)' : 'transparent',
                      color: isOn ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {isOn && '✓ '}{mt}
                  </button>
                );
              })}
            </div>
          </div>
          {/* After party toggle */}
          {form.event_type !== '懇親会' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', padding: 'var(--space-3) 0' }}>
                <input type="checkbox" checked={hasAfterParty} onChange={e => setHasAfterParty(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--color-accent)' }} />
                懇親会あり
              </label>
              {hasAfterParty && (
                <div style={{ marginTop: 10, padding: 14, background: 'var(--color-bg-sub)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>懇親会情報</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div><label className="evt-label">場所</label><input className="evt-input" value={apForm.location} onChange={e => setApForm(p => ({ ...p, location: e.target.value }))} placeholder="例: 居酒屋XX" /></div>
                    <div className="evt-form-2col">
                      <div><label className="evt-label">開始時刻</label><TimeSelect value={apForm.start_time} onChange={v => setApForm(p => ({ ...p, start_time: v }))} /></div>
                      <div><label className="evt-label">終了時刻</label><TimeSelect value={apForm.end_time} onChange={v => setApForm(p => ({ ...p, end_time: v }))} /></div>
                    </div>
                    <div><label className="evt-label">参加費</label><input className="evt-input" type="number" min="0" placeholder="0 = 無料" value={apForm.fee} onChange={e => setApForm(p => ({ ...p, fee: e.target.value }))} /></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ボタン */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--color-border)', marginTop: -4, paddingTop: 16, paddingBottom: 8 }}>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)} disabled={saving}>キャンセル</Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving || !form.title.trim() || !form.event_date}>
              {saving ? '作成中...' : '作成'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Scoped styles ── */}
      <style>{`
        .evt-label { display: block; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 6px; }
        .evt-input {
          width: 100%; box-sizing: border-box; height: 38px; padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);
          border: 1px solid var(--color-border); background: var(--color-bg); font-size: 0.875rem; color: var(--color-text-primary);
          font-family: inherit; line-height: 1.5;
          outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .evt-input:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }

        .evt-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 768px) {
          .evt-form-2col { grid-template-columns: 1fr !important; }
          .evt-input { font-size: 16px !important; padding: 10px 12px !important; height: auto !important; }
          .evt-label { font-size: 14px !important; margin-bottom: 8px !important; }
        }
      `}</style>
    </section>
  );
}
