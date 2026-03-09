import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("get-admin-dashboard")
      .then((result) => {
        setData(result);
      })
      .catch((err) => {
        setError(err.message || "ダッシュボードの取得に失敗しました。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">ダッシュボード</h1>
          <p className="page-description">管理者ダッシュボード</p>
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
          <h1 className="page-title">ダッシュボード</h1>
          <p className="page-description">管理者ダッシュボード</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message error">{error}</p>
          </div>
        </section>
      </section>
    );
  }

  const pendingCount = data.pending_application_count || 0;
  const paidCount = data.paid_count || 0;
  const totalCount = data.total_count || 0;
  const dueRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const regularCount = data.regular_count || 0;
  const supportingCount = data.supporting_count || 0;
  const obCount = data.ob_count || 0;
  const pausedCount = data.paused_count || 0;
  const newCount = data.new_count || 0;
  const rawNl = data.recent_newsletters;
  const newsletters = (Array.isArray(rawNl) ? rawNl : []).slice(0, 5);

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">ダッシュボード</h1>
        <p className="page-description">管理者ダッシュボード</p>
      </div>

      <div className="dashboard-grid">
        {/* Pending applications card */}
        <section className="card detail-card stack-sm accent-warning">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>未処理の入会申込</h2></div>
            </div>
            <p style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>{pendingCount}</p>
            <p className="muted">件の申込が承認待ちです</p>
            <div className="actions">
              <Link className="text-link" to="/admin/applications">申込管理へ</Link>
            </div>
          </div>
        </section>

        {/* Due rate card */}
        <section className="card detail-card stack-sm accent-info">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>会費納入率</h2></div>
            </div>
            <p style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>{dueRate}%</p>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${dueRate}%` }} />
            </div>
            <p className="muted">{paidCount} / {totalCount} 名が納入済</p>
          </div>
        </section>

        {/* Member summary metrics */}
        <section className="card detail-card stack-sm">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>会員サマリー</h2></div>
            </div>
            <div className="dashboard-metrics">
              <div className="metric-card">
                <span className="metric-label">正会員</span>
                <span>{regularCount}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">賛助会員</span>
                <span>{supportingCount}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">OB会員</span>
                <span>{obCount}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">休会中</span>
                <span>{pausedCount}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">新入会員</span>
                <span>{newCount}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent newsletters */}
        <section className="card detail-card stack-sm">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>最近の配信</h2></div>
            </div>
            {newsletters.length === 0 ? (
              <p className="muted">配信履歴はありません。</p>
            ) : (
              <div className="pending-list">
                {newsletters.map((nl, idx) => (
                  <div key={nl.id || idx} className="basic-info-document">
                    <div>
                      <strong>{nl.title || "-"}</strong>
                      <span className="muted" style={{ marginLeft: "0.5rem" }}>{nl.channel || "-"}</span>
                    </div>
                    <div>
                      <span className={`pill${nl.status === "送信済" ? " pill-success" : ""}`}>{nl.status || "-"}</span>
                      <span className="muted" style={{ marginLeft: "0.5rem" }}>{nl.date || "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Quick actions */}
        <section className="card detail-card stack-sm">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>クイックアクション</h2></div>
            </div>
            <div className="actions" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
              <Link className="text-link" to="/admin/members">会員一覧</Link>
              <Link className="text-link" to="/admin/applications">申込管理</Link>
              <Link className="text-link" to="/admin/dues-management">会費管理</Link>
              <Link className="text-link" to="/admin/organization-chart">組織図管理</Link>
              <Link className="text-link" to="/admin/newsletters">配信管理</Link>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
