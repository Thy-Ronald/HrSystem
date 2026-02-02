/**
 * EmptyState Component
 * Displayed when no data is available
 */
import { FileQuestion } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-slate-50 p-4 rounded-full mb-4 shadow-inner">
        <FileQuestion className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">No Data Available</h3>
      <p className="text-sm text-slate-500 max-w-[250px] mx-auto">
        There are no ranking results for the selected repository and time period.
      </p>
    </div>
  );
}
