import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import { useAuth } from '../../contexts/AuthContext';
import { fullName } from '../../utils/formatName';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { PageHeader } from '../../components/ui';
import { useIsMobile } from '../../hooks/useIsMobile';

const STATUS_BADGE = {
  "公開": { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  "完了": { bg: "#ecfdf5", color: "#059669", border: "#bbf7d0" },
};

const STATUS_LABEL = { "公開": "公開", "完了": "完了" };

const TAG_BADGE = {
  "審議": { bg: "#eff6ff", color: "#2563eb" },
  "協議": { bg: "#fffbeb", color: "#d97706" },
  "討議": { bg: "#fef3c7", color: "#92400e" },
  "報告": { bg: "#ecfdf5", color: "#059669" },
  "議案": { bg: "#eff6ff", color: "#2563eb" },
  "その他": { bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)" },
};

const DECISION_STATUS_BADGE = {
  "未審議":   { bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)" },
  "承認":     { bg: "#ecfdf5", color: "#059669" },
  "否決":     { bg: "#fee2e2", color: "#dc2626" },
  "継続審議": { bg: "#fffbeb", color: "#d97706" },
  "了承":     { bg: "#ecfdf5", color: "#059669" },
};

/* ── Attendance Ring ── */
function AttendanceRing({ present, total, size = 44 }) {
  if (!total) return null;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? present / total : 0;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8E6DF" strokeWidth={3} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1D9E75" strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 500, fill: '#2C2C2A' }}>
        {present}/{total}
      </text>
    </svg>
  );
}

/* ── Helpers ── */
function parseDateParts(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const dow = ["日","月","火","水","木","金","土"][d.getDay()];
  return { month: d.getMonth() + 1, day: d.getDate(), dow, year: d.getFullYear() };
}

function formatDateFull(dateStr) {
  const p = parseDateParts(dateStr);
  if (!p) return dateStr || "";
  return `${p.year}/${p.month}/${p.day}（${p.dow}）`;
}

/* ── SVG Icons ── */
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const ChevronDown = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 6.75L9 11.25l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const CalendarIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="10" width="36" height="32" rx="4" stroke="#E8E6DF" strokeWidth="2" fill="#F9F8F6"/><path d="M6 18h36" stroke="#E8E6DF" strokeWidth="2"/><rect x="14" y="14" width="2" height="0" rx="1" fill="#E8E6DF"/><line x1="16" y1="6" x2="16" y2="14" stroke="#E8E6DF" strokeWidth="2" strokeLinecap="round"/><line x1="32" y1="6" x2="32" y2="14" stroke="#E8E6DF" strokeWidth="2" strokeLinecap="round"/><rect x="14" y="24" width="6" height="4" rx="1" fill="#E8E6DF"/><rect x="14" y="32" width="6" height="4" rx="1" fill="#E8E6DF"/><rect x="24" y="24" width="6" height="4" rx="1" fill="#E8E6DF"/></svg>
);
const LocationIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.75a3.5 3.5 0 0 0-3.5 3.5C3.5 8.75 7 12.25 7 12.25s3.5-3.5 3.5-7a3.5 3.5 0 0 0-3.5-3.5Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" fill="currentColor"/></svg>
);
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4.25V7l2.25 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 3.5h7M4.5 7h7M4.5 10.5h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="2.5" cy="3.5" r=".75" fill="currentColor"/><circle cx="2.5" cy="7" r=".75" fill="currentColor"/><circle cx="2.5" cy="10.5" r=".75" fill="currentColor"/></svg>
);

