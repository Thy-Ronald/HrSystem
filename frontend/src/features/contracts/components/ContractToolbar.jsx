import { ExportDropdown } from './ExportDropdown';
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"

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
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={loading}
        className="h-10 w-10 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        title="Refresh contracts"
      >
        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
      </Button>
      <Button
        onClick={onNewContract}
        className="bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold px-6 h-10 rounded-xl shadow-sm"
      >
        <Plus className="mr-2 h-4 w-4" />
        <span>New Contract</span>
      </Button>
      <ExportDropdown
        contracts={contracts}
        currentTime={currentTime}
        disabled={!contracts || contracts.length === 0}
      />
    </div>
  );
}
