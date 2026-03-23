import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest, base44, invalidateReadCache } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DatePicker from "../../components/ui/DatePicker";
import { Button, PageHeader, Modal } from '../../components/ui';
import { fullName } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';
import YearPillNav from '../../components/ui/YearPillNav';

/* ── Helpers ── */
function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}
function formatCurrency(v) {
  const n = Number(v);
  return `¥${(Number.isFinite(n) ? n : 0).toLocaleString("ja-JP")}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_SETTINGS = {
  regular_annual_fee: 30000,
  associate_annual_fee: 10000,
  admission_fee: 10000,
  first_half_fee: 30000,
  second_half_fee: 15000,
};

const DUE_TYPE_BADGE = {
  "年会費":       { color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  "入会金":       { color: "var(--color-warning)", bg: "var(--color-warning-light)" },
  "後期入会会費": { color: "var(--color-success)", bg: "var(--color-success-light)" },
  "前期入会会費": { color: "var(--color-accent)", bg: "var(--color-accent-light)" },
};

const MEMBER_TYPE_BADGE = {
  "正会員":   { color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  "賛助会員": { color: "#0891b2", bg: "#ecfeff" },
};

/* ── Toast ── */
function Toast({ message, type = "success" }) {
  if (!message) return null;
  return (
    <div className={`nl2-toast${type === "error" ? " nl2-toast-error" : ""}`}>
      <span className="nl2-toast-icon">{type === "error" ? "\u2717" : "\u2713"}</span>
      {message}
    </div>
  );
}

/* ── Pill Tab Button ── */
function PillTab({ active, onClick, children, badge }) {
  return (
    <button
      type="button"
      className={`nl2-pill-tab${active ? " active" : ""}`}
      onClick={onClick}
    >
      {children}
      {badge !== undefined && badge !== null && (
        <span style={{
          marginLeft: 3,
          fontSize: "12px", fontWeight: "var(--font-weight-normal)",
          color: "inherit",
        }}>
          ({badge})
        </span>
      )}
    </button>
  );
}

/* ── Summary Card ── */
function SummaryCard({ icon, label, value, sub, color, progress }) {
  return (
    <div style={{
      flex: "1 1 0", minWidth: 150,
      display: "flex", flexDirection: "column", gap: 6,
      padding: "18px 20px",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--color-border)",
      background: "var(--color-bg)",
      borderTop: `3px solid ${color || "var(--color-accent)"}`,
    }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "var(--color-text-primary)", lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{sub}</div>}
      {progress !== undefined && (
        <div style={{ height: 6, borderRadius: 3, background: "var(--color-border)", overflow: "hidden", marginTop: 2 }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${Math.min(100, progress)}%`,
            background: color || "var(--color-accent)",
            transition: "width 0.5s ease",
          }} />
        </div>
      )}
    </div>
  );
}

/* ── Due Type Badge ── */
function DueTypeBadge({ type }) {
  const badge = DUE_TYPE_BADGE[type] || { color: "var(--color-text-secondary)", bg: "var(--color-border)" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px",
      borderRadius: 999, fontSize: 12, fontWeight: 600,
      color: badge.color, background: badge.bg, whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {type || "年会費"}
    </span>
  );
}

