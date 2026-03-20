import { useMemo } from 'react';

export default function YearPillNav({ fiscalYears, activeFyId, currentFyId, onChange }) {
  const sorted = useMemo(() =>
    [...fiscalYears].sort((a, b) => (a.year || 0) - (b.year || 0)),
    [fiscalYears]
  );
  const activeIdx = sorted.findIndex(fy => fy.id === activeFyId);

  const arrowStyle = (disabled) => ({
    background: 'none',
    border: 'none',
    padding: '4px 6px',
    fontSize: 14,
    color: disabled ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
    cursor: disabled ? 'default' : 'pointer',
    borderRadius: 'var(--radius-sm)',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  });

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      background: 'var(--color-bg-sub)',
      borderRadius: 'var(--radius-full)',
      padding: '3px 4px',
      border: '1px solid var(--color-border)',
    }}>
      <button
        type="button"
        style={arrowStyle(activeIdx <= 0)}
        disabled={activeIdx <= 0}
        onClick={() => activeIdx > 0 && onChange(sorted[activeIdx - 1].id)}
        aria-label="前の年度"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div style={{ display: 'flex', gap: 2 }}>
        {sorted.map(fy => {
          const label = fy.year ? `${fy.year}` : fy.year_label;
          const isActive = fy.id === activeFyId;
          const isCurrent = fy.id === currentFyId;
          return (
            <button
              key={fy.id}
              type="button"
              onClick={() => onChange(fy.id)}
              style={{
                padding: '5px 14px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: isActive ? 'var(--color-accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--color-text-secondary)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                position: 'relative',
                lineHeight: 1.4,
              }}
            >
              {label}
              {isCurrent && !isActive && (
                <span style={{
                  position: 'absolute', top: -1, right: -1,
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--color-accent)', border: '2px solid var(--color-bg-sub)',
                }} />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        style={arrowStyle(activeIdx >= sorted.length - 1)}
        disabled={activeIdx >= sorted.length - 1}
        onClick={() => activeIdx < sorted.length - 1 && onChange(sorted[activeIdx + 1].id)}
        aria-label="次の年度"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
