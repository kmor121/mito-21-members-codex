import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest, base44, invalidateReadCache } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DatePicker from "../../components/ui/DatePicker";

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
  "年会費":       { color: "#4f46e5", bg: "#eef2ff" },
  "入会金":       { color: "#b45309", bg: "#fffbeb" },
  "後期入会会費": { color: "#059669", bg: "#ecfdf5" },
  "前期入会会費": { color: "#4f46e5", bg: "#eef2ff" },
};

const MEMBER_TYPE_BADGE = {
  "正会員":   { color: "#4f46e5", bg: "#eef2ff" },
  "賛助会員": { color: "#0891b2", bg: "#ecfeff" },
};

/* ── Toast ── */
function Toast({ message, type = "success" }) {
  if (!message) return null;
  return (
    <div className="nl2-toast nl2-toast-enter" style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: type === "error" ? "#fef2f2" : undefined,
      color: type === "error" ? "#991b1b" : undefined,
      borderColor: type === "error" ? "#fecaca" : undefined,
    }}>
      <span className="nl2-toast-icon">{type === "error" ? "\u2717" : "\u2713"}</span>
      {message}
    </div>
  );
}

/* ── Pill Tab Button ── */
function PillTab({ active, onClick, children, badge, badgeColor }) {
  return (
    <button
      type="button"
      className={`nl2-pill-tab${active ? " active" : ""}`}
      onClick={onClick}
      style={{ padding: "7px 18px", fontSize: "13px" }}
    >
      {children}
      {badge !== undefined && badge !== null && (
        <span style={{
          marginLeft: 6,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: 20, height: 20, padding: "0 6px",
          borderRadius: 999,
          background: active ? "rgba(255,255,255,0.25)" : (badgeColor || "#fee2e2"),
          color: active ? "#fff" : (badgeColor ? "#fff" : "#991b1b"),
          fontSize: "11px", fontWeight: 700,
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── Year Pill Navigator ── */
function YearPillNav({ fiscalYears, activeFyId, currentFyId, onChange }) {
  const sorted = useMemo(() =>
    [...fiscalYears].sort((a, b) => (a.year || 0) - (b.year || 0)),
    [fiscalYears]
  );
  const activeIdx = sorted.findIndex(fy => fy.id === activeFyId);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "4px 8px", minWidth: 32, fontSize: 16, lineHeight: 1 }}
        disabled={activeIdx <= 0}
        onClick={() => activeIdx > 0 && onChange(sorted[activeIdx - 1].id)}
        aria-label="前の年度"
      >&larr;</button>
      <div style={{ display: "flex", gap: 4 }}>
        {sorted.map(fy => {
          const label = fy.year ? `${fy.year}` : fy.year_label;
          const isActive = fy.id === activeFyId;
          const isCurrent = fy.id === currentFyId;
          return (
            <button
              key={fy.id}
              type="button"
              onClick={() => onChange(fy.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: isActive ? "2px solid var(--primary)" : "1px solid var(--line)",
                background: isActive ? "var(--primary)" : "#fff",
                color: isActive ? "#fff" : "var(--text-secondary)",
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s",
                position: "relative",
              }}
            >
              {label}
              {isCurrent && !isActive && (
                <span style={{
                  position: "absolute", top: -3, right: -3,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--primary)", border: "2px solid #fff",
                }} />
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "4px 8px", minWidth: 32, fontSize: 16, lineHeight: 1 }}
        disabled={activeIdx >= sorted.length - 1}
        onClick={() => activeIdx < sorted.length - 1 && onChange(sorted[activeIdx + 1].id)}
        aria-label="次の年度"
      >&rarr;</button>
    </div>
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
      border: "1px solid var(--line)",
      background: "#fff",
      borderTop: `3px solid ${color || "var(--primary)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "var(--text)", lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{sub}</div>}
      {progress !== undefined && (
        <div style={{ height: 6, borderRadius: 3, background: "var(--line-light)", overflow: "hidden", marginTop: 2 }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${Math.min(100, progress)}%`,
            background: color || "var(--primary)",
            transition: "width 0.5s ease",
          }} />
        </div>
      )}
    </div>
  );
}

/* ── Due Type Badge ── */
function DueTypeBadge({ type }) {
  const badge = DUE_TYPE_BADGE[type] || { color: "var(--text-secondary)", bg: "var(--line-light)" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px",
      borderRadius: 999, fontSize: 12, fontWeight: 600,
      color: badge.color, background: badge.bg,
    }}>
      {type || "年会費"}
    </span>
  );
}

