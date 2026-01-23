/**
 * RefreshButton Component
 * Manual refresh button with loading state and error feedback
 */

export function RefreshButton({ onRefresh, isRefreshing, error }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRefresh}
        type="button"
        disabled={isRefreshing}
        className="px-3 py-2 text-sm font-medium rounded-full transition-colors text-[#5f6368] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-[#eaebef]"
        title={isRefreshing ? "Refreshing..." : "Refresh data"}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={isRefreshing ? 'animate-spin' : ''}
        >
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        {isRefreshing && <span className="text-xs">Refreshing...</span>}
      </button>
      {error && (
        <span className="text-xs text-red-600" title={error}>
          Failed to refresh
        </span>
      )}
    </div>
  );
}
