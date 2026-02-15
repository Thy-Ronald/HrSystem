/**
 * ViewModeSelector Component
 * Toggle between Rank and Graph Ranking views
 */
import { Button } from "@/components/ui/button"

export function ViewModeSelector({ viewMode, onViewChange, onOpenModal }) {
  const buttonStyle = "px-4 h-9 text-xs font-semibold rounded-lg bg-[#1a73e8] hover:bg-[#185abc] text-white shadow-sm transition-all active:scale-95 border-none";

  return (
    <nav className="flex items-center gap-2" aria-label="View mode selection">
      <Button
        onClick={onOpenModal}
        variant="outline"
        className={buttonStyle}
      >
        Rank
      </Button>
      <Button
        variant="outline"
        className={buttonStyle}
      >
        Graph Ranking
      </Button>
    </nav>
  );
}
