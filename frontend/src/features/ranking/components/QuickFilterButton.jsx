/**
 * QuickFilterButton Component
 * Reusable button for filter selection
 */

export function QuickFilterButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`
        px-4 py-1.5 text-sm font-medium rounded border transition-colors
        ${active
          ? 'bg-[#007bff] border-transparent text-white shadow-sm'
          : 'bg-white border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa]'
        }
      `}
    >
      {label}
    </button>
  );
}
