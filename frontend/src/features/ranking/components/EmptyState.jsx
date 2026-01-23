/**
 * EmptyState Component
 * Displayed when no data is available
 */

export function EmptyState() {
  return (
    <tr>
      <td colSpan="100%" className="px-4 py-32">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 mb-4 bg-[#f1f3f4] rounded-full flex items-center justify-center text-[#dadce0]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm text-[#70757a]">No data available for the selected period</p>
        </div>
      </td>
    </tr>
  );
}