/* ── Member Type Badge ── */
function MemberTypeBadge({ type }) {
  const badge = MEMBER_TYPE_BADGE[type] || { color: "var(--text-secondary)", bg: "var(--line-light)" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px",
      borderRadius: 999, fontSize: 11, fontWeight: 600,
      color: badge.color, background: badge.bg,
    }}>
      {type || "-"}
    </span>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status, onClick }) {
  const isPaid = status === "納入済";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "4px 12px", borderRadius: 999,
        border: "none", cursor: "pointer",
        fontSize: 12, fontWeight: 600,
        background: isPaid ? "#ecfdf5" : "#fef2f2",
        color: isPaid ? "#065f46" : "#991b1b",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.transform = "scale(1.05)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
    >
      {isPaid ? "\u2713 納入済" : "\u25CF 未納"}
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
      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>過去の名義:</span>
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(s)}
          style={{
            padding: "2px 8px", borderRadius: 999, border: "1px solid var(--line)",
            background: value === s ? "var(--primary-light)" : "#fff",
            fontSize: 11, cursor: "pointer", color: "var(--text)",
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
  if (!target) return null;
  const isPaid = target.status === "納入済";

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: 480, overflow: "visible" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ background: isPaid ? "#fef2f2" : "#ecfdf5", borderBottom: "none" }}>
          <h3 style={{ fontSize: "1rem" }}>{isPaid ? "納入済を取り消す" : "消込処理"}</h3>
          <button type="button" className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: "24px", overflow: "visible" }}>
          {/* Member info */}
          <div style={{
            padding: 16, borderRadius: "var(--radius)", background: "var(--bg)",
            marginBottom: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{target.member_name}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 8 }}>
              <DueTypeBadge type={target.due_type || "年会費"} />
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{formatCurrency(target.amount)}</span>
            </div>
          </div>

          {isPaid ? (
            <div style={{
              padding: 16, borderRadius: "var(--radius)",
              background: "#fef2f2", border: "1px solid #fecaca",
              textAlign: "center",
            }}>
              <p style={{ margin: 0, fontSize: 14, color: "#991b1b", fontWeight: 600 }}>
                この会費を「未納」に戻しますか？
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#b91c1c" }}>
                入金日・振込名義の情報はクリアされます
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ position: "relative", zIndex: 10 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  入金日
                </label>
                <DatePicker id="reconcile-date" value={toggleDate} onChange={setToggleDate} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  振込名義
                </label>
                <input
                  type="text" value={togglePayerName}
                  placeholder="例: 株式会社○○"
                  onChange={(e) => setTogglePayerName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", fontSize: 14 }}
                />
                <PayerSuggest memberId={target.member_id} allDues={allDues} value={togglePayerName} onChange={setTogglePayerName} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  備考 <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(任意)</span>
                </label>
                <input
                  type="text" value={toggleNotes}
                  placeholder="備考があれば入力"
                  onChange={(e) => setToggleNotes(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", fontSize: 14 }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-secondary" type="button" onClick={onClose}>キャンセル</button>
          <button
            className="btn"
            type="button"
            onClick={onConfirm}
            disabled={saving}
            style={{
              background: isPaid ? "#dc2626" : "#059669",
              color: "#fff", border: "none",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "処理中..." : isPaid ? "未納に戻す" : "納入済にする"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Member History Modal ── */
function MemberHistoryModal({ open, memberName, memberId, allDues, fyMap, currentFyId, onClose }) {
  if (!open || !memberId) return null;
  const memberDues = allDues
    .filter((d) => d.member_id === memberId)
    .sort((a, b) => {
      const ya = fyMap[a.fiscal_year_id]?.year || 0;
      const yb = fyMap[b.fiscal_year_id]?.year || 0;
      return yb - ya;
    });

  const totalUnpaid = memberDues.filter(d => d.status !== "納入済").length;

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>{memberName}</h3>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>全年度の会費履歴</span>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto", padding: "16px 24px" }}>
          {totalUnpaid > 0 && (
            <div style={{
              padding: "10px 16px", borderRadius: "var(--radius)",
              background: "#fef2f2", border: "1px solid #fecaca",
              marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
              fontSize: 13, color: "#991b1b", fontWeight: 500,
            }}>
              <span style={{ fontSize: 16 }}>{"\u26A0\uFE0F"}</span>
              未納が{totalUnpaid}件あります
            </div>
          )}
          {memberDues.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>{"📄"}</div>
              <p style={{ margin: 0, color: "var(--text-secondary)" }}>会費データがありません</p>
            </div>
          ) : (
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
                      background: isUnpaid ? "#fef2f2" : undefined,
                    }}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{label}</span>
                        {isCurrent && (
                          <span style={{
                            marginLeft: 4, padding: "1px 6px", borderRadius: 999,
                            background: "var(--primary-light)", color: "var(--primary)",
                            fontSize: 10, fontWeight: 600,
                          }}>当年度</span>
                        )}
                      </td>
                      <td><DueTypeBadge type={d.due_type || "年会費"} /></td>
                      <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(d.amount)}</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: 999,
                          fontSize: 11, fontWeight: 600,
                          background: isUnpaid ? "#fef2f2" : "#ecfdf5",
                          color: isUnpaid ? "#991b1b" : "#065f46",
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
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" type="button" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

/* ── Settings Field ── */
function SettingsField({ id, label, description, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</label>
      {description && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{description}</span>}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          id={id}
          type="number"
          min="0"
          step="1000"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: "var(--radius)",
            border: "1px solid var(--line)", fontSize: 14,
            fontVariantNumeric: "tabular-nums",
          }}
        />
        <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500, flexShrink: 0 }}>円</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════ */
/* ── Main Component                  ── */
/* ══════════════════════════════════════ */

export default function DuesManagement() {
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

  // Batch selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Member history modal
  const [historyModal, setHistoryModal] = useState(null);

  // Confirm dialogs
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [confirmReminder, setConfirmReminder] = useState(false);
  const [confirmAllReminder, setConfirmAllReminder] = useState(false);
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
        const [allFiscalYears, allDues, dueSettings, allMembers] = await Promise.all([
          base44.entities.FiscalYear.list("-year"),
          base44.entities.Due.list(),
          base44.entities.DueSetting.list(),
          base44.entities.Member.filter({ approval_status: "承認済" }),
        ]);

        setFiscalYears(allFiscalYears);
        setAllDueSettings(dueSettings);
        const currentFy = allFiscalYears.find((fy) => fy.is_current === true);
        const currentFyId = currentFy?.id || "";
        setCurrentFiscalYearId(currentFyId);
        const activeFyId = fiscalYearId || currentFyId;
        const selectedFy = allFiscalYears.find((fy) => fy.id === activeFyId) || null;
        setSelectedFiscalYear(selectedFy);

        // member map
        const mMap = {};
        for (const m of allMembers) {
          mMap[m.id] = { name: m.name_kanji || "", type: m.member_type || "", is_new: !!m.is_new };
        }
        setMemberMap(mMap);

        // Enrich all dues
        const enrichedAll = allDues.map((d) => ({
          ...d,
          member_name: d.member_name || mMap[d.member_id]?.name || "",
          member_type: d.member_type || mMap[d.member_id]?.type || "",
          is_new: d.is_new ?? mMap[d.member_id]?.is_new ?? false,
        }));
        setAllDuesRaw(enrichedAll);

        // Filter for selected FY
        setDues(enrichedAll.filter((d) => d.fiscal_year_id === activeFyId));

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
    let total = 0, paidCount = 0, unpaidCount = 0, paidAmount = 0, unpaidAmount = 0;
    for (const d of dues) {
      total++;
      const amt = Number(d.amount) || 0;
      if (d.status === "納入済") { paidCount++; paidAmount += amt; }
      else { unpaidCount++; unpaidAmount += amt; }
    }
    return { total, paidCount, unpaidCount, paidAmount, unpaidAmount };
  }, [dues]);

  const paidRate = computedSummary.total > 0
    ? Math.round((computedSummary.paidCount / computedSummary.total) * 100)
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

  /* ── Filtered dues (current tab) ── */
  const filteredDues = useMemo(() => {
    let list = dues;
    // status filter
    if (statusFilter === "unpaid") list = list.filter(d => d.status !== "納入済");
    else if (statusFilter === "paid") list = list.filter(d => d.status === "納入済");
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
  }, [dues, statusFilter, dueTypeFilter, searchQuery]);

  // Unique due types in current year
  const dueTypes = useMemo(() => {
    const types = new Set();
    for (const d of dues) types.add(d.due_type || "年会費");
    return [...types];
  }, [dues]);

  /* ── Handlers ── */
  function handleFiscalYearChange(fyId) {
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

  async function executeSendReminder() {
    setConfirmReminder(false);
    setSaving(true);
    try {
      await apiRequest("send-due-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_year_id: activeFiscalYearId }),
      });
      showToast("リマインドメールを送信しました");
    } catch (err) {
      showToast(err.message || "送信に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }

  async function executeSendAllReminder() {
    setConfirmAllReminder(false);
    setSaving(true);
    try {
      const fyIds = [...new Set(allUnpaid.map((d) => d.fiscal_year_id))];
      for (const fyId of fyIds) {
        await apiRequest("send-due-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fiscal_year_id: fyId }),
        });
      }
      showToast(`全年度の未納者にリマインドメールを送信しました (${fyIds.length}年度分)`);
    } catch (err) {
      showToast(err.message || "送信に失敗しました", "error");
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

  /* ── Render ── */
  return (
    <section className="admin-shell">
      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>会費管理</h1>
            {selectedFiscalYear && (
              <span style={{
                padding: "4px 12px", borderRadius: 999,
                background: "var(--primary-light)", color: "var(--primary)",
                fontSize: 12, fontWeight: 700,
              }}>
                {selectedFiscalYear.year_label || `${selectedFiscalYear.year}年度`}
              </span>
            )}
          </div>
          <p className="page-description" style={{ margin: "4px 0 0" }}>年度別の会費管理・消込・未納確認</p>
        </div>
      </div>

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
      {showBatchModal && (
        <div className="confirm-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: 400, overflow: "visible" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: "#ecfdf5", borderBottom: "none" }}>
              <h3 style={{ fontSize: "1rem" }}>一括消込</h3>
              <button type="button" className="modal-close" onClick={() => setShowBatchModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: 24, overflow: "visible" }}>
              <div style={{
                padding: 16, borderRadius: "var(--radius)", background: "var(--bg)",
                marginBottom: 20, textAlign: "center",
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)" }}>{selectedIds.size}件</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>を納入済にします</div>
              </div>
              <div style={{ position: "relative", zIndex: 10 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  入金日（全件共通）
                </label>
                <DatePicker id="batch-date" value={batchDate} onChange={setBatchDate} />
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-secondary" type="button" onClick={() => setShowBatchModal(false)}>キャンセル</button>
              <button
                className="btn"
                type="button"
                onClick={executeBatchPaid}
                disabled={saving}
                style={{ background: "#059669", color: "#fff", border: "none" }}
              >
                {saving ? "処理中..." : "一括納入済にする"}
              </button>
            </div>
          </div>
        </div>
      )}

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
        open={confirmReminder}
        title="リマインド送信確認"
        message={`未納者 ${computedSummary.unpaidCount || 0}名にリマインドメールを送信しますか？`}
        confirmLabel="送信する"
        onConfirm={executeSendReminder}
        onCancel={() => setConfirmReminder(false)}
      />
      <ConfirmDialog
        open={confirmAllReminder}
        title="全年度リマインド送信確認"
        message={`全年度の未納者 ${allUnpaidSummary.totalCount}件（${unpaidByYear.length}年度分）にリマインドメールを送信しますか？`}
        confirmLabel="全年度分を送信"
        onConfirm={executeSendAllReminder}
        onCancel={() => setConfirmAllReminder(false)}
      />

      {error && <p className="message error" aria-live="polite" style={{ marginBottom: 12 }}>{error}</p>}

      {/* ── Tab Bar (Pill style) ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        <PillTab active={activeTab === "current"} onClick={() => { setActiveTab("current"); setSelectedIds(new Set()); }}>
          当年度
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

      {/* ══════════════════════════════════════ */}
      {/* ── Tab 1: 当年度                    ── */}
      {/* ══════════════════════════════════════ */}
      {activeTab === "current" && (
        <>
          {/* Year pill nav */}
          {fiscalYears.length > 0 && (
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
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <SummaryCard
              icon={"📊"}
              label="全体"
              value={`${computedSummary.total}名`}
              color="var(--primary)"
            />
            <SummaryCard
              icon={"\u2705"}
              label="納入済"
              value={`${computedSummary.paidCount}名`}
              sub={formatCurrency(computedSummary.paidAmount)}
              color="#059669"
            />
            <SummaryCard
              icon={"\u26A0\uFE0F"}
              label="未納"
              value={`${computedSummary.unpaidCount}名`}
              sub={formatCurrency(computedSummary.unpaidAmount)}
              color="#dc2626"
            />
            <SummaryCard
              icon={"📈"}
              label="納入率"
              value={`${paidRate}%`}
              color="var(--primary)"
              progress={paidRate}
            />
          </div>

          {/* Search & Filter Bar */}
          <section className="card panel-card single-panel">
            <div className="card-body stack">
              {/* Search + filters */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                {/* Search */}
                <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{
                    position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                    color: "var(--text-secondary)",
                  }}>
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="氏名・振込名義で検索"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%", padding: "8px 12px 8px 34px",
                      borderRadius: "var(--radius)", border: "1px solid var(--line)",
                      fontSize: 13,
                    }}
                  />
                </div>

                {/* Status filter pills */}
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap", marginRight: 2 }}>ステータス</span>
                  {[
                    { key: "all", label: "全て" },
                    { key: "unpaid", label: "未納" },
                    { key: "paid", label: "納入済" },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`nl2-pill-tab${statusFilter === opt.key ? " active" : ""}`}
                      onClick={() => setStatusFilter(opt.key)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Due type filter pills */}
                {dueTypes.length > 1 && (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap", marginRight: 2 }}>種類</span>
                    <button
                      type="button"
                      className={`nl2-pill-tab${dueTypeFilter === "all" ? " active" : ""}`}
                      onClick={() => setDueTypeFilter("all")}
                    >全て</button>
                    {dueTypes.map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`nl2-pill-tab${dueTypeFilter === t ? " active" : ""}`}
                        onClick={() => setDueTypeFilter(t)}
                      >{t}</button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setConfirmReminder(true)}
                    disabled={saving || computedSummary.unpaidCount === 0}
                    style={{ fontSize: 12, padding: "6px 12px" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 4, verticalAlign: "middle" }}>
                      <path d="M1 3l6 4 6-4M1 3v8h12V3H1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    </svg>
                    リマインド
                  </button>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <LoadingSpinner />
              ) : filteredDues.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>{"💰"}</div>
                  <p style={{ margin: 0, fontWeight: 600, color: "var(--text)" }}>
                    {dues.length === 0 ? "会費データがありません" : "条件に一致するデータがありません"}
                  </p>
                  {dues.length === 0 && (
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                      会費設定を行い、会費を生成してください
                    </p>
                  )}
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36, textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.size > 0 && selectedIds.size === filteredDues.filter(d => d.status !== "納入済").length && filteredDues.some(d => d.status !== "納入済")}
                            onChange={(e) => toggleSelectAll(e.target.checked, filteredDues)}
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
                        const isSelected = selectedIds.has(due.id);
                        const isUnpaid = due.status !== "納入済";
                        const priorCount = priorUnpaidByMember[due.member_id] || 0;
                        return (
                          <tr
                            key={due.id}
                            onClick={(e) => handleRowClick(due, e)}
                            style={{
                              cursor: "pointer",
                              background: isSelected ? "rgba(79, 70, 229, 0.06)" : undefined,
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--line-light)"; }}
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
                                    color: "var(--primary)", textDecoration: "none",
                                  }}
                                  onClick={(e) => { e.stopPropagation(); setHistoryModal({ memberId: due.member_id, memberName: due.member_name }); }}
                                  title="全年度の会費履歴を表示"
                                >
                                  {displayValue(due.member_name)}
                                </button>
                                {due.is_new && (
                                  <span style={{
                                    padding: "1px 6px", borderRadius: 999,
                                    background: "#dbeafe", color: "#1d4ed8",
                                    fontSize: 10, fontWeight: 700,
                                  }}>NEW</span>
                                )}
                                {priorCount > 0 && (
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
                            <td><DueTypeBadge type={due.due_type || "年会費"} /></td>
                            <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
                              {formatCurrency(due.amount)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <StatusBadge status={due.status} onClick={(e) => { e.stopPropagation(); openReconcileModal(due); }} />
                            </td>
                            <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>{displayValue(due.paid_date)}</td>
                            <td style={{ fontSize: 13 }}>{displayValue(due.payer_name)}</td>
                            <td style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {displayValue(due.notes)}
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
              background: "#fff",
              borderTop: "1px solid var(--line)",
              boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
              padding: "12px 24px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>
              {selectedIds.size}件選択中
            </span>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => { setBatchDate(todayStr()); setShowBatchModal(true); }}
              disabled={saving}
              style={{ fontSize: 13 }}
            >
              一括納入済にする
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setSelectedIds(new Set())}
              style={{ fontSize: 13 }}
            >
              選択解除
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── Tab 2: 全年度未納一覧            ── */}
      {/* ══════════════════════════════════════ */}
      {activeTab === "all-unpaid" && (
        <>
          {/* Summary */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <SummaryCard
              icon={"\u26A0\uFE0F"}
              label="未納合計"
              value={`${allUnpaidSummary.totalCount}件`}
              sub={formatCurrency(allUnpaidSummary.totalAmount)}
              color="#dc2626"
            />
            <SummaryCard
              icon={"🟠"}
              label="うち前年度以前"
              value={`${allUnpaidSummary.priorCount}件`}
              sub={formatCurrency(allUnpaidSummary.priorAmount)}
              color="#d97706"
            />
            <SummaryCard
              icon={"🟣"}
              label="当年度分"
              value={`${allUnpaidSummary.totalCount - allUnpaidSummary.priorCount}件`}
              sub={formatCurrency(allUnpaidSummary.totalAmount - allUnpaidSummary.priorAmount)}
              color="var(--primary)"
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setConfirmAllReminder(true)}
              disabled={saving || allUnpaidSummary.totalCount === 0}
              style={{ fontSize: 12, padding: "6px 14px" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 4, verticalAlign: "middle" }}>
                <path d="M1 3l6 4 6-4M1 3v8h12V3H1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              全未納者にリマインドメール送信
            </button>
          </div>

          {/* Grouped tables */}
          {loading ? (
            <LoadingSpinner />
          ) : allUnpaid.length === 0 ? (
            <section className="card panel-card single-panel">
              <div className="card-body" style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>{"\u2705"}</div>
                <p style={{ margin: 0, fontWeight: 600, color: "var(--text)" }}>全年度で未納はありません</p>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>素晴らしい！すべての会費が納入済です</p>
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
                    padding: "12px 20px",
                    background: isPrior ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" : "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
                    borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
                    borderBottom: `1px solid ${isPrior ? "#fde68a" : "var(--primary-100)"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isPrior && <span style={{ fontSize: 16 }}>{"\u26A0\uFE0F"}</span>}
                      <span style={{ fontSize: 15, fontWeight: 700, color: isPrior ? "#92400e" : "var(--primary)" }}>{label}</span>
                      {isCurrent && (
                        <span style={{
                          padding: "2px 8px", borderRadius: 999,
                          background: "var(--primary)", color: "#fff",
                          fontSize: 10, fontWeight: 700,
                        }}>当年度</span>
                      )}
                      {isPrior && (
                        <span style={{
                          padding: "2px 8px", borderRadius: 999,
                          background: "#fde68a", color: "#92400e",
                          fontSize: 10, fontWeight: 700,
                        }}>前年度以前</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: isPrior ? "#c2410c" : "var(--primary)",
                      }}>
                        {items.length}件 / {formatCurrency(groupTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="card-body" style={{ padding: "0" }}>
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
                                  background: isSelected ? "rgba(79, 70, 229, 0.06)" : (isPrior ? "#fffdf7" : undefined),
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = isPrior ? "#fff8f0" : "var(--line-light)"; }}
                                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isPrior ? "#fffdf7" : ""; }}
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
                                        color: "var(--primary)",
                                      }}
                                      onClick={(e) => { e.stopPropagation(); setHistoryModal({ memberId: due.member_id, memberName: due.member_name }); }}
                                      title="全年度の会費履歴を表示"
                                    >
                                      {displayValue(due.member_name)}
                                    </button>
                                    {due.is_new && (
                                      <span style={{
                                        padding: "1px 6px", borderRadius: 999,
                                        background: "#dbeafe", color: "#1d4ed8",
                                        fontSize: 10, fontWeight: 700,
                                      }}>NEW</span>
                                    )}
                                  </div>
                                </td>
                                <td><MemberTypeBadge type={due.member_type} /></td>
                                <td><DueTypeBadge type={due.due_type || "年会費"} /></td>
                                <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
                                  {formatCurrency(due.amount)}
                                </td>
                                <td style={{ fontSize: 13 }}>{displayValue(due.payer_name)}</td>
                                <td style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
            background: "#fff",
            borderTop: "1px solid var(--line)",
            boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
            padding: "12px 24px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>
              {selectedIds.size}件選択中
            </span>
            <button className="btn btn-primary" type="button" onClick={() => { setBatchDate(todayStr()); setShowBatchModal(true); }} disabled={saving} style={{ fontSize: 13 }}>
              一括納入済にする
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setSelectedIds(new Set())} style={{ fontSize: 13 }}>
              選択解除
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── Tab 3: 会費設定                  ── */}
      {/* ══════════════════════════════════════ */}
      {activeTab === "settings" && (
        <>
          <section className="card panel-card single-panel">
            <div className="card-body stack">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>年度別会費設定</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>年度:</span>
                  <select
                    value={settingsFyId}
                    onChange={(e) => loadSettingsForFy(e.target.value)}
                    style={{
                      padding: "6px 12px", borderRadius: "var(--radius)",
                      border: "1px solid var(--line)", fontSize: 13, fontWeight: 600,
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
                  padding: "10px 16px", borderRadius: "var(--radius)",
                  background: "var(--info-light)", border: "1px solid #bfdbfe",
                  fontSize: 13,
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="6" stroke="#3b82f6" strokeWidth="1.5" />
                    <path d="M8 5v3M8 10h.01" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span>前年度の設定を参照できます</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: "4px 10px", marginLeft: "auto" }}
                    onClick={copyPriorSettings}
                  >
                    前年度と同じ金額を使用
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveSettings}>
                {/* Existing members */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{
                    fontSize: 14, fontWeight: 700, color: "var(--text)",
                    margin: "0 0 16px",
                    padding: "0 0 8px",
                    borderBottom: "1px solid var(--line)",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 16 }}>{"👥"}</span>
                    既存会員
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
                    fontSize: 14, fontWeight: 700, color: "var(--text)",
                    margin: "0 0 16px",
                    padding: "0 0 8px",
                    borderBottom: "1px solid var(--line)",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 16 }}>{"🆕"}</span>
                    新入会員
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
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
                  background: "var(--bg)", border: "1px solid var(--line)",
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>会費生成ルール (プレビュー)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>正会員</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(settingsForm.regular_annual_fee)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>賛助会員</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(settingsForm.associate_annual_fee)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>新入会 (前期)</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        入会金 {formatCurrency(settingsForm.admission_fee)} + {formatCurrency(settingsForm.first_half_fee)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>新入会 (後期)</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        入会金 {formatCurrency(settingsForm.admission_fee)} + {formatCurrency(settingsForm.second_half_fee)}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={saving}
                    style={{ padding: "8px 24px", fontSize: 14 }}
                  >
                    {saving ? "保存中..." : "設定を保存"}
                  </button>
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
