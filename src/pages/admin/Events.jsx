import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DatePicker from '../../components/ui/DatePicker';
import TimeSelect from '../../components/ui/TimeSelect';
import YearPillNav from '../../components/ui/YearPillNav';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fullName } from '../../utils/formatName';

const EVENT_TYPE_BADGE = {
  "懇親会": { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  "総会":   { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  "例会":   { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  "セミナー": { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  "その他": { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
};

const STATUS_BADGE = {
  draft:     { label: "下書き", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
  published: { label: "公開中", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  closed:    { label: "締切",   color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  completed: { label: "完了",   color: "#059669", bg: "#ecfdf5", border: "#bbf7d0" },
};

function getDayParts(dateStr) {
  if (!dateStr) return { dateMain: '-', dowLabel: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { dateMain: '-', dowLabel: '' };
  const dow = ['日','月','火','水','木','金','土'][d.getDay()];
  return { dateMain: `${d.getMonth() + 1}/${d.getDate()}`, dowLabel: `${dow}曜日` };
}

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

const DEFAULT_OPTIONS = ["出席", "欠席"];
const DETAIL_OPTIONS = ["出席", "欠席", "遅刻参加", "オンライン参加", "未定"];
const MEMBER_TYPES = ["正会員", "賛助会員", "OB会員", "名誉顧問"];

export default function Events() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedFYId, setSelectedFYId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', event_type: '例会', event_date: '', start_time: '18:00', end_time: '20:00',
    location: '', capacity: '', fee: '', rsvp_deadline: '',
    response_options: [...DEFAULT_OPTIONS],
    target_member_types: [],
    allMembers: true,
  });
  const [hasAfterParty, setHasAfterParty] = useState(false);
  const [apForm, setApForm] = useState({ location: '', start_time: '20:00', end_time: '22:00', fee: '' });

  function showToast(msg, type) {
    if (window.__showToast) window.__showToast(msg, type || 'success');
  }

  const loadData = useCallback(async () => {
    try {
      const [fyList, evtList, attList] = await Promise.all([
        base44.entities.FiscalYear.list('-year'),
        base44.entities.Event.list(),
        base44.entities.Attendance.list(),
      ]);
      setFiscalYears(fyList || []);
      setEvents(evtList || []);
      setAttendances(attList || []);
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

  const attendanceByEvent = useMemo(() => {
    const map = {};
    attendances.forEach(a => {
      if (!a.event_id) return;
      if (!map[a.event_id]) map[a.event_id] = [];
      map[a.event_id].push(a);
    });
    return map;
  }, [attendances]);

  const stats = useMemo(() => {
    let completed = 0, published = 0, draft = 0, totalAttend = 0;
    filteredEvents.forEach(e => {
      if (e.status === 'completed') completed++;
      else if (e.status === 'published' || e.status === 'closed') published++;
      else draft++;
      const atts = attendanceByEvent[e.id] || [];
      totalAttend += atts.filter(a => a.response === '出席' || a.status === '出席').length;
    });
    return { completed, published, draft, totalAttend };
  }, [filteredEvents, attendanceByEvent]);

  const nextEventId = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = filteredEvents
      .filter(e => e.event_date >= today && e.status !== 'completed')
      .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''));
    return upcoming.length > 0 ? upcoming[0].id : null;
  }, [filteredEvents]);

  /* ── Create handler ── */
  async function handleCreate(e) {
    e.preventDefault();
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
        target_member_types: form.allMembers ? [] : form.target_member_types,
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
        response_options: [...DEFAULT_OPTIONS], target_member_types: [], allMembers: true,
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
        <div className="page-header"><h1 className="page-title">イベント管理</h1></div>
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
            <h1 className="page-title" style={{ margin: 0, fontSize: 17 }}>イベント管理</h1>
            <button type="button" onClick={() => setShowCreateModal(true)} style={{
              width: 36, height: 36, borderRadius: 'var(--radius)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--primary)', cursor: 'pointer', color: '#fff', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
          {fiscalYears.length > 0 && (() => {
            const sortedFYs = [...fiscalYears].sort((a, b) => a.year - b.year);
            const idx = sortedFYs.findIndex(fy => fy.id === selectedFYId);
            const canPrev = idx > 0;
            const canNext = idx < sortedFYs.length - 1;
            const fy = sortedFYs[idx];
            const yearLabel = fy ? (fy.year_label || `${fy.year}年度`) : '';
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button type="button" disabled={!canPrev} onClick={() => canPrev && setSelectedFYId(sortedFYs[idx - 1].id)}
                  style={{ background: 'none', border: 'none', padding: '4px', fontSize: 14, color: canPrev ? 'var(--primary)' : 'var(--muted)', cursor: canPrev ? 'pointer' : 'default' }}>&#9666;</button>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{yearLabel}</span>
                <button type="button" disabled={!canNext} onClick={() => canNext && setSelectedFYId(sortedFYs[idx + 1].id)}
                  style={{ background: 'none', border: 'none', padding: '4px', fontSize: 14, color: canNext ? 'var(--primary)' : 'var(--muted)', cursor: canNext ? 'pointer' : 'default' }}>&#9656;</button>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">イベント管理</h1>
            <p className="page-description">イベントの作成・出欠管理</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            新規作成
          </button>
        </div>
      )}

      {/* ── Year Nav (desktop) ── */}
      {!isMobile && fiscalYears.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <YearPillNav fiscalYears={fiscalYears} activeFyId={selectedFYId} currentFyId={currentFyId} onChange={setSelectedFYId} />
        </div>
      )}

      {/* ── Stats ── */}
      {isMobile ? (
        <div className="stat-chip-bar" style={{ marginBottom: 8 }}>
          <span className="stat-chip">完了 <span className="stat-chip-value" style={{ color: 'var(--success)' }}>{stats.completed}</span></span>
          <span className="stat-chip">公開中 <span className="stat-chip-value" style={{ color: 'var(--primary)' }}>{stats.published}</span></span>
          <span className="stat-chip">下書き <span className="stat-chip-value">{stats.draft}</span></span>
          <span className="stat-chip">参加者計 <span className="stat-chip-value" style={{ color: 'var(--text-secondary)' }}>{stats.totalAttend}</span></span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 24 }}>
          <div className="evt-stat-card"><div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>完了</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--success)' }}>{stats.completed}</div></div>
          <div className="evt-stat-card"><div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>公開中</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--primary)' }}>{stats.published}</div></div>
          <div className="evt-stat-card"><div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>下書き</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-secondary)' }}>{stats.draft}</div></div>
          <div className="evt-stat-card"><div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>参加者計</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-secondary)' }}>{stats.totalAttend}</div></div>
        </div>
      )}

      {/* ── Event List ── */}
      {filteredEvents.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="10" width="36" height="32" rx="4" stroke="var(--line)" strokeWidth="2" fill="var(--bg)"/><path d="M6 18h36" stroke="var(--line)" strokeWidth="2"/><line x1="16" y1="6" x2="16" y2="14" stroke="var(--line)" strokeWidth="2" strokeLinecap="round"/><line x1="32" y1="6" x2="32" y2="14" stroke="var(--line)" strokeWidth="2" strokeLinecap="round"/></svg>
          <p style={{ fontSize: 14, marginTop: 16 }}>イベントはまだありません。「新規作成」から最初のイベントを作成しましょう。</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredEvents.map(evt => {
            const dp = getDayParts(evt.event_date);
            const sb = STATUS_BADGE[evt.status] || STATUS_BADGE.draft;
            const tb = EVENT_TYPE_BADGE[evt.event_type] || EVENT_TYPE_BADGE["その他"];
            const isNext = evt.id === nextEventId;
            const atts = attendanceByEvent[evt.id] || [];
            const attendCount = atts.filter(a => a.response === '出席' || a.status === '出席').length;
            const totalTarget = atts.length;

            return (
              <div
                key={evt.id}
                className={`evt-card${isNext ? ' evt-card-next' : ''}`}
                onClick={() => navigate(`/admin/events/${evt.id}`)}
              >
                {/* Date */}
                <div className="evt-date-col">
                  <div style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.1, color: 'var(--text)' }}>{dp.dateMain}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{dp.dowLabel}</div>
                </div>
                <div className="evt-card-divider" />
                {/* Center */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{evt.title}</span>
                    <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: tb.bg, color: tb.color, border: `1px solid ${tb.border}` }}>{evt.event_type}</span>
                    <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>{sb.label}</span>
                    {isNext && <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#EEEDFE', color: '#534AB7' }}>次回</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {evt.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.75a3.5 3.5 0 0 0-3.5 3.5C3.5 8.75 7 12.25 7 12.25s3.5-3.5 3.5-7a3.5 3.5 0 0 0-3.5-3.5Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" fill="currentColor"/></svg>{evt.location}</span>}
                    {evt.start_time && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4.25V7l2.25 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>{evt.start_time}{evt.end_time ? `〜${evt.end_time}` : ''}</span>}
                    {evt.fee > 0 && <span>¥{Number(evt.fee).toLocaleString()}</span>}
                  </div>
                </div>
                {/* Ring */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  {totalTarget > 0 && <AttendanceRing present={attendCount} total={totalTarget} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div className="confirm-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>新規イベント作成</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Title + Type */}
                <div>
                  <label className="evt-label">イベント名 <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input className="evt-input" type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="evt-label">イベント種別 <span style={{ color: 'var(--error)' }}>*</span></label>
                  <select className="evt-input" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                    {["懇親会", "総会", "例会", "セミナー", "その他"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {/* Date + Times */}
                <div className="evt-form-2col">
                  <div>
                    <label className="evt-label">開催日 <span style={{ color: 'var(--error)' }}>*</span></label>
                    <DatePicker value={form.event_date} onChange={v => setForm(f => ({ ...f, event_date: v }))} required />
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
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => applyPreset(DEFAULT_OPTIONS)}>基本</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => applyPreset(DETAIL_OPTIONS)}>詳細</button>
                  </div>
                  {form.response_options.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <input className="evt-input" style={{ flex: 1 }} type="text" value={opt} onChange={e => updateOption(idx, e.target.value)} placeholder={`選択肢${idx + 1}`} />
                      {form.response_options.length > 2 && (
                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 13, color: 'var(--error)' }} onClick={() => removeOption(idx)}>&times;</button>
                      )}
                    </div>
                  ))}
                  <button type="button" style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }} onClick={addOption}>+ 選択肢を追加</button>
                </div>
                {/* Target members */}
                <div>
                  <label className="evt-label">対象会員種別</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.allMembers} onChange={e => setForm(f => ({ ...f, allMembers: e.target.checked, target_member_types: e.target.checked ? [] : f.target_member_types }))} />
                    全員
                  </label>
                  {!form.allMembers && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {MEMBER_TYPES.map(mt => (
                        <label key={mt} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                          <input type="checkbox" checked={form.target_member_types.includes(mt)}
                            onChange={e => setForm(f => ({
                              ...f,
                              target_member_types: e.target.checked ? [...f.target_member_types, mt] : f.target_member_types.filter(t => t !== mt),
                            }))} />
                          {mt}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {/* After party toggle */}
                {form.event_type !== '懇親会' && (
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      <input type="checkbox" checked={hasAfterParty} onChange={e => setHasAfterParty(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                      懇親会あり
                    </label>
                    {hasAfterParty && (
                      <div style={{ marginTop: 10, padding: 14, background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>懇親会情報</div>
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
              </div>
              {/* Footer */}
              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--line)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>キャンセル</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !form.title.trim() || !form.event_date}>
                  {saving ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Scoped styles ── */}
      <style>{`
        .evt-stat-card { background: var(--bg); border-radius: var(--radius-lg); padding: 14px 16px; }
        .evt-card {
          display: flex; align-items: center; gap: 16px;
          border-radius: var(--radius-lg); border: 1px solid var(--line);
          padding: 16px 20px; cursor: pointer; background: #fff; transition: all 0.15s;
        }
        .evt-card:hover { transform: translateY(-1px); background: var(--bg); box-shadow: var(--shadow-md); }
        .evt-card-next { border: 1.5px solid var(--primary); }
        .evt-date-col { min-width: 52px; text-align: center; flex-shrink: 0; }
        .evt-card-divider { width: 1px; height: 40px; background: var(--line); flex-shrink: 0; }
        .evt-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
        .evt-input {
          width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius);
          border: 1px solid var(--line); background: var(--bg); font-size: 14px; color: var(--text);
          outline: none; transition: border-color 0.15s, background 0.15s;
        }
        .evt-input:focus { border-color: var(--primary); background: #fff; }
        .evt-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 768px) {
          .evt-card { padding: 10px 12px !important; gap: 10px !important; }
          .evt-date-col { min-width: 44px; }
          .evt-date-col > div:first-child { font-size: 17px !important; }
          .evt-card-divider { height: 32px; }
          .evt-form-2col { grid-template-columns: 1fr !important; }
          .modal-dialog { max-width: 95vw !important; margin: 8px; }
        }
      `}</style>
    </section>
  );
}
