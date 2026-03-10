import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest, base44 } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DatePicker from "../../components/ui/DatePicker";

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

export default function DuesManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYearId = searchParams.get("fiscalYearId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [fiscalYears, setFiscalYears] = useState([]);
  const [dues, setDues] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [currentFiscalYearId, setCurrentFiscalYearId] = useState("");

  const [settingsForm, setSettingsForm] = useState({ ...DEFAULT_SETTINGS });
  const [settingsId, setSettingsId] = useState(null);

  // Toggle modal
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleDate, setToggleDate] = useState(todayStr());
  const [togglePayerName, setTogglePayerName] = useState("");

  // Payer name search
  const [payerSearch, setPayerSearch] = useState("");
  const [payerSearchResults, setPayerSearchResults] = useState(null);
  const [payerSearchLoading, setPayerSearchLoading] = useState(false);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);

  // Confirm dialogs
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [confirmAllPaid, setConfirmAllPaid] = useState(false);
  const [confirmReminder, setConfirmReminder] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [allFiscalYears, allDues, allDueSettings, allMembers] = await Promise.all([
          base44.entities.FiscalYear.list("-year"),
          base44.entities.Due.list(),
          base44.entities.DueSetting.list(),
          base44.entities.Member.filter({ approval_status: "承認済" }),
        ]);

        setFiscalYears(allFiscalYears);
        const currentFy = allFiscalYears.find((fy) => fy.is_current === true);
        const currentFyId = currentFy?.id || "";
        setCurrentFiscalYearId(currentFyId);
        const activeFyId = fiscalYearId || currentFyId;
        const selectedFy = allFiscalYears.find((fy) => fy.id === activeFyId) || null;
        setSelectedFiscalYear(selectedFy);

        // Build member name map
        const memberMap = {};
        for (const m of allMembers) {
          memberMap[m.id] = { name: m.name_kanji || "", type: m.member_type || "", is_new: !!m.is_new };
        }

        // Filter dues for selected fiscal year and enrich
        const fyDues = allDues
          .filter((d) => d.fiscal_year_id === activeFyId)
          .map((d) => ({
            ...d,
            member_name: d.member_name || memberMap[d.member_id]?.name || "",
            member_type: d.member_type || memberMap[d.member_id]?.type || "",
            is_new: d.is_new ?? memberMap[d.member_id]?.is_new ?? false,
          }));
        setDues(fyDues);
        setSummary({});

        // Due settings
        const fySettings = allDueSettings.filter((s) => s.fiscal_year_id === activeFyId);
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

        setSelectedIds(new Set());
      } catch (err) {
        setError(err.message || "会費データの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [fiscalYearId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeFiscalYearId = selectedFiscalYear?.id || currentFiscalYearId || fiscalYearId;

  const computedSummary = useMemo(() => {
    const total = dues.length;
    let paidCount = 0, unpaidCount = 0, paidAmount = 0, unpaidAmount = 0;
    let annualPaid = 0, annualUnpaid = 0, admissionPaid = 0, admissionUnpaid = 0;

    for (const d of dues) {
      const amt = Number(d.amount) || 0;
      const dueType = d.due_type || "年会費";
      if (d.status === "納入済") {
        paidCount++;
        paidAmount += amt;
        if (dueType === "入会金") admissionPaid += amt;
        else annualPaid += amt;
      } else {
        unpaidCount++;
        unpaidAmount += amt;
        if (dueType === "入会金") admissionUnpaid += amt;
        else annualUnpaid += amt;
      }
    }

    return {
      total_count: summary.total_count || total,
      paid_count: summary.paid_count ?? paidCount,
      unpaid_count: summary.unpaid_count ?? unpaidCount,
      paid_amount: summary.paid_amount ?? paidAmount,
      unpaid_amount: summary.unpaid_amount ?? unpaidAmount,
      annual_paid: annualPaid,
      annual_unpaid: annualUnpaid,
      admission_paid: admissionPaid,
      admission_unpaid: admissionUnpaid,
    };
  }, [dues, summary]);

  function handleFiscalYearChange(e) {
    const val = e.target.value;
    if (val) setSearchParams({ fiscalYearId: val });
    else setSearchParams({});
  }

  async function handleToggleStatus() {
    if (!toggleTarget) return;
    const newStatus = toggleTarget.status === "納入済" ? "未納" : "納入済";
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
          notes: toggleTarget.notes || "",
        }),
      });
      setMessage(`${toggleTarget.member_name}の${toggleTarget.due_type || "会費"}を${newStatus}にしました。`);
      setToggleTarget(null);
      loadData();
    } catch (err) {
      setMessage(err.message || "更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function executeBatchPaid() {
    setConfirmBatch(false);
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const today = todayStr();
      const promises = Array.from(selectedIds).map((id) => {
        const due = dues.find((d) => d.id === id);
        return apiRequest("save-due", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "納入済", paid_date: today, notes: due?.notes || "" }),
        });
      });
      await Promise.all(promises);
      setMessage(`${selectedIds.size}件を納入済にしました。`);
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      setMessage(err.message || "一括更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function executeAllPaid() {
    setConfirmAllPaid(false);
    const unpaid = dues.filter((d) => d.status !== "納入済");
    if (unpaid.length === 0) return;
    setSaving(true);
    try {
      const today = todayStr();
      await apiRequest("batch-update-dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_year_id: activeFiscalYearId, status: "納入済", paid_date: today }),
      });
      setMessage("全件を納入済にしました。");
      loadData();
    } catch (err) {
      setMessage(err.message || "一括更新に失敗しました。");
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
      setMessage("リマインドメールを送信しました。");
    } catch (err) {
      setMessage(err.message || "送信に失敗しました。");
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
          fiscal_year_id: activeFiscalYearId,
          id: settingsId || undefined,
          regular_annual_fee: Number(settingsForm.regular_annual_fee) || 0,
          associate_annual_fee: Number(settingsForm.associate_annual_fee) || 0,
          admission_fee: Number(settingsForm.admission_fee) || 0,
          first_half_fee: Number(settingsForm.first_half_fee) || 0,
          second_half_fee: Number(settingsForm.second_half_fee) || 0,
        }),
      });
      setMessage("会費設定を保存しました。");
      setShowSettings(false);
      loadData();
    } catch (err) {
      setMessage(err.message || "会費設定の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  function updateSettings(key, value) {
    setSettingsForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSelectAll(checked) {
    if (checked) {
      setSelectedIds(new Set(dues.filter((d) => d.status !== "納入済").map((d) => d.id)));
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

  function handleRowClick(due) {
    if (due.status === "納入済") return;
    toggleSelectOne(due.id);
  }

  async function handlePayerSearch() {
    const q = payerSearch.trim().toLowerCase();
    if (!q) { setPayerSearchResults(null); return; }
    setPayerSearchLoading(true);
    try {
      const [allDues, allFiscalYears] = await Promise.all([
        base44.entities.Due.list(),
        base44.entities.FiscalYear.list(),
      ]);
      const fyMap = {};
      for (const fy of allFiscalYears) fyMap[fy.id] = fy.year ? `${fy.year}年度` : fy.id;
      const results = allDues
        .filter((d) => {
          const pn = (d.payer_name || "").toLowerCase();
          const mn = (d.member_name || "").toLowerCase();
          return pn.includes(q) || mn.includes(q);
        })
        .map((d) => ({
          member_name: d.member_name || "",
          payer_name: d.payer_name || "",
          year: fyMap[d.fiscal_year_id] || "",
          amount: d.amount || 0,
          status: d.status || "",
        }))
        .slice(0, 50);
      setPayerSearchResults(results);
    } catch {
      setPayerSearchResults([]);
    } finally {
      setPayerSearchLoading(false);
    }
  }

  // Filter dues by payer name locally
  const filteredDues = useMemo(() => {
    const q = payerSearch.trim().toLowerCase();
    if (!q) return dues;
    return dues.filter((d) => {
      const pn = (d.payer_name || "").toLowerCase();
      const mn = (d.member_name || "").toLowerCase();
      return pn.includes(q) || mn.includes(q);
    });
  }, [dues, payerSearch]);

  const paidRate = computedSummary.total_count > 0
    ? Math.round(((computedSummary.paid_count || 0) / computedSummary.total_count) * 100)
    : 0;

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">会費管理</h1>
        <p className="page-description">年度別の会費管理・消込</p>
      </div>

      {/* Toggle status modal */}
      {toggleTarget && (
        <div className="confirm-overlay" onClick={() => setToggleTarget(null)}>
          <div className="modal-dialog" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>会費ステータス変更</h3>
              <button type="button" className="modal-close" onClick={() => setToggleTarget(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>
                <strong>{toggleTarget.member_name}</strong>の
                {toggleTarget.due_type && toggleTarget.due_type !== "年会費" ? `${toggleTarget.due_type}` : "会費"}
                （{formatCurrency(toggleTarget.amount)}）を
              </p>
              <p style={{ fontSize: '1.1em', fontWeight: 600, margin: '0.75rem 0' }}>
                {toggleTarget.status === "納入済" ? (
                  <span style={{ color: '#c53030' }}>「未納」に戻す</span>
                ) : (
                  <span style={{ color: '#2f855a' }}>「納入済」にする</span>
                )}
              </p>
              {toggleTarget.status !== "納入済" && (
                <>
                  <div className="field" style={{ marginTop: '0.5rem' }}>
                    <label htmlFor="toggle-date">入金日</label>
                    <DatePicker id="toggle-date" value={toggleDate}
                      onChange={(val) => setToggleDate(val)} />
                  </div>
                  <div className="field" style={{ marginTop: '0.5rem' }}>
                    <label htmlFor="toggle-payer-name">振込名</label>
                    <input id="toggle-payer-name" type="text" value={togglePayerName}
                      placeholder="振込元の名義"
                      onChange={(e) => setTogglePayerName(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="button" type="button" onClick={handleToggleStatus} disabled={saving}>
                {saving ? "処理中..." : "変更する"}
              </button>
              <button className="button ghost" type="button" onClick={() => setToggleTarget(null)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="confirm-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>会費設定（年度ごと）</h3>
              <button type="button" className="modal-close" onClick={() => setShowSettings(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="settings-form" noValidate onSubmit={handleSaveSettings}>
                <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.85em' }}>
                  この年度の会費金額を設定します。年度ごとに独立して管理されます。
                </p>

                <h4 style={{ margin: '0 0 0.5rem', borderBottom: '1px solid var(--line)', paddingBottom: '0.25rem' }}>既存会員</h4>
                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <div className="field">
                    <label htmlFor="s-regular">正会員 年会費</label>
                    <input id="s-regular" type="number" min="0" step="1000"
                      value={settingsForm.regular_annual_fee}
                      onChange={(e) => updateSettings("regular_annual_fee", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="s-associate">賛助会員 年会費</label>
                    <input id="s-associate" type="number" min="0" step="1000"
                      value={settingsForm.associate_annual_fee}
                      onChange={(e) => updateSettings("associate_annual_fee", e.target.value)} />
                  </div>
                </div>

                <h4 style={{ margin: '0 0 0.5rem', borderBottom: '1px solid var(--line)', paddingBottom: '0.25rem' }}>新入会員</h4>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="s-admission">入会金</label>
                    <input id="s-admission" type="number" min="0" step="1000"
                      value={settingsForm.admission_fee}
                      onChange={(e) => updateSettings("admission_fee", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="s-first-half">前期入会 会費</label>
                    <input id="s-first-half" type="number" min="0" step="1000"
                      value={settingsForm.first_half_fee}
                      onChange={(e) => updateSettings("first_half_fee", e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="s-second-half">後期入会 会費</label>
                    <input id="s-second-half" type="number" min="0" step="1000"
                      value={settingsForm.second_half_fee}
                      onChange={(e) => updateSettings("second_half_fee", e.target.value)} />
                  </div>
                </div>

                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 8, fontSize: '0.85em' }}>
                  <strong>会費生成ルール:</strong>
                  <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.2em', lineHeight: 1.6 }}>
                    <li>正会員: {formatCurrency(settingsForm.regular_annual_fee)}</li>
                    <li>賛助会員: {formatCurrency(settingsForm.associate_annual_fee)}</li>
                    <li>新入会員: 入会金 {formatCurrency(settingsForm.admission_fee)} + 前期会費 {formatCurrency(settingsForm.first_half_fee)} or 後期会費 {formatCurrency(settingsForm.second_half_fee)}</li>
                  </ul>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="button" type="submit" form="settings-form" disabled={saving}>
                {saving ? "保存中..." : "設定を保存"}
              </button>
              <button className="button ghost" type="button" onClick={() => setShowSettings(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmBatch}
        title="一括消込確認"
        message={`選択した${selectedIds.size}件を納入済にしますか？`}
        confirmLabel="納入済にする"
        onConfirm={executeBatchPaid}
        onCancel={() => setConfirmBatch(false)}
      />
      <ConfirmDialog
        open={confirmAllPaid}
        title="全件消込確認"
        message={`全${dues.filter((d) => d.status !== "納入済").length}件を納入済にしますか？この操作は取り消せません。`}
        confirmLabel="全員納入済"
        confirmStyle={{ background: '#c53030', borderColor: '#c53030' }}
        onConfirm={executeAllPaid}
        onCancel={() => setConfirmAllPaid(false)}
      />
      <ConfirmDialog
        open={confirmReminder}
        title="リマインド送信確認"
        message={`未納者 ${computedSummary.unpaid_count || 0}名にリマインドメールを送信しますか？`}
        confirmLabel="送信する"
        onConfirm={executeSendReminder}
        onCancel={() => setConfirmReminder(false)}
      />

      {message && (
        <p className="message" aria-live="polite" style={{ marginBottom: '0.75rem' }}>{message}</p>
      )}

      <section className="card panel-card single-panel">
        <div className="card-body stack">
          {/* Controls */}
          <div className="panel-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="field" style={{ margin: 0, minWidth: 180 }}>
                <select value={activeFiscalYearId} onChange={handleFiscalYearChange}
                  style={{ padding: '0.4rem 0.75rem' }}>
                  <option value="">-- 年度選択 --</option>
                  {fiscalYears.map((fy) => (
                    <option key={fy.id} value={fy.id}>
                      {fy.year_label || (fy.year ? `${fy.year}年度` : fy.id)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedFiscalYear && (
                <span className="pill">{selectedFiscalYear.year_label || `${selectedFiscalYear.year}年度`}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="field" style={{ margin: 0, minWidth: 200 }}>
                <input
                  type="text"
                  placeholder="振込名 / 会員名で検索"
                  value={payerSearch}
                  onChange={(e) => setPayerSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handlePayerSearch(); }}
                  style={{ padding: '0.4rem 0.75rem' }}
                />
              </div>
              <button className="button ghost" type="button" onClick={handlePayerSearch} disabled={payerSearchLoading} style={{ fontSize: '0.85em' }}>
                {payerSearchLoading ? "検索中..." : "振込名検索"}
              </button>
              <button className="button ghost" type="button" onClick={() => setShowSettings(true)}>会費設定</button>
              <button className="button ghost" type="button" onClick={() => setConfirmReminder(true)}
                disabled={saving || !(computedSummary.unpaid_count > 0)}>
                リマインド ({computedSummary.unpaid_count || 0}名)
              </button>
              <button className="button ghost" type="button" onClick={() => setConfirmAllPaid(true)}
                disabled={saving || !(computedSummary.unpaid_count > 0)}>
                全員納入済
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="dashboard-metrics" style={{ marginBottom: '0.25rem' }}>
            <div className="metric-card">
              <span className="metric-label">全体</span>
              <span>{computedSummary.total_count}件</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">納入済</span>
              <span style={{ color: '#2f855a' }}>{computedSummary.paid_count}件 / {formatCurrency(computedSummary.paid_amount)}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">未納</span>
              <span style={{ color: '#c53030' }}>{computedSummary.unpaid_count}件 / {formatCurrency(computedSummary.unpaid_amount)}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">納入率</span>
              <span>{paidRate}%</span>
            </div>
          </div>

          {/* Breakdown */}
          {(computedSummary.admission_paid > 0 || computedSummary.admission_unpaid > 0) && (
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85em', color: 'var(--text-secondary)', padding: '0 0.25rem' }}>
              <span>年会費: 納入済 {formatCurrency(computedSummary.annual_paid)} / 未納 {formatCurrency(computedSummary.annual_unpaid)}</span>
              <span>入会金: 納入済 {formatCurrency(computedSummary.admission_paid)} / 未納 {formatCurrency(computedSummary.admission_unpaid)}</span>
            </div>
          )}

          {/* Batch bar */}
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0.75rem', background: 'var(--bg)', borderRadius: 8 }}>
              <span style={{ fontSize: '0.9em' }}>{selectedIds.size}件選択中</span>
              <button className="button" type="button" onClick={() => setConfirmBatch(true)} disabled={saving} style={{ fontSize: '0.85em' }}>
                選択した{selectedIds.size}件を納入済にする
              </button>
              <button className="button ghost" type="button" onClick={() => setSelectedIds(new Set())} style={{ fontSize: '0.85em' }}>
                選択解除
              </button>
            </div>
          )}

          {/* Payer search results (cross-year) */}
          {payerSearchResults !== null && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--info-light)', borderRadius: 8, fontSize: '0.9em', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong>過去年度の振込名検索結果</strong>
                <button className="text-link" type="button" onClick={() => setPayerSearchResults(null)} style={{ fontSize: '0.85em' }}>閉じる</button>
              </div>
              {payerSearchResults.length === 0 ? (
                <p className="muted">一致する振込名は見つかりませんでした。</p>
              ) : (
                <div className="table-wrap" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  <table className="data-table" style={{ minWidth: 400 }}>
                    <thead>
                      <tr><th>会員名</th><th>振込名</th><th>年度</th><th>金額</th><th>ステータス</th></tr>
                    </thead>
                    <tbody>
                      {payerSearchResults.map((r, i) => (
                        <tr key={i}>
                          <td>{r.member_name || "-"}</td>
                          <td><strong>{r.payer_name || "-"}</strong></td>
                          <td>{r.year || "-"}</td>
                          <td>{formatCurrency(r.amount)}</td>
                          <td><span className={`pill${r.status === "納入済" ? " pill-success" : ""}`}>{r.status || "-"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <p className="message error">{error}</p>
          ) : filteredDues.length === 0 ? (
            <p className="empty-state">会費データがありません。</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === dues.filter(d => d.status !== "納入済").length && dues.some(d => d.status !== "納入済")}
                        onChange={(e) => toggleSelectAll(e.target.checked)} />
                    </th>
                    <th>会員名</th>
                    <th>会員種別</th>
                    <th>種類</th>
                    <th style={{ textAlign: 'right' }}>金額</th>
                    <th style={{ textAlign: 'center' }}>ステータス</th>
                    <th>納入日</th>
                    <th>振込名</th>
                    <th>備考</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDues.map((due) => {
                    const dueType = due.due_type || "年会費";
                    const isSelected = selectedIds.has(due.id);
                    const isUnpaid = due.status !== "納入済";
                    return (
                      <tr
                        key={due.id}
                        onClick={() => handleRowClick(due)}
                        style={{
                          cursor: isUnpaid ? 'pointer' : 'default',
                          background: isSelected ? 'rgba(66, 153, 225, 0.1)' : undefined,
                        }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          {isUnpaid && (
                            <input type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(due.id)} />
                          )}
                        </td>
                        <td>
                          <strong>{displayValue(due.member_name)}</strong>
                          {due.is_new && <span className="pill pill-info" style={{ marginLeft: 4, fontSize: '0.7em' }}>新入</span>}
                        </td>
                        <td>{displayValue(due.member_type)}</td>
                        <td>
                          {dueType === "入会金" ? (
                            <span className="pill pill-warning" style={{ fontSize: '0.8em' }}>{dueType}</span>
                          ) : dueType === "後期入会会費" ? (
                            <span className="pill pill-info" style={{ fontSize: '0.8em' }}>{dueType}</span>
                          ) : (
                            <span style={{ fontSize: '0.9em' }}>{dueType}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(due.amount)}</td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button type="button"
                            className={`pill pill-clickable${due.status === "納入済" ? " pill-success" : " pill-danger"}`}
                            style={{ cursor: 'pointer', fontSize: '0.9em', padding: '0.3em 0.8em', border: 'none' }}
                            onClick={() => { setToggleTarget(due); setToggleDate(todayStr()); setTogglePayerName(due.payer_name || ""); }}>
                            {due.status === "納入済" ? "✓ 納入済" : "未納"}
                          </button>
                        </td>
                        <td>{displayValue(due.paid_date)}</td>
                        <td>{displayValue(due.payer_name)}</td>
                        <td>{displayValue(due.notes)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
