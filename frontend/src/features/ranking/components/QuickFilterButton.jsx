/**
 * QuickFilterButton Component
 * Reusable button for filter selection
 */
import { Button } from "@/components/ui/button"

export function QuickFilterButton({ label, active, onClick }) {
  return (
    <Button
      onClick={onClick}
      variant={active ? "default" : "outline"}
      className={`
        px-4 h-8 text-xs font-semibold rounded-lg transition-all
        ${active
          ? 'bg-[#1a73e8] dark:bg-blue-600 hover:bg-[#185abc] dark:hover:bg-blue-700 shadow-sm text-white border-transparent'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        }
      `}
    >
      {label}
    </Button>
  );
}
