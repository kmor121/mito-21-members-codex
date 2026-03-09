import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function FiscalYears() {
  const [years, setYears] = useState([]);
  const [currentFiscalYearId, setCurrentFiscalYearId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Editor form state
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formIsCurrent, setFormIsCurrent] = useState(false);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  // Transition options
  const [copyOrgs, setCopyOrgs] = useState(true);
  const [generateDues, setGenerateDues] = useState(true);
  const [resetIsNew, setResetIsNew] = useState(true);

  const loadYears = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("list-fiscal-years-admin");
      const raw = result.fiscal_years;
      const list = Array.isArray(raw) ? raw : [];
      const curId = result.current_fiscal_year_id || null;
      setYears(list);
      setCurrentFiscalYearId(curId);
      return { list, curId };
    } catch (err) {
      setError(err.message || "年度一覧の取得に失敗しました。");
      return { list: [], curId: null };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadYears().then(({ list, curId }) => {
      if (curId && list.find((y) => y.id === curId)) {
        selectYear(list.find((y) => y.id === curId));
      } else if (list.length > 0) {
        selectYear(list[0]);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function selectYear(y) {
    setSelectedId(y.id || null);
    setFormYear(y.year || new Date().getFullYear());
    setFormIsCurrent(!!y.is_current);
    setFormStartDate(y.start_date || "");
    setFormEndDate(y.end_date || "");
    setCopyOrgs(true);
    setGenerateDues(true);
    setResetIsNew(true);
    setMessage("");
  }

  function handleNew() {
    const now = new Date().getFullYear();
    setSelectedId(null);
    setFormYear(now);
    setFormIsCurrent(false);
    setFormStartDate(`${now}-01-01`);
    setFormEndDate(`${now}-12-31`);
    setCopyOrgs(true);
    setGenerateDues(true);
    setResetIsNew(true);
    setMessage("");
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!formYear) {
      setError("年度は必須です。");
      return;
    }
    if (!formStartDate || !formEndDate) {
      setError("開始日と終了日は必須です。");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        year: Number(formYear),
        start_date: formStartDate,
        end_date: formEndDate,
        is_current: formIsCurrent,
      };
      if (selectedId) payload.id = selectedId;

      const result = await apiRequest("save-fiscal-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const savedId = result.id || selectedId;
      setMessage("保存しました。");

      const { list } = await loadYears();
      const saved = list.find((y) => y.id === savedId);
      if (saved) selectYear(saved);
    } catch (err) {
      setError(err.message || "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetCurrent() {
    if (!selectedId) return;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await apiRequest("set-current-fiscal-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId }),
      });
      setMessage("現在年度を変更しました。");
      const { list } = await loadYears();
      const saved = list.find((y) => y.id === selectedId);
      if (saved) selectYear(saved);
    } catch (err) {
      setError(err.message || "現在年度の設定に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleTransition() {
    if (!selectedId) return;
    if (!window.confirm("年度切替一括処理を実行しますか？\nこの操作は取り消せません。")) return;

    setError("");
    setMessage("");
    setSaving(true);
    try {
      const result = await apiRequest("execute-fiscal-year-transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_fiscal_year_id: selectedId,
          copy_organizations: copyOrgs,
          generate_dues: generateDues,
          reset_is_new: resetIsNew,
        }),
      });
      setMessage(result.log || "年度切替処理が完了しました。");
      await loadYears();
    } catch (err) {
      setError(err.message || "年度切替処理に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  const selected = years.find((y) => y.id === selectedId) || null;

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">年度管理</h1>
        <p className="page-description">年度の管理・年度切替</p>
      </div>

      {(error || message) && (
        <p className={`message${error ? " error" : ""}`} aria-live="polite">
          {error || message}
        </p>
      )}

      <div className="master-detail">
        {/* Left: year list */}
        <section className="card panel-card list-panel">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>年度一覧</h2></div>
              <button className="button" type="button" onClick={handleNew}>新規追加</button>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : years.length === 0 ? (
              <p className="empty-state">年度データがありません。</p>
            ) : (
              <div className="pending-list">
                {years.map((y) => (
                  <div
                    key={y.id}
                    className={`basic-info-document${y.id === selectedId ? " selected" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => selectYear(y)}
                  >
                    <div>
                      <strong>{y.year}年度</strong>
                      {y.is_current && (
                        <span className="pill pill-success" style={{ marginLeft: "0.5rem" }}>現在</span>
                      )}
                    </div>
                    <div>
                      <span className="pill">{stateLabel(y.state)}</span>
                      <span className="muted" style={{ marginLeft: "0.5rem" }}>
                        {displayValue(y.start_date)} - {displayValue(y.end_date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: year editor */}
        <section className="card panel-card detail-panel">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>{selectedId ? `${formYear}年度 編集` : "新規年度"}</h2></div>
            </div>

            <form className="form-grid" noValidate onSubmit={handleSave}>
              <div className="field">
                <label htmlFor="fy-year">年度</label>
                <input
                  id="fy-year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="fy-is-current" className="checkbox-label">
                  <input
                    id="fy-is-current"
                    type="checkbox"
                    checked={formIsCurrent}
                    onChange={(e) => setFormIsCurrent(e.target.checked)}
                  />
                  現在年度
                </label>
              </div>

              <div className="field">
                <label htmlFor="fy-start">開始日</label>
                <input
                  id="fy-start"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="fy-end">終了日</label>
                <input
                  id="fy-end"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  required
                />
              </div>

              {selected && (
                <div className="field field-span-2">
                  <div className="info-block">
                    <p><span className="muted">保存済ステータス:</span> {stateLabel(selected.state)}</p>
                    <p><span className="muted">保存済開始日:</span> {displayValue(selected.start_date)}</p>
                    <p><span className="muted">保存済終了日:</span> {displayValue(selected.end_date)}</p>
                  </div>
                </div>
              )}

              <div className="filter-actions">
                <button className="button" type="submit" disabled={saving}>
                  {saving ? "保存中..." : "保存する"}
                </button>
                {selectedId && !formIsCurrent && (
                  <button
                    className="button ghost"
                    type="button"
                    disabled={saving}
                    onClick={handleSetCurrent}
                  >
                    現在年度にする
                  </button>
                )}
              </div>
            </form>

            {/* Transition section */}
            {selectedId && !selected?.is_current && (
              <div className="stack" style={{ marginTop: "2rem", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
                <h3>年度切替一括処理</h3>
                <p className="muted">選択中の年度へ切り替える一括処理を実行します。</p>

                <div className="field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={copyOrgs}
                      onChange={(e) => setCopyOrgs(e.target.checked)}
                    />
                    組織構成をコピーする
                  </label>
                </div>
                <div className="field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={generateDues}
                      onChange={(e) => setGenerateDues(e.target.checked)}
                    />
                    会費レコードを生成する
                  </label>
                </div>
                <div className="field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={resetIsNew}
                      onChange={(e) => setResetIsNew(e.target.checked)}
                    />
                    新入会員フラグをリセットする
                  </label>
                </div>

                <div className="filter-actions">
                  <button
                    className="button"
                    type="button"
                    style={{ background: "#c53030", borderColor: "#c53030" }}
                    disabled={saving}
                    onClick={handleTransition}
                  >
                    年度切替を実行する
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
