import { useState, useRef, useEffect, useMemo } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function YearPillNav({ fiscalYears, activeFyId, currentFyId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isMobile = useIsMobile();

  const sorted = useMemo(() =>
    [...(fiscalYears || [])].sort((a, b) => (a.year || 0) - (b.year || 0)),
    [fiscalYears]
  );

  const activeFy = sorted.find(fy => fy.id === activeFyId);
  const label = activeFy ? (activeFy.year_label || `${activeFy.year}年度`) : '';

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  if (!fiscalYears || fiscalYears.length === 0) return null;

  if (sorted.length === 1) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: isMobile ? 4 : 6,
        fontSize: isMobile ? 12 : 13, fontWeight: 600, color: 'var(--color-text-secondary)',
      }}>
        {label}
        {activeFyId === currentFyId && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', flexShrink: 0 }} />
        )}
      </span>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: isMobile ? 4 : 6,
          padding: isMobile ? '4px 10px' : '6px 12px',
          background: open ? 'var(--color-bg-sub)' : 'transparent',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: isMobile ? 12 : 13, fontWeight: 600,
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        {activeFyId === currentFyId && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', flexShrink: 0 }} />
        )}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transition: 'transform 0.15s ease', transform: open ? 'rotate(180deg)' : 'rotate(0)', marginLeft: 2 }}
        >
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          minWidth: 160, zIndex: 100, overflow: 'hidden',
          animation: 'yearDropIn 0.12s ease',
        }}>
          {sorted.map(fy => {
            const fyLabel = fy.year_label || `${fy.year}年度`;
            const isActive = fy.id === activeFyId;
            const isCurrent = fy.id === currentFyId;
            return (
              <button
                key={fy.id}
                type="button"
                onClick={() => { onChange(fy.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: isMobile ? '8px 12px' : '10px 14px',
                  border: 'none', background: isActive ? 'var(--color-accent-light)' : 'transparent',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  cursor: 'pointer', transition: 'background 0.1s', textAlign: 'left',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--color-bg-sub)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--color-accent-light)' : 'transparent'; }}
              >
                <span style={{ flex: 1 }}>{fyLabel}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isCurrent ? 'var(--color-success)' : 'transparent', flexShrink: 0 }} />
                {isActive ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M3.5 7l2.5 2.5L10.5 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span style={{ width: 14, flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes yearDropIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
