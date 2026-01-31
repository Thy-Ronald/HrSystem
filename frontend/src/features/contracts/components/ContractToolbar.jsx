import { ExportDropdown } from './ExportDropdown';

/**
 * Toolbar component for contract list actions
 */
export function ContractToolbar({
  onNewContract,
  onRefresh,
  loading,
  contracts,
  currentTime
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 border-b border-[#f1f3f4]">
      <div className="flex items-center gap-2">
        <button
          onClick={onNewContract}
          className="flex items-center gap-2 px-4 py-2 bg-[#c2e7ff] hover:bg-[#a8d8f0] text-[#001d35] rounded font-medium transition-colors shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>New Contract</span>
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 hover:bg-[#eaebef] rounded transition-colors text-[#5f6368] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh contracts"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={loading ? 'animate-spin' : ''}
          >
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>
      <ExportDropdown
        contracts={contracts}
        currentTime={currentTime}
        disabled={!contracts || contracts.length === 0}
      />
    </div>
  );
}
