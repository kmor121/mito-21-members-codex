import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

function statusPillClass(status) {
  if (status === "承認済") return " pill-success";
  if (status === "却下") return " pill-danger";
  return " pill-warning";
}

const STATUS_TABS = [
  { key: "all", label: "すべて" },
  { key: "申請中", label: "申請中" },
  { key: "承認済", label: "承認済" },
  { key: "却下", label: "却下" },
];

export default function Applications() {
  const navigate = useNavigate();
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("申請中");

  const loadPending = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const list = await base44.entities.Member.filter(
        { approval_status: { "$in": ["申請中", "承認済", "却下"] } },
        "-created_date"
      );
      setAllMembers(list);
    } catch (err) {
      setError(err.message || "申込一覧の取得に失敗しました。");
      setAllMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const filteredMembers = useMemo(() => {
    if (statusFilter === "all") return allMembers;
    return allMembers.filter((m) => m.approval_status === statusFilter);
  }, [allMembers, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: allMembers.length, "申請中": 0, "承認済": 0, "却下": 0 };
    for (const m of allMembers) {
      const s = m.approval_status || "";
      if (counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [allMembers]);

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">入会申込管理</h1>
        <p className="page-description">入会申込の承認・却下</p>
      </div>

      {/* Status tab bar */}
      <div className="tab-bar" style={{ marginBottom: '1rem' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-button${statusFilter === tab.key ? " is-active" : ""}`}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
            <span className="pill" style={{ marginLeft: 6, fontSize: '0.8em' }}>{statusCounts[tab.key] || 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <section className="card panel-card single-panel"><div className="card-body"><LoadingSpinner /></div></section>
      ) : error ? (
        <section className="card panel-card single-panel"><div className="card-body"><p className="message error">{error}</p></div></section>
      ) : (
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>申込一覧 ({filteredMembers.length}件)</h2></div>
            </div>

            {filteredMembers.length === 0 ? (
              <p className="muted">該当する申込はありません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>氏名</th>
                      <th>会社名</th>
                      <th>申込日</th>
                      <th>紹介者1</th>
                      <th>紹介者2</th>
                      <th>ステータス</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((item) => (
                      <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/applications/${item.id}`)}>
                        <td><strong>{displayValue(item.name_kanji)}</strong></td>
                        <td>{displayValue(item.company_name)}</td>
                        <td>{item.applied_at ? item.applied_at.slice(0, 10) : "-"}</td>
                        <td>{displayValue(item.referrer_1)}</td>
                        <td>{displayValue(item.referrer_2)}</td>
                        <td>
                          <span className={`pill${statusPillClass(item.approval_status)}`}>
                            {displayValue(item.approval_status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
