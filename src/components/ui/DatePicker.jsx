import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = Array.from({ length: 12 }, (_, i) => i);

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDate(str) {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  return { year: Number(parts[0]), month: Number(parts[1]) - 1, day: Number(parts[2]) };
}

export default function DatePicker({
  value,
  onChange,
  id,
  required,
  disabled,
  placeholder = '日付を選択',
  minYear = 1940,
  maxYear,
}) {
  const currentYear = new Date().getFullYear();
  const effectiveMaxYear = maxYear || currentYear + 10;
  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const parsed = parseDate(value);
  const [viewYear, setViewYear] = useState(parsed?.year || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (open && parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    } else if (open && !parsed) {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate position when opening
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropH = 340; // estimated dropdown height
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < dropH + 8 && rect.top > dropH + 8;
    setPos({
      left: rect.left,
      top: above ? rect.top - dropH - 4 : rect.bottom + 4,
      width: Math.max(rect.width, 280),
    });
  }, [open, viewYear, viewMonth]);

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

  // Scroll/resize to reposition or close
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

  const handleSelect = useCallback((day) => {
    const dateStr = formatDate(viewYear, viewMonth, day);
    onChange(dateStr);
    setOpen(false);
  }, [viewYear, viewMonth, onChange]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const displayValue = parsed
    ? `${parsed.year}年${parsed.month + 1}月${parsed.day}日`
    : '';

  const totalDays = daysInMonth(viewYear, viewMonth);
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const yearOptions = [];
  for (let y = effectiveMaxYear; y >= minYear; y--) yearOptions.push(y);

  const dropdown = open && pos && createPortal(
    <div ref={dropdownRef} className="dp-dropdown" style={{
      position: 'fixed',
      top: pos.top,
      left: pos.left,
      width: Math.min(pos.width, 300),
      maxWidth: 300,
      zIndex: 10000,
    }}>
      <div className="dp-header">
        <button type="button" className="dp-nav" onClick={prevMonth} aria-label="前月">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        </button>
        <div className="dp-title">
          <select className="dp-year-select" value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span>年</span>
          <select className="dp-month-select" value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))}>
            {MONTHS.map(m => <option key={m} value={m}>{m + 1}</option>)}
          </select>
          <span>月</span>
        </div>
        <button type="button" className="dp-nav" onClick={nextMonth} aria-label="翌月">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
        </button>
      </div>

      <div className="dp-weekdays">
        {DAYS.map((d, i) => (
          <div key={d} className={`dp-weekday${i === 0 ? ' dp-sun' : i === 6 ? ' dp-sat' : ''}`}>{d}</div>
        ))}
      </div>

      <div className="dp-grid">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e${idx}`} className="dp-cell dp-empty" />;
          const dateStr = formatDate(viewYear, viewMonth, day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === value;
          const dow = idx % 7;
          return (
            <button
              key={idx}
              type="button"
              className={[
                'dp-cell dp-day',
                isToday && 'dp-today',
                isSelected && 'dp-selected',
                dow === 0 && 'dp-sun',
                dow === 6 && 'dp-sat',
              ].filter(Boolean).join(' ')}
              onClick={() => handleSelect(day)}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="dp-footer">
        <button type="button" className="dp-today-btn"
          onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); handleSelect(today.getDate()); }}>
          今日
        </button>
        {value && (
          <button type="button" className="dp-clear-btn"
            onClick={() => { onChange(''); setOpen(false); }}>
            クリア
          </button>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div className="dp-container" ref={triggerRef}>
      <button
        type="button"
        id={id}
        className={`dp-trigger${open ? ' dp-trigger--open' : ''}${!displayValue ? ' dp-trigger--placeholder' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="dp-trigger-text">{displayValue || placeholder}</span>
        <svg className="dp-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z" clipRule="evenodd" />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}
