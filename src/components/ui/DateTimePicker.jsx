import { useState } from 'react';
import DatePicker from './DatePicker';

export default function DateTimePicker({ value, onChange, disabled, id }) {
  // value format: "2026-03-10T14:30" (datetime-local format)
  const datePart = value ? value.split('T')[0] : '';
  const timePart = value ? (value.split('T')[1] || '00:00') : '00:00';

  const handleDateChange = (newDate) => {
    if (!newDate) { onChange(''); return; }
    onChange(`${newDate}T${timePart}`);
  };

  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    if (datePart) {
      onChange(`${datePart}T${newTime}`);
    }
  };

  return (
    <div className="dtp-container">
      <DatePicker
        value={datePart}
        onChange={handleDateChange}
        id={id}
        disabled={disabled}
        placeholder="日付を選択"
      />
      <input
        type="time"
        className="dtp-time"
        value={timePart}
        onChange={handleTimeChange}
        disabled={disabled || !datePart}
      />
    </div>
  );
}
