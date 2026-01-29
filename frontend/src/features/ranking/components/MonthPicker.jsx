/**
 * MonthPicker Component
 * Allows users to select a specific month and year
 */

import { useState, useEffect } from 'react';

export function MonthPicker({ value, onChange, label = 'Month' }) {
  const [selectedYear, setSelectedYear] = useState(() => {
    if (value && value.startsWith('month-')) {
      const parts = value.split('-');
      return parts.length === 3 ? parseInt(parts[2]) : new Date().getFullYear();
    }
    return new Date().getFullYear();
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (value && value.startsWith('month-')) {
      const parts = value.split('-');
      return parts.length === 3 ? parseInt(parts[1]) - 1 : new Date().getMonth();
    }
    return new Date().getMonth();
  });

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 3; i++) {
    years.push(currentYear - i);
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    if (value && value.startsWith('month-')) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setSelectedYear(parseInt(parts[2]));
        setSelectedMonth(parseInt(parts[1]) - 1);
      }
    }
  }, [value]);

  const handleYearChange = (e) => {
    const year = parseInt(e.target.value);
    setSelectedYear(year);
    const monthValue = `month-${String(selectedMonth + 1).padStart(2, '0')}-${year}`;
    onChange(monthValue);
  };

  const handleMonthChange = (e) => {
    const month = parseInt(e.target.value);
    setSelectedMonth(month);
    const monthValue = `month-${String(month + 1).padStart(2, '0')}-${selectedYear}`;
    onChange(monthValue);
  };

  return (
    <div className="flex flex-col gap-1 relative w-full">
      <label htmlFor="month-picker" className="text-sm font-medium text-[#5f6368]">
        {label}
      </label>
      <div className="flex gap-2">
        <select
          id="month-picker-month"
          value={selectedMonth}
          onChange={handleMonthChange}
          className="flex-1 px-3 py-1.5 text-sm border border-[#dadce0] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
        >
          {months.map((month, index) => (
            <option key={index} value={index}>
              {month}
            </option>
          ))}
        </select>
        <select
          id="month-picker-year"
          value={selectedYear}
          onChange={handleYearChange}
          className="flex-1 px-3 py-1.5 text-sm border border-[#dadce0] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
