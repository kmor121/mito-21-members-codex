import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44, invalidateReadCache, apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DatePicker from '../../components/ui/DatePicker';
import TimeSelect from '../../components/ui/TimeSelect';
import { fullName } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

const EVENT_TYPE_BADGE = {
  "懇親会": { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  "総会":   { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  "例会":   { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  "セミナー": { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  "その他": { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
};

const STATUS_CONF = {
  draft:     { label: "下書き", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
  published: { label: "公開中", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  closed:    { label: "受付終了", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  completed: { label: "完了",   color: "#059669", bg: "#ecfdf5", border: "#bbf7d0" },
};

function formatDateFull(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const dow = ['日','月','火','水','木','金','土'][dt.getDay()];
  return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}(${dow})`;
}

function AttendanceRing({ present, total, size = 64 }) {
  if (!total) return null;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? present / total : 0;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" style={{ stroke: 'var(--line)' }} strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" style={{ stroke: 'var(--success)' }} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 14, fontWeight: 600, fill: 'var(--text)' }}>
        {present}/{total}
      </text>
    </svg>
  );
}

const MEMBER_TYPES = ["正会員", "賛助会員", "OB会員", "名誉顧問"];

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [event, setEvent] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [confirmModal, setConfirmModal] = useState(null);
  const [childAfterParty, setChildAfterParty] = useState(null);
  const [childApAtts, setChildApAtts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [orgAssignments, setOrgAssignments] = useState([]);
  const [showApForm, setShowApForm] = useState(false);
  const [apEditing, setApEditing] = useState(false);
  const [apForm, setApForm] = useState({ location: '', start_time: '20:00', end_time: '22:00', fee: '' });

  function showToast(msg, type) {
    if (window.__showToast) window.__showToast(msg, type || 'success');
  }

  const loadData = useCallback(async () => {
    try {
      const [evt, attList, memberList, orgList, oaList] = await Promise.all([
        base44.entities.Event.get(eventId),
        base44.entities.Attendance.filter({ event_id: eventId }).catch(() => []),
        base44.entities.Member.filter({ approval_status: '承認済', status: '活動中' }).catch(() => []),
        base44.entities.Organization.list().catch(() => []),
        base44.entities.OrgAssignment.list().catch(() => []),
      ]);
      setEvent(evt);
      setAttendances(attList || []);
      setMembers(memberList || []);
      setOrganizations(orgList || []);
      setOrgAssignments(oaList || []);
      // Load child after-party
      const apEvts = await base44.entities.Event.filter({ parent_event_id: eventId, is_after_party: true }).catch(() => []);
      const ap = (apEvts || [])[0] || null;
      setChildAfterParty(ap);
      if (ap) {
        base44.entities.Attendance.filter({ event_id: ap.id }).then(a => setChildApAtts(a || [])).catch(() => setChildApAtts([]));
      } else {
        setChildApAtts([]);
      }
    } catch (err) {
      showToast('イベントの取得に失敗しました', 'error');
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  const status = event?.status || 'draft';
  const sc = STATUS_CONF[status] || STATUS_CONF.draft;
  const tb = EVENT_TYPE_BADGE[event?.event_type] || EVENT_TYPE_BADGE["その他"];
  const responseOptions = useMemo(() => {
    if (event?.response_options && event.response_options.length >= 2) return event.response_options;
    return ["出席", "欠席"];
  }, [event]);

  // Target members
  const targetMembers = useMemo(() => {
    if (!event || !members.length) return [];
    if (!event.target_member_types || event.target_member_types.length === 0) return members;
    return members.filter(m => event.target_member_types.includes(m.member_type));
  }, [event, members]);

  const attendanceMap = useMemo(() => {
    const map = {};
    attendances.forEach(a => { map[a.member_id] = a; });
    return map;
  }, [attendances]);

  const respondedMembers = useMemo(() => targetMembers.filter(m => attendanceMap[m.id]), [targetMembers, attendanceMap]);
  const notRespondedMembers = useMemo(() => targetMembers.filter(m => !attendanceMap[m.id]), [targetMembers, attendanceMap]);

  const responseSummary = useMemo(() => {
    const counts = {};
    responseOptions.forEach(opt => { counts[opt] = 0; });
    attendances.forEach(a => {
      const resp = a.response || a.status;
      if (counts[resp] !== undefined) counts[resp]++;
      else counts[resp] = (counts[resp] || 0) + 1;
    });
    return counts;
  }, [attendances, responseOptions]);

  const attendCount = responseSummary["出席"] || 0;

  const rates = useMemo(() => {
    const totalTarget = targetMembers.length;
    const responded = respondedMembers.length;
    const attend = responseSummary["出席"] || 0;
    return {
      responseRate: totalTarget > 0 ? Math.round((responded / totalTarget) * 100) : 0,
      attendRate: responded > 0 ? Math.round((attend / responded) * 100) : 0,
      totalTarget, responded, attend,
    };
  }, [targetMembers, respondedMembers, responseSummary]);

  const orgBreakdown = useMemo(() => {
    if (!organizations.length || !orgAssignments.length) return [];
    const fyId = event?.fiscal_year_id;
    const relevantOAs = fyId ? orgAssignments.filter(oa => oa.fiscal_year_id === fyId) : orgAssignments;
    const memberOrgMap = {};
    relevantOAs.forEach(oa => {
      if (!memberOrgMap[oa.member_id]) memberOrgMap[oa.member_id] = [];
      memberOrgMap[oa.member_id].push(oa.organization_id);
    });
    const orgMap = {};
    organizations.forEach(o => { orgMap[o.id] = o; });
    const orgStats = {};
    targetMembers.forEach(m => {
      const orgIds = memberOrgMap[m.id] || ['__none__'];
      const att = attendanceMap[m.id];
      orgIds.forEach(orgId => {
        if (!orgStats[orgId]) orgStats[orgId] = { target: 0, responded: 0, attend: 0, absent: 0 };
        orgStats[orgId].target++;
        if (att) {
          orgStats[orgId].responded++;
          const resp = att.response || att.status;
          if (resp === '出席') orgStats[orgId].attend++;
          if (resp === '欠席') orgStats[orgId].absent++;
        }
      });
    });
    return Object.entries(orgStats)
      .map(([orgId, stats]) => ({
        orgId,
        orgName: orgId === '__none__' ? '未所属' : (orgMap[orgId]?.org_name || '不明'),
        ...stats,
        responseRate: stats.target > 0 ? Math.round((stats.responded / stats.target) * 100) : 0,
      }))
      .sort((a, b) => b.target - a.target);
  }, [event, organizations, orgAssignments, targetMembers, attendanceMap]);

  /* ── Status change ── */
  const STATUS_TRANSITIONS = {
    draft:     [{ to: 'published', label: '公開する', msg: '公開すると会員がイベントを閲覧・出欠回答できるようになります。' }],
    published: [
      { to: 'closed', label: '受付終了にする', msg: '受付終了にすると新規の出欠回答を受け付けなくなります。' },
      { to: 'draft', label: '下書きに戻す', msg: '下書きに戻すと会員には非表示になります。', secondary: true },
    ],
    closed: [
      { to: 'completed', label: '完了にする', msg: '完了にすると編集がロックされます。' },
      { to: 'published', label: '公開に戻す', msg: '公開に戻すと出欠回答を再開できます。', secondary: true },
    ],
    completed: [
      { to: 'closed', label: '受付終了に戻す', msg: 'ステータスを戻すと編集が再開できます。', secondary: true },
    ],
  };

  function requestStatusChange(to, msg, label) {
    setConfirmModal({ title: 'ステータス変更', message: msg, confirmLabel: label, onConfirm: () => doStatusChange(to) });
  }

  async function doStatusChange(newStatus) {
    setConfirmModal(null);
    setSaving(true);
    try {
      await base44.entities.Event.update(eventId, { status: newStatus });
      if (childAfterParty) {
        await base44.entities.Event.update(childAfterParty.id, { status: newStatus });
      }
      invalidateReadCache('Event');
      showToast(`ステータスを「${STATUS_CONF[newStatus]?.label || newStatus}」に変更しました`);
      await loadData();
    } catch (err) { showToast(err.message || '更新に失敗しました', 'error'); }
    setSaving(false);
  }

  /* ── Delete ── */
  function requestDelete() {
    setConfirmModal({
      title: 'イベントを削除', message: 'このイベントを削除しますか？この操作は取り消せません。',
      confirmLabel: '削除する', danger: true, onConfirm: doDelete,
    });
  }
  async function doDelete() {
    setConfirmModal(null);
    setSaving(true);
    try {
      await base44.entities.Event.delete(eventId);
      invalidateReadCache('Event');
      showToast('イベントを削除しました');
      navigate('/admin/events');
    } catch (err) { showToast(err.message || '削除に失敗しました', 'error'); }
    setSaving(false);
  }

  /* ── Edit ── */
  const canEdit = status === 'draft';
  const canEditPartial = status === 'published' || status === 'closed';

  function startEdit() {
    setEditForm({
      title: event.title || '',
      event_type: event.event_type || '懇親会',
      event_date: event.event_date || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location: event.location || '',
      capacity: event.capacity || '',
      fee: event.fee || '',
      rsvp_deadline: event.rsvp_deadline || '',
      description: event.description || '',
    });
    setIsEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const payload = {};
      if (canEdit) {
        payload.title = editForm.title.trim();
        payload.event_type = editForm.event_type;
        payload.event_date = editForm.event_date;
      }
      payload.start_time = editForm.start_time || '';
      payload.end_time = editForm.end_time || '';
      payload.location = editForm.location.trim();
      payload.capacity = editForm.capacity ? Number(editForm.capacity) : 0;
      payload.fee = editForm.fee ? Number(editForm.fee) : 0;
      payload.rsvp_deadline = editForm.rsvp_deadline || '';
      payload.description = editForm.description || '';

      await base44.entities.Event.update(eventId, payload);
      invalidateReadCache('Event');
      showToast('イベントを更新しました');
      setIsEditing(false);
      await loadData();
    } catch (err) { showToast(err.message || '更新に失敗しました', 'error'); }
    setSaving(false);
  }

  /* ── Proxy response ── */
  async function handleProxyResponse(memberId, response) {
    setSaving(true);
    try {
      const existing = attendanceMap[memberId];
      if (existing) {
        await base44.entities.Attendance.update(existing.id, {
          response, status: response, responded_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.Attendance.create({
          event_id: eventId, member_id: memberId,
          response, status: response, responded_at: new Date().toISOString(),
        });
      }
      invalidateReadCache('Attendance');
      showToast('出欠を更新しました');
      await loadData();
    } catch (err) { showToast(err.message || '更新に失敗しました', 'error'); }
    setSaving(false);
  }

  async function handleCancelResponse(memberId) {
    setSaving(true);
    try {
      const existing = attendanceMap[memberId];
      if (existing) {
        await base44.entities.Attendance.delete(existing.id);
        invalidateReadCache('Attendance');
        showToast('回答を取り消しました');
        await loadData();
      }
    } catch (err) { showToast(err.message || '取消に失敗しました', 'error'); }
    setSaving(false);
  }

  /* ── After-party proxy response ── */
  async function handleApProxyResponse(memberId, response) {
    if (!childAfterParty) return;
    setSaving(true);
    try {
      const apAtt = childApAtts.find(a => a.member_id === memberId);
      if (apAtt) {
        await base44.entities.Attendance.update(apAtt.id, {
          response, status: response, responded_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.Attendance.create({
          event_id: childAfterParty.id, member_id: memberId,
          response, status: response, responded_at: new Date().toISOString(),
        });
      }
      invalidateReadCache('Attendance');
      showToast('懇親会の出欠を更新しました');
      await loadData();
    } catch (err) { showToast(err.message || '更新に失敗しました', 'error'); }
    setSaving(false);
  }

  async function handleApCancelResponse(memberId) {
    if (!childAfterParty) return;
    setSaving(true);
    try {
      const apAtt = childApAtts.find(a => a.member_id === memberId);
      if (apAtt) {
        await base44.entities.Attendance.delete(apAtt.id);
        invalidateReadCache('Attendance');
        showToast('懇親会の回答を取り消しました');
        await loadData();
      }
    } catch (err) { showToast(err.message || '取消に失敗しました', 'error'); }
    setSaving(false);
  }

  /* ── After-party CRUD ── */
  async function addAfterParty() {
    setSaving(true);
    try {
      await base44.entities.Event.create({
        title: `${event.title} 懇親会`,
        event_type: '懇親会',
        event_date: event.event_date,
        start_time: apForm.start_time || event.end_time || '',
        end_time: apForm.end_time || '',
        location: apForm.location || '',
        fee: apForm.fee ? Number(apForm.fee) : 0,
        status: event.status,
        parent_event_id: eventId,
        is_after_party: true,
        response_options: ['出席', '欠席'],
        default_response_options: true,
        fiscal_year_id: event.fiscal_year_id || '',
        sort_order: 0,
      });
      invalidateReadCache('Event');
      setShowApForm(false);
      setApForm({ location: '', start_time: '20:00', end_time: '22:00', fee: '' });
      showToast('懇親会を追加しました');
      await loadData();
    } catch (err) { showToast(err.message || '追加に失敗しました', 'error'); }
    setSaving(false);
  }

  async function saveAfterParty() {
    if (!childAfterParty) return;
    setSaving(true);
    try {
      await base44.entities.Event.update(childAfterParty.id, {
        location: apForm.location || '', start_time: apForm.start_time || '', end_time: apForm.end_time || '',
        fee: apForm.fee ? Number(apForm.fee) : 0,
      });
      invalidateReadCache('Event');
      setApEditing(false);
      showToast('懇親会を更新しました');
      await loadData();
    } catch (err) { showToast(err.message || '更新に失敗しました', 'error'); }
    setSaving(false);
  }

  function requestDeleteAfterParty() {
    setConfirmModal({
      title: '懇親会を中止', message: '懇親会を中止しますか？出欠回答データも削除されます。',
      confirmLabel: '中止する', danger: true, onConfirm: deleteAfterParty,
    });
  }

  async function deleteAfterParty() {
    if (!childAfterParty) return;
    setConfirmModal(null);
    setSaving(true);
    try {
      for (const att of childApAtts) { await base44.entities.Attendance.delete(att.id); }
      await base44.entities.Event.delete(childAfterParty.id);
      invalidateReadCache('Event');
      invalidateReadCache('Attendance');
      showToast('懇親会を中止しました');
      await loadData();
    } catch (err) { showToast(err.message || '削除に失敗しました', 'error'); }
    setSaving(false);
  }

  /* ── Send reminder ── */
  async function sendReminder() {
    setConfirmModal(null);
    setSaving(true);
    try {
      const nl = await base44.entities.Newsletter.create({
        title: `【リマインド】${event.title} — 出欠回答のお願い`,
        channel: 'email',
        status: 'draft',
        audience_type: 'all',
        body: `${event.title}の出欠回答をお願いします。\n回答がまだの方は、以下のリンクからご回答ください。`,
        body_html: `<p>${event.title}の出欠回答をお願いします。</p><p>回答がまだの方は、以下のリンクからご回答ください。</p>`,
        linked_event_id: event.id,
        is_reminder: true,
      });
      const result = await apiRequest('send-newsletter', { body: JSON.stringify({ newsletter_id: nl.id }) });
      invalidateReadCache('Newsletter');
      invalidateReadCache('Attendance');
      showToast(result.message || `${result.success_count || 0}名にリマインドを送信しました`);
      await loadData();
    } catch (err) {
      showToast(err.message || 'リマインド送信に失敗しました', 'error');
    }
    setSaving(false);
  }

  /* ── Render ── */
  if (loading) {
    return <section className="admin-shell"><div className="page-header"><h1 className="page-title">イベント詳細</h1></div><LoadingSpinner /></section>;
  }
  if (!event) {
    return <section className="admin-shell"><div className="page-header"><h1 className="page-title">イベントが見つかりません</h1></div><Link to="/admin/events" className="text-link">&larr; 一覧に戻る</Link></section>;
  }

  const transitions = STATUS_TRANSITIONS[status] || [];

  return (
    <section className="admin-shell">
      {/* Back link */}
      <div style={{ marginBottom: 8 }}>
        <Link to="/admin/events" className="text-link" style={{ fontSize: 13 }}>&larr; イベント一覧に戻る</Link>
      </div>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="page-title" style={{ margin: 0, fontSize: isMobile ? 18 : undefined }}>{event.title}</h1>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: tb.bg, color: tb.color, border: `1px solid ${tb.border}` }}>{event.event_type}</span>
            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
          </div>
          <p className="page-description" style={{ margin: '6px 0 0', fontSize: 13 }}>
            {formatDateFull(event.event_date)}
            {event.start_time && ` ${event.start_time}`}{event.end_time && `〜${event.end_time}`}
          </p>
          {event.location && (
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              {event.location}{event.fee > 0 && ` / ¥${Number(event.fee).toLocaleString()}`}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', flexShrink: 0 }}>
          {(canEdit || canEditPartial) && !isEditing && (
            <button className="btn btn-secondary" type="button" onClick={startEdit}
              style={isMobile ? { fontSize: 12, padding: '6px 12px', flex: 1 } : {}}>編集</button>
          )}
          {transitions.map(t => (
            <button key={t.to} className={`btn ${t.secondary ? 'btn-secondary' : 'btn-primary'}`} type="button" disabled={saving}
              onClick={() => requestStatusChange(t.to, t.msg, t.label)}
              style={isMobile ? { fontSize: 12, padding: '6px 12px', flex: 1 } : {}}>
              {t.label}
            </button>
          ))}
          {status === 'draft' && (
            <button className="btn btn-danger" type="button" disabled={saving} onClick={requestDelete}
              style={isMobile ? { fontSize: 12, padding: '6px 12px' } : {}}>削除</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: isMobile ? 12 : 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {[{ key: 'overview', label: '概要' }, { key: 'attendance', label: `出欠状況（${attendances.length}/${targetMembers.length}）` }].map(tab => (
          <button key={tab.key} type="button" onClick={() => { setActiveTab(tab.key); setIsEditing(false); }}
            className={`nl2-pill-tab${activeTab === tab.key ? ' active' : ''}`}
            style={isMobile ? { fontSize: 12, padding: '5px 10px' } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <section className="card panel-card">
          <div className="card-body stack">
            {isEditing ? (
              /* Edit form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {canEdit && (
                  <>
                    <div><label className="evtd-label">イベント名</label><input className="evtd-input" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
                    <div><label className="evtd-label">イベント種別</label>
                      <select className="evtd-input" value={editForm.event_type} onChange={e => setEditForm(f => ({ ...f, event_type: e.target.value }))}>
                        {["懇親会","総会","例会","セミナー","その他"].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><label className="evtd-label">開催日</label><DatePicker value={editForm.event_date} onChange={v => setEditForm(f => ({ ...f, event_date: v }))} /></div>
                  </>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div><label className="evtd-label">開始時刻</label><TimeSelect value={editForm.start_time} onChange={v => setEditForm(f => ({ ...f, start_time: v }))} /></div>
                  <div><label className="evtd-label">終了時刻</label><TimeSelect value={editForm.end_time} onChange={v => setEditForm(f => ({ ...f, end_time: v }))} /></div>
                </div>
                <div><label className="evtd-label">開催場所</label><input className="evtd-input" value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div><label className="evtd-label">定員</label><input className="evtd-input" type="number" min="0" value={editForm.capacity} onChange={e => setEditForm(f => ({ ...f, capacity: e.target.value }))} /></div>
                  <div><label className="evtd-label">参加費</label><input className="evtd-input" type="number" min="0" value={editForm.fee} onChange={e => setEditForm(f => ({ ...f, fee: e.target.value }))} /></div>
                </div>
                <div><label className="evtd-label">出欠回答期限</label><DatePicker value={editForm.rsvp_deadline} onChange={v => setEditForm(f => ({ ...f, rsvp_deadline: v }))} /></div>
                <div><label className="evtd-label">イベント説明</label><textarea className="evtd-input" rows={4} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn btn-secondary" type="button" onClick={() => setIsEditing(false)}>キャンセル</button>
                  <button className="btn btn-primary" type="button" disabled={saving} onClick={saveEdit}>{saving ? '保存中...' : '保存'}</button>
                </div>
              </div>
            ) : (
              /* View mode */
              <dl className="evtd-info-grid">
                <div><dt>開催日</dt><dd>{formatDateFull(event.event_date)}</dd></div>
                <div><dt>時間</dt><dd>{event.start_time || '-'}{event.end_time ? `〜${event.end_time}` : ''}</dd></div>
                <div><dt>場所</dt><dd>{event.location || '-'}</dd></div>
                <div><dt>参加費</dt><dd>{event.fee > 0 ? `¥${Number(event.fee).toLocaleString()}` : '無料'}</dd></div>
                <div><dt>定員</dt><dd>{event.capacity > 0 ? `${event.capacity}名` : '制限なし'}</dd></div>
                <div><dt>出欠回答期限</dt><dd>{event.rsvp_deadline ? formatDateFull(event.rsvp_deadline) : '未設定'}</dd></div>
                <div><dt>対象会員</dt><dd>{event.target_member_types?.length > 0 ? event.target_member_types.join('、') : '全員'}</dd></div>
                <div><dt>回答選択肢</dt><dd style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{responseOptions.map(o => <span key={o} className="pill" style={{ fontSize: 12 }}>{o}</span>)}</dd></div>
              </dl>
            )}
            {!isEditing && event.description && (
              <div style={{ marginTop: 16, padding: 16, background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
                <div className="tiptap-content-view" dangerouslySetInnerHTML={{ __html: event.description }} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── After Party Section (always visible if not a party itself) ── */}
      {event.event_type !== '懇親会' && !event.is_after_party && (
        <div style={{ marginBottom: 16 }}>
          {childAfterParty ? (
            /* Has after-party: show info + edit/delete */
            <div style={{ padding: 16, background: '#fffbeb', borderRadius: 'var(--radius-lg)', border: '1px solid #fde68a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🍻</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>懇親会</span>
                </div>
                {status !== 'completed' && !apEditing && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" type="button" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => { setApForm({ location: childAfterParty.location || '', start_time: childAfterParty.start_time || '', end_time: childAfterParty.end_time || '', fee: childAfterParty.fee || '' }); setApEditing(true); }}>
                      編集
                    </button>
                    <button className="btn btn-danger" type="button" style={{ fontSize: 12, padding: '4px 10px' }} disabled={saving}
                      onClick={requestDeleteAfterParty}>
                      中止
                    </button>
                  </div>
                )}
              </div>
              {apEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div><label className="evtd-label">場所</label><input className="evtd-input" value={apForm.location} onChange={e => setApForm(f => ({ ...f, location: e.target.value }))} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label className="evtd-label">開始時刻</label><TimeSelect value={apForm.start_time} onChange={v => setApForm(f => ({ ...f, start_time: v }))} /></div>
                    <div><label className="evtd-label">終了時刻</label><TimeSelect value={apForm.end_time} onChange={v => setApForm(f => ({ ...f, end_time: v }))} /></div>
                  </div>
                  <div><label className="evtd-label">参加費</label><input className="evtd-input" type="number" min="0" value={apForm.fee} onChange={e => setApForm(f => ({ ...f, fee: e.target.value }))} /></div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button className="btn btn-secondary" type="button" onClick={() => setApEditing(false)}>キャンセル</button>
                    <button className="btn btn-primary" type="button" disabled={saving} onClick={saveAfterParty}>{saving ? '保存中...' : '保存'}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#78350f', marginBottom: 6 }}>
                    {childAfterParty.location && <span>📍 {childAfterParty.location}</span>}
                    {childAfterParty.start_time && <span>🕐 {childAfterParty.start_time}{childAfterParty.end_time ? `〜${childAfterParty.end_time}` : ''}</span>}
                    {childAfterParty.fee > 0 && <span>¥{Number(childAfterParty.fee).toLocaleString()}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#92400e' }}>
                    出欠: 出席 <strong>{childApAtts.filter(a => a.response === '出席').length}</strong> / 欠席 <strong>{childApAtts.filter(a => a.response === '欠席').length}</strong>
                  </div>
                </>
              )}
            </div>
          ) : status !== 'completed' ? (
            /* No after-party: show add button/form */
            showApForm ? (
              <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>🍻 懇親会を追加</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div><label className="evtd-label">場所</label><input className="evtd-input" value={apForm.location} onChange={e => setApForm(f => ({ ...f, location: e.target.value }))} placeholder="例: 居酒屋XX" /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label className="evtd-label">開始時刻</label><TimeSelect value={apForm.start_time} onChange={v => setApForm(f => ({ ...f, start_time: v }))} /></div>
                    <div><label className="evtd-label">終了時刻</label><TimeSelect value={apForm.end_time} onChange={v => setApForm(f => ({ ...f, end_time: v }))} /></div>
                  </div>
                  <div><label className="evtd-label">参加費</label><input className="evtd-input" type="number" min="0" placeholder="0 = 無料" value={apForm.fee} onChange={e => setApForm(f => ({ ...f, fee: e.target.value }))} /></div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button className="btn btn-secondary" type="button" onClick={() => setShowApForm(false)}>キャンセル</button>
                    <button className="btn btn-primary" type="button" disabled={saving} onClick={addAfterParty}>{saving ? '追加中...' : '追加'}</button>
                  </div>
                </div>
              </div>
            ) : (
              <button className="btn btn-secondary" type="button" onClick={() => { setApForm({ location: '', start_time: event.end_time || '20:00', end_time: '22:00', fee: '' }); setShowApForm(true); }}>
                🍻 懇親会を追加
              </button>
            )
          ) : null}
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {activeTab === 'attendance' && (
        <section className="card panel-card">
          <div className="card-body stack">
            {/* Summary with rates */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, flexWrap: 'wrap', marginBottom: 20 }}>
              <AttendanceRing present={rates.attend} total={rates.totalTarget} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>回答率</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--text)' }}>{rates.responseRate}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>({rates.responded}/{rates.totalTarget})</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>出席率</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--success)' }}>{rates.attendRate}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>({rates.attend}/{rates.responded})</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {responseOptions.map(opt => {
                    const count = responseSummary[opt] || 0;
                    const isAttend = opt === '出席';
                    const isAbsent = opt === '欠席';
                    return (
                      <div key={opt} style={{
                        padding: '4px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--line)',
                        background: isAttend ? 'var(--success-light)' : isAbsent ? 'var(--error-light)' : 'var(--bg)',
                        fontSize: 13,
                      }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{opt}</span>
                        <span style={{ marginLeft: 6, fontWeight: 700, color: isAttend ? 'var(--success)' : isAbsent ? 'var(--error)' : 'var(--text)' }}>{count}</span>
                      </div>
                    );
                  })}
                  <div style={{ padding: '4px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>未回答</span>
                    <span style={{ marginLeft: 6, fontWeight: 700, color: 'var(--muted)' }}>{notRespondedMembers.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Remind button */}
            {event.status !== 'completed' && (
              <div style={{ marginBottom: 16 }}>
                {notRespondedMembers.length > 0 ? (
                  <button className="btn btn-secondary" type="button" disabled={saving}
                    onClick={() => setConfirmModal({
                      title: 'リマインド送信',
                      message: `未回答の${notRespondedMembers.length}名にリマインドメールを送信しますか？\n\n件名: 【リマインド】${event.title} — 出欠回答のお願い`,
                      confirmLabel: '送信',
                      onConfirm: sendReminder,
                    })}>
                    未回答 {notRespondedMembers.length}名にリマインド送信
                  </button>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>全員回答済みです</p>
                )}
              </div>
            )}

            {/* Organization breakdown */}
            {orgBreakdown.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>所属別内訳</h3>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <div style={{ minWidth: isMobile ? 0 : 400, border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: isMobile ? '1fr 36px 46px 32px 32px' : '1fr 70px 70px 70px 70px',
                      padding: isMobile ? '8px 10px' : '8px 14px', background: 'var(--line-light)',
                      fontSize: isMobile ? 11 : 12, fontWeight: 600, color: 'var(--text-secondary)',
                      borderBottom: '1px solid var(--line)',
                    }}>
                      <span>所属</span>
                      <span style={{ textAlign: 'center' }}>対象</span>
                      <span style={{ textAlign: 'center' }}>回答率</span>
                      <span style={{ textAlign: 'center' }}>出席</span>
                      <span style={{ textAlign: 'center' }}>欠席</span>
                    </div>
                    {orgBreakdown.map((row, idx) => (
                      <div key={row.orgId} style={{
                        display: 'grid', gridTemplateColumns: isMobile ? '1fr 36px 46px 32px 32px' : '1fr 70px 70px 70px 70px',
                        padding: isMobile ? '8px 10px' : '10px 14px', fontSize: isMobile ? 11 : 13,
                        borderBottom: idx < orgBreakdown.length - 1 ? '1px solid var(--line)' : 'none',
                      }}>
                        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{row.orgName}</span>
                        <span style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{row.target}</span>
                        <span style={{ textAlign: 'center', fontWeight: 600, color: row.responseRate === 100 ? 'var(--success)' : 'var(--text)' }}>{row.responseRate}%</span>
                        <span style={{ textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>{row.attend}</span>
                        <span style={{ textAlign: 'center', fontWeight: 600, color: row.absent > 0 ? 'var(--error)' : 'var(--text-secondary)' }}>{row.absent}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Responded list */}
            {respondedMembers.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>回答済み（{respondedMembers.length}名）</h3>
                <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  {respondedMembers.map((m, idx) => {
                    const att = attendanceMap[m.id];
                    const resp = att?.response || att?.status || '';
                    return (
                      <div key={m.id} style={{
                        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        gap: isMobile ? 6 : 10, padding: isMobile ? '10px 12px' : '10px 14px',
                        borderBottom: idx < respondedMembers.length - 1 ? '1px solid var(--line-light)' : 'none',
                      }}>
                        <span style={{ fontWeight: 500, fontSize: 13, flex: 1, minWidth: 80 }}>{fullName(m)}</span>
                        <select value={resp} onChange={e => {
                          if (e.target.value === '__cancel__') handleCancelResponse(m.id);
                          else handleProxyResponse(m.id, e.target.value);
                        }} disabled={saving}
                          style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: '#fff', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 'auto' : 100 }}>
                          {responseOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          <option value="__cancel__" style={{ color: '#999' }}>-- 取消 --</option>
                        </select>
                        {att?.comment && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{att.comment}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Not responded list */}
            {notRespondedMembers.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--muted)' }}>未回答（{notRespondedMembers.length}名）</h3>
                <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  {notRespondedMembers.map((m, idx) => (
                    <div key={m.id} style={{
                      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      gap: isMobile ? 6 : 10, padding: isMobile ? '10px 12px' : '10px 14px',
                      borderBottom: idx < notRespondedMembers.length - 1 ? '1px solid var(--line-light)' : 'none',
                      background: 'var(--bg)',
                    }}>
                      <span style={{ fontWeight: 500, fontSize: 13, flex: 1, minWidth: 80, color: 'var(--muted)' }}>{fullName(m)}</span>
                      <select value="" onChange={e => e.target.value && handleProxyResponse(m.id, e.target.value)} disabled={saving}
                        style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: '#fff', color: 'var(--muted)', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 'auto' : 100 }}>
                        <option value="">--</option>
                        {responseOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── After party attendance ── */}
            {childAfterParty && (() => {
              const apAtts = childApAtts || [];
              const apAttMap = {};
              apAtts.forEach(a => { apAttMap[a.member_id] = a; });
              const apAttendCount = apAtts.filter(a => (a.response || a.status) === '出席').length;
              const apAbsentCount = apAtts.filter(a => (a.response || a.status) === '欠席').length;
              const apRespondedMembers = targetMembers.filter(m => apAttMap[m.id]);
              const apNotRespondedMembers = targetMembers.filter(m => !apAttMap[m.id]);
              const apTargetCount = targetMembers.length;
              const apResponseRate = apTargetCount > 0 ? Math.round((apRespondedMembers.length / apTargetCount) * 100) : 0;
              const apAttendRate = apRespondedMembers.length > 0 ? Math.round((apAttendCount / apRespondedMembers.length) * 100) : 0;

              return (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '2px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 18 }}>🍻</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#92400e', margin: 0 }}>懇親会の出欠</h3>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {childAfterParty.location && `📍 ${childAfterParty.location}`}
                      {childAfterParty.start_time && ` 🕐 ${childAfterParty.start_time}${childAfterParty.end_time ? `〜${childAfterParty.end_time}` : ''}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, flexWrap: 'wrap', marginBottom: 20 }}>
                    <AttendanceRing present={apAttendCount} total={apTargetCount} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>回答率</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--text)' }}>{apResponseRate}</span>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span>
                            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>({apRespondedMembers.length}/{apTargetCount})</span>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>出席率</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--success)' }}>{apAttendRate}</span>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span>
                            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>({apAttendCount}/{apRespondedMembers.length})</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ padding: '4px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--line)', background: 'var(--success-light)', fontSize: 13 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>出席</span>
                          <span style={{ marginLeft: 6, fontWeight: 700, color: 'var(--success)' }}>{apAttendCount}</span>
                        </div>
                        <div style={{ padding: '4px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--line)', background: 'var(--error-light)', fontSize: 13 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>欠席</span>
                          <span style={{ marginLeft: 6, fontWeight: 700, color: 'var(--error)' }}>{apAbsentCount}</span>
                        </div>
                        <div style={{ padding: '4px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 13 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>未回答</span>
                          <span style={{ marginLeft: 6, fontWeight: 700, color: 'var(--muted)' }}>{apNotRespondedMembers.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {apRespondedMembers.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>回答済み（{apRespondedMembers.length}名）</h4>
                      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                        {apRespondedMembers.map((m, idx) => {
                          const att = apAttMap[m.id];
                          const resp = att?.response || att?.status || '';
                          return (
                            <div key={m.id} style={{
                              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                              alignItems: isMobile ? 'flex-start' : 'center',
                              gap: isMobile ? 6 : 10, padding: isMobile ? '10px 12px' : '10px 14px',
                              borderBottom: idx < apRespondedMembers.length - 1 ? '1px solid var(--line-light)' : 'none',
                            }}>
                              <span style={{ fontWeight: 500, fontSize: 13, flex: 1, minWidth: 80 }}>{fullName(m)}</span>
                              <select value={resp} onChange={e => {
                                if (e.target.value === '__cancel__') handleApCancelResponse(m.id);
                                else handleApProxyResponse(m.id, e.target.value);
                              }} disabled={saving}
                                style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: '#fff', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 'auto' : 100 }}>
                                <option value="出席">出席</option>
                                <option value="欠席">欠席</option>
                                <option value="__cancel__" style={{ color: '#999' }}>-- 取消 --</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {apNotRespondedMembers.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--muted)' }}>未回答（{apNotRespondedMembers.length}名）</h4>
                      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                        {apNotRespondedMembers.map((m, idx) => (
                          <div key={m.id} style={{
                            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            gap: isMobile ? 6 : 10, padding: isMobile ? '10px 12px' : '10px 14px',
                            borderBottom: idx < apNotRespondedMembers.length - 1 ? '1px solid var(--line-light)' : 'none',
                            background: 'var(--bg)',
                          }}>
                            <span style={{ fontWeight: 500, fontSize: 13, flex: 1, minWidth: 80, color: 'var(--muted)' }}>{fullName(m)}</span>
                            <select value="" onChange={e => e.target.value && handleApProxyResponse(m.id, e.target.value)} disabled={saving}
                              style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: '#fff', color: 'var(--muted)', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 'auto' : 100 }}>
                              <option value="">--</option>
                              <option value="出席">出席</option>
                              <option value="欠席">欠席</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <div className="confirm-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-dialog" style={{ maxWidth: 'min(440px, calc(100vw - 32px))' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{confirmModal.title}</h3>
            </div>
            <div style={{ padding: '20px 24px', fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {confirmModal.message}
            </div>
            <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" type="button" onClick={() => setConfirmModal(null)}>キャンセル</button>
              <button className="btn btn-primary" type="button" disabled={saving} onClick={confirmModal.onConfirm}
                style={confirmModal.danger ? { background: 'var(--error)', borderColor: 'var(--error)' } : {}}>
                {saving ? '処理中...' : confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Scoped styles ── */}
      <style>{`
        .evtd-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
        .evtd-input {
          width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius);
          border: 1px solid var(--line); background: var(--bg); font-size: 14px; color: var(--text);
          outline: none; transition: border-color 0.15s, background 0.15s;
        }
        .evtd-input:focus { border-color: var(--primary); background: #fff; }
        .evtd-info-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px; margin: 0;
        }
        .evtd-info-grid div { display: flex; flex-direction: column; gap: 2px; }
        .evtd-info-grid dt { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
        .evtd-info-grid dd { font-size: 14px; color: var(--text); margin: 0; }
        @media (max-width: 768px) {
          .evtd-info-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </section>
  );
}
