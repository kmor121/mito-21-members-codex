import { useMemo } from 'react';

export default function YearPillNav({ fiscalYears, activeFyId, currentFyId, onChange }) {
  const sorted = useMemo(() =>
    [...fiscalYears].sort((a, b) => (a.year || 0) - (b.year || 0)),
    [fiscalYears]
  );

  if (!fiscalYears || fiscalYears.length === 0) return null;

  return (
    <select
      value={activeFyId || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: 'none',
        WebkitAppearance: 'none',
        background: '#fff',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '6px 32px 6px 12px',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        cursor: 'pointer',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        minWidth: 'auto',
        lineHeight: 1.4,
      }}
    >
      {sorted.map(fy => (
        <option key={fy.id} value={fy.id}>
          {fy.year_label || `${fy.year}年度`}{fy.id === currentFyId ? ' ●' : ''}
        </option>
      ))}
    </select>
  );
}
