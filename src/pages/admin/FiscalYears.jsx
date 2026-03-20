import { useState, useEffect, useCallback } from 'react';
import { apiRequest, base44, invalidateReadCache } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DatePicker from '../../components/ui/DatePicker';
import { useIsMobile } from '../../hooks/useIsMobile';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

function stateLabel(state) {
  if (state === "upcoming") return "開始前";
  if (state === "closed") return "締了";
  if (state === "open") return "開放中";
  return state || "-";
}

function statePillClass(state) {
  if (state === "open") return "pill-success";
  if (state === "upcoming") return "pill-info";
  if (state === "closed") return "";
  return "";
}

function formatCurrency(v) {
  const n = Number(v);
  if (isNaN(n)) return "-";
  return n.toLocaleString("ja-JP") + "円";
}

function formatDateRange(start, end) {
  if (!start && !end) return "-";
  return `${start || "?"} 〜 ${end || "?"}`;
}

const DEFAULT_FEES = {
  regular_annual_fee: 30000,
  associate_annual_fee: 10000,
  admission_fee: 10000,
  first_half_fee: 30000,
  second_half_fee: 15000,
};

/* ── Custom Confirm Dialog ── */
function FyConfirmDialog({ open, title, icon, children, confirmLabel, confirmDanger, onConfirm, onCancel, saving }) {
  if (!open) return null;
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="fy-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="fy-confirm-header">
          {icon && <span className="fy-confirm-icon">{icon}</span>}
          <h3>{title}</h3>
        </div>
        <div className="fy-confirm-body">{children}</div>
        <div className="fy-confirm-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            キャンセル
          </button>
          <button
            type="button"
            className={confirmDanger ? "btn btn-danger" : "btn btn-primary"}
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "処理中..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Toast ── */
function FyToast({ message, type, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className={`nl2-toast${type === "error" ? " nl2-toast-error" : ""}`}>
      <span className="nl2-toast-icon">{type === "error" ? "\u2717" : "\u2713"}</span>
      {message}
    </div>
  );
}

export default function FiscalYears() {
  const isMobile = useIsMobile();
  const [years, setYears] = useState([]);
  const [currentFiscalYearId, setCurrentFiscalYearId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "" });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Form fields
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formIsCurrent, setFormIsCurrent] = useState(false);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formYearTouched, setFormYearTouched] = useState(false);
  const [dateAutoSet, setDateAutoSet] = useState(false);

  // Fee fields (informational, saved if backend supports)
  const [usePrevFees, setUsePrevFees] = useState(true);
  const [fees, setFees] = useState({ ...DEFAULT_FEES });
  const [prevFees, setPrevFees] = useState(null);

  // Transition state
  const [copyOrgs, setCopyOrgs] = useState(true);
  const [generateDues, setGenerateDues] = useState(true);
  const [resetIsNew, setResetIsNew] = useState(true);
  const [updateGraduates, setUpdateGraduates] = useState(true);

  // Confirm dialogs
  const [confirmTransition, setConfirmTransition] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [confirmSetCurrent, setConfirmSetCurrent] = useState(false);
  const [setCurrentTargetId, setSetCurrentTargetId] = useState(null);

  /* ── Load years ── */
  const loadYears = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.FiscalYear.list("-year");
      const cur = list.find((y) => y.is_current === true);
      setYears(list);
      setCurrentFiscalYearId(cur?.id || null);
      return { list, curId: cur?.id || null };
    } catch (err) {
      setToast({ message: err.message || "年度一覧の取得に失敗しました。", type: "error" });
      return { list: [], curId: null };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadYears(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-suggest dates when year changes ── */
  useEffect(() => {
    if (!formYearTouched) return;
    const y = Number(formYear);
    if (!y || y < 2000 || y > 2100) return;
    if (!dateAutoSet) {
      const defaults = deriveDefaultDates(y, years);
      setFormStartDate(defaults.start);
      setFormEndDate(defaults.end);
      setDateAutoSet(true);
    }
  }, [formYear, formYearTouched]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load previous year fees ── */
  function loadPrevYearFees() {
    // Find the most recent year before formYear
    const sorted = [...years].sort((a, b) => b.year - a.year);
    const prev = sorted.find((y) => y.year < Number(formYear));
    if (prev) {
      // Try to get fees from the previous year
      const feeData = {
        regular_annual_fee: prev.regular_annual_fee ?? DEFAULT_FEES.regular_annual_fee,
        associate_annual_fee: prev.associate_annual_fee ?? DEFAULT_FEES.associate_annual_fee,
        admission_fee: prev.admission_fee ?? DEFAULT_FEES.admission_fee,
        first_half_fee: prev.first_half_fee ?? DEFAULT_FEES.first_half_fee,
        second_half_fee: prev.second_half_fee ?? DEFAULT_FEES.second_half_fee,
      };
      setPrevFees(feeData);
      return feeData;
    }
    setPrevFees(null);
    return DEFAULT_FEES;
  }

  /* ── Derive default dates from previous year ── */
  function deriveDefaultDates(nextYear, yearsList) {
    const sorted = [...yearsList].sort((a, b) => b.year - a.year);
    const prev = sorted.find((y) => y.year < nextYear) || sorted[0];
    if (prev && prev.start_date && prev.end_date) {
      // Shift previous year's dates by +1 year
      const shiftDate = (d) => {
        const parts = d.split("-");
        if (parts.length === 3) return `${Number(parts[0]) + 1}-${parts[1]}-${parts[2]}`;
        return d;
      };
      return { start: shiftDate(prev.start_date), end: shiftDate(prev.end_date) };
    }
    return { start: `${nextYear}-04-01`, end: `${nextYear + 1}-03-31` };
  }

  /* ── Handlers ── */
  function handleNew() {
    const nextYear = years.length > 0
      ? Math.max(...years.map((y) => y.year)) + 1
      : new Date().getFullYear();
    const defaults = deriveDefaultDates(nextYear, years);
    setSelectedId(null);
    setFormYear(nextYear);
    setFormIsCurrent(false);
    setFormStartDate(defaults.start);
    setFormEndDate(defaults.end);
    setFormYearTouched(false);
    setDateAutoSet(true);
    setUsePrevFees(true);
    setFees({ ...DEFAULT_FEES });
    setCopyOrgs(true);
    setGenerateDues(true);
    setResetIsNew(true);
    setUpdateGraduates(true);
    setShowModal(true);

    // Load prev fees after state is set
    setTimeout(() => {
      const sorted = [...years].sort((a, b) => b.year - a.year);
      const prev = sorted[0];
      if (prev) {
        const feeData = {
          regular_annual_fee: prev.regular_annual_fee ?? DEFAULT_FEES.regular_annual_fee,
          associate_annual_fee: prev.associate_annual_fee ?? DEFAULT_FEES.associate_annual_fee,
          admission_fee: prev.admission_fee ?? DEFAULT_FEES.admission_fee,
          first_half_fee: prev.first_half_fee ?? DEFAULT_FEES.first_half_fee,
          second_half_fee: prev.second_half_fee ?? DEFAULT_FEES.second_half_fee,
        };
        setPrevFees(feeData);
        setFees(feeData);
      }
    }, 0);
  }

  function handleEdit(y) {
    setSelectedId(y.id);
    setFormYear(y.year || new Date().getFullYear());
    setFormIsCurrent(!!y.is_current);
    setFormStartDate(y.start_date || "");
    setFormEndDate(y.end_date || "");
    setFormYearTouched(false);
    setDateAutoSet(false);
    setUsePrevFees(false);
    setFees({
      regular_annual_fee: y.regular_annual_fee ?? DEFAULT_FEES.regular_annual_fee,
      associate_annual_fee: y.associate_annual_fee ?? DEFAULT_FEES.associate_annual_fee,
      admission_fee: y.admission_fee ?? DEFAULT_FEES.admission_fee,
      first_half_fee: y.first_half_fee ?? DEFAULT_FEES.first_half_fee,
      second_half_fee: y.second_half_fee ?? DEFAULT_FEES.second_half_fee,
    });
    setCopyOrgs(true);
    setGenerateDues(true);
    setResetIsNew(true);
    setUpdateGraduates(true);
    setShowModal(true);
    loadPrevYearFees();
  }

  function handleYearInput(val) {
    setFormYear(val);
    setFormYearTouched(true);
    setDateAutoSet(false);
  }

  function handleDateManualChange(field, val) {
    if (field === "start") setFormStartDate(val);
    else setFormEndDate(val);
  }

  function updateFee(key, val) {
    setUsePrevFees(false);
    setFees((prev) => ({ ...prev, [key]: val }));
  }

  function handleUsePrevFees(checked) {
    setUsePrevFees(checked);
    if (checked && prevFees) {
      setFees({ ...prevFees });
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formYear) { setToast({ message: "年度は必須です。", type: "error" }); return; }
    if (!formStartDate || !formEndDate) { setToast({ message: "開始日と終了日は必須です。", type: "error" }); return; }

    setSaving(true);
    try {
      const payload = {
        year: Number(formYear),
        start_date: formStartDate,
        end_date: formEndDate,
        is_current: formIsCurrent,
        regular_annual_fee: Number(fees.regular_annual_fee) || 0,
        associate_annual_fee: Number(fees.associate_annual_fee) || 0,
        admission_fee: Number(fees.admission_fee) || 0,
        first_half_fee: Number(fees.first_half_fee) || 0,
        second_half_fee: Number(fees.second_half_fee) || 0,
      };
      if (selectedId) payload.id = selectedId;

      const result = await apiRequest("save-fiscal-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setToast({ message: selectedId ? "年度を更新しました。" : "年度を追加しました。", type: "success" });
      setShowModal(false);
      invalidateReadCache("FiscalYear");
      await loadYears();
    } catch (err) {
      setToast({ message: err.message || "保存に失敗しました。", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetCurrent() {
    if (!setCurrentTargetId) return;
    setConfirmSetCurrent(false);
    setSaving(true);
    try {
      await apiRequest("set-current-fiscal-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: setCurrentTargetId }),
      });
      setToast({ message: "現在年度を変更しました。", type: "success" });
      invalidateReadCache("FiscalYear");
      await loadYears();
    } catch (err) {
      setToast({ message: err.message || "現在年度の設定に失敗しました。", type: "error" });
    } finally {
      setSaving(false);
      setSetCurrentTargetId(null);
    }
  }

  async function executeTransition() {
    setConfirmTransition(false);
    if (!transitionTarget) return;
    setSaving(true);
    try {
      const result = await apiRequest("execute-fiscal-year-transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_fiscal_year_id: transitionTarget.id,
          copy_organizations: copyOrgs,
          generate_dues: generateDues,
          reset_is_new: resetIsNew,
          update_graduates: updateGraduates,
        }),
      });
      setToast({ message: result.log || "年度移行が完了しました。", type: "success" });
      invalidateReadCache("FiscalYear");
      await loadYears();
    } catch (err) {
      setToast({ message: err.message || "年度移行に失敗しました。", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteYear() {
    setConfirmDelete(false);
    if (!deleteTargetId) return;
    const target = years.find((y) => y.id === deleteTargetId);
    if (target?.is_current) {
      setToast({ message: "現在年度は削除できません。", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await apiRequest("delete-fiscal-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTargetId }),
      });
      setToast({ message: "年度を削除しました。", type: "success" });
      invalidateReadCache("FiscalYear");
      await loadYears();
    } catch (err) {
      setToast({ message: err.message || "年度の削除に失敗しました。", type: "error" });
    } finally {
      setSaving(false);
      setDeleteTargetId(null);
    }
  }

  /* ── Transition data ── */
  const currentYear = years.find((y) => y.is_current);
  const nextYears = years.filter((y) => !y.is_current && y.year > (currentYear?.year || 0));
  const transitionTarget = nextYears.length > 0 ? nextYears[nextYears.length - 1] : null;

  const deleteTargetYear = years.find((y) => y.id === deleteTargetId);

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">年度管理</h1>
        {!isMobile && <p className="page-description">年度の登録・管理と年度移行処理</p>}
      </div>

      {/* Toast */}
      <FyToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />

      {/* Delete confirm */}
      <FyConfirmDialog
        open={confirmDelete}
        title="年度を削除"
        icon={"\u26A0\uFE0F"}
        confirmLabel="削除する"
        confirmDanger
        onConfirm={handleDeleteYear}
        onCancel={() => { setConfirmDelete(false); setDeleteTargetId(null); }}
        saving={saving}
      >
        <p>
          <strong>{deleteTargetYear?.year}年度</strong>を削除しますか？
        </p>
        <p className="fy-confirm-warn">
          関連する組織構成・会費データも削除されます。この操作は取り消せません。
        </p>
      </FyConfirmDialog>

      {/* Set current confirm */}
      <FyConfirmDialog
        open={confirmSetCurrent}
        title="現在年度の変更"
        icon={"📅"}
        confirmLabel="変更する"
        onConfirm={handleSetCurrent}
        onCancel={() => { setConfirmSetCurrent(false); setSetCurrentTargetId(null); }}
        saving={saving}
      >
        <p>
          <strong>{years.find((y) => y.id === setCurrentTargetId)?.year}年度</strong>を現在年度に設定しますか？
        </p>
      </FyConfirmDialog>

      {/* Transition confirm */}
      <FyConfirmDialog
        open={confirmTransition}
        title="年度移行の実行"
        icon={"🔄"}
        confirmLabel="移行を実行する"
        confirmDanger
        onConfirm={executeTransition}
        onCancel={() => setConfirmTransition(false)}
        saving={saving}
      >
        <p>
          <strong>{currentYear?.year}年度</strong> → <strong>{transitionTarget?.year}年度</strong>への移行処理を実行しますか？
        </p>
        <div className="fy-transition-summary">
          {copyOrgs && <div>\u2705 組織構成をコピー</div>}
          {generateDues && <div>\u2705 会費レコードを自動生成</div>}
          {resetIsNew && <div>\u2705 新入会員フラグをリセット</div>}
          {updateGraduates && <div>\u2705 卒業生フラグを自動更新</div>}
        </div>
        <p className="fy-confirm-warn">この操作は取り消せません。</p>
      </FyConfirmDialog>

      {/* ── Year List ── */}
      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <div className="panel-heading compact">
            <h2>年度一覧</h2>
            <button className="btn btn-primary" type="button" onClick={handleNew}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 4 }}>
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              新規追加
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : years.length === 0 ? (
            <div className="fy-empty">
              <span className="fy-empty-icon">{"📆"}</span>
              <p>年度データがありません</p>
              <button className="btn btn-primary" type="button" onClick={handleNew} style={{ marginTop: 8 }}>
                最初の年度を追加
              </button>
            </div>
          ) : (
            isMobile ? (
              <div className="fy-card-list">
                {years.map((y) => (
                  <div
                    key={y.id}
                    className={`fy-card-item${y.is_current ? " fy-card-item-current" : ""}`}
                    onClick={() => handleEdit(y)}
                  >
                    <div className="fy-card-item-header">
                      <div className="fy-card-item-title">
                        <strong className="fy-year-num">{y.year}年度</strong>
                        {y.is_current && (
                          <span className="pill pill-success" style={{ fontSize: 12 }}>現在</span>
                        )}
                      </div>
                      <span className={`pill ${statePillClass(y.state)}`} style={{ fontSize: 12 }}>{stateLabel(y.state)}</span>
                    </div>
                    <div className="fy-card-item-period muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {formatDateRange(y.start_date, y.end_date)}
                    </div>
                    <div className="fy-card-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="text-link" type="button" onClick={() => handleEdit(y)}>
                        編集
                      </button>
                      {!y.is_current && (
                        <>
                          <button
                            className="text-link"
                            type="button"
                            onClick={() => { setSetCurrentTargetId(y.id); setConfirmSetCurrent(true); }}
                          >
                            現在年度に設定
                          </button>
                          <button
                            className="text-link"
                            type="button"
                            style={{ color: "var(--color-danger)" }}
                            onClick={() => { setDeleteTargetId(y.id); setConfirmDelete(true); }}
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>年度</th>
                      <th>期間</th>
                      <th>ステータス</th>
                      <th style={{ width: 180 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {years.map((y) => (
                      <tr
                        key={y.id}
                        className={`fy-row${y.is_current ? " fy-row-current" : ""}`}
                        onClick={() => handleEdit(y)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <div className="fy-year-cell">
                            <strong className="fy-year-num">{y.year}年度</strong>
                            {y.is_current && (
                              <span className="pill pill-success" style={{ fontSize: 12 }}>現在</span>
                            )}
                          </div>
                        </td>
                        <td className="fy-period-cell">
                          {formatDateRange(y.start_date, y.end_date)}
                        </td>
                        <td>
                          <span className={`pill ${statePillClass(y.state)}`}>{stateLabel(y.state)}</span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="fy-actions">
                            <button className="text-link" type="button" onClick={() => handleEdit(y)}>
                              編集
                            </button>
                            {!y.is_current && (
                              <>
                                <button
                                  className="text-link"
                                  type="button"
                                  onClick={() => { setSetCurrentTargetId(y.id); setConfirmSetCurrent(true); }}
                                >
                                  現在年度に設定
                                </button>
                                <button
                                  className="text-link"
                                  type="button"
                                  style={{ color: "var(--color-danger)" }}
                                  onClick={() => { setDeleteTargetId(y.id); setConfirmDelete(true); }}
                                >
                                  削除
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </section>

      {/* ── Year Transition Section ── */}
      {currentYear && transitionTarget && (
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <div className="fy-transition-header">
              <div>
                <h2>年度移行</h2>
                <p className="muted" style={{ marginTop: 2 }}>現在年度から新しい年度への一括移行処理</p>
              </div>
            </div>

            <div className={`fy-transition-flow${isMobile ? " fy-transition-flow-vertical" : ""}`}>
              <div className="fy-transition-box">
                <span className="fy-transition-label">移行元（現在）</span>
                <strong className="fy-transition-year">{currentYear.year}年度</strong>
                <span className="fy-transition-period">
                  {formatDateRange(currentYear.start_date, currentYear.end_date)}
                </span>
              </div>
              <div className={`fy-transition-arrow${isMobile ? " fy-transition-arrow-vertical" : ""}`}>
                {isMobile ? (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M16 8v16M10 18l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M8 16h16M18 10l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="fy-transition-box fy-transition-box-target">
                <span className="fy-transition-label">移行先（新年度）</span>
                <strong className="fy-transition-year">{transitionTarget.year}年度</strong>
                <span className="fy-transition-period">
                  {formatDateRange(transitionTarget.start_date, transitionTarget.end_date)}
                </span>
              </div>
            </div>

            <div className="fy-transition-options">
              <label className="fy-transition-check">
                <input type="checkbox" checked={copyOrgs} onChange={(e) => setCopyOrgs(e.target.checked)} />
                <div>
                  <strong>組織構成を前年度からコピー</strong>
                  <p className="muted">委員会・部門の構成と役職者の割り当てを新年度にコピーします</p>
                </div>
              </label>
              <label className="fy-transition-check">
                <input type="checkbox" checked={generateDues} onChange={(e) => setGenerateDues(e.target.checked)} />
                <div>
                  <strong>会費レコードを自動生成</strong>
                  <p className="muted">全会員の会費レコード（年会費・入会金等）を新年度の設定に基づいて自動生成します</p>
                </div>
              </label>
              <label className="fy-transition-check">
                <input type="checkbox" checked={resetIsNew} onChange={(e) => setResetIsNew(e.target.checked)} />
                <div>
                  <strong>新入会員フラグ（is_new）をリセット</strong>
                  <p className="muted">前年度に新入会員だった会員のフラグをリセットします（翌年度は既存会員扱い）</p>
                </div>
              </label>
              <label className="fy-transition-check">
                <input type="checkbox" checked={updateGraduates} onChange={(e) => setUpdateGraduates(e.target.checked)} />
                <div>
                  <strong>卒業生フラグを自動更新</strong>
                  <p className="muted">卒業予定年が新年度以前の会員を自動的に卒業済みに更新します</p>
                </div>
              </label>
            </div>

            <div style={{ paddingTop: 8 }}>
              <button
                className="btn btn-danger"
                type="button"
                disabled={saving}
                onClick={() => setConfirmTransition(true)}
              >
                {"🔄"} 年度移行を実行
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Edit/Create Modal ── */}
      {showModal && (
        <div className="confirm-overlay" onClick={() => setShowModal(false)}>
          <div className="fy-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fy-modal-header">
              <h3>{selectedId ? `${formYear}年度の編集` : "新しい年度を追加"}</h3>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            <form className="fy-modal-body" noValidate onSubmit={handleSave}>
              {/* Year input */}
              <div className="fy-modal-section">
                <div className="fy-field">
                  <label className="fy-field-label" htmlFor="fy-year">
                    年度
                    <span className="required">必須</span>
                  </label>
                  <input
                    id="fy-year"
                    className="fy-year-input"
                    type="number"
                    min={2000}
                    max={2100}
                    placeholder="例: 2026"
                    value={formYear}
                    onChange={(e) => handleYearInput(e.target.value)}
                    required
                  />
                  <p className="fy-field-help">
                    年度を入力すると開始日・終了日が自動で提案されます（4月〜翌3月）
                  </p>
                </div>
              </div>

              {/* Date range */}
              <div className="fy-modal-section">
                <span className="fy-section-title">期間設定</span>
                <div className="fy-date-grid">
                  <div className="fy-field">
                    <label className="fy-field-label" htmlFor="fy-start">
                      開始日
                      <span className="required">必須</span>
                    </label>
                    <DatePicker
                      id="fy-start"
                      value={formStartDate}
                      onChange={(val) => handleDateManualChange("start", val)}
                      placeholder="開始日を選択"
                    />
                  </div>
                  <div className="fy-field">
                    <label className="fy-field-label" htmlFor="fy-end">
                      終了日
                      <span className="required">必須</span>
                    </label>
                    <DatePicker
                      id="fy-end"
                      value={formEndDate}
                      onChange={(val) => handleDateManualChange("end", val)}
                      placeholder="終了日を選択"
                    />
                  </div>
                </div>
                {formStartDate && formEndDate && (
                  <div className="fy-date-preview">
                    {"📅"} {formStartDate} 〜 {formEndDate}
                  </div>
                )}
              </div>

              {/* Is current */}
              <div className="fy-modal-section">
                <label className="fy-checkbox-card">
                  <input
                    type="checkbox"
                    checked={formIsCurrent}
                    onChange={(e) => setFormIsCurrent(e.target.checked)}
                  />
                  <div>
                    <strong>現在の年度に設定する</strong>
                    <p className="muted">チェックすると、この年度がシステム全体の現在年度として使われます</p>
                  </div>
                </label>
              </div>

              {/* Fee settings */}
              <div className="fy-modal-section">
                <span className="fy-section-title">会費設定</span>

                {prevFees && (
                  <label className="fy-checkbox-card" style={{ marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={usePrevFees}
                      onChange={(e) => handleUsePrevFees(e.target.checked)}
                    />
                    <div>
                      <strong>前年度と同じ金額を使用</strong>
                      <p className="muted">前年度の会費設定を引き継ぎます</p>
                    </div>
                  </label>
                )}

                <div className="fy-fee-grid">
                  <div className="fy-fee-field">
                    <label className="fy-fee-label">正会員 年会費</label>
                    <div className="fy-fee-input-wrap">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={fees.regular_annual_fee}
                        onChange={(e) => updateFee("regular_annual_fee", e.target.value)}
                        className="fy-fee-input"
                      />
                      <span className="fy-fee-unit">円</span>
                    </div>
                  </div>
                  <div className="fy-fee-field">
                    <label className="fy-fee-label">賛助会員 年会費</label>
                    <div className="fy-fee-input-wrap">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={fees.associate_annual_fee}
                        onChange={(e) => updateFee("associate_annual_fee", e.target.value)}
                        className="fy-fee-input"
                      />
                      <span className="fy-fee-unit">円</span>
                    </div>
                  </div>
                  <div className="fy-fee-field">
                    <label className="fy-fee-label">入会金</label>
                    <div className="fy-fee-input-wrap">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={fees.admission_fee}
                        onChange={(e) => updateFee("admission_fee", e.target.value)}
                        className="fy-fee-input"
                      />
                      <span className="fy-fee-unit">円</span>
                    </div>
                  </div>
                  <div className="fy-fee-field">
                    <label className="fy-fee-label">前期入会会費</label>
                    <div className="fy-fee-input-wrap">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={fees.first_half_fee}
                        onChange={(e) => updateFee("first_half_fee", e.target.value)}
                        className="fy-fee-input"
                      />
                      <span className="fy-fee-unit">円</span>
                    </div>
                  </div>
                  <div className="fy-fee-field">
                    <label className="fy-fee-label">後期入会会費</label>
                    <div className="fy-fee-input-wrap">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={fees.second_half_fee}
                        onChange={(e) => updateFee("second_half_fee", e.target.value)}
                        className="fy-fee-input"
                      />
                      <span className="fy-fee-unit">円</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="fy-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  キャンセル
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "保存中..." : selectedId ? "保存" : "追加"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
