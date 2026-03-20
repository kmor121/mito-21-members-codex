import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { PageHeader } from '../../components/ui';
import { fullName } from '../../utils/formatName';
import { useIsMobile } from '../../hooks/useIsMobile';

const FIELD_LABELS = {
  last_name: '姓',
  first_name: '名',
  last_name_kana: '姓（カナ）',
  first_name_kana: '名（カナ）',
  birthday: '生年月日',
  email: 'メール',
  phone: '電話番号',
  mobile_phone: '携帯電話',
  company_name: '会社名',
  company_title: '役職',
  company_position: '役職',
  industry: '業種',
  company_phone: '会社電話',
  company_fax: '会社FAX',
  company_address: '会社住所',
  company_postal_code: '会社郵便番号',
  company_pr: '会社PR',
  home_postal_code: '自宅郵便番号',
  home_address: '自宅住所',
  home_phone: '自宅電話',
  home_fax: '自宅FAX',
  hobbies: '趣味・信条',
  profile_image: 'プロフィール画像',
  show_email_in_directory: 'メール公開',
  show_company_in_directory: '会社公開',
  show_mobile_in_directory: '携帯公開',
  member_type: '会員種別',
  status: 'ステータス',
  member_number: '会員番号',
  is_new: '新入会員',
  app_role: 'アプリロール',
  notes: '備考',
};

function displayVal(v) {
  if (v === null || v === undefined || v === '') return '(なし)';
  if (v === 'true') return 'はい';
  if (v === 'false') return 'いいえ';
  return String(v);
}

function roleBadge(role) {
  if (role === 'admin') return { bg: 'var(--color-accent-light)', color: 'var(--color-accent)' };
  return { bg: 'var(--color-success-light, #ecfdf5)', color: 'var(--color-success, #059669)' };
}

export default function ChangeLogs() {
  const [searchParams] = useSearchParams();
  const filterMemberId = searchParams.get('member_id') || '';
  const isMobile = useIsMobile();

  const [logs, setLogs] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [allLogs, allMembers] = await Promise.all([
          filterMemberId
            ? base44.entities.MemberChangeLog.filter({ member_id: filterMemberId }, '-changed_at')
            : base44.entities.MemberChangeLog.list('-changed_at'),
          base44.entities.Member.list(),
        ]);
        setLogs(allLogs);
        setMembers(allMembers);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [filterMemberId]);

  const memberMap = useMemo(() => {
    const m = {};
    members.forEach(mb => { m[mb.id] = mb; });
    return m;
  }, [members]);

  const filterMemberName = filterMemberId && memberMap[filterMemberId]
    ? fullName(memberMap[filterMemberId])
    : '';

  if (loading) {
    return (
      <section className="admin-shell">
        <PageHeader title="変更履歴" />
        <LoadingSpinner />
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <PageHeader
        title="変更履歴"
        subtitle={filterMemberName ? `${filterMemberName} の変更履歴` : '全会員の変更履歴'}
      />

      {filterMemberId && (
        <div style={{ marginBottom: 12 }}>
          <Link to="/admin/change-logs" className="text-link" style={{ fontSize: 13 }}>
            ← 全会員の変更履歴に戻る
          </Link>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="panel-card single-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>変更履歴はありません。</p>
        </div>
      ) : isMobile ? (
        /* ── Mobile: card list ── */
        <div style={{ display: 'grid', gap: 8 }}>
          {logs.map((log, i) => {
            const mb = memberMap[log.member_id];
            const rb = roleBadge(log.changed_by_role);
            return (
              <div key={log.id || i} style={{
                background: '#fff', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    {log.changed_at ? new Date(log.changed_at).toLocaleString('ja-JP') : '-'}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 4,
                    background: rb.bg, color: rb.color,
                  }}>{log.changed_by_role || '-'}</span>
                </div>
                {!filterMemberId && mb && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                    <Link to={`/admin/members/${log.member_id}`} className="text-link">{fullName(mb)}</Link>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                  変更者: {log.changed_by || '-'}
                </div>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {FIELD_LABELS[log.field_name] || log.field_name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12 }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>{displayVal(log.old_value)}</span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{displayVal(log.new_value)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Desktop: table ── */
        <div className="panel-card single-panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>日時</th>
                  {!filterMemberId && <th>会員</th>}
                  <th>変更者</th>
                  <th>ロール</th>
                  <th>フィールド</th>
                  <th>変更前</th>
                  <th>変更後</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const mb = memberMap[log.member_id];
                  const rb = roleBadge(log.changed_by_role);
                  return (
                    <tr key={log.id || i}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        {log.changed_at ? new Date(log.changed_at).toLocaleString('ja-JP') : '-'}
                      </td>
                      {!filterMemberId && (
                        <td>
                          {mb ? (
                            <Link to={`/admin/members/${log.member_id}`} className="text-link" style={{ fontSize: 13 }}>
                              {fullName(mb)}
                            </Link>
                          ) : '-'}
                        </td>
                      )}
                      <td style={{ fontSize: 13 }}>{log.changed_by || '-'}</td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                          background: rb.bg, color: rb.color,
                        }}>{log.changed_by_role || '-'}</span>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>
                        {FIELD_LABELS[log.field_name] || log.field_name}
                      </td>
                      <td style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                        {displayVal(log.old_value)}
                      </td>
                      <td style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: 13 }}>
                        {displayVal(log.new_value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
