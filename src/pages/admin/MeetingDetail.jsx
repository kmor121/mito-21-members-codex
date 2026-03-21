import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44, invalidateReadCache } from '../../api/base44Client';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DatePicker from '../../components/ui/DatePicker';
import TimeSelect from '../../components/ui/TimeSelect';
import MemberSelector from '../../components/ui/MemberSelector';
import { Modal, Button } from '../../components/ui';
import { isAttendanceClosed } from '../../utils/attendanceUtils';
import { fullName, nameInitial } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

const RichTextEditor = lazy(() => import('../../components/common/RichTextEditor'));

const STATUS_BADGE = {
  "下書き": { bg: "var(--color-border)", color: "var(--color-text-secondary)", border: "var(--color-border)" },
  "公開":   { bg: "var(--color-accent-light)", color: "var(--color-accent)", border: "var(--color-accent-light)" },
  "完了":   { bg: "var(--color-success-light)", color: "var(--color-success)", border: "#bbf7d0" },
};
const STATUS_LABEL = { "下書き": "下書き", "公開": "公開", "完了": "完了" };

const DECISION_STATUSES = ["未審議", "承認", "否決", "継続審議", "了承"];

const AGENDA_TAGS = ["審議", "協議", "討議", "報告"];

const TAG_BADGE = {
  "審議": { bg: "var(--color-accent-light)", color: "var(--color-accent)" },
  "協議": { bg: "var(--color-warning-light)", color: "var(--color-warning)" },
  "討議": { bg: "#fef3c7", color: "#92400e" },
  "報告": { bg: "var(--color-success-light)", color: "var(--color-success)" },
  "議案": { bg: "var(--color-accent-light)", color: "var(--color-accent)" },
  "その他": { bg: "var(--color-border)", color: "var(--color-text-secondary)" },
};

const QUICK_LINKS = [
  { label: "入会管理", url: "/member/applications", linkLabel: "入会管理を見る" },
  { label: "会費管理", url: "/member/dues-overview", linkLabel: "会費管理を見る" },
  { label: "組織図", url: "/organization", linkLabel: "組織図を見る" },
];

const DEFAULT_SONOTA_ITEM = { order: 99, title: "その他", tag: "", person_id: "", person_label: "", link_url: "", link_label: "", decision: "", decision_status: "未審議" };

const DECISION_STATUS_BADGE = {
  "未審議": { bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)" },
  "承認":   { bg: "#ecfdf5", color: "#059669" },
  "否決":   { bg: "#fee2e2", color: "#dc2626" },
  "継続審議": { bg: "#fffbeb", color: "#d97706" },
  "了承":   { bg: "#ecfdf5", color: "#059669" },
};

const DEFAULT_CEREMONY_ITEMS = [
  { order: 1, title: "開会のことば", person_id: "" },
  { order: 2, title: "会長挨拶", person_id: "" },
  { order: 3, title: "直前会長挨拶", person_id: "" },
  { order: 5, title: "監事講評", person_id: "" },
  { order: 6, title: "閉会のことば", person_id: "" },
];

function formatDateFull(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = ["日","月","火","水","木","金","土"][d.getDay()];
  return `${y}年${m}月${day}日（${dow}）`;
}

function emptyAgendaItem(order) {
  return { order, title: "", tag: "", person_id: "", person_label: "", link_url: "", link_label: "", decision: "", decision_status: "未審議" };
}

function MemberAvatar({ member, size = 32 }) {
  const imgUrl = member?.profile_image_url;
  const initial = nameInitial(member);
  if (imgUrl) {
    return <img src={imgUrl} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "var(--color-bg-sub)", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.44, fontWeight: 600, color: "var(--color-text-secondary)",
    }}>
      {initial}
    </div>
  );
}

