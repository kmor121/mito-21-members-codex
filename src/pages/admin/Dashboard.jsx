import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import { useMultiCache } from '../../hooks/useDataCache';
import { useIsMobile } from '../../hooks/useIsMobile';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { data: raw, loading, error } = useMultiCache([
    { key: "members:approved", fetcher: () => base44.entities.Member.filter({ approval_status: "承認済" }) },
    { key: "members:pending", fetcher: () => base44.entities.Member.filter({ approval_status: "申請中" }) },
    { key: "fiscalYears:all", fetcher: () => base44.entities.FiscalYear.list() },
    { key: "dues:all", fetcher: () => base44.entities.Due.list() },
    { key: "newsletters:recent", fetcher: () => base44.entities.Newsletter.list("-created_date", 5) },
  ]);

  const data = useMemo(() => {
    if (!raw) return null;
    const members = raw["members:approved"] || [];
    const pendingMembers = raw["members:pending"] || [];
    const fiscalYears = raw["fiscalYears:all"] || [];
    const dues = raw["dues:all"] || [];
    const newsletters = raw["newsletters:recent"] || [];

    const currentFy = fiscalYears.find((fy) => fy.is_current === true);
    const currentDues = currentFy ? dues.filter((d) => d.fiscal_year_id === currentFy.id) : [];
    const paidCount = currentDues.filter((d) => d.status === "納入済").length;
    const totalCount = currentDues.length;

    return {
      pending_application_count: pendingMembers.length,
      paid_count: paidCount,
      total_count: totalCount,
      regular_count: members.filter((m) => m.member_type === "正会員" && m.status === "活動中").length,
      supporting_count: members.filter((m) => m.member_type === "賛助会員" && m.status === "活動中").length,
      ob_count: members.filter((m) => m.member_type === "OB会員" && m.status === "活動中").length,
      paused_count: members.filter((m) => m.status === "休会").length,
      new_count: members.filter((m) => m.is_new === true).length,
      recent_newsletters: newsletters.map((nl) => ({
        id: nl.id,
        title: nl.title || nl.subject || "",
        channel: nl.channel || "",
        status: nl.status === "sent" ? "送信済" : nl.status === "scheduled" ? "予約中" : nl.status === "draft" ? "下書き" : nl.status || "",
        date: nl.last_sent_at ? nl.last_sent_at.slice(0, 10) : nl.created_date ? nl.created_date.slice(0, 10) : "",
      })),
    };
  }, [raw]);

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">ダッシュボード</h1>
          <p className="page-description">管理者ダッシュボード</p>
        </div>
        <section className="card panel-card single-panel"><div className="card-body"><LoadingSpinner /></div></section>
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
        <section className="card panel-card single-panel"><div className="card-body stack"><p className="message error">{error}</p></div></section>
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
  const newsletters = data.recent_newsletters || [];

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">ダッシュボード</h1>
        <p className="page-description">管理者ダッシュボード</p>
      </div>

      <div className="dashboard-grid" style={isMobile ? { display: 'flex', flexDirection: 'column', gap: '0.75rem' } : undefined}>
        <section className="card detail-card stack-sm accent-warning">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>未処理の入会申込</h2></div></div>
            <p style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: 700, margin: 0 }}>{pendingCount}</p>
            <p className="muted" style={isMobile ? { fontSize: '12px' } : undefined}>件の申込が承認待ちです</p>
            <div className="actions"><Link className="text-link" to="/admin/applications">申込管理へ</Link></div>
          </div>
        </section>

        <section className="card detail-card stack-sm accent-info">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>会費納入率</h2></div></div>
            <p style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: 700, margin: 0 }}>{dueRate}%</p>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${dueRate}%` }} /></div>
            <p className="muted" style={isMobile ? { fontSize: '12px' } : undefined}>{paidCount} / {totalCount} 名が納入済</p>
          </div>
        </section>

        <section className="card detail-card stack-sm">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>会員サマリー</h2></div></div>
            {isMobile ? (
              <div className="stat-chip-bar">
                <div className="stat-chip">
                  <span className="stat-chip-icon" style={{ background: '#3b82f6' }}>正</span>
                  <span className="stat-chip-value">正会員: <b>{regularCount}</b></span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-icon" style={{ background: '#8b5cf6' }}>賛</span>
                  <span className="stat-chip-value">賛助会員: <b>{supportingCount}</b></span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-icon" style={{ background: '#6b7280' }}>OB</span>
                  <span className="stat-chip-value">OB会員: <b>{obCount}</b></span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-icon" style={{ background: '#f59e0b' }}>休</span>
                  <span className="stat-chip-value">休会中: <b>{pausedCount}</b></span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-icon" style={{ background: '#10b981' }}>新</span>
                  <span className="stat-chip-value">新入会員: <b>{newCount}</b></span>
                </div>
              </div>
            ) : (
              <div className="dashboard-metrics">
                <div className="metric-card"><span className="metric-label">正会員</span><span>{regularCount}</span></div>
                <div className="metric-card"><span className="metric-label">賛助会員</span><span>{supportingCount}</span></div>
                <div className="metric-card"><span className="metric-label">OB会員</span><span>{obCount}</span></div>
                <div className="metric-card"><span className="metric-label">休会中</span><span>{pausedCount}</span></div>
                <div className="metric-card"><span className="metric-label">新入会員</span><span>{newCount}</span></div>
              </div>
            )}
          </div>
        </section>

        <section className="card detail-card stack-sm">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>最近の配信</h2></div></div>
            {newsletters.length === 0 ? (
              <p className="muted">配信履歴はありません。</p>
            ) : (
              <div className="pending-list">
                {newsletters.map((nl, idx) => (
                  <div key={nl.id || idx} className="basic-info-document" style={isMobile ? { flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' } : undefined}>
                    <div>
                      <strong>{nl.title || "-"}</strong>
                      <span className="muted" style={{ marginLeft: "0.5rem", fontSize: isMobile ? '12px' : undefined }}>{nl.channel || "-"}</span>
                    </div>
                    <div>
                      <span className={`pill${nl.status === "送信済" ? " pill-success" : ""}`} style={isMobile ? { fontSize: '12px' } : undefined}>{nl.status || "-"}</span>
                      <span className="muted" style={{ marginLeft: "0.5rem", fontSize: isMobile ? '12px' : undefined }}>{nl.date || "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="card detail-card stack-sm">
          <div className="card-body stack">
            <div className="panel-heading"><div><h2>クイックアクション</h2></div></div>
            <div className="actions" style={{ flexWrap: "wrap", gap: "0.5rem", flexDirection: isMobile ? 'column' : undefined }}>
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
