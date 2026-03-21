import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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

export default function TimeSelect({ value, onChange, disabled, placeholder = "時刻を選択" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const parsed = parseTime(value);

  // Calculate position when opening
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropH = 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < dropH + 8 && rect.top > dropH + 8;
    setPos({
      left: rect.left,
      top: above ? rect.top - dropH - 4 : rect.bottom + 4,
      width: Math.max(rect.width, 220),
    });
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Scroll/resize to close
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  function setTime(h, m) {
    const roundedM = Math.round(m / 5) * 5;
    onChange(`${pad2(h)}:${pad2(roundedM >= 60 ? 0 : roundedM)}`);
  }

  function handleQuick(qt) {
    setTime(qt.h, qt.m);
    setOpen(false);
  }

  const dropdown = open && pos && createPortal(
    <div ref={dropdownRef} className="dp-dropdown" style={{
      position: 'fixed',
      top: pos.top,
      left: pos.left,
      width: Math.min(pos.width, 240),
      maxWidth: 240,
      zIndex: 10000,
      padding: 12,
    }}>
      {/* Quick times */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
        {QUICK_TIMES.map((qt) => {
          const isActive = parsed && parsed.h === qt.h && parsed.m === qt.m;
          return (
            <button key={qt.label} type="button" onClick={() => handleQuick(qt)}
              style={{
                padding: "4px 10px", fontSize: 12, borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)", cursor: "pointer",
                background: isActive ? "var(--color-accent)" : "#fff",
                color: isActive ? "#fff" : "var(--color-text-primary)",
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
          style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 14, flex: 1, fontFamily: "inherit" }}
        >
          {HOURS.map((h) => <option key={h} value={h}>{pad2(h)}時</option>)}
        </select>
        <span style={{ color: "var(--color-text-secondary)" }}>:</span>
        <select
          value={parsed?.m ?? 0}
          onChange={(e) => { setTime(parsed?.h ?? 19, Number(e.target.value)); }}
          style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontSize: 14, flex: 1, fontFamily: "inherit" }}
        >
          {MINUTES.map((m) => <option key={m} value={m}>{pad2(m)}分</option>)}
        </select>
      </div>

      {/* Clear */}
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
        {value && (
          <button type="button" onClick={() => { onChange(""); setOpen(false); }}
            style={{ background: "none", border: "none", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>
            クリア
          </button>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div className="dp-container" ref={triggerRef} style={{ minWidth: 120 }}>
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
      {dropdown}
    </div>
  );
}
