export default function AttendanceDeadlineBadge({ deadline, closed }) {
  if (closed) {
    return (
      <span style={{
        fontSize: 11, fontWeight: 600,
        padding: '2px 8px', borderRadius: 99,
        background: 'var(--color-bg-sub)',
        color: 'var(--color-text-tertiary)',
      }}>
        受付終了
      </span>
    );
  }

  if (!deadline) return null;

  const dl = new Date(deadline);
  dl.setHours(23, 59, 59, 999);
  const now = new Date();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dlDate = new Date(deadline); dlDate.setHours(0, 0, 0, 0);

  const isExpired = now > dl;
  const isToday = dlDate.getTime() === today.getTime();
  const diffDays = Math.ceil((dlDate - today) / (1000 * 60 * 60 * 24));

  if (isExpired) {
    return (
      <span style={{
        fontSize: 11, fontWeight: 600,
        padding: '2px 8px', borderRadius: 99,
        background: 'var(--color-bg-sub)',
        color: 'var(--color-text-tertiary)',
      }}>
        期限切れ
      </span>
    );
  }

  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dl.getDay()];
  const label = isToday
    ? '本日締切'
    : diffDays <= 3
      ? `期限: ${dl.getMonth() + 1}/${dl.getDate()}(${dayOfWeek}) あと${diffDays}日`
      : `期限: ${dl.getMonth() + 1}/${dl.getDate()}(${dayOfWeek})`;

  const isUrgent = isToday || diffDays <= 3;

  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 99,
      background: isUrgent ? 'var(--color-danger-light)' : 'var(--color-bg-sub)',
      color: isUrgent ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
    }}>
      {label}
    </span>
  );
}