function SpeakerInput({ value, label, onChange, onLabelChange, members, roleMap, placeholder = "担当者を検索..." }) {
  // value = person_id (member), label = person_label (free text)
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);
  const selectedMember = value ? members.find((m) => (m.id || m._id) === value) : null;
  const displayText = selectedMember ? fullName(selectedMember) : (label || "");

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setIsOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return members.slice(0, 10);
    const q = query.toLowerCase();
    return members.filter((m) => {
      const fn = fullName(m).toLowerCase();
      const kana = (m.last_name_kana || "") + " " + (m.first_name_kana || "");
      return fn.includes(q) || kana.toLowerCase().includes(q);
    }).slice(0, 10);
  }, [members, query]);

  function selectMember(m) {
    onChange(m.id || m._id);
    if (onLabelChange) onLabelChange("");
    setQuery("");
    setIsOpen(false);
  }
  function selectFreeText() {
    onChange("");
    if (onLabelChange) onLabelChange(query);
    setIsOpen(false);
  }
  function clear() {
    onChange("");
    if (onLabelChange) onLabelChange("");
    setQuery("");
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1 }}>
      {displayText && !isOpen ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "5px 8px", border: "1px solid var(--color-border)", borderRadius: 8, background: "#fff" }}>
          {selectedMember ? (
            <MemberAvatar member={selectedMember} size={22} />
          ) : (
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--color-bg-sub)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--color-text-secondary)", flexShrink: 0 }}>外</span>
          )}
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayText}
            {!selectedMember && label && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: 4 }}>(外部)</span>}
          </span>
          {selectedMember && roleMap?.[value] && (
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", flexShrink: 0 }}>{roleMap[value]}</span>
          )}
          <button type="button" onClick={clear} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 14, padding: "0 2px", flexShrink: 0 }}>&times;</button>
        </div>
      ) : (
        <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          style={{ width: "100%", fontSize: 13, padding: "6px 10px", border: "1px solid var(--color-border)", borderRadius: 8, outline: "none", boxSizing: "border-box" }}
        />
      )}
      {isOpen && (query || !displayText) && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
          background: "#fff", border: "1px solid var(--color-border)", borderRadius: 10,
          boxShadow: "var(--shadow-lg)", maxHeight: 240, overflowY: "auto", marginTop: 4,
        }}>
          {filtered.map((m) => (
            <div key={m.id || m._id} onClick={() => selectMember(m)}
              className="mtg-dropdown-item"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
            >
              <MemberAvatar member={m} size={24} />
              <span style={{ flex: 1 }}>{fullName(m)}</span>
              {roleMap?.[m.id || m._id] && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{roleMap[m.id || m._id]}</span>}
            </div>
          ))}
          {query && (
            <>
              <div style={{ borderTop: "1px dashed var(--color-border)" }} />
              <div onClick={selectFreeText}
                className="mtg-dropdown-item-add"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "var(--color-accent)" }}
              >
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--color-accent-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--color-accent)", flexShrink: 0 }}>✏</span>
                「{query}」を外部担当者として追加
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function MeetingDetail() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { memberInfo } = useAuth();
  const isMobile = useIsMobile();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState("agenda");
  const [confirmModal, setConfirmModal] = useState(null);

  // Editable fields
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [moderatorId, setModeratorId] = useState("");
  const [attendanceDeadline, setAttendanceDeadline] = useState("");
  const [ceremonyItems, setCeremonyItems] = useState([]);
  const [agendaItems, setAgendaItems] = useState([]);
  const [attendeeIds, setAttendeeIds] = useState([]);
  const [observerIds, setObserverIds] = useState([]);
  const [minutesNote, setMinutesNote] = useState("");
  const [minutesContent, setMinutesContent] = useState("");

  const [meetingAtts, setMeetingAtts] = useState([]);
  const [afterParty, setAfterParty] = useState(null);
  const [afterPartyAtts, setAfterPartyAtts] = useState([]);
  const [apObserverIds, setApObserverIds] = useState([]);
  const [showApForm, setShowApForm] = useState(false);
  const [apEditing, setApEditing] = useState(false);
  const [apForm, setApForm] = useState({ location: '', start_time: '21:00', end_time: '23:00', fee: '' });

  // Reference data
  const [allMembers, setAllMembers] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [memberRoleMap, setMemberRoleMap] = useState({});
  const [memberOrgLabel, setMemberOrgLabel] = useState({}); // member_id → "組織名 役職"
  const [refDataLoaded, setRefDataLoaded] = useState(false);
  const refDataRef = useRef(null);

  const showToastMsg = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

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

  const PersonWithRole = useCallback(({ personId, style }) => {
    if (!personId) return null;
    const name = getMemberName(personId);
    const orgLabel = memberOrgLabel[personId];
    if (!name) return null;
    return (
      <span style={style}>
        {orgLabel && <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginRight: 6 }}>{orgLabel}</span>}
        <span style={{ fontWeight: 500 }}>{name}</span>
      </span>
    );
  }, [getMemberName, memberOrgLabel]);

  const loadMeeting = useCallback(async () => {
    try {
      const [m, atts, apEvents] = await Promise.all([
        base44.entities.Meeting.get(meetingId),
        base44.entities.Attendance.filter({ meeting_id: meetingId }).catch(() => []),
        base44.entities.Event.filter({ parent_meeting_id: meetingId, is_after_party: true }).catch(() => []),
      ]);
      setMeeting(m);
      setMeetingAtts(atts || []);
      const ap = (apEvents || [])[0] || null;
      setAfterParty(ap);
      if (ap) {
        setApObserverIds(Array.isArray(ap.observer_ids) ? ap.observer_ids : []);
        base44.entities.Attendance.filter({ event_id: ap.id }).then(a => setAfterPartyAtts(a || [])).catch(() => setAfterPartyAtts([]));
      } else {
        setAfterPartyAtts([]);
      }
      setTitle(m.title || "");
      setMeetingDate(m.meeting_date || "");
      setStartTime(m.start_time || "");
      setEndTime(m.end_time || "");
      setLocation(m.location || "");
      setModeratorId(m.moderator_id || "");
      setAttendanceDeadline(m.attendance_deadline || "");
      setCeremonyItems(
        Array.isArray(m.ceremony_items) && m.ceremony_items.length > 0
          ? m.ceremony_items
          : DEFAULT_CEREMONY_ITEMS.map((c) => ({ ...c }))
      );
      setAgendaItems(Array.isArray(m.agenda_items) && m.agenda_items.length > 0 ? m.agenda_items : [{ ...DEFAULT_SONOTA_ITEM }]);
      setAttendeeIds(Array.isArray(m.attendee_ids) ? m.attendee_ids : []);
      setObserverIds(Array.isArray(m.observer_ids) ? m.observer_ids : []);
      setMinutesNote(m.minutes_note || "");
      setMinutesContent(m.minutes_content || "");
    } catch {
      setMeeting(null);
    }
    setLoading(false);
  }, [meetingId]);

  const loadRefData = useCallback(async () => {
    try {
      const [orgs, assigns, members] = await Promise.all([
        base44.entities.Organization.list(),
        base44.entities.OrgAssignment.list(),
        base44.entities.Member.list(),
      ]);
      setAllMembers(members || []);
      const memberMap = {};
      (members || []).forEach((m) => { memberMap[m.id] = m; });
      refDataRef.current = { allOrgs: orgs || [], allAssigns: assigns || [], memberMap };
      setRefDataLoaded(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadMeeting(); loadRefData(); }, [loadMeeting, loadRefData]);

  // Compute board members for attendance
  useEffect(() => {
    if (!meeting || !refDataLoaded || !refDataRef.current) return;
    const { allOrgs, allAssigns, memberMap } = refDataRef.current;
    const fyId = meeting.fiscal_year_id;
    const boardOrg = allOrgs.find((o) => o.org_type === "幹事会" && o.fiscal_year_id === fyId);
    if (!boardOrg) return;
    const boardOrgIds = new Set([boardOrg.id]);
    function addChildren(parentId) {
      allOrgs.forEach((o) => {
        if (o.parent_id === parentId && o.fiscal_year_id === fyId) {
          boardOrgIds.add(o.id);
          addChildren(o.id);
        }
      });
    }
    addChildren(boardOrg.id);
    const memberIds = new Set();
    const roleMap = {};
    // Build org-role label map with priority: 幹事会 > 委員会 > 部会 > その他
    const orgTypePriority = { "幹事会": 0, "委員会": 1, "部会": 2, "室": 3, "その他": 4 };
    const orgLabelMap = {}; // member_id → { label, priority }
    const orgById = {};
    allOrgs.forEach((o) => { orgById[o.id] = o; });
    allAssigns.forEach((a) => {
      if (a.fiscal_year_id !== fyId || !memberMap[a.member_id]) return;
      if (boardOrgIds.has(a.organization_id)) {
        memberIds.add(a.member_id);
      }
      if (a.role && !roleMap[a.member_id]) roleMap[a.member_id] = a.role;
      // Build org-role label
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
    const orgLabels = {};
    Object.entries(orgLabelMap).forEach(([mid, v]) => { orgLabels[mid] = v.label; });
    const members = Array.from(memberIds).map((id) => memberMap[id]).filter(Boolean)
      .sort((a, b) => (fullName(a) || "").localeCompare(fullName(b) || ""));
    setBoardMembers(members);
    setMemberRoleMap(roleMap);
    setMemberOrgLabel(orgLabels);
  }, [meeting, refDataLoaded]);

  // Build save payload
  function buildPayload(extra = {}) {
    // Ensure "その他" item exists at the end
    let items = [...agendaItems];
    const sonotaIdx = items.findIndex((a) => a.title === "その他");
    if (sonotaIdx === -1) {
      items.push({ ...DEFAULT_SONOTA_ITEM });
    } else if (sonotaIdx !== items.length - 1) {
      const [sonota] = items.splice(sonotaIdx, 1);
      items.push(sonota);
    }
    const sortedAgenda = items.map((item, i) => ({ ...item, order: i + 1 }));
    const payload = {
      title: title.trim(),
      meeting_date: meetingDate,
      start_time: startTime,
      end_time: endTime,
      location: location.trim(),
      moderator_id: moderatorId,
      attendance_deadline: attendanceDeadline || '',
      ceremony_items: ceremonyItems,
      agenda_items: sortedAgenda,
      attendee_ids: attendeeIds,
      observer_ids: observerIds,
      minutes_note: minutesNote,
      minutes_content: minutesContent,
      ...extra,
    };
    return payload;
  }

  // Save
  async function handleSave() {
    if (!title.trim() || !meetingDate) {
      showToastMsg("会議名と開催日は必須です。");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Meeting.update(meetingId, buildPayload());
      invalidateReadCache("Meeting");
      showToastMsg("保存しました");
      await loadMeeting();
    } catch (err) {
      showToastMsg(err.message || "保存に失敗しました");
    }
    setSaving(false);
  }

  // Status change
  async function handleStatusChange(newStatus) {
    // For "公開", show custom confirm modal with attendance summary
    if (newStatus === "公開") {
      const presentCount = attendeeIds.length;
      const absCount = boardMembers.length - presentCount;
      const obsCount = observerIds.length;
      setConfirmModal({
        title: "幹事会を公開しますか？",
        message: (
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12, padding: "10px 12px", background: "#fffbeb", borderRadius: 6, border: "1px solid #fde68a" }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>&#9888;</span>
              <div style={{ fontSize: 13, color: "#92400e" }}>
                <p style={{ margin: "0 0 4px", fontWeight: 600 }}>公開すると以下が実行されます:</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>会員に次第が公開されます</li>
                  <li>次第の編集がロックされます</li>
                  <li>議事録・出欠は引き続き編集できます</li>
                </ul>
              </div>
            </div>
            <div style={{ fontSize: 13, padding: "8px 12px", background: "#f8fafc", borderRadius: 6, border: "1px solid var(--color-border)" }}>
              出席: <strong style={{ color: "#059669" }}>{presentCount}名</strong>
              <span style={{ margin: "0 6px", color: "var(--color-text-secondary)" }}>/</span>
              欠席: <strong style={{ color: absCount > 0 ? "#dc2626" : "var(--color-text-secondary)" }}>{absCount}名</strong>
              {obsCount > 0 && (
                <>
                  <span style={{ margin: "0 6px", color: "var(--color-text-secondary)" }}>/</span>
                  オブザーバー: <strong style={{ color: "var(--color-accent)" }}>{obsCount}名</strong>
                </>
              )}
            </div>
          </div>
        ),
        confirmLabel: "公開する",
        onConfirm: () => doStatusChange("公開"),
      });
      return;
    }
    // 完了→公開に戻す場合は専用メッセージ
    if (newStatus === "公開" && status === "完了") {
      setConfirmModal({
        title: "公開に戻す",
        message: "この幹事会を「公開」状態に戻しますか？議事録や出欠の編集が再び可能になります。",
        confirmLabel: "公開に戻す",
        onConfirm: () => doStatusChange("公開"),
      });
      return;
    }
    const msgs = {
      "完了": "会議を完了にしますか？すべての編集がロックされます。",
      "下書き": "下書きに戻しますか？次第・議事録の編集が再び可能になります。",
    };
    setConfirmModal({
      title: "ステータス変更",
      message: msgs[newStatus] || "ステータスを変更しますか？",
      confirmLabel: "変更する",
      onConfirm: () => doStatusChange(newStatus),
    });
    return;
  }

  async function doStatusChange(newStatus) {
    setConfirmModal(null);
    setSaving(true);
    try {
      await base44.entities.Meeting.update(meetingId, buildPayload({ status: newStatus }));
      // Sync after-party event status
      if (afterParty) {
        const eventStatusMap = { "下書き": "draft", "公開": "published", "完了": "completed" };
        await base44.entities.Event.update(afterParty.id, { status: eventStatusMap[newStatus] || "draft" });
        invalidateReadCache("Event");
      }
      invalidateReadCache("Meeting");
      showToastMsg(`ステータスを「${STATUS_LABEL[newStatus] || newStatus}」に変更しました`);
      await loadMeeting();
    } catch (err) { showToastMsg(err.message || "更新に失敗しました"); }
    setSaving(false);
  }

  // Ceremony: only person_id editable
  function updateCeremonyPerson(index, personId) {
    setCeremonyItems((prev) => prev.map((item, i) => i === index ? { ...item, person_id: personId } : item));
  }
  function updateCeremonyField(index, field, value) {
    setCeremonyItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  // Agenda operations
  function addAgendaItem() {
    setAgendaItems((prev) => {
      const sonotaIdx = prev.findIndex((a) => a.title === "その他");
      const newItem = emptyAgendaItem(prev.length + 1);
      if (sonotaIdx >= 0) {
        const next = [...prev];
        next.splice(sonotaIdx, 0, newItem);
        return next;
      }
      return [...prev, newItem];
    });
  }
  function removeAgendaItem(index) {
    if (agendaItems[index]?.title === "その他") return;
    setConfirmModal({
      title: "議題の削除",
      message: `「${agendaItems[index]?.title || "この議題"}」を削除しますか？`,
      confirmLabel: "削除する",
      danger: true,
      onConfirm: () => {
        setAgendaItems((prev) => prev.filter((_, i) => i !== index));
        setConfirmModal(null);
      },
    });
  }
  function updateAgendaItem(index, field, value) {
    setAgendaItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }
  function moveAgendaItem(index, direction) {
    const ni = index + direction;
    if (ni < 0 || ni >= agendaItems.length) return;
    setAgendaItems((prev) => { const a = [...prev]; [a[index], a[ni]] = [a[ni], a[index]]; return a; });
  }

  // Copy agenda to clipboard
  const [copyLabel, setCopyLabel] = useState("コピー");
  function copyAgendaText() {
    if (!meeting) return;
    const lines = [];
    lines.push(`${meeting.title} 次第`);
    const dateFull = formatDateFull(meeting.meeting_date);
    const timeRange = [meeting.start_time, meeting.end_time].filter(Boolean).join("〜");
    lines.push(`${dateFull}${timeRange ? ` ${timeRange}` : ""}`);
    if (meeting.location) lines.push(`場所: ${meeting.location}`);
    if (meeting.moderator_id) lines.push(`司会: ${getMemberName(meeting.moderator_id)}`);
    lines.push("");
    // Ceremony before
    const cBefore = ceremonyItems.filter((c) => c.order <= 3).sort((a, b) => a.order - b.order);
    cBefore.forEach((c) => {
      const pLabel = c.person_id ? formatSpeakerLine(c.person_id) : (c.person_label || "");
      lines.push(`${c.order}. ${c.title}${pLabel ? ` ─── ${pLabel}` : ""}`);
    });
    // Agenda (4. 議事)
    lines.push("4. 議事");
    agendaItems.forEach((item, idx) => {
      const pLabel = item.person_id ? formatSpeakerLine(item.person_id) : (item.person_label || "");
      const tagStr = item.tag ? ` [${item.tag}]` : "";
      lines.push(`   ${idx + 1}) ${item.title}${tagStr}${pLabel ? ` ─── ${pLabel}` : ""}`);
    });
    // Ceremony after
    const cAfter = ceremonyItems.filter((c) => c.order >= 5).sort((a, b) => a.order - b.order);
    cAfter.forEach((c) => {
      const speakers = [];
      if (c.person_id) speakers.push(formatSpeakerLine(c.person_id));
      else if (c.person_label) speakers.push(c.person_label);
      if (c.person_id_2) speakers.push(formatSpeakerLine(c.person_id_2));
      else if (c.person_label_2) speakers.push(c.person_label_2);
      const pLabel = speakers.join(" / ");
      lines.push(`${c.order}. ${c.title}${pLabel ? ` ─── ${pLabel}` : ""}`);
    });
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopyLabel("コピーしました ✓");
      showToastMsg("次第をコピーしました");
      setTimeout(() => setCopyLabel("コピー"), 1500);
    }).catch(() => showToastMsg("コピーに失敗しました"));
  }
  function formatSpeakerLine(personId) {
    const name = getMemberName(personId);
    if (!name) return "";
    const orgLabel = memberOrgLabel[personId];
    return orgLabel ? `${orgLabel} ${name}` : name;
  }

  // Attendance record map
  const attRecordMap = useMemo(() => {
    const map = {};
    meetingAtts.forEach(a => { map[a.member_id] = a; });
    return map;
  }, [meetingAtts]);

  // Attendance (legacy toggle)
  function toggleAttendee(memberId) {
    setAttendeeIds((prev) => prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]);
  }

  // Proxy response via Attendance record
  async function handleProxyMeetingResponse(memberId, response) {
    setSaving(true);
    try {
      const existing = attRecordMap[memberId];
      if (existing) {
        await base44.entities.Attendance.update(existing.id, {
          response, status: response, responded_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.Attendance.create({
          meeting_id: meetingId, member_id: memberId,
          response, status: response, responded_at: new Date().toISOString(),
        });
      }
      invalidateReadCache('Attendance');
      showToastMsg('出欠を更新しました');
      await loadMeeting();
    } catch (err) { showToastMsg(err.message || '更新に失敗しました', 'error'); }
    setSaving(false);
  }

  async function handleCancelMeetingResponse(memberId) {
    setSaving(true);
    try {
      const existing = attRecordMap[memberId];
      if (existing) {
        await base44.entities.Attendance.delete(existing.id);
        invalidateReadCache('Attendance');
        showToastMsg('回答を取り消しました');
        await loadMeeting();
      }
    } catch (err) { showToastMsg(err.message || '取消に失敗しました', 'error'); }
    setSaving(false);
  }

  // After-party attendance map
  const apAttRecordMap = useMemo(() => {
    const m = {};
    afterPartyAtts.forEach(a => { m[a.member_id] = a; });
    return m;
  }, [afterPartyAtts]);

  async function handleProxyApResponse(memberId, response) {
    if (!afterParty) return;
    setSaving(true);
    try {
      const existing = apAttRecordMap[memberId];
      if (existing) {
        await base44.entities.Attendance.update(existing.id, { response, status: response, responded_at: new Date().toISOString() });
      } else {
        await base44.entities.Attendance.create({ event_id: afterParty.id, member_id: memberId, response, status: response, responded_at: new Date().toISOString() });
      }
      invalidateReadCache('Attendance');
      showToastMsg('懇親会の出欠を更新しました');
      await loadMeeting();
    } catch (err) { showToastMsg(err.message || '更新に失敗しました', 'error'); }
    setSaving(false);
  }

  async function handleCancelApResponse(memberId) {
    setSaving(true);
    try {
      const existing = apAttRecordMap[memberId];
      if (existing) {
        await base44.entities.Attendance.delete(existing.id);
        invalidateReadCache('Attendance');
        showToastMsg('懇親会の回答を取り消しました');
        await loadMeeting();
      }
    } catch (err) { showToastMsg(err.message || '取消に失敗しました', 'error'); }
    setSaving(false);
  }

  // After-party observer helpers
  function addApObserver(memberId) {
    if (!memberId || apObserverIds.includes(memberId)) return;
    setApObserverIds(prev => [...prev, memberId]);
  }
  function removeApObserver(memberId) {
    setApObserverIds(prev => prev.filter(id => id !== memberId));
  }
  async function saveApObservers() {
    if (!afterParty) return;
    setSaving(true);
    try {
      await base44.entities.Event.update(afterParty.id, { observer_ids: apObserverIds });
      invalidateReadCache('Event');
      showToastMsg('懇親会のオブザーバーを保存しました');
      await loadMeeting();
    } catch (err) { showToastMsg(err.message || '保存に失敗しました', 'error'); }
    setSaving(false);
  }

  // Observer
  function addObserver(memberId) {
    if (!memberId || observerIds.includes(memberId)) return;
    setObserverIds((prev) => [...prev, memberId]);
  }
  function removeObserver(memberId) {
    setObserverIds((prev) => prev.filter((id) => id !== memberId));
  }

  /* ── After-party CRUD ── */
  async function addAfterPartyMeeting() {
    setSaving(true);
    try {
      const statusMap = { "下書き": "draft", "公開": "published", "完了": "completed" };
      await base44.entities.Event.create({
        title: `${meeting.title} 懇親会`,
        event_type: '懇親会',
        event_date: meeting.meeting_date,
        start_time: apForm.start_time || meeting.end_time || '',
        end_time: apForm.end_time || '',
        location: apForm.location || '',
        fee: apForm.fee ? Number(apForm.fee) : 0,
        status: statusMap[meeting.status] || 'draft',
        parent_meeting_id: meetingId,
        is_after_party: true,
        response_options: ['出席', '欠席'],
        default_response_options: true,
        fiscal_year_id: meeting.fiscal_year_id || '',
        sort_order: 0,
      });
      invalidateReadCache('Event');
      setShowApForm(false);
      setApForm({ location: '', start_time: '21:00', end_time: '23:00', fee: '' });
      showToastMsg('懇親会を追加しました');
      await loadMeeting();
    } catch (err) { showToastMsg(err.message || '追加に失敗しました'); }
    setSaving(false);
  }

  async function saveAfterPartyMeeting() {
    if (!afterParty) return;
    setSaving(true);
    try {
      await base44.entities.Event.update(afterParty.id, {
        location: apForm.location || '', start_time: apForm.start_time || '', end_time: apForm.end_time || '',
        fee: apForm.fee ? Number(apForm.fee) : 0,
      });
      invalidateReadCache('Event');
      setApEditing(false);
      showToastMsg('懇親会を更新しました');
      await loadMeeting();
    } catch (err) { showToastMsg(err.message || '更新に失敗しました'); }
    setSaving(false);
  }

  function requestDeleteAfterPartyMeeting() {
    setConfirmModal({
      title: '懇親会を中止', message: '懇親会を中止しますか？出欠回答データも削除されます。',
      confirmLabel: '中止する', danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        setSaving(true);
        try {
          for (const att of afterPartyAtts) { await base44.entities.Attendance.delete(att.id); }
          await base44.entities.Event.delete(afterParty.id);
          invalidateReadCache('Event');
          invalidateReadCache('Attendance');
          showToastMsg('懇親会を中止しました');
          await loadMeeting();
        } catch (err) { showToastMsg(err.message || '削除に失敗しました'); }
        setSaving(false);
      },
    });
  }

  if (loading) {
    return (<section className="admin-shell"><div className="page-header"><h1 className="page-title">幹事会 詳細</h1></div><LoadingSpinner /></section>);
  }
  if (!meeting) {
    return (<section className="admin-shell"><div className="page-header"><h1 className="page-title">会議が見つかりません</h1></div><Link to="/admin/meetings" className="text-link">&larr; 一覧に戻る</Link></section>);
  }

  const status = meeting.status;
  const badge = STATUS_BADGE[status] || STATUS_BADGE["下書き"];
  const canEditAgenda = status === "下書き";
  const canEditMinutes = status === "下書き" || status === "公開";
  const canEditAttendance = status === "下書き" || status === "公開";
  const statusLabel = STATUS_LABEL[status] || status;
  const attendeeCount = attendeeIds.length;
  const absentCount = boardMembers.length - attendeeCount;
  const observerCount = observerIds.length;

  const ceremonyBefore = ceremonyItems.filter((c) => c.order <= 3).sort((a, b) => a.order - b.order);
  const ceremonyAfter = ceremonyItems.filter((c) => c.order >= 5).sort((a, b) => a.order - b.order);

  // Members available for observer selection (not in board members and not already an observer)
  const boardMemberIds = new Set(boardMembers.map((m) => m.id || m._id));
  const observerCandidates = allMembers.filter((m) => {
    const mid = m.id || m._id;
    return !boardMemberIds.has(mid) && !observerIds.includes(mid);
  });
  const apObserverCandidates = allMembers.filter(m => {
    const mid = m.id || m._id;
    return !boardMemberIds.has(mid) && !apObserverIds.includes(mid);
  });

  const tabs = [
    { key: "agenda", label: "次第" },
    { key: "minutes", label: "議事録" },
    { key: "attendance", label: `出欠（${attendeeCount}/${boardMembers.length}${observerCount > 0 ? `+${observerCount}` : ""}）` },
  ];

  return (
    <section className="admin-shell">
      {toast && <div className="nl2-toast"><span className="nl2-toast-icon">{"\u2713"}</span><span>{toast}</span></div>}

      {/* Confirm Modal */}
      <Modal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} title={confirmModal?.title || ''} style={{ maxWidth: 400 }}>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>{confirmModal?.message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button variant="ghost" onClick={() => setConfirmModal(null)}>キャンセル</Button>
          <Button variant={confirmModal?.danger ? 'danger' : 'primary'} onClick={confirmModal?.onConfirm} disabled={saving}>
            {saving ? '処理中...' : confirmModal?.confirmLabel}
          </Button>
        </div>
      </Modal>

      <div style={{ marginBottom: 8 }}>
        <Link to="/admin/meetings" className="text-link" style={{ fontSize: 13 }}>&larr; 幹事会一覧に戻る</Link>
      </div>

      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: isMobile ? 8 : 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: isMobile ? 18 : undefined }}>{meeting.title}</h1>
            <span className="pill" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontSize: 12 }}>{statusLabel}</span>
          </div>
          <p className="page-description" style={{ margin: "4px 0 0", fontSize: isMobile ? 12 : undefined }}>
            {formatDateFull(meeting.meeting_date)}
            {meeting.start_time && ` ${meeting.start_time}`}
            {meeting.end_time && `〜${meeting.end_time}`}
            {!isMobile && meeting.location && ` / ${meeting.location}`}
            {!isMobile && meeting.moderator_id && ` / 司会: ${getMemberName(meeting.moderator_id)}`}
          </p>
          {isMobile && (meeting.location || meeting.moderator_id) && (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>
              {meeting.location}{meeting.location && meeting.moderator_id && " / "}{meeting.moderator_id && `司会: ${getMemberName(meeting.moderator_id)}`}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
          {status === "下書き" && <Button variant="primary" size={isMobile ? "sm" : "md"} disabled={saving} onClick={() => handleStatusChange("公開")}>公開にする</Button>}
          {status === "公開" && (
            <>
              <Button variant="secondary" size={isMobile ? "sm" : "md"} disabled={saving} onClick={() => handleStatusChange("下書き")}>下書きに戻す</Button>
              <Button variant="primary" size={isMobile ? "sm" : "md"} disabled={saving} onClick={() => handleStatusChange("完了")}>完了にする</Button>
            </>
          )}
          {status === "完了" && <Button variant="secondary" size={isMobile ? "sm" : "md"} disabled={saving} onClick={() => handleStatusChange("公開")}>公開に戻す</Button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: isMobile ? 12 : 20, alignItems: "center", flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={`nl2-pill-tab${activeTab === tab.key ? " active" : ""}`}
            style={isMobile ? { fontSize: 12, padding: "5px 10px" } : {}}
          >{tab.label}</button>
        ))}
        {activeTab === "agenda" && (
          <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", gap: 6, width: isMobile ? "100%" : "auto", marginTop: isMobile ? 4 : 0 }}>
            <Button variant="secondary" onClick={() => {
              const copyCeremony = Array.isArray(meeting.ceremony_items)
                ? meeting.ceremony_items.map(c => ({
                    order: c.order, title: c.title,
                    person_id: c.person_id || '', person_label: c.person_label || '',
                    person_id_2: c.person_id_2 || '', person_label_2: c.person_label_2 || '',
                  }))
                : null;
              const copyAgenda = Array.isArray(meeting.agenda_items)
                ? meeting.agenda_items.map(a => ({
                    order: a.order, title: a.title, tag: a.tag || '',
                    person_id: a.person_id || '', person_label: a.person_label || '',
                    link_url: '', link_label: '', decision: '', decision_status: '未審議',
                  }))
                : null;
              navigate('/admin/meetings', { state: { copyAgenda, copyCeremony, copyFromTitle: meeting.title } });
            }}
              size="sm"
              style={{ flex: isMobile ? 1 : undefined }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              {isMobile ? "コピー新規" : "コピーして新規作成"}
            </Button>
            <Button variant="secondary" onClick={copyAgendaText}
              size="sm"
              style={{ flex: isMobile ? 1 : undefined }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              {copyLabel}
            </Button>
          </div>
        )}
      </div>

      {/* ── AGENDA TAB ── */}
      {activeTab === "agenda" && (
        <section className="card panel-card">
          <div className="card-body stack">
            {/* Meeting info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>会議名 <span style={{ color: "#dc2626" }}>*</span></label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEditAgenda} />
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div className="field" style={{ flex: 1, minWidth: 180 }}>
                  <label>開催日 <span style={{ color: "#dc2626" }}>*</span></label>
                  <DatePicker value={meetingDate} onChange={setMeetingDate} disabled={!canEditAgenda} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 180 }}>
                  <label>場所</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} disabled={!canEditAgenda} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div className="field" style={{ flex: 1, minWidth: 140 }}>
                  <label>開始時刻</label>
                  <TimeSelect value={startTime} onChange={setStartTime} disabled={!canEditAgenda} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 140 }}>
                  <label>終了時刻</label>
                  <TimeSelect value={endTime} onChange={setEndTime} disabled={!canEditAgenda} />
                </div>
              </div>
              <div className="field">
                <label>司会者</label>
                <MemberSelector value={moderatorId} onChange={setModeratorId} members={allMembers} roleMap={memberRoleMap} disabled={!canEditAgenda} placeholder="司会者を選択..." />
              </div>
            </div>

            {/* 式次第 */}
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "20px 0 8px", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>式次第</h3>

            {/* Ceremony 1-3 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ceremonyBefore.map((item) => {
                const realIdx = ceremonyItems.indexOf(item);
                return (
                  <div key={item.order} style={{
                    display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 8 : 12, padding: isMobile ? "8px 10px" : "8px 16px",
                    background: "#f8fafc", borderRadius: 6, border: "1px solid var(--color-border)",
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 13, minWidth: 20, color: "var(--color-text-secondary)" }}>{item.order}.</span>
                    <span style={{ fontWeight: 600, fontSize: 13, minWidth: isMobile ? 0 : 120 }}>{item.title}</span>
                    <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", width: isMobile ? "100%" : "auto", minWidth: 0 }}>
                      {canEditAgenda ? (
                        <div style={{ width: isMobile ? "100%" : 220 }}>
                          <SpeakerInput value={item.person_id || ""} label={item.person_label || ""}
                            onChange={(v) => updateCeremonyField(realIdx, "person_id", v)}
                            onLabelChange={(v) => updateCeremonyField(realIdx, "person_label", v)}
                            members={allMembers} roleMap={memberRoleMap} />
                        </div>
                      ) : (
                        item.person_id ? (
                          <PersonWithRole personId={item.person_id} style={{ fontSize: 13, color: "var(--color-text-secondary)" }} />
                        ) : item.person_label ? (
                          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                            <span style={{ fontWeight: 500 }}>{item.person_label}</span>
                            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: 4 }}>(外部)</span>
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 議事 (4) */}
            <div style={{ margin: "12px 0", padding: "12px 16px", background: "var(--color-accent-light)", borderRadius: 8, border: "1px solid var(--color-accent-light)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--color-accent)" }}>4. 議事</span>
                {canEditAgenda && (
                  <Button variant="secondary" size="sm" onClick={addAgendaItem}>+ 議題追加</Button>
                )}
              </div>

              {agendaItems.length === 0 ? (
                <p style={{ color: "var(--color-text-secondary)", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>議題がまだ追加されていません。</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {agendaItems.map((item, idx) => {
                    const tagBadge = item.tag ? (TAG_BADGE[item.tag] || TAG_BADGE["その他"]) : null;
                    return (
                      <div key={idx} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: isMobile ? "10px 10px" : "12px 14px", background: "#fff" }}>
                        {/* Title row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-secondary)", minWidth: isMobile ? 24 : 30 }}>{idx + 1}）</span>
                          {canEditAgenda ? (
                            <input type="text" value={item.title} onChange={(e) => updateAgendaItem(idx, "title", e.target.value)}
                              placeholder="議題名" style={{ flex: 1, fontSize: 13 }} />
                          ) : (
                            <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{item.title}</span>
                          )}
                        </div>

                        {/* Tag + Person row */}
                        <div style={{ marginLeft: isMobile ? 24 : 30, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", gap: isMobile ? 8 : 12, alignItems: isMobile ? "flex-start" : "center", flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>種別:</span>
                              {canEditAgenda ? (
                                <select value={item.tag || ""} onChange={(e) => updateAgendaItem(idx, "tag", e.target.value)}
                                  style={{ width: 110, fontSize: 12, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                                  <option value="">未設定</option>
                                  {AGENDA_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                              ) : (
                                tagBadge ? <span className="pill" style={{ background: tagBadge.bg, color: tagBadge.color, fontSize: 12 }}>{item.tag}</span> : <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>-</span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: isMobile ? 0 : 200, width: isMobile ? "100%" : "auto" }}>
                              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>担当:</span>
                              {canEditAgenda ? (
                                <SpeakerInput value={item.person_id || ""} label={item.person_label || ""}
                                  onChange={(v) => updateAgendaItem(idx, "person_id", v)}
                                  onLabelChange={(v) => updateAgendaItem(idx, "person_label", v)}
                                  members={allMembers} roleMap={memberRoleMap} />
                              ) : (
                                item.person_id ? (
                                  <PersonWithRole personId={item.person_id} style={{ fontSize: 13 }} />
                                ) : item.person_label ? (
                                  <span style={{ fontSize: 13 }}>
                                    <span style={{ fontWeight: 500 }}>{item.person_label}</span>
                                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: 4 }}>(外部)</span>
                                  </span>
                                ) : null
                              )}
                            </div>
                          </div>

                          {/* Link */}
                          {canEditAgenda ? (
                            item.link_url ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>リンク:</span>
                                <input type="text" value={item.link_url} onChange={(e) => updateAgendaItem(idx, "link_url", e.target.value)}
                                  placeholder="/admin/... or https://..." style={{ flex: 1, minWidth: 180, fontSize: 12 }} />
                                <input type="text" value={item.link_label || ""} onChange={(e) => updateAgendaItem(idx, "link_label", e.target.value)}
                                  placeholder="表示テキスト" style={{ width: 120, fontSize: 12 }} />
                                <button type="button" onClick={() => { updateAgendaItem(idx, "link_url", ""); updateAgendaItem(idx, "link_label", ""); }}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 14, padding: "0 4px" }}>&times;</button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <button type="button" onClick={() => updateAgendaItem(idx, "link_url", "https://")}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: 12, padding: 0, textAlign: "left" }}>
                                  + リンク追加
                                </button>
                                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>|</span>
                                {QUICK_LINKS.map((ql) => (
                                  <button key={ql.url} type="button" onClick={() => { updateAgendaItem(idx, "link_url", ql.url); updateAgendaItem(idx, "link_label", ql.linkLabel); }}
                                    style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: 4, cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 11, padding: "1px 8px" }}>
                                    {ql.label}
                                  </button>
                                ))}
                              </div>
                            )
                          ) : (
                            item.link_url && (
                              item.link_url.startsWith("/") ? (
                                <Link to={item.link_url} style={{ fontSize: 12, color: "var(--color-accent)" }}>
                                  {item.link_label || "リンクを見る"}
                                </Link>
                              ) : (
                                <a href={item.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--color-accent)" }}>
                                  {item.link_label || "資料リンク"}
                                </a>
                              )
                            )
                          )}
                        </div>

                        {/* Move/delete */}
                        {canEditAgenda && (
                          <div style={{ marginLeft: isMobile ? 24 : 30, marginTop: 8, display: "flex", gap: 6 }}>
                            <button type="button" disabled={idx === 0} onClick={() => moveAgendaItem(idx, -1)}
                              style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: 4, padding: "2px 8px", fontSize: 12, cursor: "pointer" }}>↑</button>
                            <button type="button" disabled={idx === agendaItems.length - 1} onClick={() => moveAgendaItem(idx, 1)}
                              style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: 4, padding: "2px 8px", fontSize: 12, cursor: "pointer" }}>↓</button>
                            {item.title !== "その他" && (
                              <button type="button" onClick={() => removeAgendaItem(idx)}
                                style={{ background: "none", border: "1px solid #fca5a5", borderRadius: 4, padding: "2px 8px", fontSize: 12, cursor: "pointer", color: "#dc2626" }}>削除</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ceremony 5-6 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ceremonyAfter.map((item) => {
                const realIdx = ceremonyItems.indexOf(item);
                const isKanjiKohyo = item.title === "監事講評";
                return (
                  <div key={item.order} style={{
                    display: "flex", alignItems: isKanjiKohyo && canEditAgenda ? "flex-start" : (isMobile ? "flex-start" : "center"),
                    gap: isMobile ? 8 : 12, padding: isMobile ? "8px 10px" : "8px 16px",
                    background: "#f8fafc", borderRadius: 6, border: "1px solid var(--color-border)",
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 13, minWidth: 20, color: "var(--color-text-secondary)", paddingTop: isKanjiKohyo && canEditAgenda ? 6 : 0 }}>{item.order}.</span>
                    <span style={{ fontWeight: 600, fontSize: 13, minWidth: isMobile ? 0 : 120, paddingTop: isKanjiKohyo && canEditAgenda ? 6 : 0 }}>{item.title}</span>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: isMobile ? "stretch" : "flex-end", gap: 4, width: isMobile ? "100%" : "auto", minWidth: 0 }}>
                      {canEditAgenda ? (
                        <>
                          <div style={{ width: isMobile ? "100%" : 220 }}>
                            <SpeakerInput value={item.person_id || ""} label={item.person_label || ""}
                              onChange={(v) => updateCeremonyField(realIdx, "person_id", v)}
                              onLabelChange={(v) => updateCeremonyField(realIdx, "person_label", v)}
                              members={allMembers} roleMap={memberRoleMap} placeholder="担当者1を検索..." />
                          </div>
                          {isKanjiKohyo && (
                            (item.person_id_2 || item.person_label_2 || item.person_id) ? (
                              <div style={{ width: isMobile ? "100%" : 220 }}>
                                <SpeakerInput value={item.person_id_2 || ""} label={item.person_label_2 || ""}
                                  onChange={(v) => updateCeremonyField(realIdx, "person_id_2", v)}
                                  onLabelChange={(v) => updateCeremonyField(realIdx, "person_label_2", v)}
                                  members={allMembers} roleMap={memberRoleMap} placeholder="担当者2を検索..." />
                              </div>
                            ) : (
                              <button type="button" onClick={() => updateCeremonyField(realIdx, "person_id_2", "")}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: 12, padding: "2px 0" }}>
                                ＋ 担当者を追加
                              </button>
                            )
                          )}
                        </>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                          {item.person_id ? (
                            <PersonWithRole personId={item.person_id} style={{ fontSize: 13, color: "var(--color-text-secondary)" }} />
                          ) : item.person_label ? (
                            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                              <span style={{ fontWeight: 500 }}>{item.person_label}</span>
                              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: 4 }}>(外部)</span>
                            </span>
                          ) : null}
                          {isKanjiKohyo && (item.person_id_2 || item.person_label_2) && (
                            item.person_id_2 ? (
                              <PersonWithRole personId={item.person_id_2} style={{ fontSize: 13, color: "var(--color-text-secondary)" }} />
                            ) : (
                              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                                <span style={{ fontWeight: 500 }}>{item.person_label_2}</span>
                                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: 4 }}>(外部)</span>
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {canEditAgenda && (
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                <Button variant="primary" disabled={saving} onClick={handleSave}>{saving ? "保存中..." : "保存"}</Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── MINUTES TAB ── */}
      {activeTab === "minutes" && (
        <section className="card panel-card">
          <div className="card-body stack">
              <>
                {/* Decision results */}
                {agendaItems.length > 0 && (
                  <>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px", color: "var(--color-text-primary)" }}>審議結果</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {agendaItems.map((item, idx) => {
                        const tagBadge = item.tag ? (TAG_BADGE[item.tag] || TAG_BADGE["その他"]) : null;
                        const decBadge = DECISION_STATUS_BADGE[item.decision_status] || DECISION_STATUS_BADGE["未審議"];
                        return (
                          <div key={idx} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "14px 16px", background: "#fafbfc" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text-secondary)" }}>{idx + 1}）</span>
                              {item.tag && tagBadge && <span className="pill" style={{ background: tagBadge.bg, color: tagBadge.color, fontSize: 12 }}>{item.tag}</span>}
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{item.title || "(無題)"}</span>
                              {item.person_id && <PersonWithRole personId={item.person_id} style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: "auto" }} />}
                            </div>
                            {item.person_label && <p style={{ marginLeft: 24, fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px 28px" }}>{item.person_label}</p>}
                            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginLeft: 28 }}>
                              <div style={{ minWidth: 140 }}>
                                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>結果</label>
                                {canEditMinutes ? (
                                  <select value={item.decision_status || "未審議"} onChange={(e) => updateAgendaItem(idx, "decision_status", e.target.value)}
                                    style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                                    {DECISION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                ) : (
                                  <span className="pill" style={{ background: decBadge.bg, color: decBadge.color, fontSize: 12 }}>{item.decision_status || "未審議"}</span>
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>決定事項</label>
                                {canEditMinutes ? (
                                  <textarea value={item.decision || ""} onChange={(e) => updateAgendaItem(idx, "decision", e.target.value)}
                                    rows={2} placeholder="決定事項を入力" style={{ width: "100%", fontSize: 13 }} />
                                ) : (
                                  <p style={{ fontSize: 13, margin: 0 }}>{item.decision || "-"}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Rich text minutes */}
                <div style={{ marginTop: agendaItems.length > 0 ? 24 : 0 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px", color: "var(--color-text-primary)" }}>議事録本文</h3>
                  {canEditMinutes ? (
                    <Suspense fallback={
                      <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LoadingSpinner />
                      </div>
                    }>
                      <div className="doc-ed-editor-wrap">
                        <RichTextEditor content={minutesContent} onChange={setMinutesContent} placeholder="議事録を入力してください..." />
                      </div>
                    </Suspense>
                  ) : (
                    minutesContent ? (
                      <div className="tiptap-content-view" style={{ padding: "16px", border: "1px solid var(--color-border)", borderRadius: 8, background: "#fafbfc" }}
                        dangerouslySetInnerHTML={{ __html: minutesContent }} />
                    ) : (
                      <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>議事録本文はまだ記入されていません。</p>
                    )
                  )}
                </div>

                {/* Legacy minutes note */}
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>補足メモ</label>
                  {canEditMinutes ? (
                    <textarea value={minutesNote} onChange={(e) => setMinutesNote(e.target.value)}
                      rows={3} placeholder="全体の備考など" style={{ width: "100%", fontSize: 13 }} />
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{minutesNote || "-"}</p>
                  )}
                </div>

                {canEditMinutes && (
                  <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    <Button variant="primary" disabled={saving} onClick={handleSave}>{saving ? "保存中..." : "保存"}</Button>
                  </div>
                )}
              </>
          </div>
        </section>
      )}

      {/* ── After Party section (hidden on attendance tab — has its own AP section) ── */}
      {activeTab !== "attendance" && afterParty ? (
        <div style={{ marginBottom: 16, padding: 16, background: '#fffbeb', borderRadius: 'var(--radius-lg)', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🍻</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>懇親会</span>
            </div>
            {canEditAttendance && !apEditing && (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="secondary" size="sm"
                  onClick={() => { setApForm({ location: afterParty.location || '', start_time: afterParty.start_time || '', end_time: afterParty.end_time || '', fee: afterParty.fee || '' }); setApEditing(true); }}>
                  編集
                </Button>
                <Button variant="danger" size="sm" disabled={saving}
                  onClick={requestDeleteAfterPartyMeeting}>
                  中止
                </Button>
              </div>
            )}
          </div>
          {apEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label className="mtg-label">場所</label><input className="mtg-input" value={apForm.location} onChange={e => setApForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div className="mtg-form-2col">
                <div><label className="mtg-label">開始時刻</label><TimeSelect value={apForm.start_time} onChange={v => setApForm(f => ({ ...f, start_time: v }))} /></div>
                <div><label className="mtg-label">終了時刻</label><TimeSelect value={apForm.end_time} onChange={v => setApForm(f => ({ ...f, end_time: v }))} /></div>
              </div>
              <div><label className="mtg-label">参加費</label><input className="mtg-input" type="number" min="0" value={apForm.fee} onChange={e => setApForm(f => ({ ...f, fee: e.target.value }))} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <Button variant="secondary" onClick={() => setApEditing(false)}>キャンセル</Button>
                <Button variant="primary" disabled={saving} onClick={saveAfterPartyMeeting}>{saving ? '保存中...' : '保存'}</Button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#78350f', marginBottom: 6 }}>
                {afterParty.location && <span>📍 {afterParty.location}</span>}
                {afterParty.start_time && <span>🕐 {afterParty.start_time}{afterParty.end_time ? `〜${afterParty.end_time}` : ''}</span>}
                {afterParty.fee > 0 && <span>¥{Number(afterParty.fee).toLocaleString()}</span>}
              </div>
              <div style={{ fontSize: 12, color: '#92400e' }}>
                出欠: 出席 <strong>{afterPartyAtts.filter(a => a.response === '出席').length}</strong> / 欠席 <strong>{afterPartyAtts.filter(a => a.response === '欠席').length}</strong>
              </div>
            </>
          )}
        </div>
      ) : canEditAttendance ? (
        showApForm ? (
          <div style={{ marginBottom: 16, padding: 16, background: 'var(--color-bg-sub)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12 }}>🍻 懇親会を追加</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label className="mtg-label">場所</label><input className="mtg-input" value={apForm.location} onChange={e => setApForm(f => ({ ...f, location: e.target.value }))} placeholder="例: 居酒屋XX" /></div>
              <div className="mtg-form-2col">
                <div><label className="mtg-label">開始時刻</label><TimeSelect value={apForm.start_time} onChange={v => setApForm(f => ({ ...f, start_time: v }))} /></div>
                <div><label className="mtg-label">終了時刻</label><TimeSelect value={apForm.end_time} onChange={v => setApForm(f => ({ ...f, end_time: v }))} /></div>
              </div>
              <div><label className="mtg-label">参加費</label><input className="mtg-input" type="number" min="0" placeholder="0 = 無料" value={apForm.fee} onChange={e => setApForm(f => ({ ...f, fee: e.target.value }))} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <Button variant="secondary" onClick={() => setShowApForm(false)}>キャンセル</Button>
                <Button variant="primary" disabled={saving} onClick={addAfterPartyMeeting}>{saving ? '追加中...' : '追加'}</Button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <Button variant="secondary" onClick={() => { setApForm({ location: '', start_time: meeting.end_time || '21:00', end_time: '23:00', fee: '' }); setShowApForm(true); }}>
              🍻 懇親会を追加
            </Button>
          </div>
        )
      ) : null}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === "attendance" && (() => {
        const responseOptions = ['出席', '欠席'];
        const respondedMembers = boardMembers.filter(m => attRecordMap[m.id || m._id]);
        const notRespondedMembers = boardMembers.filter(m => !attRecordMap[m.id || m._id]);
        const responseSummary = {};
        responseOptions.forEach(opt => { responseSummary[opt] = 0; });
        meetingAtts.forEach(a => {
          const resp = a.response || a.status;
          if (responseSummary[resp] !== undefined) responseSummary[resp]++;
        });
        const totalTarget = boardMembers.length;
        const responded = respondedMembers.length;
        const attend = responseSummary["出席"] || 0;
        const responseRate = totalTarget > 0 ? Math.round((responded / totalTarget) * 100) : 0;
        const attendRate = totalTarget > 0 ? Math.round((attend / totalTarget) * 100) : 0;

        return (
          <section className="card panel-card">
            <div className="card-body" style={{ padding: isMobile ? "14px" : "20px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: 16, flexWrap: "wrap", gap: 6 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>出欠管理</h3>
              </div>

              {/* Summary rates */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 2 }}>回答率</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>{responseRate}</span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>%</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>({responded}/{totalTarget})</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 2 }}>出席率</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--color-success)' }}>{attendRate}</span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>%</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>({attend}/{totalTarget})</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {responseOptions.map(opt => {
                  const count = responseSummary[opt] || 0;
                  const isAttend = opt === '出席';
                  const isAbsent = opt === '欠席';
                  return (
                    <div key={opt} style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: isAttend ? 'var(--color-success-light)' : isAbsent ? 'var(--color-danger-light)' : 'var(--color-bg-sub)', fontSize: 13 }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{opt}</span>
                      <span style={{ marginLeft: 6, fontWeight: 700, color: isAttend ? 'var(--color-success)' : isAbsent ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{count}</span>
                    </div>
                  );
                })}
                <div style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-sub)', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>未回答</span>
                  <span style={{ marginLeft: 6, fontWeight: 700, color: 'var(--color-text-tertiary)' }}>{notRespondedMembers.length}</span>
                </div>
              </div>

              {/* 出欠期限 — 出欠タブ内 */}
              {status !== '完了' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 0', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>出欠期限:</span>
                  {attendanceDeadline ? (
                    <>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {(() => { const d = new Date(attendanceDeadline); const dow = ['日','月','火','水','木','金','土'][d.getDay()]; return `${d.getMonth()+1}/${d.getDate()}（${dow}）`; })()}
                      </span>
                      <div style={{ maxWidth: 160 }}>
                        <DatePicker value={attendanceDeadline} onChange={(v) => {
                          setAttendanceDeadline(v);
                          base44.entities.Meeting.update(meetingId, { attendance_deadline: v || '' })
                            .then(() => showToastMsg('出欠期限を更新しました'))
                            .catch(() => showToastMsg('更新に失敗しました'));
                        }} placeholder="変更" />
                      </div>
                      <button type="button" onClick={() => {
                        setAttendanceDeadline('');
                        base44.entities.Meeting.update(meetingId, { attendance_deadline: '' })
                          .then(() => showToastMsg('出欠期限を解除しました'))
                          .catch(() => showToastMsg('更新に失敗しました'));
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-tertiary)', textDecoration: 'underline', padding: '4px' }}>
                        解除
                      </button>
                    </>
                  ) : (
                    <div style={{ maxWidth: 200 }}>
                      <DatePicker value={attendanceDeadline} onChange={(v) => {
                        setAttendanceDeadline(v);
                        base44.entities.Meeting.update(meetingId, { attendance_deadline: v || '' })
                          .then(() => showToastMsg('出欠期限を設定しました'))
                          .catch(() => showToastMsg('更新に失敗しました'));
                      }} placeholder="期限日を選択" />
                    </div>
                  )}
                </div>
              )}

              {/* Attendance closed toggle (公開 status only) */}
              {status === "公開" && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", marginBottom: 12,
                  background: meeting.attendance_closed ? "var(--color-warning-light, #fffbeb)" : "var(--color-bg-sub)",
                  borderRadius: "var(--radius-md)",
                  border: meeting.attendance_closed ? "1px solid var(--color-warning, #fde68a)" : "1px solid var(--color-border)",
                }}>
                  <span style={{ fontSize: 13, color: meeting.attendance_closed ? "var(--color-warning, #92400e)" : "var(--color-text-secondary)" }}>
                    {meeting.attendance_closed ? "出欠の受付は終了しています" : "出欠を受付中です"}
                  </span>
                  {meeting.attendance_closed ? (
                    <Button variant="ghost" size="sm" disabled={saving} onClick={async () => {
                      setSaving(true);
                      try {
                        await base44.entities.Meeting.update(meetingId, { attendance_closed: false });
                        setMeeting(prev => ({ ...prev, attendance_closed: false }));
                        showToastMsg("出欠の受付を再開しました");
                      } catch { showToastMsg("更新に失敗しました"); }
                      finally { setSaving(false); }
                    }}>受付を再開</Button>
                  ) : (
                    <Button variant="secondary" size="sm" disabled={saving} onClick={() => setConfirmModal({
                      title: "出欠の受付を終了しますか？",
                      message: "会員は出欠の回答・変更ができなくなります。",
                      confirmLabel: "受付終了",
                      onConfirm: async () => {
                        await base44.entities.Meeting.update(meetingId, { attendance_closed: true });
                        setMeeting(prev => ({ ...prev, attendance_closed: true }));
                        showToastMsg("出欠の受付を終了しました");
                        setConfirmModal(null);
                      },
                    })}>受付終了</Button>
                  )}
                </div>
              )}

              {/* Read-only notice */}
              {!canEditAttendance && (
                <div style={{ marginBottom: 12, padding: "8px 12px", background: "var(--color-warning-light)", borderRadius: 6, border: "1px solid var(--color-warning)", fontSize: 13, color: "var(--color-warning)" }}>
                  ※ 完了後のため出欠は変更できません
                </div>
              )}

              {boardMembers.length === 0 ? (
                <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "2rem 0", fontSize: 13 }}>
                  この年度の幹事会メンバーが見つかりません。組織図から幹事会の配属を確認してください。
                </p>
              ) : (
                <>
                  {/* Responded list */}
                  {respondedMembers.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)' }}>回答済み（{respondedMembers.length}名）</h3>
                      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        {respondedMembers.map((m, idx) => {
                          const mid = m.id || m._id;
                          const att = attRecordMap[mid];
                          const resp = att?.response || att?.status || '';
                          return (
                            <div key={mid} style={{
                              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                              alignItems: isMobile ? 'flex-start' : 'center',
                              gap: isMobile ? 6 : 10, padding: isMobile ? '10px 12px' : '10px 14px',
                              borderBottom: idx < respondedMembers.length - 1 ? '1px solid var(--color-border)' : 'none',
                            }}>
                              <span style={{ fontWeight: 500, fontSize: 13, flex: 1, minWidth: 80 }}>{fullName(m)}</span>
                              <select value={resp} onChange={e => {
                                if (e.target.value === '__cancel__') handleCancelMeetingResponse(mid);
                                else handleProxyMeetingResponse(mid, e.target.value);
                              }} disabled={saving || !canEditAttendance}
                                style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: '#fff', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 'auto' : 100 }}>
                                {responseOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                <option value="__cancel__" style={{ color: '#999' }}>-- 取消 --</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Not responded list */}
                  {notRespondedMembers.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-tertiary)' }}>未回答（{notRespondedMembers.length}名）</h3>
                      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        {notRespondedMembers.map((m, idx) => {
                          const mid = m.id || m._id;
                          return (
                            <div key={mid} style={{
                              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                              alignItems: isMobile ? 'flex-start' : 'center',
                              gap: isMobile ? 6 : 10, padding: isMobile ? '10px 12px' : '10px 14px',
                              borderBottom: idx < notRespondedMembers.length - 1 ? '1px solid var(--color-border)' : 'none',
                              background: 'var(--color-bg-sub)',
                            }}>
                              <span style={{ fontWeight: 500, fontSize: 13, flex: 1, minWidth: 80, color: 'var(--color-text-tertiary)' }}>{fullName(m)}</span>
                              <select value="" onChange={e => e.target.value && handleProxyMeetingResponse(mid, e.target.value)} disabled={saving || !canEditAttendance}
                                style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-tertiary)', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 'auto' : 100 }}>
                                <option value="">--</option>
                                {responseOptions.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Observer section */}
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid var(--color-border)", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>オブザーバー</span>
                      {canEditAttendance && (
                        <div style={{ width: isMobile ? "100%" : 220, marginTop: isMobile ? 4 : 0 }}>
                          <MemberSelector value="" onChange={(mid) => { if (mid) addObserver(mid); }}
                            members={observerCandidates} roleMap={memberRoleMap} placeholder="+ オブザーバーを追加..." />
                        </div>
                      )}
                    </div>
                    {observerIds.length === 0 ? (
                      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center", padding: "12px 0" }}>オブザーバーはいません</p>
                    ) : (
                      <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}>
                        {observerIds.map((oid, idx) => {
                          const m = memberMap[oid];
                          if (!m) return null;
                          return (
                            <div key={oid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: idx < observerIds.length - 1 ? "1px solid var(--color-bg-sub)" : "none" }}>
                              <MemberAvatar member={m} size={28} />
                              <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName(m)}</span>
                              {memberRoleMap[oid] && <span style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{memberRoleMap[oid]}</span>}
                              {canEditAttendance && (
                                <button type="button" onClick={() => removeObserver(oid)}
                                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)", fontSize: 16, padding: "0 4px", flexShrink: 0 }}>&times;</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Save observer changes */}
                  {canEditAttendance && (() => {
                    const initObs = Array.isArray(meeting.observer_ids) ? meeting.observer_ids : [];
                    const changed = JSON.stringify([...observerIds].sort()) !== JSON.stringify([...initObs].sort());
                    return changed ? (
                      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                        <Button variant="primary" disabled={saving} onClick={handleSave}>{saving ? "保存中..." : "オブザーバーを保存"}</Button>
                      </div>
                    ) : null;
                  })()}

                  {/* ── After Party Attendance ── */}
                  {afterParty && (() => {
                    const apRespondedMembers = boardMembers.filter(m => apAttRecordMap[m.id || m._id]);
                    const apNotRespondedMembers = boardMembers.filter(m => !apAttRecordMap[m.id || m._id]);
                    const apResponseOptions = ['出席', '欠席'];
                    const apAttend = afterPartyAtts.filter(a => (a.response || a.status) === '出席').length;
                    const apTotal = boardMembers.length;
                    const apResponseRate = apTotal > 0 ? Math.round((apRespondedMembers.length / apTotal) * 100) : 0;

                    return (
                      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>🍻 懇親会出欠</h3>
                        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                          回答率: <strong style={{ color: 'var(--color-text-primary)' }}>{apResponseRate}%</strong> ({apRespondedMembers.length}/{apTotal})
                          <span style={{ margin: '0 8px' }}>|</span>
                          参加: <strong style={{ color: 'var(--color-success)' }}>{apAttend}</strong>
                        </div>

                        {apRespondedMembers.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>回答済み（{apRespondedMembers.length}名）</h4>
                            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                              {apRespondedMembers.map((m, idx) => {
                                const mid = m.id || m._id;
                                const att = apAttRecordMap[mid];
                                const resp = att?.response || att?.status || '';
                                return (
                                  <div key={mid} style={{
                                    display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                                    alignItems: isMobile ? 'flex-start' : 'center',
                                    gap: isMobile ? 6 : 10, padding: isMobile ? '10px 12px' : '10px 14px',
                                    borderBottom: idx < apRespondedMembers.length - 1 ? '1px solid var(--color-border)' : 'none',
                                  }}>
                                    <span style={{ fontWeight: 500, fontSize: 13, flex: 1, minWidth: 80 }}>{fullName(m)}</span>
                                    <select value={resp} onChange={e => {
                                      if (e.target.value === '__cancel__') handleCancelApResponse(mid);
                                      else handleProxyApResponse(mid, e.target.value);
                                    }} disabled={saving || !canEditAttendance}
                                      style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: '#fff', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 'auto' : 100 }}>
                                      {apResponseOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                      <option value="__cancel__">-- 取消 --</option>
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {apNotRespondedMembers.length > 0 && (
                          <div>
                            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-tertiary)' }}>未回答（{apNotRespondedMembers.length}名）</h4>
                            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                              {apNotRespondedMembers.map((m, idx) => {
                                const mid = m.id || m._id;
                                return (
                                  <div key={mid} style={{
                                    display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                                    alignItems: isMobile ? 'flex-start' : 'center',
                                    gap: isMobile ? 6 : 10, padding: isMobile ? '10px 12px' : '10px 14px',
                                    borderBottom: idx < apNotRespondedMembers.length - 1 ? '1px solid var(--color-border)' : 'none',
                                    background: 'var(--color-bg-sub)',
                                  }}>
                                    <span style={{ fontWeight: 500, fontSize: 13, flex: 1, minWidth: 80, color: 'var(--color-text-tertiary)' }}>{fullName(m)}</span>
                                    <select value="" onChange={e => e.target.value && handleProxyApResponse(mid, e.target.value)} disabled={saving || !canEditAttendance}
                                      style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-tertiary)', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 'auto' : 100 }}>
                                      <option value="">--</option>
                                      {apResponseOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* AP Observer section */}
                        <div style={{ marginTop: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid var(--color-border)", flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>懇親会オブザーバー</span>
                            {canEditAttendance && (
                              <div style={{ width: isMobile ? "100%" : 220, marginTop: isMobile ? 4 : 0 }}>
                                <MemberSelector value="" onChange={(mid) => { if (mid) addApObserver(mid); }}
                                  members={apObserverCandidates} roleMap={memberRoleMap} placeholder="+ 追加..." />
                              </div>
                            )}
                          </div>
                          {apObserverIds.length === 0 ? (
                            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center", padding: "8px 0" }}>オブザーバーはいません</p>
                          ) : (
                            <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}>
                              {apObserverIds.map((oid, idx) => {
                                const m = memberMap[oid];
                                if (!m) return null;
                                return (
                                  <div key={oid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: idx < apObserverIds.length - 1 ? "1px solid var(--color-bg-sub)" : "none" }}>
                                    <MemberAvatar member={m} size={28} />
                                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName(m)}</span>
                                    {canEditAttendance && (
                                      <button type="button" onClick={() => removeApObserver(oid)}
                                        style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)", fontSize: 16, padding: "0 4px", flexShrink: 0 }}>&times;</button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {canEditAttendance && (() => {
                            const initApObs = Array.isArray(afterParty?.observer_ids) ? afterParty.observer_ids : [];
                            const changed = JSON.stringify([...apObserverIds].sort()) !== JSON.stringify([...initApObs].sort());
                            return changed ? (
                              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                                <Button variant="primary" disabled={saving} onClick={saveApObservers}>{saving ? "保存中..." : "懇親会オブザーバーを保存"}</Button>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </section>
        );
      })()}

      <style>{`
        .mtg-dropdown-item { border-bottom: 1px solid var(--color-border); }
        .mtg-dropdown-item:hover { background: var(--color-bg-sub); }
        .mtg-dropdown-item-add:hover { background: var(--color-accent-light); }
      `}</style>
    </section>
  );
}
