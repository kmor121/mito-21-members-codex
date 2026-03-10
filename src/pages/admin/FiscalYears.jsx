import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';

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

export default function FiscalYears() {
  const [years, setYears] = useState([]);
  const [currentFiscalYearId, setCurrentFiscalYearId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formIsCurrent, setFormIsCurrent] = useState(false);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  const [copyOrgs, setCopyOrgs] = useState(true);
  const [generateDues, setGenerateDues] = useState(true);
  const [resetIsNew, setResetIsNew] = useState(true);
  const [updateGraduates, setUpdateGraduates] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [confirmTransition, setConfirmTransition] = useState(false);

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
    setUpdateGraduates(true);
    setMessage("");
    setShowModal(true);
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
    setUpdateGraduates(true);
    setMessage("");
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!formYear) { setError("年度は必須です。"); return; }
    if (!formStartDate || !formEndDate) { setError("開始日と終了日は必須です。"); return; }

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
      setShowModal(false);

      const { list } = await loadYears();
      const saved = list.find((y) => y.id === savedId);
      if (saved) setSelectedId(saved.id);
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

  async function executeTransition() {
    setConfirmTransition(false);
    if (!selectedId) return;
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
          update_graduates: updateGraduates,
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

      <ConfirmDialog
        open={confirmTransition}
        title="年度切替確認"
        message="年度切替一括処理を実行しますか？この操作は取り消せません。"
        confirmLabel="実行する"
        confirmStyle={{ background: '#c53030', borderColor: '#c53030' }}
        onConfirm={executeTransition}
        onCancel={() => setConfirmTransition(false)}
      />

      {(error || message) && (
        <p className={`message${error ? " error" : ""}`} aria-live="polite">
          {error || message}
        </p>
      )}

      <section className="card panel-card single-panel">
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
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>年度</th>
                    <th>開始日</th>
                    <th>終了日</th>
                    <th>ステータス</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.id}>
                      <td>
                        <strong>{y.year}年度</strong>
                        {y.is_current && (
                          <span className="pill pill-success" style={{ marginLeft: "0.5rem" }}>現在</span>
                        )}
                      </td>
                      <td>{displayValue(y.start_date)}</td>
                      <td>{displayValue(y.end_date)}</td>
                      <td><span className="pill">{stateLabel(y.state)}</span></td>
                      <td>
                        <button className="text-link" type="button" onClick={() => selectYear(y)}>編集</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Edit Modal */}
      {showModal && (
        <div className="confirm-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedId ? `${formYear}年度 編集` : "新規年度"}</h3>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form className="form-grid" noValidate onSubmit={handleSave}>
                <div className="field">
                  <label htmlFor="fy-year">年度</label>
                  <input id="fy-year" type="number" min={2000} max={2100} value={formYear} onChange={(e) => setFormYear(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="fy-is-current" className="checkbox-label">
                    <input id="fy-is-current" type="checkbox" checked={formIsCurrent} onChange={(e) => setFormIsCurrent(e.target.checked)} />
                    現在年度
                  </label>
                </div>
                <div className="field">
                  <label htmlFor="fy-start">開始日</label>
                  <input id="fy-start" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="fy-end">終了日</label>
                  <input id="fy-end" type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} required />
                </div>

                <div className="filter-actions field-span-2">
                  <button className="button" type="submit" disabled={saving}>
                    {saving ? "保存中..." : "保存する"}
                  </button>
                  {selectedId && !formIsCurrent && (
                    <button className="button ghost" type="button" disabled={saving} onClick={handleSetCurrent}>
                      現在年度にする
                    </button>
                  )}
                </div>
              </form>

              {selectedId && !selected?.is_current && (
                <div className="stack" style={{ marginTop: "2rem", borderTop: "1px solid var(--line)", paddingTop: "1.5rem" }}>
                  <h3>年度切替一括処理</h3>
                  <p className="muted">選択中の年度へ切り替える一括処理を実行します。</p>
                  <div className="field">
                    <label className="checkbox-label"><input type="checkbox" checked={copyOrgs} onChange={(e) => setCopyOrgs(e.target.checked)} /> 組織構成をコピーする</label>
                  </div>
                  <div className="field">
                    <label className="checkbox-label"><input type="checkbox" checked={generateDues} onChange={(e) => setGenerateDues(e.target.checked)} /> 会費レコードを生成する</label>
                  </div>
                  <div className="field">
                    <label className="checkbox-label"><input type="checkbox" checked={resetIsNew} onChange={(e) => setResetIsNew(e.target.checked)} /> 新入会員フラグをリセットする</label>
                  </div>
                  <div className="field">
                    <label className="checkbox-label"><input type="checkbox" checked={updateGraduates} onChange={(e) => setUpdateGraduates(e.target.checked)} /> 卒業生フラグを自動更新する</label>
                  </div>
                  <div className="filter-actions">
                    <button className="button" type="button" style={{ background: "#c53030", borderColor: "#c53030" }} disabled={saving} onClick={() => setConfirmTransition(true)}>
                      年度切替を実行する
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
