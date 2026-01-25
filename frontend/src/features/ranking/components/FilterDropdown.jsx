/**
 * FilterDropdown Component
 * Dropdown for selecting time period filter
 */

import { FILTER_LABELS, QUICK_FILTERS } from '../constants';

export function FilterDropdown({ activeFilter, onFilterChange }) {
  const filters = [
    { value: QUICK_FILTERS.TODAY, label: FILTER_LABELS[QUICK_FILTERS.TODAY] },
    { value: QUICK_FILTERS.YESTERDAY, label: FILTER_LABELS[QUICK_FILTERS.YESTERDAY] },
    { value: QUICK_FILTERS.THIS_WEEK, label: FILTER_LABELS[QUICK_FILTERS.THIS_WEEK] },
    { value: QUICK_FILTERS.LAST_WEEK, label: FILTER_LABELS[QUICK_FILTERS.LAST_WEEK] },
    { value: QUICK_FILTERS.THIS_MONTH, label: FILTER_LABELS[QUICK_FILTERS.THIS_MONTH] },
  ];

  const activeLabel = FILTER_LABELS[activeFilter] || activeFilter;

  return (
    <div className="flex flex-col gap-1 relative w-full">
      <label htmlFor="filter-select" className="text-sm font-medium text-[#5f6368]">
        Period
      </label>
      <select
        id="filter-select"
        value={activeFilter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-[#dadce0] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
      >
        {filters.map((filter) => (
          <option key={filter.value} value={filter.value}>
            {filter.label}
          </option>
        ))}
      </select>
    </div>
  );
}
