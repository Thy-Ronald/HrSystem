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
          ? 'bg-[#1a3e62] hover:bg-[#122c46] shadow-sm text-white border-transparent'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }
      `}
    >
      {label}
    </Button>
  );
}
