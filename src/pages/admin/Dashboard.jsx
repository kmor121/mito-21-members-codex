import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import useDataCache from '../../hooks/useDataCache';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fullName } from '../../utils/formatName';

/* ─── tiny skeleton ─── */
function Skeleton({ width = '100%', height = 16, radius = 6, style }) {
  return (
    <div
      className="db-skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
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
  if (rate >= 80) return 'var(--success)';
  if (rate >= 50) return 'var(--warning)';
  return 'var(--error)';
}

/* ─── status dot ─── */
function Dot({ color }) {
  return (
    <span
      style={{
        display: 'inline-block', width: 8, height: 8,
        borderRadius: '50%', background: color, marginRight: 6, flexShrink: 0,
      }}
    />
  );
}

/* ─── Section wrapper with fade-in ─── */
function Section({ title, loading, error, children, linkTo, linkLabel }) {
  return (
    <div className={`db-card${loading ? '' : ' db-fade-in'}`}>
      <div className="db-card-header">
        <span className="db-card-title">{title}</span>
        {linkTo && !loading && (
          <Link className="text-link" to={linkTo} style={{ fontSize: 12 }}>{linkLabel || '詳細'}</Link>
        )}
      </div>
      <div className="db-card-body">
        {error ? <p style={{ color: 'var(--error)', fontSize: 13 }}>{error}</p> : children}
      </div>
    </div>
  );
}

/* ─── format date helper ─── */
function fmtDate(d) {
  if (!d) return '-';
  const s = typeof d === 'string' ? d.slice(0, 10) : '';
  if (!s) return '-';
  const [y, m, day] = s.split('-');
  return `${Number(m)}/${Number(day)}`;
}

function fmtDateTime(d) {
  if (!d) return '-';
  const s = typeof d === 'string' ? d : '';
  if (s.length >= 16) return `${fmtDate(s)} ${s.slice(11, 16)}`;
  return fmtDate(s);
}

/* ─── field name mapping for change log ─── */
const FIELD_LABELS = {
  status: 'ステータス',
  member_type: '会員種別',
  approval_status: '承認状態',
  app_role: '権限',
  last_name: '姓',
  first_name: '名',
  email: 'メール',
  phone: '電話',
  company_name: '会社名',
  position: '役職',
};

/* ═══════════════════════════════════════════
   Dashboard
   ═══════════════════════════════════════════ */
export default function Dashboard() {
  const isMobile = useIsMobile();

  /* ── Tier 1 data sources (independent) ── */

  // Members
  const { data: approvedMembers, loading: loadMembers, error: errMembers } = useDataCache(
    'dash:members:approved',
    () => base44.entities.Member.filter({ approval_status: '承認済' }),
  );
  const { data: pendingMembers, loading: loadPending, error: errPending } = useDataCache(
    'dash:members:pending',
    () => base44.entities.Member.filter({ approval_status: '申請中' }),
  );

  // Fiscal years + Dues
  const { data: fiscalYears, loading: loadFy, error: errFy } = useDataCache(
    'dash:fy:all',
    () => base44.entities.FiscalYear.list(),
  );
  const { data: allDues, loading: loadDues, error: errDues } = useDataCache(
    'dash:dues:all',
    () => base44.entities.Due.list(),
  );

  // Meetings
  const { data: meetings, loading: loadMtg, error: errMtg } = useDataCache(
    'dash:meetings:all',
    () => base44.entities.Meeting.list('-meeting_date', 10),
  );

  // Change log
  const { data: changeLogs, loading: loadLogs, error: errLogs } = useDataCache(
    'dash:logs:recent',
    () => base44.entities.MemberChangeLog.list('-changed_at', 10),
  );

  /* ── Derived data ── */

  const memberStats = useMemo(() => {
    if (!approvedMembers) return null;
    const m = approvedMembers;
    return {
      total: m.filter(x => x.status === '活動中').length,
      regular: m.filter(x => x.member_type === '正会員' && x.status === '活動中').length,
      supporting: m.filter(x => x.member_type === '賛助会員' && x.status === '活動中').length,
      ob: m.filter(x => x.member_type === 'OB会員' && x.status === '活動中').length,
      paused: m.filter(x => x.status === '休会').length,
      newMember: m.filter(x => x.is_new === true).length,
    };
  }, [approvedMembers]);

  const duesStats = useMemo(() => {
    if (!fiscalYears || !allDues) return null;
    const currentFy = fiscalYears.find(fy => fy.is_current === true);
    if (!currentFy) return { paid: 0, total: 0, rate: 0, fyLabel: '-' };
    const currentDues = allDues.filter(d => d.fiscal_year_id === currentFy.id);
    const paid = currentDues.filter(d => d.status === '納入済').length;
    const total = currentDues.length;
    const rate = total > 0 ? Math.round((paid / total) * 100) : 0;
    return { paid, total, rate, fyLabel: currentFy.label || currentFy.name || '-' };
  }, [fiscalYears, allDues]);

  const nextMeeting = useMemo(() => {
    if (!meetings) return null;
    const today = new Date().toISOString().slice(0, 10);
    // Find upcoming meetings (status is 下書き or 確定, date >= today)
    const upcoming = meetings
      .filter(m => m.meeting_date >= today && (m.status === '下書き' || m.status === '確定'))
      .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
    return upcoming[0] || null;
  }, [meetings]);

  const pendingCount = pendingMembers?.length || 0;

  const unpaidDues = useMemo(() => {
    if (!fiscalYears || !allDues) return [];
    const currentFy = fiscalYears.find(fy => fy.is_current === true);
    if (!currentFy) return [];
    return allDues.filter(d => d.fiscal_year_id === currentFy.id && d.status === '未納');
  }, [fiscalYears, allDues]);

  // Build member lookup for change logs
  const memberMap = useMemo(() => {
    if (!approvedMembers) return {};
    const map = {};
    approvedMembers.forEach(m => { map[String(m.id)] = m; });
    return map;
  }, [approvedMembers]);

  /* ── Render ── */
  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">ダッシュボード</h1>
        {!isMobile && <p className="page-description">管理者ダッシュボード</p>}
      </div>

      {/* ═══ Tier 1: KPI Cards ═══ */}
      <div className="db-tier1">
        {/* 会員概要 */}
        {loadMembers ? <SkeletonCard lines={4} /> : (
          <Section title="会員概要" loading={false} error={errMembers} linkTo="/admin/members" linkLabel="会員一覧">
            {memberStats && (
              <>
                <div className="db-big-number">{memberStats.total}<span className="db-big-unit">名</span></div>
                <div className="db-stat-grid">
                  <div className="db-stat-row"><Dot color="var(--primary)" />正会員<span className="db-stat-val">{memberStats.regular}</span></div>
                  <div className="db-stat-row"><Dot color="#8b5cf6" />賛助会員<span className="db-stat-val">{memberStats.supporting}</span></div>
                  <div className="db-stat-row"><Dot color="var(--muted)" />OB会員<span className="db-stat-val">{memberStats.ob}</span></div>
                  <div className="db-stat-row"><Dot color="var(--warning)" />休会<span className="db-stat-val">{memberStats.paused}</span></div>
                  {memberStats.newMember > 0 && (
                    <div className="db-stat-row"><Dot color="var(--success)" />新入会員<span className="db-stat-val">{memberStats.newMember}</span></div>
                  )}
                </div>
              </>
            )}
          </Section>
        )}

        {/* 会費納入率 */}
        {(loadFy || loadDues) ? <SkeletonCard lines={3} /> : (
          <Section title="会費納入率" loading={false} error={errFy || errDues} linkTo="/admin/dues-management" linkLabel="会費管理">
            {duesStats && (
              <>
                <div className="db-big-number" style={{ color: rateColor(duesStats.rate) }}>
                  {duesStats.rate}<span className="db-big-unit">%</span>
                </div>
                <div className="db-progress-track">
                  <div className="db-progress-fill" style={{ width: `${duesStats.rate}%`, background: rateColor(duesStats.rate) }} />
                </div>
                <p className="db-sub-text">{duesStats.paid} / {duesStats.total} 名が納入済</p>
              </>
            )}
          </Section>
        )}

        {/* 次回幹事会 */}
        {loadMtg ? <SkeletonCard lines={3} /> : (
          <Section title="次回幹事会" loading={false} error={errMtg} linkTo="/admin/meetings" linkLabel="幹事会一覧">
            {nextMeeting ? (
              <>
                <div className="db-meeting-title">{nextMeeting.title}</div>
                <div className="db-meeting-meta">
                  <span>{nextMeeting.meeting_date?.replace(/-/g, '/')}</span>
                  {nextMeeting.start_time && <span>{nextMeeting.start_time}〜{nextMeeting.end_time || ''}</span>}
                </div>
                {nextMeeting.location && (
                  <p className="db-sub-text">{nextMeeting.location}</p>
                )}
                <span className="pill" style={{ marginTop: 4, fontSize: 11 }}>
                  {nextMeeting.status === '確定' ? '公開' : '下書き'}
                </span>
              </>
            ) : (
              <p className="db-sub-text">予定されている幹事会はありません</p>
            )}
          </Section>
        )}
      </div>

      {/* ═══ Tier 2: Action Items + Activity Log ═══ */}
      <div className="db-tier2">
        {/* アクション項目 */}
        {(loadPending || loadFy || loadDues) ? <SkeletonCard lines={4} /> : (
          <Section title="要対応" loading={false} error={errPending}>
            <div className="db-action-list">
              {/* 入会申請 */}
              <Link to="/admin/applications" className="db-action-item" style={pendingCount > 0 ? { background: 'var(--warning-light)' } : undefined}>
                <div className="db-action-left">
                  <Dot color={pendingCount > 0 ? 'var(--warning)' : 'var(--muted)'} />
                  <span>入会申請</span>
                </div>
                <span className="db-action-badge" style={pendingCount > 0 ? { background: 'var(--warning)', color: '#fff' } : undefined}>
                  {pendingCount}件
                </span>
              </Link>
              {/* 未納会費 */}
              <Link to="/admin/dues-management" className="db-action-item" style={unpaidDues.length > 0 ? { background: 'var(--error-light)' } : undefined}>
                <div className="db-action-left">
                  <Dot color={unpaidDues.length > 0 ? 'var(--error)' : 'var(--muted)'} />
                  <span>未納会費</span>
                </div>
                <span className="db-action-badge" style={unpaidDues.length > 0 ? { background: 'var(--error)', color: '#fff' } : undefined}>
                  {unpaidDues.length}件
                </span>
              </Link>
            </div>
          </Section>
        )}

        {/* 最近の活動ログ */}
        {loadLogs ? <SkeletonCard lines={5} /> : (
          <Section title="最近の活動" loading={false} error={errLogs}>
            {(!changeLogs || changeLogs.length === 0) ? (
              <p className="db-sub-text">活動ログはありません</p>
            ) : (
              <div className="db-log-list">
                {changeLogs.slice(0, 8).map((log, i) => {
                  const member = memberMap[String(log.member_id)];
                  const name = member ? fullName(member) : `ID:${log.member_id}`;
                  const field = FIELD_LABELS[log.field_name] || log.field_name;
                  return (
                    <div key={log.id || i} className="db-log-item">
                      <div className="db-log-top">
                        <span className="db-log-name">{name}</span>
                        <span className="db-log-time">{fmtDateTime(log.changed_at)}</span>
                      </div>
                      <div className="db-log-detail">
                        <span className="db-log-field">{field}</span>
                        {log.old_value && <span className="db-log-old">{log.old_value}</span>}
                        {log.old_value && log.new_value && <span className="db-log-arrow">→</span>}
                        {log.new_value && <span className="db-log-new">{log.new_value}</span>}
                      </div>
                      <span className="db-log-by">{log.changed_by}（{log.changed_by_role === 'admin' ? '管理者' : '本人'}）</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        )}
      </div>

      {/* ═══ Tier 3: Quick Actions ═══ */}
      <div className="db-tier3">
        <div className="db-card db-fade-in">
          <div className="db-card-header">
            <span className="db-card-title">クイックアクション</span>
          </div>
          <div className="db-quick-grid">
            <Link className="db-quick-btn" to="/admin/members">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              会員一覧
            </Link>
            <Link className="db-quick-btn" to="/admin/applications">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              申込管理
            </Link>
            <Link className="db-quick-btn" to="/admin/dues-management">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              会費管理
            </Link>
            <Link className="db-quick-btn" to="/admin/meetings">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              幹事会管理
            </Link>
            <Link className="db-quick-btn" to="/admin/newsletters">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              配信管理
            </Link>
            <Link className="db-quick-btn" to="/admin/organization-chart">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              組織図管理
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ Scoped styles ═══ */}
      <style>{`
        /* ── skeleton pulse ── */
        .db-skeleton {
          background: linear-gradient(90deg, var(--line-light) 25%, #e8ecf1 50%, var(--line-light) 75%);
          background-size: 200% 100%;
          animation: db-shimmer 1.5s infinite;
        }
        @keyframes db-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .db-skeleton-card {
          padding: 20px;
          min-height: 120px;
        }

        /* ── fade-in ── */
        .db-fade-in {
          animation: db-fadein 0.35s ease;
        }
        @keyframes db-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── card ── */
        .db-card {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }
        .db-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px 10px;
          border-bottom: 1px solid var(--line-light);
        }
        .db-card-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: 0.02em;
        }
        .db-card-body {
          padding: 14px 18px 18px;
        }

        /* ── tier layouts ── */
        .db-tier1 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }
        .db-tier2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .db-tier3 {
          margin-bottom: 8px;
        }

        /* ── big KPI number ── */
        .db-big-number {
          font-size: 32px;
          font-weight: 800;
          color: var(--text);
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .db-big-unit {
          font-size: 14px;
          font-weight: 600;
          margin-left: 2px;
          color: var(--text-secondary);
        }

        /* ── stat grid (member breakdown) ── */
        .db-stat-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .db-stat-row {
          display: flex;
          align-items: center;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .db-stat-val {
          margin-left: auto;
          font-weight: 700;
          color: var(--text);
          font-size: 14px;
        }

        /* ── progress bar ── */
        .db-progress-track {
          width: 100%;
          height: 8px;
          background: var(--line-light);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .db-progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.6s ease;
        }

        /* ── sub text ── */
        .db-sub-text {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0;
        }

        /* ── meeting card ── */
        .db-meeting-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 6px;
        }
        .db-meeting-meta {
          display: flex;
          gap: 12px;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        /* ── action items ── */
        .db-action-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .db-action-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          text-decoration: none;
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          transition: box-shadow var(--transition);
        }
        .db-action-item:hover {
          box-shadow: var(--shadow);
        }
        .db-action-left {
          display: flex;
          align-items: center;
        }
        .db-action-badge {
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          background: var(--line-light);
          color: var(--text-secondary);
        }

        /* ── activity log ── */
        .db-log-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .db-log-item {
          padding-bottom: 10px;
          border-bottom: 1px solid var(--line-light);
        }
        .db-log-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .db-log-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }
        .db-log-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
        }
        .db-log-time {
          font-size: 11px;
          color: var(--muted);
        }
        .db-log-detail {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary);
          flex-wrap: wrap;
        }
        .db-log-field {
          font-weight: 600;
          color: var(--text);
        }
        .db-log-old {
          color: var(--error);
          text-decoration: line-through;
        }
        .db-log-arrow {
          color: var(--muted);
        }
        .db-log-new {
          color: var(--success);
          font-weight: 600;
        }
        .db-log-by {
          font-size: 11px;
          color: var(--muted);
        }

        /* ── quick action grid ── */
        .db-quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 14px 18px 18px;
        }
        .db-quick-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          background: var(--panel);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: all var(--transition);
        }
        .db-quick-btn:hover {
          background: var(--primary-light);
          border-color: var(--primary-100);
          color: var(--primary);
        }
        .db-quick-btn svg {
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .db-quick-btn:hover svg {
          color: var(--primary);
        }

        /* ── mobile ── */
        @media (max-width: 768px) {
          .db-tier1 {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .db-tier2 {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .db-quick-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            padding: 12px 14px 14px;
          }
          .db-card-header {
            padding: 12px 14px 8px;
          }
          .db-card-body {
            padding: 12px 14px 14px;
          }
          .db-big-number {
            font-size: 26px;
          }
          .db-quick-btn {
            padding: 8px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </section>
  );
}
