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
        px-4 py-1.5 text-sm font-medium rounded-full border transition-colors
        ${active
          ? 'bg-[#1a73e8] border-transparent text-white shadow-sm'
          : 'bg-white border-[#dadce0] text-[#3c4043] hover:bg-[#f8f9fa]'
        }
      `}
    >
      {label}
    </button>
  );
}
