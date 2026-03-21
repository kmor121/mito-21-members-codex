import { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import useDataCache from '../../hooks/useDataCache';
import { useIsMobile } from '../../hooks/useIsMobile';
import { PageHeader } from '../../components/ui';

/* ─── tiny skeleton ─── */
function Skeleton({ width = '100%', height = 16, radius = 6, style }) {
  return <div className="db-skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}
function SkeletonCard({ lines = 3 }) {
  return (
    <div className="db-card db-skeleton-card">
      <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '90%'} height={12} style={{ marginBottom: 8 }} />
      ))}
    </div>
  );
}

/* ─── progress bar color helper ─── */
function rateColor(rate) {
  if (rate >= 80) return 'var(--color-success)';
  if (rate >= 50) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

/* ─── status dot ─── */
function Dot({ color }) {
  return (
    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6, flexShrink: 0 }} />
  );
}

/* ─── Section wrapper with fade-in ─── */
function Section({ title, loading, error, children, linkTo, linkLabel, delay = 0 }) {
  return (
    <div className={`db-card${loading ? '' : ' db-fade-in'}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      <div className="db-card-header">
        <span className="db-card-title">{title}</span>
        {linkTo && !loading && (
          <Link className="text-link" to={linkTo} style={{ fontSize: 12 }}>{linkLabel || '詳細'}</Link>
        )}
      </div>
      <div className="db-card-body">
        {error ? <p style={{ color: 'var(--color-danger)', fontSize: 13, margin: 0 }}>{error}</p> : children}
      </div>
    </div>
  );
}

/* ─── format date helper ─── */
function fmtMeetingDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const dow = ['日','月','火','水','木','金','土'][dt.getDay()];
  return `${dt.getMonth() + 1}/${dt.getDate()}(${dow})`;
}

/* ═══ Dashboard ═══ */
export default function Dashboard() {
  const isMobile = useIsMobile();
  useEffect(() => { try { base44.appLogs?.logUserInApp?.('A1-ダッシュボード'); } catch (e) { /* analytics */ } }, []);

  const { data: approvedMembers, loading: loadMembers, error: errMembers } = useDataCache(
    'dash:members:approved', () => base44.entities.Member.filter({ approval_status: '承認済' }),
  );
  const { data: pendingMembers, loading: loadPending, error: errPending } = useDataCache(
    'dash:members:pending', () => base44.entities.Member.filter({ approval_status: '申請中' }),
  );
  const { data: fiscalYears, loading: loadFy, error: errFy } = useDataCache(
    'dash:fy:all', () => base44.entities.FiscalYear.list(),
  );
  const { data: allDues, loading: loadDues, error: errDues } = useDataCache(
    'dash:dues:all', () => base44.entities.Due.list(),
  );
  const { data: meetings, loading: loadMtg, error: errMtg } = useDataCache(
    'dash:meetings:all', () => base44.entities.Meeting.list('-meeting_date', 10),
  );

  const currentFy = useMemo(() => {
    if (!fiscalYears) return null;
    return fiscalYears.find(fy => fy.is_current === true) || null;
  }, [fiscalYears]);

  const fyLabel = currentFy ? (currentFy.year_label || (currentFy.year ? `${currentFy.year}年度` : '')) : '';

  const memberStats = useMemo(() => {
    if (!approvedMembers) return null;
    const m = approvedMembers;
    return {
      total: m.filter(x => x.status === '活動中').length,
      regular: m.filter(x => x.member_type === '正会員' && x.status === '活動中').length,
      supporting: m.filter(x => x.member_type === '賛助会員' && x.status === '活動中').length,
    };
  }, [approvedMembers]);

  const duesStats = useMemo(() => {
    if (!currentFy || !allDues) return null;
    const currentDues = allDues.filter(d => d.fiscal_year_id === currentFy.id);
    const paid = currentDues.filter(d => d.status === '納入済').length;
    const total = currentDues.length;
    const unpaid = currentDues.filter(d => d.status === '未納').length;
    const rate = total > 0 ? Math.round((paid / total) * 100) : 0;
    return { paid, total, unpaid, rate };
  }, [currentFy, allDues]);

  const nextMeeting = useMemo(() => {
    if (!meetings) return null;
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = meetings.filter(m => m.meeting_date >= today && m.status === '公開').sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
    if (upcoming.length > 0) return { ...upcoming[0], isUpcoming: true };
    const completed = meetings.filter(m => m.status === '完了').sort((a, b) => (b.meeting_date || '').localeCompare(a.meeting_date || ''));
    if (completed.length > 0) return { ...completed[0], isUpcoming: false };
    return null;
  }, [meetings]);

  const pendingCount = pendingMembers?.length || 0;
  const unpaidCount = duesStats?.unpaid || 0;

  return (
    <section className="admin-shell">
      {isMobile ? (
        <div style={{ padding: '0 0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: 18 }}>ダッシュボード</h1>
            {fyLabel && <span className="db-fy-badge">{fyLabel}</span>}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>水戸21の会 管理ダッシュボード</p>
        </div>
      ) : (
        <PageHeader
          title="ダッシュボード"
          subtitle="水戸21の会 管理ダッシュボード"
          actions={fyLabel && <span className="db-fy-badge">{fyLabel}</span>}
        />
      )}

      {/* ═══ Tier 1: KPI Cards ═══ */}
      <div className="db-tier1">
        {loadMembers ? <SkeletonCard lines={3} /> : (
          <Section title="会員概況" loading={false} error={errMembers} linkTo="/admin/members" linkLabel="会員一覧" delay={0}>
            {memberStats && (
              <>
                <div className="db-big-number">{memberStats.total}<span className="db-big-unit">名</span></div>
                <div className="db-stat-grid">
                  <div className="db-stat-row"><Dot color="var(--color-accent)" />正会員<span className="db-stat-val">{memberStats.regular}</span></div>
                  <div className="db-stat-row"><Dot color="#8b5cf6" />賛助会員<span className="db-stat-val">{memberStats.supporting}</span></div>
                </div>
              </>
            )}
          </Section>
        )}

        {(loadFy || loadDues) ? <SkeletonCard lines={3} /> : (
          <Section title="会費回収状況" loading={false} error={errFy || errDues} linkTo="/admin/dues-management" linkLabel="会費管理" delay={50}>
            {duesStats && (
              <>
                <div className="db-big-number" style={{ color: rateColor(duesStats.rate) }}>
                  {duesStats.rate}<span className="db-big-unit">%</span>
                </div>
                <div className="db-progress-track">
                  <div className="db-progress-fill" style={{ width: `${duesStats.rate}%`, background: rateColor(duesStats.rate) }} />
                </div>
                <p className="db-sub-text">
                  {duesStats.paid} / {duesStats.total} 名が納入済
                  {duesStats.unpaid > 0 && <span style={{ color: 'var(--color-danger)', fontWeight: 600, marginLeft: 8 }}>未納 {duesStats.unpaid}件</span>}
                </p>
              </>
            )}
          </Section>
        )}

        {loadMtg ? <SkeletonCard lines={3} /> : (
          <Section title={nextMeeting?.isUpcoming ? '次回幹事会' : '直近の幹事会'} loading={false} error={errMtg} linkTo="/admin/meetings" linkLabel="幹事会一覧" delay={100}>
            {nextMeeting ? (
              <>
                <div className="db-meeting-title">{nextMeeting.title}</div>
                <div className="db-meeting-meta">
                  <span className="db-meeting-meta-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.75" y="2.75" width="10.5" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.75 5.75h10.5" stroke="currentColor" strokeWidth="1.2"/><line x1="4.5" y1="1.25" x2="4.5" y2="3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="9.5" y1="1.25" x2="9.5" y2="3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    {fmtMeetingDate(nextMeeting.meeting_date)}
                  </span>
                  {nextMeeting.start_time && (
                    <span className="db-meeting-meta-item">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4.25V7l2.25 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {nextMeeting.start_time}{nextMeeting.end_time ? `〜${nextMeeting.end_time}` : ''}
                    </span>
                  )}
                </div>
                {nextMeeting.location && (
                  <div className="db-meeting-meta" style={{ marginTop: 2 }}>
                    <span className="db-meeting-meta-item">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.75a3.5 3.5 0 0 0-3.5 3.5C3.5 8.75 7 12.25 7 12.25s3.5-3.5 3.5-7a3.5 3.5 0 0 0-3.5-3.5Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" fill="currentColor"/></svg>
                      {nextMeeting.location}
                    </span>
                  </div>
                )}
                {!nextMeeting.isUpcoming && <span className="pill" style={{ marginTop: 6, fontSize: 11 }}>完了</span>}
              </>
            ) : (
              <p className="db-sub-text">予定されている幹事会はありません</p>
            )}
          </Section>
        )}
      </div>

      {/* ═══ Tier 2: Action Items ═══ */}
      {(loadPending || loadFy || loadDues) ? (
        <div className="db-tier2"><SkeletonCard lines={2} /></div>
      ) : (
        <div className="db-tier2">
          <Section title="要対応" loading={false} error={errPending} delay={150}>
            <div className="db-action-list">
              <Link to="/admin/applications" className="db-action-item" style={pendingCount > 0 ? { background: 'var(--color-danger-light)' } : undefined}>
                <div className="db-action-left">
                  <Dot color={pendingCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'} />
                  <span>入会申込</span>
                </div>
                {pendingCount > 0 ? (
                  <span className="db-action-badge db-action-badge-alert">{pendingCount}件 未処理</span>
                ) : (
                  <span className="db-action-badge db-action-badge-ok">未処理なし</span>
                )}
              </Link>
              <Link to="/admin/dues-management" className="db-action-item" style={unpaidCount > 0 ? { background: 'var(--color-warning-light)' } : undefined}>
                <div className="db-action-left">
                  <Dot color={unpaidCount > 0 ? 'var(--color-warning)' : 'var(--color-success)'} />
                  <span>会費未納</span>
                </div>
                {unpaidCount > 0 ? (
                  <span className="db-action-badge db-action-badge-warn">{unpaidCount}件</span>
                ) : (
                  <span className="db-action-badge db-action-badge-ok">未納なし</span>
                )}
              </Link>
            </div>
          </Section>
        </div>
      )}

      {/* ═══ Tier 3: Quick Actions ═══ */}
      <div className="db-tier3">
        <div className="db-card db-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="db-card-header">
            <span className="db-card-title">クイックアクション</span>
          </div>
          <div className="db-quick-grid">
            <Link className="db-quick-btn" to="/admin/members/new">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              会員追加
            </Link>
            <Link className="db-quick-btn" to="/admin/newsletters/new">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              配信作成
            </Link>
            <Link className="db-quick-btn" to="/admin/meetings">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              幹事会管理
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ Scoped styles ═══ */}
      <style>{`
        .db-skeleton {
          background: linear-gradient(90deg, var(--color-bg-sub) 25%, #e8ecf1 50%, var(--color-bg-sub) 75%);
          background-size: 200% 100%; animation: db-shimmer 1.5s infinite;
        }
        @keyframes db-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .db-skeleton-card { padding: 20px; min-height: 120px; }
        .db-fade-in { animation: db-fadein 0.35s ease both; }
        @keyframes db-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .db-fy-badge {
          display: inline-flex; align-items: center; padding: 4px 14px; border-radius: 999px;
          font-size: 13px; font-weight: 600; background: var(--color-accent-light);
          color: var(--color-accent); border: 1px solid var(--color-accent-light); white-space: nowrap;
        }

        .db-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
        .db-card-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px 10px; border-bottom: 1px solid var(--color-border); }
        .db-card-title { font-size: 13px; font-weight: 700; color: var(--color-text-primary); letter-spacing: 0.02em; }
        .db-card-body { padding: 14px 18px 18px; }

        .db-tier1 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
        .db-tier2 { margin-bottom: 16px; }
        .db-tier3 { margin-bottom: 8px; }

        .db-big-number { font-size: 32px; font-weight: 800; color: var(--color-text-primary); line-height: 1.1; margin-bottom: 8px; }
        .db-big-unit { font-size: 14px; font-weight: 600; margin-left: 2px; color: var(--color-text-secondary); }

        .db-stat-grid { display: flex; flex-direction: column; gap: 4px; }
        .db-stat-row { display: flex; align-items: center; font-size: 13px; color: var(--color-text-secondary); }
        .db-stat-val { margin-left: auto; font-weight: 700; color: var(--color-text-primary); font-size: 14px; }

        .db-progress-track { width: 100%; height: 8px; background: var(--color-bg-sub); border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
        .db-progress-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }

        .db-sub-text { font-size: 12px; color: var(--color-text-secondary); margin: 0; }

        .db-meeting-title { font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 6px; }
        .db-meeting-meta { display: flex; gap: 12px; font-size: 13px; color: var(--color-text-secondary); margin-bottom: 2px; flex-wrap: wrap; }
        .db-meeting-meta-item { display: inline-flex; align-items: center; gap: 4px; }

        .db-action-list { display: flex; flex-direction: column; gap: 8px; }
        .db-action-item {
          display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;
          border-radius: var(--radius-md); border: 1px solid var(--color-border); text-decoration: none;
          color: var(--color-text-primary); font-size: 14px; font-weight: 600; transition: box-shadow var(--transition-fast);
        }
        .db-action-item:hover { box-shadow: var(--shadow-md); }
        .db-action-left { display: flex; align-items: center; }
        .db-action-badge { padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .db-action-badge-alert { background: var(--color-danger); color: #fff; }
        .db-action-badge-warn { background: var(--color-warning); color: #fff; }
        .db-action-badge-ok { background: var(--color-bg-sub); color: var(--color-text-secondary); font-weight: 500; }

        .db-quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 14px 18px 18px; }
        .db-quick-btn {
          display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--radius-md);
          border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text-primary);
          font-size: 13px; font-weight: 600; text-decoration: none; transition: all var(--transition-fast);
        }
        .db-quick-btn:hover { background: var(--color-accent-light); border-color: var(--color-accent-light); color: var(--color-accent); }
        .db-quick-btn svg { color: var(--color-text-secondary); flex-shrink: 0; }
        .db-quick-btn:hover svg { color: var(--color-accent); }

        @media (max-width: 768px) {
          .db-tier1 { grid-template-columns: 1fr; gap: 12px; margin-bottom: 12px; }
          .db-tier2 { margin-bottom: 12px; }
          .db-quick-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 12px 14px 14px; }
          .db-card-header { padding: 12px 14px 8px; }
          .db-card-body { padding: 12px 14px 14px; }
          .db-big-number { font-size: 26px; }
          .db-quick-btn { padding: 8px 10px; font-size: 12px; gap: 6px; }
          .db-action-item { padding: 10px 12px; font-size: 13px; }
          .db-fy-badge { font-size: 12px; padding: 3px 10px; }
        }
      `}</style>
    </section>
  );
}
