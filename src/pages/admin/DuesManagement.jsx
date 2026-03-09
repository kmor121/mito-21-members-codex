import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "../../api/base44Client";
import LoadingSpinner from "../../components/common/LoadingSpinner";

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

function formatCurrency(v) {
  const n = Number(v);
  return `¥${(Number.isFinite(n) ? n : 0).toLocaleString("ja-JP")}`;
}

export default function DuesManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYearId = searchParams.get("fiscalYearId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Data from API
  const [fiscalYears, setFiscalYears] = useState([]);
  const [dues, setDues] = useState([]);
  const [dueSettings, setDueSettings] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [currentFiscalYearId, setCurrentFiscalYearId] = useState("");

  // UI state
  const [selectedDueId, setSelectedDueId] = useState(null);
  const [dueForm, setDueForm] = useState({ status: "", paid_date: "", notes: "" });
  const [settingsForm, setSettingsForm] = useState({
    regular_member_amount: "",
    supporting_member_amount: "",
  });

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    const query = fiscalYearId ? `list-dues-admin?fiscalYearId=${fiscalYearId}` : "list-dues-admin";
    apiRequest(query)
      .then((result) => {
        const rawFY = result.fiscal_years;
        setFiscalYears(Array.isArray(rawFY) ? rawFY : []);
        const rawDues = result.dues;
        setDues(Array.isArray(rawDues) ? rawDues : []);
        const rawSettings = result.due_settings;
        setDueSettings(Array.isArray(rawSettings) ? rawSettings : []);
        setSummary(result.summary || {});
        setSelectedFiscalYear(result.selected_fiscal_year || null);
        setCurrentFiscalYearId(result.current_fiscal_year_id || "");

        // Populate settings form from due_settings
        const settings = Array.isArray(result.due_settings) ? result.due_settings : [];
        const regular = settings.find((s) => s.member_type === "正会員");
        const supporting = settings.find((s) => s.member_type === "賛助会員");
        setSettingsForm({
          regular_member_amount: regular ? regular.amount : "",
          supporting_member_amount: supporting ? supporting.amount : "",
        });
      })
      .catch((err) => {
        setError(err.message || "会費データの取得に失敗しました。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fiscalYearId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When a due is selected, populate form
  useEffect(() => {
    if (selectedDueId) {
      const due = dues.find((d) => d.id === selectedDueId);
      if (due) {
        setDueForm({
          status: due.status || "",
          paid_date: due.paid_date || "",
          notes: due.notes || "",
        });
      }
    }
  }, [selectedDueId, dues]);

  const selectedDue = dues.find((d) => d.id === selectedDueId) || null;
  const activeFiscalYearId = selectedFiscalYear?.id || currentFiscalYearId || fiscalYearId;

  function handleFiscalYearChange(e) {
    const val = e.target.value;
    if (val) {
      setSearchParams({ fiscalYearId: val });
    } else {
      setSearchParams({});
    }
    setSelectedDueId(null);
  }

  async function handleSendReminder() {
    const unpaidCount = summary.unpaid_count || 0;
    if (!window.confirm(`未納者 ${unpaidCount} 名にリマインドメールを送信しますか？`)) return;
    setSaving(true);
    try {
      await apiRequest("send-due-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_year_id: activeFiscalYearId }),
      });
      alert("リマインドメールを送信しました。");
    } catch (err) {
      alert(err.message || "送信に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleBatchPaid() {
    if (!window.confirm("全員を納入済にしますか？この操作は取り消せません。")) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await apiRequest("batch-update-dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiscal_year_id: activeFiscalYearId,
          status: "納入済",
          paid_date: today,
        }),
      });
      alert("全員を納入済にしました。");
      loadData();
    } catch (err) {
      alert(err.message || "一括更新に失敗しました。");
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
          settings: [
            { member_type: "正会員", amount: Number(settingsForm.regular_member_amount) || 0 },
            { member_type: "賛助会員", amount: Number(settingsForm.supporting_member_amount) || 0 },
          ],
        }),
      });
      alert("会費設定を保存しました。");
      loadData();
    } catch (err) {
      alert(err.message || "会費設定の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDue(e) {
    e.preventDefault();
    if (!selectedDue) return;

    // Validation
    if (dueForm.status === "納入済" && !dueForm.paid_date) {
      alert("納入済の場合は納入日を入力してください。");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("save-due", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDue.id,
          status: dueForm.status,
          paid_date: dueForm.paid_date,
          notes: dueForm.notes,
        }),
      });
      alert("会費情報を保存しました。");
      loadData();
    } catch (err) {
      alert(err.message || "会費情報の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">会費管理</h1>
          <p className="page-description">年度別の会費管理</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body">
            <LoadingSpinner />
          </div>
        </section>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">会費管理</h1>
          <p className="page-description">年度別の会費管理</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message error">{error}</p>
          </div>
        </section>
      </section>
    );
  }

  const yearLabel = selectedFiscalYear?.year_label || "";

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">会費管理</h1>
        <p className="page-description">年度別の会費管理</p>
      </div>

      <div className="master-detail-layout">
        {/* Left panel: dues list */}
        <section className="card panel-card list-panel">
          <div className="card-body stack">
            <div className="panel-heading">
              <div>
                <h2>会費一覧</h2>
              </div>
            </div>
            {dues.length === 0 ? (
              <p className="muted">会費データがありません。</p>
            ) : (
              <div className="pending-list">
                {dues.map((due) => (
                  <button
                    key={due.id}
                    className={`pending-item${selectedDueId === due.id ? " is-selected" : ""}`}
                    onClick={() => setSelectedDueId(due.id)}
                  >
                    <span className="pending-date">
                      {displayValue(due.member_type)} / {formatCurrency(due.amount)}
                    </span>
                    <strong>{displayValue(due.member_name)}</strong>
                    <span className="pending-status">
                      <span className={`pill${due.status === "納入済" ? " pill-success" : ""}`}>
                        {displayValue(due.status)}
                      </span>
                      {due.paid_date && (
                        <span className="muted" style={{ marginLeft: "0.5rem" }}>
                          {due.paid_date}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right panel: detail / settings */}
        <section className="card panel-card detail-panel">
          <div className="card-body stack">
            {/* 1. Header with year label pill */}
            <div className="panel-heading">
              <div>
                <h2>会費管理</h2>
                {yearLabel && <span className="pill">{yearLabel}</span>}
              </div>
            </div>

            {/* 2. Fiscal year selector */}
            <div className="form-section">
              <label className="field-label" htmlFor="fy-select">
                年度選択
              </label>
              <select
                id="fy-select"
                className="field-input"
                value={activeFiscalYearId}
                onChange={handleFiscalYearChange}
              >
                <option value="">-- 選択 --</option>
                {fiscalYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>
                    {fy.year_label || fy.id}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Summary section */}
            <div className="form-section">
              <h3 className="section-title">サマリー</h3>
              <div className="dashboard-metrics">
                <div className="metric-card">
                  <span className="metric-label">対象者数</span>
                  <span>{summary.total_count || 0}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">納入済</span>
                  <span>{summary.paid_count || 0}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">未納</span>
                  <span>{summary.unpaid_count || 0}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">合計金額</span>
                  <span>{formatCurrency(summary.total_amount)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">納入済金額</span>
                  <span>{formatCurrency(summary.paid_amount)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">未納金額</span>
                  <span>{formatCurrency(summary.unpaid_amount)}</span>
                </div>
              </div>
            </div>

            {/* 4. Batch actions */}
            <div className="form-section">
              <h3 className="section-title">一括操作</h3>
              <div className="actions" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleSendReminder}
                  disabled={saving || !(summary.unpaid_count > 0)}
                >
                  未納者にリマインドメール送信 ({summary.unpaid_count || 0}名)
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleBatchPaid}
                  disabled={saving}
                >
                  全員を納入済にする
                </button>
              </div>
            </div>

            {/* 5. Due settings form */}
            <form className="form-section" onSubmit={handleSaveSettings}>
              <h3 className="section-title">会費設定</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label" htmlFor="regular-amount">
                    正会員 年会費
                  </label>
                  <input
                    id="regular-amount"
                    className="field-input"
                    type="number"
                    min="0"
                    value={settingsForm.regular_member_amount}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        regular_member_amount: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="supporting-amount">
                    賛助会員 年会費
                  </label>
                  <input
                    id="supporting-amount"
                    className="field-input"
                    type="number"
                    min="0"
                    value={settingsForm.supporting_member_amount}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        supporting_member_amount: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="actions" style={{ marginTop: "0.75rem" }}>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  設定を保存
                </button>
              </div>
            </form>

            {/* 6. Selected due editor */}
            {selectedDue && (
              <form className="form-section" onSubmit={handleSaveDue}>
                <h3 className="section-title">会費編集</h3>

                {/* Member info (readonly) */}
                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label">会員名</label>
                    <input
                      className="field-input"
                      type="text"
                      value={displayValue(selectedDue.member_name)}
                      readOnly
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">会員種別</label>
                    <input
                      className="field-input"
                      type="text"
                      value={displayValue(selectedDue.member_type)}
                      readOnly
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">金額</label>
                    <input
                      className="field-input"
                      type="text"
                      value={formatCurrency(selectedDue.amount)}
                      readOnly
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label" htmlFor="due-status">
                      ステータス
                    </label>
                    <select
                      id="due-status"
                      className="field-input"
                      value={dueForm.status}
                      onChange={(e) =>
                        setDueForm((prev) => ({ ...prev, status: e.target.value }))
                      }
                    >
                      <option value="未納">未納</option>
                      <option value="納入済">納入済</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="field-label" htmlFor="due-paid-date">
                      納入日
                    </label>
                    <input
                      id="due-paid-date"
                      className="field-input"
                      type="date"
                      value={dueForm.paid_date}
                      onChange={(e) =>
                        setDueForm((prev) => ({ ...prev, paid_date: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="due-notes">
                    備考
                  </label>
                  <textarea
                    id="due-notes"
                    className="field-input"
                    rows={3}
                    value={dueForm.notes}
                    onChange={(e) =>
                      setDueForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>

                <div className="actions" style={{ marginTop: "0.75rem" }}>
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    保存
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setSelectedDueId(null)}
                  >
                    選択解除
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
