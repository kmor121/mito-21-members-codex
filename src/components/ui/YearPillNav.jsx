import { useMemo } from 'react';

export default function YearPillNav({ fiscalYears, activeFyId, currentFyId, onChange }) {
  const sorted = useMemo(() =>
    [...fiscalYears].sort((a, b) => (a.year || 0) - (b.year || 0)),
    [fiscalYears]
  );
  const activeIdx = sorted.findIndex(fy => fy.id === activeFyId);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "4px 8px", minWidth: 32, fontSize: 16, lineHeight: 1 }}
        disabled={activeIdx <= 0}
        onClick={() => activeIdx > 0 && onChange(sorted[activeIdx - 1].id)}
        aria-label="前の年度"
      >&larr;</button>
      <div style={{ display: "flex", gap: 4 }}>
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
                padding: "6px 14px",
                borderRadius: 999,
                border: isActive ? "2px solid var(--primary)" : "1px solid var(--line)",
                background: isActive ? "var(--primary)" : "#fff",
                color: isActive ? "#fff" : "var(--text-secondary)",
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s",
                position: "relative",
              }}
            >
              {label}
              {isCurrent && !isActive && (
                <span style={{
                  position: "absolute", top: -3, right: -3,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--primary)", border: "2px solid #fff",
                }} />
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "4px 8px", minWidth: 32, fontSize: 16, lineHeight: 1 }}
        disabled={activeIdx >= sorted.length - 1}
        onClick={() => activeIdx < sorted.length - 1 && onChange(sorted[activeIdx + 1].id)}
        aria-label="次の年度"
      >&rarr;</button>
    </div>
  );
}
