import { useState, useRef, useEffect } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const QUICK_TIMES = [
  { label: "10:00", h: 10, m: 0 },
  { label: "13:00", h: 13, m: 0 },
  { label: "15:00", h: 15, m: 0 },
  { label: "18:00", h: 18, m: 0 },
  { label: "19:00", h: 19, m: 0 },
  { label: "20:00", h: 20, m: 0 },
];

function pad2(n) { return String(n).padStart(2, '0'); }

function parseTime(str) {
  if (!str) return null;
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

/**
 * Time selector matching the newsletter scheduling UI pattern.
 * Props: value ("HH:mm"), onChange(timeStr), disabled, placeholder
 */
export default function TimeSelect({ value, onChange, disabled, placeholder = "時刻を選択" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const parsed = parseTime(value);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Position dropdown above if near bottom
  useEffect(() => {
    if (!open || !dropdownRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ddH = dropdownRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < ddH + 8 && rect.top > ddH + 8) {
      dropdownRef.current.style.top = 'auto';
      dropdownRef.current.style.bottom = '100%';
      dropdownRef.current.style.marginBottom = '4px';
      dropdownRef.current.style.marginTop = '0';
    } else {
      dropdownRef.current.style.top = '100%';
      dropdownRef.current.style.bottom = 'auto';
      dropdownRef.current.style.marginTop = '4px';
      dropdownRef.current.style.marginBottom = '0';
    }
  }, [open]);

  function setTime(h, m) {
    // Round minute to nearest 5
    const roundedM = Math.round(m / 5) * 5;
    onChange(`${pad2(h)}:${pad2(roundedM >= 60 ? 0 : roundedM)}`);
  }

  function handleQuick(qt) {
    setTime(qt.h, qt.m);
    setOpen(false);
  }

  return (
    <div className="dp-container" ref={containerRef} style={{ minWidth: 120 }}>
      <button
        type="button"
        className={`dp-trigger${open ? ' dp-trigger--open' : ''}${!value ? ' dp-trigger--placeholder' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        style={{ minWidth: 120 }}
      >
        <span className="dp-trigger-text">{value || placeholder}</span>
        <svg className="dp-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div ref={dropdownRef} className="dp-dropdown" style={{ width: 220, padding: 12 }}>
          {/* Quick times */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
            {QUICK_TIMES.map((qt) => {
              const isActive = parsed && parsed.h === qt.h && parsed.m === qt.m;
              return (
                <button key={qt.label} type="button" onClick={() => handleQuick(qt)}
                  style={{
                    padding: "4px 10px", fontSize: 12, borderRadius: "var(--radius-sm, 6px)",
                    border: "1px solid var(--line, var(--color-border))", cursor: "pointer",
                    background: isActive ? "var(--color-accent)" : "#fff",
                    color: isActive ? "#fff" : "var(--text, #1f2937)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >{qt.label}</button>
              );
            })}
          </div>

          {/* Hour / Minute selectors */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={parsed?.h ?? 19}
              onChange={(e) => { setTime(Number(e.target.value), parsed?.m ?? 0); }}
              style={{ padding: "6px 10px", borderRadius: "var(--radius-sm, 6px)", border: "1px solid var(--line, var(--color-border))", fontSize: 14, flex: 1 }}
            >
              {HOURS.map((h) => <option key={h} value={h}>{pad2(h)}時</option>)}
            </select>
            <span style={{ color: "var(--text-secondary, var(--color-text-secondary))" }}>:</span>
            <select
              value={parsed?.m ?? 0}
              onChange={(e) => { setTime(parsed?.h ?? 19, Number(e.target.value)); }}
              style={{ padding: "6px 10px", borderRadius: "var(--radius-sm, 6px)", border: "1px solid var(--line, var(--color-border))", fontSize: 14, flex: 1 }}
            >
              {MINUTES.map((m) => <option key={m} value={m}>{pad2(m)}分</option>)}
            </select>
          </div>

          {/* Clear */}
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            {value && (
              <button type="button" onClick={() => { onChange(""); setOpen(false); }}
                style={{ background: "none", border: "none", fontSize: 12, color: "var(--text-secondary, var(--color-text-secondary))", cursor: "pointer" }}>
                クリア
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