/* ── Styles ── */
const styles = {
  fyNav: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  fyBtn: (disabled) => ({
    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid #E8E6DF', borderRadius: 8, background: '#fff', cursor: disabled ? 'default' : 'pointer',
    color: disabled ? '#ccc' : '#5F5E5A', opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
    padding: 0,
  }),
  fyText: { fontWeight: 600, fontSize: 15, color: '#2C2C2A' },
  statsRow: { display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' },
  statCard: (accentColor) => ({
    flex: '1 1 140px', minWidth: 140, padding: '16px 20px', borderRadius: 12,
    border: '1px solid #E8E6DF', background: '#fff', display: 'flex', alignItems: 'center', gap: 14,
  }),
  statDot: (color) => ({
    width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
  }),
  statLabel: { fontSize: 12, color: '#5F5E5A', margin: 0 },
  statValue: { fontSize: 22, fontWeight: 600, color: '#2C2C2A', margin: 0, lineHeight: 1.1 },
  timeline: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: (isExpanded) => ({
    borderRadius: 12, border: '1px solid #E8E6DF', background: '#fff',
    transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer', overflow: 'hidden',
  }),
  cardHeader: { padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 },
  dateBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52, flexShrink: 0 },
  dateDay: { fontSize: 20, fontWeight: 500, color: '#2C2C2A', lineHeight: 1.1 },
  dateDow: { fontSize: 12, color: '#5F5E5A', marginTop: 2 },
  divider: { width: 1, height: 40, background: '#E8E6DF', flexShrink: 0 },
  cardCenter: { flex: 1, minWidth: 0 },
  cardTitleRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#2C2C2A' },
  statusPill: (badge) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 500,
    background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, lineHeight: '18px',
  }),
  nextBadge: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
    background: '#EEEDFE', color: '#534AB7', lineHeight: '18px',
  },
  metaRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#5F5E5A' },
  metaItem: { display: 'flex', alignItems: 'center', gap: 4 },
  chevronWrap: (isExpanded) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0,
    color: '#5F5E5A', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
  }),
  expandedBody: { borderTop: '1px solid #E8E6DF', padding: '20px 24px' },
  moderatorLine: { margin: '0 0 16px', fontSize: 13, color: '#5F5E5A' },
  ceremonyRow: (idx) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px',
    borderRadius: 6, background: idx % 2 === 0 ? '#FAFAF8' : '#fff',
  }),
  numberBadge: {
    width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE', color: '#534AB7',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
    flexShrink: 0,
  },
  ceremonyTitle: { fontSize: 13, color: '#2C2C2A', marginLeft: 10, flex: 1 },
  ceremonyPerson: { fontSize: 13, color: '#5F5E5A', textAlign: 'right', paddingLeft: 16, minWidth: 0 },
  agendaSection: {
    margin: '8px 0', padding: '16px', background: '#F9F8F6', borderRadius: 10,
  },
  agendaSectionTitle: { fontSize: 13, fontWeight: 700, color: '#534AB7', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 },
  agendaItem: {
    padding: '12px 14px', background: '#fff', borderRadius: 8, border: '1px solid #E8E6DF', marginBottom: 8,
  },
  agendaTitleRow: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  agendaNum: { fontWeight: 700, fontSize: 12, color: '#5F5E5A', minWidth: 24 },
  agendaTitle: { fontWeight: 600, fontSize: 13, flex: 1, color: '#2C2C2A' },
  agendaTag: (tagBadge) => ({
    display: 'inline-block', padding: '1px 8px', borderRadius: 8, fontSize: 12, fontWeight: 500,
    background: tagBadge.bg, color: tagBadge.color, marginLeft: 6,
  }),
  agendaPerson: { fontSize: 13, color: '#5F5E5A', textAlign: 'right', minWidth: 0 },
  attendanceBox: {
    marginTop: 20, padding: '16px', borderRadius: 10, background: '#F9F8F6', border: '1px solid #E8E6DF',
  },
  attendanceBadge: (bg, color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 8,
    fontSize: 12, fontWeight: 500, background: bg, color: color,
  }),
  minutesBox: {
    marginTop: 16, padding: '16px', borderRadius: 10, background: '#fff', border: '1px solid #E8E6DF',
  },
  minutesLabel: { fontSize: 12, fontWeight: 600, color: '#5F5E5A', display: 'block', marginBottom: 8 },
  noteBox: {
    marginTop: 16, padding: '16px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A',
  },
  noteLabel: { fontSize: 12, fontWeight: 600, color: '#92400e' },
  noteText: { margin: '4px 0 0', fontSize: 13, color: '#78350f', whiteSpace: 'pre-wrap' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '60px 20px', color: '#5F5E5A',
  },
  emptyText: { fontSize: 14, marginTop: 16, color: '#5F5E5A' },
};