/* ── Member Type Badge ── */
function MemberTypeBadge({ type }) {
  const badge = MEMBER_TYPE_BADGE[type] || { color: "var(--color-text-secondary)", bg: "var(--color-border)" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px",
      borderRadius: 999, fontSize: 12, fontWeight: 600,
      color: badge.color, background: badge.bg, whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {type || "-"}
    </span>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status, onClick, disabled }) {
  const isPaid = status === "納入済";
  const isUnissued = status === "未発行";
  const bg = isPaid ? "var(--color-success-light)" : isUnissued ? "var(--color-bg-sub)" : "var(--color-danger-light)";
  const color = isPaid ? "var(--color-success)" : isUnissued ? "var(--color-text-secondary)" : "var(--color-danger)";
  const label = isPaid ? "\u2713 納入済" : isUnissued ? "\u25CB 未発行" : "\u25CF 未納";

  if (disabled) {
    return (
      <span
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "4px 12px", borderRadius: 999,
          border: "none",
          fontSize: 12, fontWeight: 600,
          background: bg, color, whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "4px 12px", borderRadius: 999,
        border: "none", cursor: "pointer",
        fontSize: 12, fontWeight: 600,
        background: bg, color, whiteSpace: "nowrap", flexShrink: 0,
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.transform = "scale(1.05)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
    >
      {label}
    </button>
  );
}

/* ── Payer Name Suggest ── */
function PayerSuggest({ memberId, allDues, value, onChange }) {
  const suggestions = useMemo(() => {
    if (!memberId) return [];
    const names = new Set();
    for (const d of allDues) {
      if (d.member_id === memberId && d.payer_name) names.add(d.payer_name);
    }
    return [...names];
  }, [memberId, allDues]);

  if (suggestions.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>過去の名義:</span>
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(s)}
          style={{
            padding: "2px 8px", borderRadius: 999, border: "1px solid var(--color-border)",
            background: value === s ? "var(--color-accent-light)" : "var(--color-bg)",
            fontSize: 12, cursor: "pointer", color: "var(--color-text-primary)",
            transition: "all 0.15s",
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/* ── Reconciliation Modal (消込モーダル) ── */
function ReconcileModal({ target, allDues, toggleDate, setToggleDate, togglePayerName, setTogglePayerName, toggleNotes, setToggleNotes, saving, onConfirm, onClose }) {
  const isPaid = target?.status === "納入済";

  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      title={isPaid ? "納入済を取り消す" : "消込処理"}
      width="480px"
      footer={<>
        <Button variant="secondary" onClick={onClose}>キャンセル</Button>
        <Button
          variant={isPaid ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={saving}
          style={{
            background: isPaid ? "var(--color-danger)" : "var(--color-success)",
            color: "#fff", border: "none",
          }}
        >
          {saving ? "処理中..." : isPaid ? "未納に戻す" : "納入済にする"}
        </Button>
      </>}
    >
      {target && (
        <div>
          {/* Member info */}
          <div style={{
            padding: 16, borderRadius: "var(--radius-md)", background: "var(--color-bg-sub)",
            marginBottom: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{target.member_name}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 8 }}>
              <DueTypeBadge type={target.due_type || "年会費"} />
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>{formatCurrency(target.amount)}</span>
            </div>
          </div>

          {isPaid ? (
            <div style={{
              padding: 16, borderRadius: "var(--radius-md)",
              background: "var(--color-danger-light)", border: "1px solid #fecaca",
              textAlign: "center",
            }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-danger)", fontWeight: 600 }}>
                この会費を「未納」に戻しますか？
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-danger)" }}>
                入金日・振込名義の情報はクリアされます
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ position: "relative", zIndex: 10 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
                  入金日
                </label>
                <DatePicker id="reconcile-date" value={toggleDate} onChange={setToggleDate} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
                  振込名義
                </label>
                <input
                  type="text" value={togglePayerName}
                  placeholder="例: 株式会社○○"
                  onChange={(e) => setTogglePayerName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", fontSize: 14 }}
                />
                <PayerSuggest memberId={target.member_id} allDues={allDues} value={togglePayerName} onChange={setTogglePayerName} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
                  備考 <span style={{ fontWeight: 400, color: "var(--color-text-secondary)" }}>(任意)</span>
                </label>
                <input
                  type="text" value={toggleNotes}
                  placeholder="備考があれば入力"
                  onChange={(e) => setToggleNotes(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", fontSize: 14 }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ── Member History Modal ── */
function MemberHistoryModal({ open, memberName, memberId, allDues, fyMap, currentFyId, onClose }) {
  const memberDues = (open && memberId) ? allDues
    .filter((d) => d.member_id === memberId)
    .sort((a, b) => {
      const ya = fyMap[a.fiscal_year_id]?.year || 0;
      const yb = fyMap[b.fiscal_year_id]?.year || 0;
      return yb - ya;
    }) : [];

  const totalUnpaid = memberDues.filter(d => d.status !== "納入済").length;

  return (
    <Modal
      isOpen={open && !!memberId}
      onClose={onClose}
      title={memberName || ""}
      width="680px"
      footer={<Button variant="secondary" onClick={onClose}>閉じる</Button>}
    >
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>全年度の会費履歴</p>
          {totalUnpaid > 0 && (
            <div style={{
              padding: "10px 16px", borderRadius: "var(--radius-md)",
              background: "var(--color-danger-light)", border: "1px solid #fecaca",
              marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
              fontSize: 13, color: "var(--color-danger)", fontWeight: 500,
            }}>
              <span style={{ fontSize: 16 }}>{"\u26A0\uFE0F"}</span>
              未納が{totalUnpaid}件あります
            </div>
          )}
          {memberDues.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>{"📄"}</div>
              <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>会費データがありません</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>年度</th>
                  <th>種類</th>
                  <th style={{ textAlign: "right" }}>金額</th>
                  <th style={{ textAlign: "center" }}>ステータス</th>
                  <th>入金日</th>
                  <th>振込名義</th>
                </tr>
              </thead>
              <tbody>
                {memberDues.map((d) => {
                  const fyInfo = fyMap[d.fiscal_year_id];
                  const label = fyInfo?.label || "-";
                  const isCurrent = d.fiscal_year_id === currentFyId;
                  const isUnpaid = d.status !== "納入済";
                  return (
                    <tr key={d.id} style={{
                      background: isUnpaid ? "var(--color-danger-light)" : undefined,
                    }}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{label}</span>
                        {isCurrent && (
                          <span style={{
                            marginLeft: 4, padding: "1px 6px", borderRadius: 999,
                            background: "var(--color-accent-light)", color: "var(--color-accent)",
                            fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                          }}>当年度</span>
                        )}
                      </td>
                      <td><DueTypeBadge type={d.due_type || "年会費"} /></td>
                      <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(d.amount)}</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: 999,
                          fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                          background: isUnpaid ? "var(--color-danger-light)" : "var(--color-success-light)",
                          color: isUnpaid ? "var(--color-danger)" : "var(--color-success)",
                        }}>
                          {isUnpaid ? "未納" : "\u2713 納入済"}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{displayValue(d.paid_date)}</td>
                      <td style={{ fontSize: 13 }}>{displayValue(d.payer_name)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
    </Modal>
  );
}

/* ── Settings Field ── */
function SettingsField({ id, label, description, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{label}</label>
      {description && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{description}</span>}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          id={id}
          type="number"
          min="0"
          step="1000"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)", fontSize: 14,
            fontVariantNumeric: "tabular-nums",
          }}
        />
        <span style={{ fontSize: 14, color: "var(--color-text-secondary)", fontWeight: 500, flexShrink: 0 }}>円</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════ */
/* ── Main Component                  ── */
/* ══════════════════════════════════════ */

export default function DuesManagement() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYearId = searchParams.get("fiscalYearId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");

  const [fiscalYears, setFiscalYears] = useState([]);
  const [allDuesRaw, setAllDuesRaw] = useState([]);
  const [allDueSettings, setAllDueSettings] = useState([]);
  const [dues, setDues] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [currentFiscalYearId, setCurrentFiscalYearId] = useState("");
  const [memberMap, setMemberMap] = useState({});

  const [settingsForm, setSettingsForm] = useState({ ...DEFAULT_SETTINGS });
  const [settingsId, setSettingsId] = useState(null);
  const [settingsFyId, setSettingsFyId] = useState("");

  // Tabs: "current" | "all-unpaid" | "settings"
  const [activeTab, setActiveTab] = useState("current");

  // Reconcile modal
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleDate, setToggleDate] = useState(todayStr());
  const [togglePayerName, setTogglePayerName] = useState("");
  const [toggleNotes, setToggleNotes] = useState("");

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueTypeFilter, setDueTypeFilter] = useState("all");
  const [memberTypeFilter, setMemberTypeFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [showMemberTypeDd, setShowMemberTypeDd] = useState(false);
  const [showOrgDd, setShowOrgDd] = useState(false);
  const memberTypeDdRef = useRef(null);
  const orgDdRef = useRef(null);

  // Organization data
  const [allOrgs, setAllOrgs] = useState([]);
  const [allAssigns, setAllAssigns] = useState([]);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Mobile filter toggle
  const [showFilters, setShowFilters] = useState(false);

  // Member history modal
  const [historyModal, setHistoryModal] = useState(null);

  // Confirm dialogs
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [confirmBulkIssue, setConfirmBulkIssue] = useState(false);
  // confirmRevert removed — unified in ReconcileModal

  // Batch reconcile modal (for batch paid date entry)
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchDate, setBatchDate] = useState(todayStr());

  // Batch bar ref for animation
  const batchBarRef = useRef(null);

  // Toast
  function showToast(msg, type = "success") {
    setToast(msg);
    setToastType(type);
  }
  useEffect(() => { try { base44.appLogs?.logUserInApp?.('A5-会費管理'); } catch (e) { /* analytics */ } }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function reloadData() {
    invalidateReadCache("Due");
    invalidateReadCache("DueSetting");
    loadData();
  }

  // Fiscal year map
  const fyMap = useMemo(() => {
    const m = {};
    for (const fy of fiscalYears) {
      m[fy.id] = {
        label: fy.year_label || (fy.year ? `${fy.year}年度` : fy.id),
        year: fy.year || 0,
        is_current: !!fy.is_current,
      };
    }
    return m;
  }, [fiscalYears]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [allFiscalYears, allDues, dueSettings, allMembers, orgs, assigns] = await Promise.all([
          base44.entities.FiscalYear.list("-year"),
          base44.entities.Due.list(),
          base44.entities.DueSetting.list(),
          base44.entities.Member.filter({ approval_status: "承認済" }),
          base44.entities.Organization.list().catch(() => []),
          base44.entities.OrgAssignment.list().catch(() => []),
        ]);

        setAllOrgs(orgs);
        setAllAssigns(assigns);

        setFiscalYears(allFiscalYears);
        setAllDueSettings(dueSettings);
        const currentFy = allFiscalYears.find((fy) => fy.is_current === true);
        const currentFyId = currentFy?.id || "";
        setCurrentFiscalYearId(currentFyId);
        const activeFyId = fiscalYearId || currentFyId;
        const selectedFy = allFiscalYears.find((fy) => fy.id === activeFyId) || null;
        setSelectedFiscalYear(selectedFy);

        // member map (only dues-eligible types)
        const DUES_ELIGIBLE_TYPES = ["正会員", "賛助会員"];
        const mMap = {};
        for (const m of allMembers) {
          if (!DUES_ELIGIBLE_TYPES.includes(m.member_type)) continue;
          mMap[m.id] = { name: fullName(m) || "", type: m.member_type || "", is_new: !!m.is_new };
        }
        setMemberMap(mMap);

        // Enrich all dues, skip orphaned records (member no longer exists)
        const enrichedAll = allDues
          .filter((d) => !d.member_id || mMap[d.member_id])
          .map((d) => ({
            ...d,
            member_name: d.member_name || mMap[d.member_id]?.name || "",
            member_type: d.member_type || mMap[d.member_id]?.type || "",
            is_new: d.is_new ?? mMap[d.member_id]?.is_new ?? false,
          }));
        setAllDuesRaw(enrichedAll);

        // Filter for selected FY and add virtual rows for members without dues
        const fyDues = enrichedAll.filter((d) => d.fiscal_year_id === activeFyId);
        const memberIdsWithDues = new Set(fyDues.map(d => d.member_id));
        const virtualDues = [];
        for (const [memberId, info] of Object.entries(mMap)) {
          if (!memberIdsWithDues.has(memberId)) {
            virtualDues.push({
              id: `virtual-${memberId}`,
              fiscal_year_id: activeFyId,
              member_id: memberId,
              member_name: info.name,
              member_type: info.type,
              is_new: info.is_new,
              amount: null,
              status: "未発行",
              due_type: "",
              paid_date: "",
              payer_name: "",
              notes: "",
              _virtual: true,
            });
          }
        }
        setDues([...fyDues, ...virtualDues]);

        // Settings for active FY
        loadSettingsForFy(activeFyId, dueSettings);

        setSelectedIds(new Set());
      } catch (err) {
        setError(err.message || "会費データの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [fiscalYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  // Outside-click handlers for custom dropdowns
  useEffect(() => {
    if (!showMemberTypeDd && !showOrgDd) return;
    const handler = (e) => {
      if (showMemberTypeDd && memberTypeDdRef.current && !memberTypeDdRef.current.contains(e.target)) setShowMemberTypeDd(false);
      if (showOrgDd && orgDdRef.current && !orgDdRef.current.contains(e.target)) setShowOrgDd(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMemberTypeDd, showOrgDd]);

  function loadSettingsForFy(fyId, settings) {
    const list = settings || allDueSettings;
    const fySettings = list.filter((s) => s.fiscal_year_id === fyId);
    setSettingsFyId(fyId);
    if (fySettings.length > 0) {
      const first = fySettings[0];
      setSettingsId(first.id || null);
      setSettingsForm({
        regular_annual_fee: first.regular_annual_fee ?? DEFAULT_SETTINGS.regular_annual_fee,
        associate_annual_fee: first.associate_annual_fee ?? DEFAULT_SETTINGS.associate_annual_fee,
        admission_fee: first.admission_fee ?? DEFAULT_SETTINGS.admission_fee,
        first_half_fee: first.first_half_fee ?? DEFAULT_SETTINGS.first_half_fee,
        second_half_fee: first.second_half_fee ?? DEFAULT_SETTINGS.second_half_fee,
      });
    } else {
      setSettingsId(null);
      setSettingsForm({ ...DEFAULT_SETTINGS });
    }
  }

  const activeFiscalYearId = selectedFiscalYear?.id || currentFiscalYearId || fiscalYearId;

  /* ── Computed: summary ── */
  const computedSummary = useMemo(() => {
    let total = 0, paidCount = 0, unpaidCount = 0, unissuedCount = 0, paidAmount = 0, unpaidAmount = 0;
    for (const d of dues) {
      total++;
      if (d.status === "未発行" || d._virtual) { unissuedCount++; continue; }
      const amt = Number(d.amount) || 0;
      if (d.status === "納入済") { paidCount++; paidAmount += amt; }
      else { unpaidCount++; unpaidAmount += amt; }
    }
    return { total, paidCount, unpaidCount, unissuedCount, paidAmount, unpaidAmount };
  }, [dues]);

  const issuedCount = computedSummary.paidCount + computedSummary.unpaidCount;
  const paidRate = issuedCount > 0
    ? Math.round((computedSummary.paidCount / issuedCount) * 100)
    : 0;

  /* ── New member IDs ── */
  const newMemberIds = useMemo(() => {
    const ids = new Set();
    for (const [id, info] of Object.entries(memberMap)) {
      if (info.is_new) ids.add(id);
    }
    return ids;
  }, [memberMap]);

  /* ── All unpaid ── */
  const allUnpaid = useMemo(() => {
    return allDuesRaw
      .filter((d) => d.status !== "納入済")
      .sort((a, b) => {
        const ya = fyMap[a.fiscal_year_id]?.year || 0;
        const yb = fyMap[b.fiscal_year_id]?.year || 0;
        if (yb !== ya) return yb - ya;
        return (a.member_name || "").localeCompare(b.member_name || "", "ja");
      });
  }, [allDuesRaw, fyMap]);

  const allUnpaidSummary = useMemo(() => {
    let totalCount = 0, totalAmount = 0, priorCount = 0, priorAmount = 0;
    for (const d of allUnpaid) {
      const amt = Number(d.amount) || 0;
      totalCount++; totalAmount += amt;
      if (d.fiscal_year_id !== currentFiscalYearId) { priorCount++; priorAmount += amt; }
    }
    return { totalCount, totalAmount, priorCount, priorAmount };
  }, [allUnpaid, currentFiscalYearId]);

  const unpaidByYear = useMemo(() => {
    const groups = {};
    for (const d of allUnpaid) {
      const fyId = d.fiscal_year_id;
      if (!groups[fyId]) groups[fyId] = [];
      groups[fyId].push(d);
    }
    return Object.entries(groups).sort((a, b) => {
      const ya = fyMap[a[0]]?.year || 0;
      const yb = fyMap[b[0]]?.year || 0;
      return yb - ya;
    });
  }, [allUnpaid, fyMap]);

  /* ── Prior-year warnings ── */
  const priorUnpaidByMember = useMemo(() => {
    const map = {};
    for (const d of allDuesRaw) {
      if (d.status !== "納入済" && d.fiscal_year_id !== activeFiscalYearId) {
        if (newMemberIds.has(d.member_id)) continue;
        map[d.member_id] = (map[d.member_id] || 0) + 1;
      }
    }
    return map;
  }, [allDuesRaw, activeFiscalYearId, newMemberIds]);

  /* ── Organizations for filter dropdown ── */
  const fyOrgs = useMemo(() => {
    return allOrgs.filter(o => o.fiscal_year_id === activeFiscalYearId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [allOrgs, activeFiscalYearId]);

  /* ── Filtered dues (current tab) ── */
  const filteredDues = useMemo(() => {
    let list = dues;
    // member type filter
    if (memberTypeFilter !== "all") list = list.filter(d => d.member_type === memberTypeFilter);
    // org filter
    if (orgFilter !== "all") {
      const orgMemberIds = new Set(
        allAssigns.filter(a => a.organization_id === orgFilter && a.fiscal_year_id === activeFiscalYearId).map(a => a.member_id)
      );
      list = list.filter(d => orgMemberIds.has(d.member_id));
    }
    // status filter
    if (statusFilter === "unpaid") list = list.filter(d => d.status === "未納");
    else if (statusFilter === "paid") list = list.filter(d => d.status === "納入済");
    else if (statusFilter === "unissued") list = list.filter(d => d.status === "未発行");
    // due type filter
    if (dueTypeFilter !== "all") list = list.filter(d => (d.due_type || "年会費") === dueTypeFilter);
    // search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(d => {
        const mn = (d.member_name || "").toLowerCase();
        const pn = (d.payer_name || "").toLowerCase();
        return mn.includes(q) || pn.includes(q);
      });
    }
    return list;
  }, [dues, memberTypeFilter, orgFilter, allAssigns, activeFiscalYearId, statusFilter, dueTypeFilter, searchQuery]);

  // Unique due types in current year
  const dueTypes = useMemo(() => {
    const types = new Set();
    for (const d of dues) types.add(d.due_type || "年会費");
    return [...types];
  }, [dues]);

  /* ── Handlers ── */
  function handleFiscalYearChange(fyId) {
    setMemberTypeFilter("all");
    setOrgFilter("all");
    if (fyId) setSearchParams({ fiscalYearId: fyId });
    else setSearchParams({});
  }

  function openReconcileModal(due) {
    setToggleTarget(due);
    setToggleDate(due.paid_date || todayStr());
    setTogglePayerName(due.payer_name || "");
    setToggleNotes(due.notes || "");
  }

  async function handleToggleStatus() {
    if (!toggleTarget) return;
    const isPaid = toggleTarget.status === "納入済";
    const newStatus = isPaid ? "未納" : "納入済";
    setSaving(true);
    try {
      await apiRequest("save-due", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: toggleTarget.id,
          status: newStatus,
          paid_date: newStatus === "納入済" ? toggleDate : "",
          payer_name: newStatus === "納入済" ? togglePayerName : "",
          notes: toggleNotes,
        }),
      });
      showToast(`${toggleTarget.member_name}の${toggleTarget.due_type || "会費"}を${newStatus}にしました`);
      setToggleTarget(null);
      reloadData();
    } catch (err) {
      showToast(err.message || "更新に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }

  async function executeBatchPaid() {
    setShowBatchModal(false);
    setConfirmBatch(false);
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const paidDate = batchDate || todayStr();
      const promises = Array.from(selectedIds).map((id) => {
        const due = dues.find((d) => d.id === id) || allUnpaid.find((d) => d.id === id);
        return apiRequest("save-due", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "納入済", paid_date: paidDate, notes: due?.notes || "" }),
        });
      });
      await Promise.all(promises);
      showToast(`${selectedIds.size}件を納入済にしました`);
      setSelectedIds(new Set());
      reloadData();
    } catch (err) {
      showToast(err.message || "一括更新に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest("save-due-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiscal_year_id: settingsFyId,
          id: settingsId || undefined,
          regular_annual_fee: Number(settingsForm.regular_annual_fee) || 0,
          associate_annual_fee: Number(settingsForm.associate_annual_fee) || 0,
          admission_fee: Number(settingsForm.admission_fee) || 0,
          first_half_fee: Number(settingsForm.first_half_fee) || 0,
          second_half_fee: Number(settingsForm.second_half_fee) || 0,
        }),
      });
      showToast("会費設定を保存しました");
      reloadData();
    } catch (err) {
      showToast(err.message || "会費設定の保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }

  function updateSettings(key, value) {
    setSettingsForm((prev) => ({ ...prev, [key]: value }));
  }

  // Selection mode is derived: true when any checkbox is checked
  const selectionMode = selectedIds.size > 0;

  function toggleSelectAll(checked, items) {
    if (checked) {
      setSelectedIds(new Set(items.filter(d => d.status !== "納入済").map(d => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function toggleSelectOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleRowClick(due, e) {
    // In selection mode: toggle checkbox
    if (selectionMode) {
      if (due.status === "納入済") return; // can't select paid items
      toggleSelectOne(due.id);
      return;
    }
    // Normal mode: open reconcile modal for any row
    openReconcileModal(due);
  }

  function handleCheckboxClick(due, e) {
    e.stopPropagation();
    toggleSelectOne(due.id);
  }

  // Past FY settings for "settings" tab history
  const settingsHistory = useMemo(() => {
    return allDueSettings
      .filter(s => s.fiscal_year_id !== settingsFyId)
      .sort((a, b) => {
        const ya = fyMap[a.fiscal_year_id]?.year || 0;
        const yb = fyMap[b.fiscal_year_id]?.year || 0;
        return yb - ya;
      });
  }, [allDueSettings, settingsFyId, fyMap]);

  // Check if prior year settings exist for "copy" feature
  const priorYearSettings = useMemo(() => {
    if (!settingsFyId) return null;
    const currentYear = fyMap[settingsFyId]?.year || 0;
    const priorFy = fiscalYears.find(fy => fy.year === currentYear - 1);
    if (!priorFy) return null;
    const s = allDueSettings.find(ds => ds.fiscal_year_id === priorFy.id);
    return s || null;
  }, [settingsFyId, fyMap, fiscalYears, allDueSettings]);

  function copyPriorSettings() {
    if (!priorYearSettings) return;
    setSettingsForm({
      regular_annual_fee: priorYearSettings.regular_annual_fee ?? DEFAULT_SETTINGS.regular_annual_fee,
      associate_annual_fee: priorYearSettings.associate_annual_fee ?? DEFAULT_SETTINGS.associate_annual_fee,
      admission_fee: priorYearSettings.admission_fee ?? DEFAULT_SETTINGS.admission_fee,
      first_half_fee: priorYearSettings.first_half_fee ?? DEFAULT_SETTINGS.first_half_fee,
      second_half_fee: priorYearSettings.second_half_fee ?? DEFAULT_SETTINGS.second_half_fee,
    });
  }

  async function executeBulkIssue() {
    setConfirmBulkIssue(false);
    if (!activeFiscalYearId) return;
    setSaving(true);
    try {
      const result = await apiRequest("bulk-generate-dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_year_id: activeFiscalYearId }),
      });
      if (result.generated_count > 0) {
        showToast(`${result.generated_count}件の会費を発行しました`);
      } else {
        showToast("発行対象の会員はいませんでした（全員発行済み）");
      }
      reloadData();
    } catch (err) {
      showToast(err.message || "会費一括発行に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ── Render ── */
  return (
    <section className="admin-shell">
      {/* ── Page Header ── */}
      {isMobile ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36 }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: 18, whiteSpace: 'nowrap', flex: 'none' }}>会費管理</h1>
            <div style={{ flex: 1 }} />
            {fiscalYears.length > 0 && (
              <YearPillNav
                fiscalYears={fiscalYears}
                activeFyId={activeFiscalYearId}
                currentFyId={currentFiscalYearId}
                onChange={handleFiscalYearChange}
              />
            )}
            <button type="button" onClick={() => setShowFilters(v => !v)} style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: showFilters ? 'var(--color-accent-light)' : 'var(--color-bg)', cursor: 'pointer',
              color: showFilters ? 'var(--color-accent)' : 'var(--color-text-secondary)', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <button type="button" onClick={() => setActiveTab('settings')} style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: activeTab === 'settings' ? 'var(--color-accent-light)' : 'var(--color-bg)', cursor: 'pointer',
              color: activeTab === 'settings' ? 'var(--color-accent)' : 'var(--color-text-secondary)', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>
        </div>
      ) : (
        <PageHeader
          title="会費管理"
          subtitle="年度別の会費管理・消込・未納確認"
          actions={computedSummary.unissuedCount > 0 ? (
            <Button
              variant="primary"
              onClick={() => setConfirmBulkIssue(true)}
              disabled={saving}
            >
              会費一括発行
            </Button>
          ) : null}
        />
      )}

      {/* Toast */}
      <Toast message={toast} type={toastType} />

      {/* Reconcile modal */}
      <ReconcileModal
        target={toggleTarget}
        allDues={allDuesRaw}
        toggleDate={toggleDate}
        setToggleDate={setToggleDate}
        togglePayerName={togglePayerName}
        setTogglePayerName={setTogglePayerName}
        toggleNotes={toggleNotes}
        setToggleNotes={setToggleNotes}
        saving={saving}
        onConfirm={handleToggleStatus}
        onClose={() => setToggleTarget(null)}
      />

      {/* Batch reconcile modal (date input for batch operations) */}
      <Modal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="一括消込"
        width="400px"
        footer={<>
          <Button variant="secondary" onClick={() => setShowBatchModal(false)}>キャンセル</Button>
          <Button
            variant="primary"
            onClick={executeBatchPaid}
            disabled={saving}
            style={{ background: "var(--color-success)", color: "#fff", border: "none" }}
          >
            {saving ? "処理中..." : "一括納入済にする"}
          </Button>
        </>}
      >
        <div style={{
          padding: 16, borderRadius: "var(--radius-md)", background: "var(--color-bg-sub)",
          marginBottom: 20, textAlign: "center",
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-accent)" }}>{selectedIds.size}件</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>を納入済にします</div>
        </div>
        <div style={{ position: "relative", zIndex: 10 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
            入金日（全件共通）
          </label>
          <DatePicker id="batch-date" value={batchDate} onChange={setBatchDate} />
        </div>
      </Modal>

      {/* Member history modal */}
      <MemberHistoryModal
        open={!!historyModal}
        memberName={historyModal?.memberName || ""}
        memberId={historyModal?.memberId || ""}
        allDues={allDuesRaw}
        fyMap={fyMap}
        currentFyId={currentFiscalYearId}
        onClose={() => setHistoryModal(null)}
      />

      <ConfirmDialog
        open={confirmBulkIssue}
        title="会費一括発行"
        message={`会費データがない正会員・賛助会員 ${computedSummary.unissuedCount}名に当年度の会費を一括発行しますか？\n※ 既に発行済みの会員はスキップされます`}
        confirmLabel="発行する"
        onConfirm={executeBulkIssue}
        onCancel={() => setConfirmBulkIssue(false)}
      />

      {error && <p className="message error" aria-live="polite" style={{ marginBottom: 12 }}>{error}</p>}

      {/* ── Tab Bar ── */}
      {isMobile ? (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: 'center' }}>
          <button type="button" className={`nl2-pill-tab${activeTab === 'current' ? ' active' : ''}`}
            onClick={() => { setActiveTab('current'); setSelectedIds(new Set()); }}>
            すべて
          </button>
          <button type="button" className={`nl2-pill-tab${activeTab === 'all-unpaid' ? ' active' : ''}`}
            onClick={() => { setActiveTab('all-unpaid'); setSelectedIds(new Set()); }}>
            未納一覧 <span style={{ fontSize: 12, fontWeight: 'var(--font-weight-normal)' }}>({allUnpaidSummary.totalCount})</span>
          </button>
          {computedSummary.unissuedCount > 0 && activeTab !== 'settings' && (
            <Button variant="primary" size="sm" onClick={() => setConfirmBulkIssue(true)} disabled={saving}
              style={{ whiteSpace: 'nowrap', marginLeft: 'auto' }}>
              一括発行
            </Button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          <PillTab active={activeTab === "current"} onClick={() => { setActiveTab("current"); setSelectedIds(new Set()); }}>
            すべて
          </PillTab>
          <PillTab
            active={activeTab === "all-unpaid"}
            onClick={() => { setActiveTab("all-unpaid"); setSelectedIds(new Set()); }}
            badge={allUnpaidSummary.totalCount > 0 ? allUnpaidSummary.totalCount : null}
          >
            全年度未納一覧
          </PillTab>
          <PillTab active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); setSelectedIds(new Set()); }}>
            会費設定
          </PillTab>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── Tab 1: 当年度                    ── */}
      {/* ══════════════════════════════════════ */}
      {activeTab === "current" && (
        <>
          {/* PC: Year pill nav (mobile is in header row) */}
          {!isMobile && fiscalYears.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <YearPillNav
                fiscalYears={fiscalYears}
                activeFyId={activeFiscalYearId}
                currentFyId={currentFiscalYearId}
                onChange={handleFiscalYearChange}
              />
            </div>
          )}

          {/* Summary cards */}
          {isMobile ? (
            <div className="stat-chip-bar" style={{ marginBottom: 8 }}>
              <div className="stat-chip">
                <span className="stat-chip-label">全体</span>
                <span className="stat-chip-value">{computedSummary.total}名</span>
              </div>
              <div className="stat-chip">
                <span className="stat-chip-label">納入済</span>
                <span className="stat-chip-value" style={{ color: "var(--color-success)" }}>{computedSummary.paidCount}名</span>
              </div>
              <div className="stat-chip">
                <span className="stat-chip-label">未納</span>
                <span className="stat-chip-value" style={{ color: "var(--color-danger)" }}>{computedSummary.unpaidCount}名</span>
              </div>
              <div className="stat-chip">
                <span className="stat-chip-label">未発行</span>
                <span className="stat-chip-value" style={{ color: "var(--color-text-secondary)" }}>{computedSummary.unissuedCount}名</span>
              </div>
              <div className="stat-chip">
                <span className="stat-chip-label">納入率</span>
                <span className="stat-chip-value">{paidRate}%</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <SummaryCard
                icon={"📊"}
                label="全体"
                value={`${computedSummary.total}名`}
                color="var(--color-accent)"
              />
              <SummaryCard
                icon={"\u2705"}
                label="納入済"
                value={`${computedSummary.paidCount}名`}
                sub={formatCurrency(computedSummary.paidAmount)}
                color="var(--color-success)"
              />
              <SummaryCard
                icon={"\u26A0\uFE0F"}
                label="未納"
                value={`${computedSummary.unpaidCount}名`}
                sub={formatCurrency(computedSummary.unpaidAmount)}
                color="var(--color-danger)"
              />
              <SummaryCard
                icon={"\u25CB"}
                label="未発行"
                value={`${computedSummary.unissuedCount}名`}
                color="var(--color-text-secondary)"
              />
              <SummaryCard
                icon={"📈"}
                label="納入率"
                value={`${paidRate}%`}
                color="var(--color-accent)"
                progress={paidRate}
              />
            </div>
          )}

          {/* Mobile filter panel (collapsible) */}
          {isMobile && showFilters && (
            <div style={{
              padding: '8px 16px', marginBottom: 8,
              borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-sub)',
            }}>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }}>
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input type="text" placeholder={"\u6C0F\u540D\u30FB\u632F\u8FBC\u540D\u7FA9\u3067\u691C\u7D22"} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: 2 }}>ステータス</span>
                {[{ key: 'all', label: 'すべて' }, { key: 'unpaid', label: '未納' }, { key: 'paid', label: '納入済' }, { key: 'unissued', label: '未発行' }].map(opt => (
                  <button key={opt.key} type="button" className={`nl2-pill-tab${statusFilter === opt.key ? ' active' : ''}`}
                    onClick={() => setStatusFilter(opt.key)}>{opt.label}</button>
                ))}
              </div>
              {dueTypes.length > 1 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: 2 }}>種類</span>
                  <button type="button" className={`nl2-pill-tab${dueTypeFilter === 'all' ? ' active' : ''}`} onClick={() => setDueTypeFilter('all')}>すべて</button>
                  {dueTypes.map(t => (
                    <button key={t} type="button" className={`nl2-pill-tab${dueTypeFilter === t ? ' active' : ''}`} onClick={() => setDueTypeFilter(t)}>{t}</button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <div ref={memberTypeDdRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>種別</span>
                  <button type="button" onClick={() => setShowMemberTypeDd(v => !v)} style={{ padding: '5px 14px', borderRadius: 999, border: memberTypeFilter !== 'all' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)', background: memberTypeFilter !== 'all' ? 'var(--color-accent)' : 'var(--color-bg)', color: memberTypeFilter !== 'all' ? '#fff' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                    {memberTypeFilter === 'all' ? 'すべて' : memberTypeFilter}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showMemberTypeDd ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {showMemberTypeDd && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 140, animation: 'yearDropIn 0.12s ease' }}>
                      {[{ v: 'all', l: 'すべて' }, { v: '正会員', l: '正会員' }, { v: '賛助会員', l: '賛助会員' }].map(o => {
                        const act = memberTypeFilter === o.v;
                        return <button key={o.v} type="button" onClick={() => { setMemberTypeFilter(o.v); setShowMemberTypeDd(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', border: 'none', background: act ? 'var(--color-accent-light)' : 'transparent', color: act ? 'var(--color-accent)' : 'var(--color-text-primary)', fontSize: 12, fontWeight: act ? 600 : 400, textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={e => { if (!act) e.currentTarget.style.background = 'var(--color-bg-sub)'; }} onMouseLeave={e => { e.currentTarget.style.background = act ? 'var(--color-accent-light)' : 'transparent'; }}><span style={{ flex: 1 }}>{o.l}</span>{act ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span style={{ width: 14 }} />}</button>;
                      })}
                    </div>
                  )}
                </div>
                <span style={{ width: 1, height: 18, background: 'var(--color-border)', flexShrink: 0 }} />
                <div ref={orgDdRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>所属</span>
                  <button type="button" onClick={() => setShowOrgDd(v => !v)} style={{ padding: '5px 14px', borderRadius: 999, border: orgFilter !== 'all' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)', background: orgFilter !== 'all' ? 'var(--color-accent)' : 'var(--color-bg)', color: orgFilter !== 'all' ? '#fff' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                    {orgFilter === 'all' ? 'すべて' : (fyOrgs.find(o => o.id === orgFilter)?.org_name || '選択中')}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showOrgDd ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {showOrgDd && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 240, maxHeight: 240, overflowY: 'auto', animation: 'yearDropIn 0.12s ease' }}>
                      {[{ v: 'all', l: 'すべて' }, ...fyOrgs.map(o => ({ v: o.id, l: o.org_name }))].map(o => {
                        const act = orgFilter === o.v;
                        return <button key={o.v} type="button" onClick={() => { setOrgFilter(o.v); setShowOrgDd(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', border: 'none', background: act ? 'var(--color-accent-light)' : 'transparent', color: act ? 'var(--color-accent)' : 'var(--color-text-primary)', fontSize: 12, fontWeight: act ? 600 : 400, textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={e => { if (!act) e.currentTarget.style.background = 'var(--color-bg-sub)'; }} onMouseLeave={e => { e.currentTarget.style.background = act ? 'var(--color-accent-light)' : 'transparent'; }}><span style={{ flex: 1 }}>{o.l}</span>{act ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span style={{ width: 14 }} />}</button>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar + Data */}
          <section className={isMobile ? "" : "card panel-card single-panel"}>
            <div className={isMobile ? "" : "card-body stack"}>
              {/* Desktop: Row 1 = Search, Row 2 = filters */}
              {!isMobile && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Row 1: Search */}
                <div style={{ position: "relative" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)" }}>
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input type="text" placeholder="氏名・振込名義で検索" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", fontSize: 13 }} />
                </div>

                {/* Row 2: All filters in one line */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Status pills */}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginRight: 4 }}>ステータス</span>
                  {[{ key: "all", label: "すべて" }, { key: "unpaid", label: "未納" }, { key: "paid", label: "納入済" }, { key: "unissued", label: "未発行" }].map(opt => (
                    <button key={opt.key} type="button" className={`nl2-pill-tab${statusFilter === opt.key ? " active" : ""}`} onClick={() => setStatusFilter(opt.key)}>{opt.label}</button>
                  ))}

                  {/* Due type pills */}
                  {dueTypes.length > 1 && (
                    <>
                      <span style={{ width: 1, height: 18, background: "var(--color-border)", margin: "0 6px", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginRight: 4 }}>種類</span>
                      <button type="button" className={`nl2-pill-tab${dueTypeFilter === "all" ? " active" : ""}`} onClick={() => setDueTypeFilter("all")}>すべて</button>
                      {dueTypes.map(t => (
                        <button key={t} type="button" className={`nl2-pill-tab${dueTypeFilter === t ? " active" : ""}`} onClick={() => setDueTypeFilter(t)}>{t}</button>
                      ))}
                    </>
                  )}

                  <span style={{ width: 1, height: 18, background: "var(--color-border)", margin: "0 6px", flexShrink: 0 }} />

                  {/* Member type dropdown */}
                  <div ref={memberTypeDdRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginRight: 4 }}>種別</span>
                    <button type="button" onClick={() => setShowMemberTypeDd(v => !v)} style={{ padding: "5px 14px", borderRadius: 999, border: memberTypeFilter !== "all" ? "1px solid var(--color-accent)" : "1px solid var(--color-border)", background: memberTypeFilter !== "all" ? "var(--color-accent)" : "var(--color-bg)", color: memberTypeFilter !== "all" ? "#fff" : "var(--color-text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", transition: "all 0.15s" }}>
                      {memberTypeFilter === "all" ? "すべて" : memberTypeFilter}
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showMemberTypeDd ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    {showMemberTypeDd && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100, background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 140, animation: "yearDropIn 0.12s ease" }}>
                        {[{ v: "all", l: "すべて" }, { v: "正会員", l: "正会員" }, { v: "賛助会員", l: "賛助会員" }].map(o => {
                          const act = memberTypeFilter === o.v;
                          return <button key={o.v} type="button" onClick={() => { setMemberTypeFilter(o.v); setShowMemberTypeDd(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: act ? "var(--color-accent-light)" : "transparent", color: act ? "var(--color-accent)" : "var(--color-text-primary)", fontSize: 12, fontWeight: act ? 600 : 400, textAlign: "left", cursor: "pointer", transition: "background 0.1s" }} onMouseEnter={e => { if (!act) e.currentTarget.style.background = "var(--color-bg-sub)"; }} onMouseLeave={e => { e.currentTarget.style.background = act ? "var(--color-accent-light)" : "transparent"; }}><span style={{ flex: 1 }}>{o.l}</span>{act ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span style={{ width: 14 }} />}</button>;
                        })}
                      </div>
                    )}
                  </div>

                  <span style={{ width: 1, height: 18, background: "var(--color-border)", margin: "0 6px", flexShrink: 0 }} />

                  {/* Organization dropdown */}
                  <div ref={orgDdRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginRight: 4 }}>所属</span>
                    <button type="button" onClick={() => setShowOrgDd(v => !v)} style={{ padding: "5px 14px", borderRadius: 999, border: orgFilter !== "all" ? "1px solid var(--color-accent)" : "1px solid var(--color-border)", background: orgFilter !== "all" ? "var(--color-accent)" : "var(--color-bg)", color: orgFilter !== "all" ? "#fff" : "var(--color-text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", transition: "all 0.15s" }}>
                      {orgFilter === "all" ? "すべて" : (fyOrgs.find(o => o.id === orgFilter)?.org_name || "選択中")}
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showOrgDd ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    {showOrgDd && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100, background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 240, maxHeight: 240, overflowY: "auto", animation: "yearDropIn 0.12s ease" }}>
                        {[{ v: "all", l: "すべて" }, ...fyOrgs.map(o => ({ v: o.id, l: o.org_name }))].map(o => {
                          const act = orgFilter === o.v;
                          return <button key={o.v} type="button" onClick={() => { setOrgFilter(o.v); setShowOrgDd(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: act ? "var(--color-accent-light)" : "transparent", color: act ? "var(--color-accent)" : "var(--color-text-primary)", fontSize: 12, fontWeight: act ? 600 : 400, textAlign: "left", cursor: "pointer", transition: "background 0.1s" }} onMouseEnter={e => { if (!act) e.currentTarget.style.background = "var(--color-bg-sub)"; }} onMouseLeave={e => { e.currentTarget.style.background = act ? "var(--color-accent-light)" : "transparent"; }}><span style={{ flex: 1 }}>{o.l}</span>{act ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span style={{ width: 14 }} />}</button>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* Table / Card List */}
              {loading ? (
                <LoadingSpinner />
              ) : filteredDues.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>{"💰"}</div>
                  <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {dues.length === 0 ? "会費データがありません" : "条件に一致するデータがありません"}
                  </p>
                  {dues.length === 0 && (
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>
                      会費設定を行い、会費を生成してください
                    </p>
                  )}
                </div>
              ) : isMobile ? (
                /* Mobile list — cloned from Documents.jsx structure */
                <div style={{ borderTop: '1px solid var(--color-border)' }}>
                  {filteredDues.map((due, idx) => {
                    const isVirtual = !!due._virtual;
                    const isSelected = selectedIds.has(due.id);
                    const isUnpaid = due.status !== "納入済" && !isVirtual;
                    const priorCount = priorUnpaidByMember[due.member_id] || 0;
                    const hasPriorWarning = !isVirtual && priorCount > 0;
                    return (
                      <div
                        key={due.id}
                        onClick={() => { if (!isVirtual) handleRowClick(due); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '11px 12px 11px 16px',
                          borderBottom: idx < filteredDues.length - 1 ? '1px solid var(--color-border)' : 'none',
                          cursor: isVirtual ? 'default' : 'pointer',
                          background: isSelected ? 'var(--color-accent-light)' : hasPriorWarning ? 'var(--color-warning-light)' : undefined,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isUnpaid ? (
                              <input type="checkbox" checked={isSelected}
                                onClick={(e) => e.stopPropagation()} onChange={(e) => handleCheckboxClick(due, e)}
                                style={{ flexShrink: 0, width: 16, height: 16, accentColor: 'var(--color-accent)' }} />
                            ) : (
                              <span style={{ width: 16, flexShrink: 0 }} />
                            )}
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); setHistoryModal({ memberId: due.member_id, memberName: due.member_name }); }}
                              style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-primary)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                              {displayValue(due.member_name)}
                            </button>
                            {due.is_new && <span style={{ padding: '0 5px', borderRadius: 999, background: 'var(--color-accent-light)', color: 'var(--color-accent)', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, lineHeight: '15px' }}>新入</span>}
                            {hasPriorWarning && <span style={{ fontSize: 10, flexShrink: 0, color: 'var(--color-warning)' }}>⚠</span>}
                          </div>
                          {!isVirtual && (
                            <div style={{ fontSize: 12, lineHeight: 1.2, color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'baseline', paddingLeft: 22 }}>
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {due.member_type} · {due.due_type || "年会費"}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', flexShrink: 0, marginLeft: 12 }}>
                                {formatCurrency(due.amount)}
                              </span>
                            </div>
                          )}
                        </div>
                        <StatusBadge status={due.status} disabled={isVirtual} onClick={isVirtual ? undefined : (e) => { e.stopPropagation(); openReconcileModal(due); }} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36, textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.size > 0 && selectedIds.size === filteredDues.filter(d => d.status !== "納入済" && !d._virtual).length && filteredDues.some(d => d.status !== "納入済" && !d._virtual)}
                            onChange={(e) => toggleSelectAll(e.target.checked, filteredDues.filter(d => !d._virtual))}
                          />
                        </th>
                        <th>氏名</th>
                        <th>種別</th>
                        <th>会費種類</th>
                        <th style={{ textAlign: "right" }}>金額</th>
                        <th style={{ textAlign: "center" }}>ステータス</th>
                        <th>入金日</th>
                        <th>振込名義</th>
                        <th>備考</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDues.map((due) => {
                        const isVirtual = !!due._virtual;
                        const isSelected = selectedIds.has(due.id);
                        const isUnpaid = due.status !== "納入済" && !isVirtual;
                        const priorCount = priorUnpaidByMember[due.member_id] || 0;
                        return (
                          <tr
                            key={due.id}
                            onClick={(e) => { if (!isVirtual) handleRowClick(due, e); }}
                            style={{
                              cursor: isVirtual ? "default" : "pointer",
                              background: isSelected ? "rgba(79, 70, 229, 0.06)" : undefined,
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => { if (!isSelected && !isVirtual) e.currentTarget.style.background = "var(--color-border)"; }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = ""; }}
                          >
                            <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                              {isUnpaid && (
                                <input type="checkbox" checked={isSelected} onChange={(e) => handleCheckboxClick(due, e)} />
                              )}
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <button
                                  type="button"
                                  style={{
                                    fontWeight: 600, fontSize: 13, padding: 0,
                                    border: "none", background: "none", cursor: "pointer",
                                    color: "var(--color-accent)", textDecoration: "none",
                                  }}
                                  onClick={(e) => { e.stopPropagation(); setHistoryModal({ memberId: due.member_id, memberName: due.member_name }); }}
                                  title="全年度の会費履歴を表示"
                                >
                                  {displayValue(due.member_name)}
                                </button>
                                {due.is_new && (
                                  <span style={{
                                    padding: "1px 6px", borderRadius: 999,
                                    background: "var(--color-accent-light)", color: "var(--color-accent-dark)",
                                    fontSize: 12, fontWeight: 700,
                                  }}>新入</span>
                                )}
                                {!isVirtual && priorCount > 0 && (
                                  <span
                                    title={`前年度以前の未納が${priorCount}件あります`}
                                    style={{ cursor: "pointer", fontSize: 13, lineHeight: 1 }}
                                    onClick={(e) => { e.stopPropagation(); setActiveTab("all-unpaid"); }}
                                  >
                                    {"\u26A0\uFE0F"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td><MemberTypeBadge type={due.member_type} /></td>
                            <td>{isVirtual ? "-" : <DueTypeBadge type={due.due_type || "年会費"} />}</td>
                            <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
                              {isVirtual ? "-" : formatCurrency(due.amount)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <StatusBadge status={due.status} disabled={isVirtual} onClick={isVirtual ? undefined : (e) => { e.stopPropagation(); openReconcileModal(due); }} />
                            </td>
                            <td style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{isVirtual ? "-" : displayValue(due.paid_date)}</td>
                            <td style={{ fontSize: 13 }}>{isVirtual ? "-" : displayValue(due.payer_name)}</td>
                            <td style={{ fontSize: 13, color: "var(--color-text-secondary)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {isVirtual ? "-" : displayValue(due.notes)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Batch action bar (slide-in) */}
          <div
            ref={batchBarRef}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              transform: selectionMode ? "translateY(0)" : "translateY(100%)",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: 100,
              background: "var(--color-bg)",
              borderTop: "1px solid var(--color-border)",
              boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
              padding: "12px 24px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 8 : 16, flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent)" }}>
              {selectedIds.size}件選択中
            </span>
            <Button variant="primary" onClick={() => { setBatchDate(todayStr()); setShowBatchModal(true); }} disabled={saving}>
              一括納入済にする
            </Button>
            <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
              選択解除
            </Button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── Tab 2: 全年度未納一覧            ── */}
      {/* ══════════════════════════════════════ */}
      {activeTab === "all-unpaid" && (
        <>
          {/* Summary */}
          {isMobile ? (
            <div className="stat-chip-bar" style={{ marginBottom: 8 }}>
              <div className="stat-chip">
                <span className="stat-chip-label">未納合計</span>
                <span className="stat-chip-value" style={{ color: "var(--color-danger)" }}>{allUnpaidSummary.totalCount}件</span>
              </div>
              <div className="stat-chip">
                <span className="stat-chip-label">前年度以前</span>
                <span className="stat-chip-value" style={{ color: "var(--color-warning)" }}>{allUnpaidSummary.priorCount}件</span>
              </div>
              <div className="stat-chip">
                <span className="stat-chip-label">当年度分</span>
                <span className="stat-chip-value">{allUnpaidSummary.totalCount - allUnpaidSummary.priorCount}件</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <SummaryCard
                icon={"\u26A0\uFE0F"}
                label="未納合計"
                value={`${allUnpaidSummary.totalCount}件`}
                sub={formatCurrency(allUnpaidSummary.totalAmount)}
                color="var(--color-danger)"
              />
              <SummaryCard
                icon={"🟠"}
                label="うち前年度以前"
                value={`${allUnpaidSummary.priorCount}件`}
                sub={formatCurrency(allUnpaidSummary.priorAmount)}
                color="var(--color-warning)"
              />
              <SummaryCard
                icon={"🟣"}
                label="当年度分"
                value={`${allUnpaidSummary.totalCount - allUnpaidSummary.priorCount}件`}
                sub={formatCurrency(allUnpaidSummary.totalAmount - allUnpaidSummary.priorAmount)}
                color="var(--color-accent)"
              />
            </div>
          )}


          {/* Grouped tables */}
          {loading ? (
            <LoadingSpinner />
          ) : allUnpaid.length === 0 ? (
            <section className="card panel-card single-panel">
              <div className="card-body" style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>{"\u2705"}</div>
                <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-primary)" }}>全年度で未納はありません</p>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>素晴らしい！すべての会費が納入済です</p>
              </div>
            </section>
          ) : (
            unpaidByYear.map(([fyId, items]) => {
              const fyInfo = fyMap[fyId];
              const label = fyInfo?.label || fyId;
              const isCurrent = fyId === currentFiscalYearId;
              const isPrior = !isCurrent;
              const groupTotal = items.reduce((s, d) => s + (Number(d.amount) || 0), 0);
              const allChecked = items.every(d => selectedIds.has(d.id));

              return (
                <section key={fyId} className="card panel-card" style={{ marginBottom: 16 }}>
                  {/* Year group header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: isMobile ? "8px 12px" : "12px 20px",
                    background: isPrior ? "var(--color-warning-light)" : "var(--color-accent-light)",
                    borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
                    borderBottom: `1px solid ${isPrior ? "#fde68a" : "var(--color-accent-light)"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isPrior && <span style={{ fontSize: 16 }}>{"\u26A0\uFE0F"}</span>}
                      <span style={{ fontSize: 15, fontWeight: 700, color: isPrior ? "var(--color-warning)" : "var(--color-accent)" }}>{label}</span>
                      {isCurrent && (
                        <span style={{
                          padding: "2px 8px", borderRadius: 999,
                          background: "var(--color-accent)", color: "#fff",
                          fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                        }}>当年度</span>
                      )}
                      {isPrior && (
                        <span style={{
                          padding: "2px 8px", borderRadius: 999,
                          background: "#fde68a", color: "var(--color-warning)",
                          fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                        }}>前年度以前</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: isPrior ? "var(--color-warning)" : "var(--color-accent)",
                      }}>
                        {items.length}件 / {formatCurrency(groupTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="card-body" style={{ padding: "0" }}>
                    {isMobile ? (
                      <div>
                        {items.map((due, idx) => {
                          const isSelected = selectedIds.has(due.id);
                          return (
                            <div
                              key={due.id}
                              onClick={() => {
                                if (selectionMode) { toggleSelectOne(due.id); }
                                else { openReconcileModal(due); }
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '11px 12px 11px 16px',
                                borderBottom: idx < items.length - 1 ? '1px solid var(--color-border)' : 'none',
                                cursor: 'pointer',
                                background: isSelected ? 'var(--color-accent-light)' : undefined,
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <input type="checkbox" checked={isSelected}
                                    onClick={(e) => e.stopPropagation()} onChange={(ev) => handleCheckboxClick(due, ev)}
                                    style={{ flexShrink: 0, width: 16, height: 16, accentColor: 'var(--color-accent)' }} />
                                  <button type="button"
                                    onClick={(e) => { e.stopPropagation(); setHistoryModal({ memberId: due.member_id, memberName: due.member_name }); }}
                                    style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-primary)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                    {displayValue(due.member_name)}
                                  </button>
                                  {due.is_new && <span style={{ padding: '0 5px', borderRadius: 999, background: 'var(--color-accent-light)', color: 'var(--color-accent)', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, lineHeight: '15px' }}>新入</span>}
                                </div>
                                <div style={{ fontSize: 12, lineHeight: 1.2, color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'baseline', paddingLeft: 22 }}>
                                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {due.member_type} · {due.due_type || "年会費"}
                                  </span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', flexShrink: 0, marginLeft: 12 }}>
                                    {formatCurrency(due.amount)}
                                  </span>
                                </div>
                              </div>
                              <StatusBadge status={"未納"} onClick={(e) => { e.stopPropagation(); openReconcileModal(due); }} />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="table-wrap">
                        <table className="data-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th style={{ width: 36, textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={allChecked}
                                  onChange={(e) => {
                                    setSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      for (const d of items) {
                                        if (e.target.checked) next.add(d.id); else next.delete(d.id);
                                      }
                                      return next;
                                    });
                                  }}
                                />
                              </th>
                              <th>氏名</th>
                              <th>種別</th>
                              <th>会費種類</th>
                              <th style={{ textAlign: "right" }}>金額</th>
                              <th>振込名義</th>
                              <th>備考</th>
                              <th style={{ textAlign: "center", width: 80 }}>消込</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((due) => {
                              const isSelected = selectedIds.has(due.id);
                              return (
                                <tr
                                  key={due.id}
                                  onClick={(e) => {
                                    if (selectionMode) {
                                      toggleSelectOne(due.id);
                                    } else {
                                      openReconcileModal(due);
                                    }
                                  }}
                                  style={{
                                    cursor: "pointer",
                                    background: isSelected ? "rgba(79, 70, 229, 0.06)" : (isPrior ? "var(--color-warning-light)" : undefined),
                                    transition: "background 0.15s",
                                  }}
                                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = isPrior ? "var(--color-warning-light)" : "var(--color-border)"; }}
                                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isPrior ? "var(--color-warning-light)" : ""; }}
                                >
                                  <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                    <input type="checkbox" checked={isSelected} onChange={(ev) => handleCheckboxClick(due, ev)} />
                                  </td>
                                  <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <button
                                        type="button"
                                        style={{
                                          fontWeight: 600, fontSize: 13, padding: 0,
                                          border: "none", background: "none", cursor: "pointer",
                                          color: "var(--color-accent)",
                                        }}
                                        onClick={(e) => { e.stopPropagation(); setHistoryModal({ memberId: due.member_id, memberName: due.member_name }); }}
                                        title="全年度の会費履歴を表示"
                                      >
                                        {displayValue(due.member_name)}
                                      </button>
                                      {due.is_new && (
                                        <span style={{
                                          padding: "1px 6px", borderRadius: 999,
                                          background: "var(--color-accent-light)", color: "var(--color-accent-dark)",
                                          fontSize: 12, fontWeight: 700,
                                        }}>新入</span>
                                      )}
                                    </div>
                                  </td>
                                  <td><MemberTypeBadge type={due.member_type} /></td>
                                  <td><DueTypeBadge type={due.due_type || "年会費"} /></td>
                                  <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
                                    {formatCurrency(due.amount)}
                                  </td>
                                  <td style={{ fontSize: 13 }}>{displayValue(due.payer_name)}</td>
                                  <td style={{ fontSize: 13, color: "var(--color-text-secondary)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {displayValue(due.notes)}
                                  </td>
                                  <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                    <StatusBadge status="未納" onClick={() => openReconcileModal(due)} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              );
            })
          )}

          {/* Batch action bar */}
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            transform: selectionMode ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 100,
            background: "var(--color-bg)",
            borderTop: "1px solid var(--color-border)",
            boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
            padding: "12px 24px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 8 : 16, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent)" }}>
              {selectedIds.size}件選択中
            </span>
            <Button variant="primary" onClick={() => { setBatchDate(todayStr()); setShowBatchModal(true); }} disabled={saving}>
              一括納入済にする
            </Button>
            <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
              選択解除
            </Button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── Tab 3: 会費設定                  ── */}
      {/* ══════════════════════════════════════ */}
      {activeTab === "settings" && (
        <>
          {isMobile && (
            <div style={{ marginBottom: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('current')}>
                {"\u2190 \u623B\u308B"}
              </Button>
            </div>
          )}
          <section className="card panel-card single-panel">
            <div className="card-body stack">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>年度別会費設定</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 }}>年度:</span>
                  <select
                    value={settingsFyId}
                    onChange={(e) => loadSettingsForFy(e.target.value)}
                    style={{
                      padding: "6px 12px", borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {fiscalYears.map(fy => (
                      <option key={fy.id} value={fy.id}>
                        {fy.year_label || (fy.year ? `${fy.year}年度` : fy.id)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Copy from prior year */}
              {priorYearSettings && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 16px", borderRadius: "var(--radius-md)",
                  background: "var(--color-accent-light)", border: "1px solid var(--color-accent-light)",
                  fontSize: 13,
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="6" stroke="var(--color-accent)" strokeWidth="1.5" />
                    <path d="M8 5v3M8 10h.01" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span>前年度の設定を参照できます</span>
                  <Button variant="secondary" size="sm" style={{ marginLeft: "auto" }}
                    onClick={copyPriorSettings}
                  >
                    前年度と同じ金額を使用
                  </Button>
                </div>
              )}

              <form onSubmit={handleSaveSettings}>
                {/* Existing members */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{
                    fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)",
                    margin: "0 0 16px",
                    padding: "0 0 8px",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 16 }}>{"👥"}</span>
                    既存会員
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                    <SettingsField
                      id="s-regular" label="正会員 年会費"
                      description="正会員の年間会費です"
                      value={settingsForm.regular_annual_fee}
                      onChange={(v) => updateSettings("regular_annual_fee", v)}
                    />
                    <SettingsField
                      id="s-associate" label="賛助会員 年会費"
                      description="賛助会員の年間会費です"
                      value={settingsForm.associate_annual_fee}
                      onChange={(v) => updateSettings("associate_annual_fee", v)}
                    />
                  </div>
                </div>

                {/* New members */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{
                    fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)",
                    margin: "0 0 16px",
                    padding: "0 0 8px",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 16 }}>{"🆕"}</span>
                    新入会員
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20 }}>
                    <SettingsField
                      id="s-admission" label="入会金"
                      description="入会時に一度だけ徴収"
                      value={settingsForm.admission_fee}
                      onChange={(v) => updateSettings("admission_fee", v)}
                    />
                    <SettingsField
                      id="s-first-half" label="前期入会 会費"
                      description="前期入会時の年会費"
                      value={settingsForm.first_half_fee}
                      onChange={(v) => updateSettings("first_half_fee", v)}
                    />
                    <SettingsField
                      id="s-second-half" label="後期入会 会費"
                      description="後期入会時の割引会費"
                      value={settingsForm.second_half_fee}
                      onChange={(v) => updateSettings("second_half_fee", v)}
                    />
                  </div>
                </div>

                {/* Summary box */}
                <div style={{
                  padding: 16, borderRadius: "var(--radius-lg)",
                  background: "var(--color-bg-sub)", border: "1px solid var(--color-border)",
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--color-text-primary)" }}>会費生成ルール (プレビュー)</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "6px 24px", fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>正会員</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(settingsForm.regular_annual_fee)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>賛助会員</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(settingsForm.associate_annual_fee)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>新入会 (前期)</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        入会金 {formatCurrency(settingsForm.admission_fee)} + {formatCurrency(settingsForm.first_half_fee)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>新入会 (後期)</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        入会金 {formatCurrency(settingsForm.admission_fee)} + {formatCurrency(settingsForm.second_half_fee)}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button variant="primary" type="submit" disabled={saving}>
                    {saving ? "保存中..." : "設定を保存"}
                  </Button>
                </div>
              </form>
            </div>
          </section>

          {/* Settings history */}
          {settingsHistory.length > 0 && (
            <section className="card panel-card" style={{ marginTop: 20 }}>
              <div className="card-body stack">
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>過去年度の設定履歴</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>年度</th>
                        <th style={{ textAlign: "right" }}>正会員</th>
                        <th style={{ textAlign: "right" }}>賛助会員</th>
                        <th style={{ textAlign: "right" }}>入会金</th>
                        <th style={{ textAlign: "right" }}>前期会費</th>
                        <th style={{ textAlign: "right" }}>後期会費</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settingsHistory.map((s) => {
                        const label = fyMap[s.fiscal_year_id]?.label || s.fiscal_year_id;
                        return (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 600 }}>{label}</td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(s.regular_annual_fee)}</td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(s.associate_annual_fee)}</td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(s.admission_fee)}</td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(s.first_half_fee)}</td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(s.second_half_fee)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
