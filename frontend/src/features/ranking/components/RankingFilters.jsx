import { QuickFilterButton } from './QuickFilterButton';
import { QUICK_FILTERS, FILTER_LABELS } from '../constants';
export function RankingFilters({
  activeQuickFilter,
  onQuickFilterChange,
}) {
  const quickFilters = [
    { value: QUICK_FILTERS.TODAY, label: FILTER_LABELS[QUICK_FILTERS.TODAY] },
    { value: QUICK_FILTERS.YESTERDAY, label: FILTER_LABELS[QUICK_FILTERS.YESTERDAY] },
    { value: QUICK_FILTERS.THIS_WEEK, label: FILTER_LABELS[QUICK_FILTERS.THIS_WEEK] },
    { value: QUICK_FILTERS.LAST_WEEK, label: FILTER_LABELS[QUICK_FILTERS.LAST_WEEK] },
    { value: QUICK_FILTERS.THIS_MONTH, label: FILTER_LABELS[QUICK_FILTERS.THIS_MONTH] },
  ];

  return (
    <section className="mb-0 pb-4 border-b border-[#e8eaed]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <nav className="flex flex-nowrap items-center gap-2 overflow-x-auto" aria-label="Quick date filters">
          {quickFilters.map((filter) => (
            <QuickFilterButton
              key={filter.value}
              label={filter.label}
              active={activeQuickFilter === filter.value}
              onClick={() => onQuickFilterChange(filter.value)}
            />
          ))}
        </nav>
      </div>
    </section>
  );
}