export default function MeetingsView() {
  const { memberInfo } = useAuth();
  const isMobile = useIsMobile();

  const [meetings, setMeetings] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [selectedFYId, setSelectedFYId] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [memberOrgLabel, setMemberOrgLabel] = useState({});
  const [meetingAttendances, setMeetingAttendances] = useState([]);
  const [afterPartyMap, setAfterPartyMap] = useState({});
  const [eventAttendances, setEventAttendances] = useState([]);
  const [savingResponse, setSavingResponse] = useState(null);
  const [expandedAttId, setExpandedAttId] = useState(null);
  const currentMemberId = memberInfo?.id || memberInfo?._id || '';

  function showToast(msg, type) { if (window.__showToast) window.__showToast(msg, type || 'success'); }

  const loadData = useCallback(async () => {
    try {
      const [fyList, meetList, members, orgs, assigns, attList, apEventList] = await Promise.all([
        base44.entities.FiscalYear.list("-year"),
        base44.entities.Meeting.list(),
        base44.entities.Member.list().catch(() => []),
        base44.entities.Organization.list().catch(() => []),
        base44.entities.OrgAssignment.list().catch(() => []),
        currentMemberId
          ? base44.entities.Attendance.filter({ member_id: currentMemberId }).catch(() => [])
          : Promise.resolve([]),
        base44.entities.Event.filter({ is_after_party: true }).catch(() => []),
      ]);
      setFiscalYears(fyList || []);
      setMeetings((meetList || []).filter((m) => m.status === "公開" || m.status === "完了"));
      setMeetingAttendances((attList || []).filter(a => a.meeting_id));
      setEventAttendances((attList || []).filter(a => a.event_id));
      // Build after-party map: meetingId -> afterParty event
      const apMap = {};
      (apEventList || []).filter(e => e.parent_meeting_id).forEach(e => { apMap[e.parent_meeting_id] = e; });
      setAfterPartyMap(apMap);
      setAllMembers(members || []);
      // Build org-role label map
      const orgById = {};
      (orgs || []).forEach((o) => { orgById[o.id] = o; });
      const orgTypePriority = { "幹事会": 0, "委員会": 1, "部会": 2, "室": 3, "その他": 4 };
      const tempMap = {};
      (assigns || []).forEach((a) => {
        if (!a.role || !a.member_id) return;
        const org = orgById[a.organization_id];
        const orgType = org?.org_type || "その他";
        const prio = orgTypePriority[orgType] ?? 4;
        const existing = tempMap[`${a.member_id}:${a.fiscal_year_id}`];
        if (!existing || prio < existing.priority) {
          const orgName = orgType === "幹事会" ? "" : (org?.org_name || "");
          tempMap[`${a.member_id}:${a.fiscal_year_id}`] = { label: orgName ? `${orgName} ${a.role}` : a.role, priority: prio };
        }
      });
      // Store as nested: { fyId: { memberId: label } }
      const labelsByFY = {};
      Object.entries(tempMap).forEach(([key, v]) => {
        const [mid, fid] = key.split(":");
        if (!labelsByFY[fid]) labelsByFY[fid] = {};
        labelsByFY[fid][mid] = v.label;
      });
      setMemberOrgLabel(labelsByFY);
      if (!selectedFYId) {
        const current = (fyList || []).find((fy) => fy.is_current);
        if (current) setSelectedFYId(current.id);
        else if (fyList.length > 0) setSelectedFYId(fyList[0].id);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedFYId]);

  useEffect(() => { loadData(); }, [loadData]);

  const memberMap = useMemo(() => {
    const map = {};
    allMembers.forEach((m) => { map[m.id || m._id] = m; });
    return map;
  }, [allMembers]);

  const getMemberName = useCallback((id) => {
    if (!id) return "";
    const m = memberMap[id];
    return m ? fullName(m) : "";
  }, [memberMap]);

  const getOrgLabel = useCallback((personId, fyId) => {
    if (!personId || !fyId) return "";
    return (memberOrgLabel[fyId] || {})[personId] || "";
  }, [memberOrgLabel]);

  // My attendance map for meetings
  const myMeetingAttMap = useMemo(() => {
    const map = {};
    meetingAttendances.forEach(a => { if (a.member_id === currentMemberId) map[a.meeting_id] = a; });
    return map;
  }, [meetingAttendances, currentMemberId]);

  // On-demand attendance cache for meeting response toggle
  const [meetingAttsCache, setMeetingAttsCache] = useState({});
  async function loadMeetingAtts(mtgId) {
    if (meetingAttsCache[mtgId]) return;
    try {
      const atts = await base44.entities.Attendance.filter({ meeting_id: mtgId });
      setMeetingAttsCache(prev => ({ ...prev, [mtgId]: atts || [] }));
    } catch { /* ignore */ }
  }

  async function handleMeetingResponse(meetingId, response) {
    setSavingResponse(meetingId);
    const existing = myMeetingAttMap[meetingId];
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
        await base44.entities.Attendance.create({
          meeting_id: meetingId, member_id: currentMemberId,
          response, status: response, responded_at: new Date().toISOString(),
        });
        invalidateReadCache('Attendance');
        showToast('出欠を回答しました');
      }
      setMeetingAttsCache(prev => { const n = { ...prev }; delete n[meetingId]; return n; });
      await loadData();
    } catch (err) {
      showToast(err.message || '回答に失敗しました', 'error');
    }
    setSavingResponse(null);
  }

  // My event attendance map (for after-parties)
  const myEventAttMap = useMemo(() => {
    const map = {};
    eventAttendances.forEach(a => { if (a.member_id === currentMemberId) map[a.event_id] = a; });
    return map;
  }, [eventAttendances, currentMemberId]);

  async function handleAfterPartyResponse(eventId, response) {
    setSavingResponse(eventId);
    const existing = myEventAttMap[eventId];
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
        await base44.entities.Attendance.create({
          event_id: eventId, member_id: currentMemberId,
          response, status: response, responded_at: new Date().toISOString(),
        });
        invalidateReadCache('Attendance');
        showToast('出欠を回答しました');
      }
      await loadData();
    } catch (err) {
      showToast(err.message || '回答に失敗しました', 'error');
    }
    setSavingResponse(null);
  }

  const [copiedMeetingId, setCopiedMeetingId] = useState(null);
  function copyAgendaText(meeting) {
    const cItems = Array.isArray(meeting.ceremony_items) ? meeting.ceremony_items : [];
    const aItems = Array.isArray(meeting.agenda_items) ? meeting.agenda_items : [];
    const fyId = meeting.fiscal_year_id;
    function speakerLine(pid) {
      const name = getMemberName(pid);
      if (!name) return "";
      const ol = getOrgLabel(pid, fyId);
      return ol ? `${ol} ${name}` : name;
    }
    const lines = [];
    lines.push(`${meeting.title} 次第`);
    const df = formatDateFull(meeting.meeting_date);
    const tr = [meeting.start_time, meeting.end_time].filter(Boolean).join("〜");
    lines.push(`${df}${tr ? ` ${tr}` : ""}`);
    if (meeting.location) lines.push(`場所: ${meeting.location}`);
    if (meeting.moderator_id) lines.push(`司会: ${getMemberName(meeting.moderator_id)}`);
    lines.push("");
    cItems.filter((c) => c.order <= 3).sort((a, b) => a.order - b.order).forEach((c) => {
      const sl = c.person_id ? speakerLine(c.person_id) : (c.person_label || "");
      lines.push(`${c.order}. ${c.title}${sl ? ` ─── ${sl}` : ""}`);
    });
    lines.push("4. 議事");
    aItems.forEach((item, idx) => {
      const sl = item.person_id ? speakerLine(item.person_id) : (item.person_label || "");
      const tag = item.tag ? ` [${item.tag}]` : "";
      lines.push(`   ${idx + 1}) ${item.title}${tag}${sl ? ` ─── ${sl}` : ""}`);
    });
    cItems.filter((c) => c.order >= 5).sort((a, b) => a.order - b.order).forEach((c) => {
      const speakers = [];
      if (c.person_id) speakers.push(speakerLine(c.person_id));
      else if (c.person_label) speakers.push(c.person_label);
      if (c.person_id_2) speakers.push(speakerLine(c.person_id_2));
      else if (c.person_label_2) speakers.push(c.person_label_2);
      const sl = speakers.join(" / ");
      lines.push(`${c.order}. ${c.title}${sl ? ` ─── ${sl}` : ""}`);
    });
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopiedMeetingId(meeting.id);
      if (window.__showToast) window.__showToast("次第をコピーしました", "success");
      setTimeout(() => setCopiedMeetingId(null), 1500);
    }).catch(() => {
      if (window.__showToast) window.__showToast("コピーに失敗しました", "error");
    });
  }

  const filteredMeetings = useMemo(() => {
    if (!selectedFYId) return [];
    return meetings
      .filter((m) => m.fiscal_year_id === selectedFYId)
      .sort((a, b) => (b.meeting_date || "").localeCompare(a.meeting_date || ""));
  }, [meetings, selectedFYId]);

  const selectedFY = fiscalYears.find((fy) => fy.id === selectedFYId);
  const sortedFYs = useMemo(() => [...fiscalYears].sort((a, b) => a.year - b.year), [fiscalYears]);
  const currentFYIndex = sortedFYs.findIndex((fy) => fy.id === selectedFYId);
  function prevFY() { if (currentFYIndex > 0) setSelectedFYId(sortedFYs[currentFYIndex - 1].id); }
  function nextFY() { if (currentFYIndex < sortedFYs.length - 1) setSelectedFYId(sortedFYs[currentFYIndex + 1].id); }

  /* ── Summary stats ── */
  const confirmedCount = filteredMeetings.length;
  const totalAgenda = filteredMeetings.reduce((sum, m) => sum + (Array.isArray(m.agenda_items) ? m.agenda_items.length : 0), 0);

  /* ── Detect "next" meeting ── */
  const nextMeetingId = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = filteredMeetings
      .filter((m) => m.meeting_date >= today && m.status === "公開")
      .sort((a, b) => (a.meeting_date || "").localeCompare(b.meeting_date || ""));
    return upcoming.length > 0 ? upcoming[0].id : null;
  }, [filteredMeetings]);

  if (loading) {
    return (
      <section className="admin-shell">
        <PageHeader title="幹事会" subtitle="幹事会の次第・議事録を確認" />
        <LoadingSpinner />
      </section>
    );
  }

  return (
    <section className="admin-shell">
      {/* ── Header ── */}
      <PageHeader title="幹事会" subtitle="幹事会の次第・議事録を確認" />

      {/* ── FY navigation ── */}
      <div style={styles.fyNav}>
        <button type="button" disabled={currentFYIndex <= 0} onClick={prevFY}
          style={styles.fyBtn(currentFYIndex <= 0)}>
          <ChevronLeft />
        </button>
        <span style={styles.fyText}>{selectedFY ? `${selectedFY.year}年度` : ""}</span>
        <button type="button" disabled={currentFYIndex >= sortedFYs.length - 1} onClick={nextFY}
          style={styles.fyBtn(currentFYIndex >= sortedFYs.length - 1)}>
          <ChevronRight />
        </button>
      </div>

      {/* ── Summary stats ── */}
      {isMobile ? (
        <div className="stat-chip-bar" style={{ marginBottom: 8 }}>
          <span className="stat-chip">開催済み <span className="stat-chip-value" style={{ color: '#1D9E75' }}>{confirmedCount}</span></span>
          <span className="stat-chip">議題合計 <span className="stat-chip-value" style={{ color: '#5F5E5A' }}>{totalAgenda}</span></span>
        </div>
      ) : (
        <div style={styles.statsRow}>
          <div style={styles.statCard('#1D9E75')}>
            <div style={styles.statDot('#1D9E75')} />
            <div>
              <p style={styles.statLabel}>開催済み</p>
              <p style={styles.statValue}>{confirmedCount}</p>
            </div>
          </div>
          <div style={styles.statCard('#5F5E5A')}>
            <div style={styles.statDot('#5F5E5A')} />
            <div>
              <p style={styles.statLabel}>議題合計</p>
              <p style={styles.statValue}>{totalAgenda}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Card list ── */}
      {filteredMeetings.length === 0 ? (
        <div style={styles.emptyState}>
          <CalendarIcon />
          <p style={styles.emptyText}>この年度の幹事会はまだ公開されていません</p>
        </div>
      ) : (
        <div style={styles.timeline}>
          {filteredMeetings.map((m) => {
            const badge = STATUS_BADGE[m.status] || STATUS_BADGE["公開"];
            const ceremonyItems = Array.isArray(m.ceremony_items) ? m.ceremony_items : [];
            const agendaItems = Array.isArray(m.agenda_items) ? m.agenda_items : [];
            const isExpanded = expandedId === m.id;
            const isCompleted = m.status === "完了";
            const isNext = m.id === nextMeetingId;
            const dateParts = parseDateParts(m.meeting_date);
            const attendeeIds = Array.isArray(m.attendee_ids) ? m.attendee_ids : [];
            const agendaCount = agendaItems.length;

            const ceremonyBefore = ceremonyItems.filter((c) => c.order <= 3).sort((a, b) => a.order - b.order);
            const ceremonyAfter = ceremonyItems.filter((c) => c.order >= 5).sort((a, b) => a.order - b.order);
            const allCeremony = [...ceremonyBefore, ...ceremonyAfter];

            const isHovered = hoveredId === m.id;
            const cardStyle = {
              ...styles.card(isExpanded),
              ...(isHovered && !isExpanded ? { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' } : {}),
            };

            return (
              <div key={m.id} style={cardStyle}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
              >
                {/* ── Card header ── */}
                <div style={styles.cardHeader}>
                  {/* Date block */}
                  <div style={styles.dateBlock}>
                    <span style={styles.dateDay}>{dateParts ? `${dateParts.month}/${dateParts.day}` : '-'}</span>
                    <span style={styles.dateDow}>{dateParts ? `${dateParts.dow}曜日` : ''}</span>
                  </div>

                  {/* Divider */}
                  <div style={styles.divider} />

                  {/* Center */}
                  <div style={styles.cardCenter}>
                    <div style={styles.cardTitleRow}>
                      <span style={styles.cardTitle}>{m.title}</span>
                      <span style={styles.statusPill(badge)}>{STATUS_LABEL[m.status] || m.status}</span>
                      {isNext && <span style={styles.nextBadge}>次回</span>}
                    </div>
                    <div style={styles.metaRow}>
                      {m.location && (
                        <span style={styles.metaItem}>
                          <LocationIcon />
                          {m.location}
                        </span>
                      )}
                      {m.start_time && (
                        <span style={styles.metaItem}>
                          <ClockIcon />
                          {m.start_time}{m.end_time ? `〜${m.end_time}` : ''}
                        </span>
                      )}
                      {agendaCount > 0 && (
                        <span style={styles.metaItem}>
                          <ListIcon />
                          {agendaCount}議題
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attendance ring */}
                  {isCompleted && attendeeIds.length > 0 && (
                    <AttendanceRing present={attendeeIds.length} total={allMembers.length || attendeeIds.length} />
                  )}

                  {/* Chevron */}
                  <div style={styles.chevronWrap(isExpanded)}>
                    <ChevronDown />
                  </div>
                </div>

                {/* ── Expanded content ── */}
                {isExpanded && (
                  <div style={styles.expandedBody} onClick={(e) => e.stopPropagation()}>
                    {/* Copy button + Moderator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      {m.moderator_id ? (
                        <p style={{ ...styles.moderatorLine, margin: 0 }}>
                          司会: {getMemberName(m.moderator_id)}
                        </p>
                      ) : <span />}
                      <button type="button" onClick={() => copyAgendaText(m)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '5px 12px', borderRadius: 8, border: '1px solid #E8E6DF',
                          background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          color: copiedMeetingId === m.id ? '#1D9E75' : '#5F5E5A',
                          transition: 'all 0.15s', flexShrink: 0,
                        }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        {copiedMeetingId === m.id ? "コピー済" : "次第コピー"}
                      </button>
                    </div>

                    {/* Ceremony before (1-3) */}
                    {ceremonyBefore.map((c, idx) => (
                      <div key={c.order} style={styles.ceremonyRow(idx)}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={styles.numberBadge}>{c.order}</div>
                          <span style={styles.ceremonyTitle}>{c.title}</span>
                        </div>
                        {(c.person_id || c.person_label) && (
                          <span style={styles.ceremonyPerson}>
                            {c.person_id ? (
                              <>
                                {getOrgLabel(c.person_id, m.fiscal_year_id) && (
                                  <span style={{ fontSize: 12, color: '#888780', marginRight: 6 }}>{getOrgLabel(c.person_id, m.fiscal_year_id)}</span>
                                )}
                                <span style={{ fontWeight: 500 }}>{getMemberName(c.person_id)}</span>
                              </>
                            ) : (
                              <span style={{ fontWeight: 500 }}>{c.person_label}</span>
                            )}
                          </span>
                        )}
                      </div>
                    ))}

                    {/* Agenda section */}
                    <div style={styles.agendaSection}>
                      <div style={styles.agendaSectionTitle}>
                        <div style={styles.numberBadge}>4</div>
                        議事
                      </div>
                      {agendaItems.length === 0 ? (
                        <p style={{ color: '#5F5E5A', fontSize: 13, margin: 0 }}>議題なし</p>
                      ) : (
                        agendaItems.map((item, idx) => {
                          const tagBadge = item.tag ? (TAG_BADGE[item.tag] || TAG_BADGE["その他"]) : null;
                          const decBadge = DECISION_STATUS_BADGE[item.decision_status] || DECISION_STATUS_BADGE["未審議"];
                          const personName = getMemberName(item.person_id);
                          const personOrgLabel = getOrgLabel(item.person_id, m.fiscal_year_id);
                          const hasMemberSpeaker = !!personName;
                          const hasFreeSpeaker = !item.person_id && !!item.person_label;
                          return (
                            <div key={idx} style={styles.agendaItem}>
                              <div style={styles.agendaTitleRow}>
                                <span style={styles.agendaNum}>{idx + 1}）</span>
                                <span style={styles.agendaTitle}>
                                  {item.title}
                                  {item.tag && tagBadge && (
                                    <span style={styles.agendaTag(tagBadge)}>{item.tag}</span>
                                  )}
                                </span>
                                {hasMemberSpeaker && (
                                  <span style={styles.agendaPerson}>
                                    {personOrgLabel && <span style={{ fontSize: 12, color: '#888780', marginRight: 6 }}>{personOrgLabel}</span>}
                                    <span style={{ fontWeight: 500 }}>{personName}</span>
                                  </span>
                                )}
                                {hasFreeSpeaker && (
                                  <span style={styles.agendaPerson}>
                                    <span style={{ fontWeight: 500 }}>{item.person_label}</span>
                                  </span>
                                )}
                              </div>
                              {item.link_url && (
                                <p style={{ margin: '4px 0 0 32px', fontSize: 12 }}>
                                  {item.link_url.startsWith("/") ? (
                                    <Link to={item.link_url} style={{ color: '#534AB7' }}>
                                      {item.link_label || "リンクを見る"}
                                    </Link>
                                  ) : (
                                    <a href={item.link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#534AB7' }}>
                                      {item.link_label || "資料を見る"}
                                    </a>
                                  )}
                                </p>
                              )}
                              {isCompleted && item.decision_status && item.decision_status !== "未審議" && (
                                <div style={{ margin: '8px 0 0 32px', display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                  <span style={{
                                    display: 'inline-block', padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                                    background: decBadge.bg, color: decBadge.color,
                                  }}>{item.decision_status}</span>
                                  {item.decision && <span style={{ fontSize: 12, color: '#2C2C2A' }}>{item.decision}</span>}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Ceremony after (5-6) */}
                    {ceremonyAfter.map((c, idx) => {
                      const renderSpeaker = (pid, plabel) => {
                        if (pid) {
                          const ol = getOrgLabel(pid, m.fiscal_year_id);
                          return <span>{ol && <span style={{ fontSize: 12, color: '#888780', marginRight: 6 }}>{ol}</span>}<span style={{ fontWeight: 500 }}>{getMemberName(pid)}</span></span>;
                        }
                        if (plabel) return <span style={{ fontWeight: 500 }}>{plabel}</span>;
                        return null;
                      };
                      const s1 = renderSpeaker(c.person_id, c.person_label);
                      const s2 = renderSpeaker(c.person_id_2, c.person_label_2);
                      return (
                        <div key={c.order} style={styles.ceremonyRow(ceremonyBefore.length + idx)}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={styles.numberBadge}>{c.order}</div>
                            <span style={styles.ceremonyTitle}>{c.title}</span>
                          </div>
                          {(s1 || s2) && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                              {s1 && <span style={styles.ceremonyPerson}>{s1}</span>}
                              {s2 && <span style={styles.ceremonyPerson}>{s2}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* ── Attendance Section ── */}
                    {(() => {
                      const myAtt = myMeetingAttMap[m.id];
                      const myResponse = myAtt?.response || '';
                      const canRespond = m.status === '公開';
                      const isSaving = savingResponse === m.id;

                      // Build unified attendance map: Attendance records + old attendee_ids
                      const mAtts = meetingAttsCache[m.id] || [];
                      const unifiedMap = {};
                      mAtts.forEach(a => { unifiedMap[a.member_id] = a.response || a.status; });
                      const oldAIds = Array.isArray(m.attendee_ids) ? m.attendee_ids : [];
                      oldAIds.forEach(id => { if (!unifiedMap[id]) unifiedMap[id] = '出席'; });
                      const oldObs = Array.isArray(m.observer_ids) ? m.observer_ids : [];
                      oldObs.forEach(id => { if (!unifiedMap[id]) unifiedMap[id] = '出席'; });
                      const attendCount = Object.values(unifiedMap).filter(v => v === '出席').length;
                      const absentCount = Object.values(unifiedMap).filter(v => v === '欠席').length;
                      const totalResponded = Object.keys(unifiedMap).length;
                      const isAttExpanded = expandedAttId === m.id;

                      return (
                        <div style={styles.attendanceBox}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#5F5E5A', marginBottom: 10 }}>出欠</div>

                          {/* Response buttons (only for 公開) */}
                          {canRespond && (
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 12, color: '#5F5E5A', marginBottom: 6 }}>あなたの回答:</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {['出席', '欠席'].map(opt => {
                                  const isSelected = myResponse === opt;
                                  const isAttend = opt === '出席';
                                  return (
                                    <button key={opt} type="button" disabled={isSaving}
                                      onClick={(e) => { e.stopPropagation(); handleMeetingResponse(m.id, opt); }}
                                      style={{
                                        padding: isMobile ? '8px 16px' : '7px 18px',
                                        borderRadius: 8, fontSize: 13, fontWeight: 600,
                                        cursor: isSaving ? 'default' : 'pointer',
                                        transition: 'all 0.15s', minHeight: 36,
                                        background: isSelected ? (isAttend ? 'var(--color-success-light)' : 'var(--color-danger-light)') : 'transparent',
                                        color: isSelected ? (isAttend ? 'var(--color-success)' : 'var(--color-danger)') : '#5F5E5A',
                                        border: isSelected ? `2px solid ${isAttend ? 'var(--color-success)' : 'var(--color-danger)'}` : '1px solid #E8E6DF',
                                        opacity: isSaving ? 0.5 : 1,
                                      }}>
                                      {isSelected && '✓ '}{opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Show result for completed */}
                          {isCompleted && myResponse && (
                            <p style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600, margin: '0 0 10px' }}>
                              ✓ あなたの回答: {myResponse}
                            </p>
                          )}

                          {/* Toggle for response details */}
                          {totalResponded > 0 && (
                            <div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); const next = isAttExpanded ? null : m.id; setExpandedAttId(next); if (next) loadMeetingAtts(m.id); }}
                                style={{ background: 'none', border: 'none', color: '#534AB7', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                {isAttExpanded ? '▾ 回答状況を閉じる' : `▸ 回答状況を見る（出席 ${attendCount} / 欠席 ${absentCount}）`}
                              </button>
                              {isAttExpanded && (
                                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {Object.entries(unifiedMap).map(([mid, resp]) => {
                                    const name = getMemberName(mid);
                                    if (!name) return null;
                                    const isA = resp === '出席';
                                    return (
                                      <span key={mid} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '3px 10px', borderRadius: 999, fontSize: 12,
                                        background: isA ? '#ecfdf5' : '#fef2f2',
                                        color: isA ? '#059669' : '#dc2626',
                                        border: `1px solid ${isA ? '#bbf7d0' : '#fecaca'}`,
                                      }}>
                                        {name} <span style={{ fontWeight: 600 }}>{resp}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── After Party Section ── */}
                    {(() => {
                      const ap = afterPartyMap[m.id];
                      if (!ap) return null;
                      const apMyAtt = myEventAttMap[ap.id];
                      const apMyResponse = apMyAtt?.response || '';
                      const apCanRespond = m.status === '公開';
                      const apIsSaving = savingResponse === ap.id;
                      return (
                        <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 16 }}>🍻</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>懇親会</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#78350f', marginBottom: 10 }}>
                            {ap.start_time && <span>🕐 {ap.start_time}{ap.end_time ? `〜${ap.end_time}` : ''}</span>}
                            {ap.location && <span>📍 {ap.location}</span>}
                            {ap.fee > 0 && <span>¥{Number(ap.fee).toLocaleString()}</span>}
                          </div>
                          {apCanRespond && (
                            <div style={{ marginBottom: 6 }}>
                              <div style={{ fontSize: 12, color: '#78350f', marginBottom: 6 }}>懇親会の出欠:</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {['出席', '欠席'].map(opt => {
                                  const isSelected = apMyResponse === opt;
                                  const isAttend = opt === '出席';
                                  return (
                                    <button key={opt} type="button" disabled={apIsSaving}
                                      onClick={(e) => { e.stopPropagation(); handleAfterPartyResponse(ap.id, opt); }}
                                      style={{
                                        padding: isMobile ? '8px 16px' : '7px 18px',
                                        borderRadius: 8, fontSize: 13, fontWeight: 600,
                                        cursor: apIsSaving ? 'default' : 'pointer',
                                        transition: 'all 0.15s', minHeight: 36,
                                        background: isSelected ? (isAttend ? 'var(--color-success-light)' : 'var(--color-danger-light)') : 'transparent',
                                        color: isSelected ? (isAttend ? 'var(--color-success)' : 'var(--color-danger)') : '#78350f',
                                        border: isSelected ? `2px solid ${isAttend ? 'var(--color-success)' : 'var(--color-danger)'}` : '1px solid #FDE68A',
                                        opacity: apIsSaving ? 0.5 : 1,
                                      }}>
                                      {isSelected && '✓ '}{opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {isCompleted && apMyResponse && (
                            <p style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600, margin: '4px 0 0' }}>
                              ✓ 懇親会: {apMyResponse}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Minutes content (rich text) */}
                    {isCompleted && m.minutes_content && (
                      <div style={styles.minutesBox}>
                        <span style={styles.minutesLabel}>議事録本文</span>
                        <div className="tiptap-content-view" dangerouslySetInnerHTML={{ __html: m.minutes_content }} />
                      </div>
                    )}

                    {/* Minutes note */}
                    {isCompleted && m.minutes_note && (
                      <div style={styles.noteBox}>
                        <span style={styles.noteLabel}>補足メモ:</span>
                        <p style={styles.noteText}>{m.minutes_note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Responsive styles ── */}
      <style>{`
        @media (max-width: 768px) {
          .meetings-view-card-header { padding: 12px 14px !important; }
        }
      `}</style>
    </section>
  );
}
