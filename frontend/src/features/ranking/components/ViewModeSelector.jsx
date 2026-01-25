/**
 * ViewModeSelector Component
 * Toggle between Rank and Graph Ranking views
 */

import { VIEW_MODES } from '../constants';

export function ViewModeSelector({ viewMode, onViewChange, onOpenModal }) {
  return (
    <nav className="flex items-center gap-2" aria-label="View mode selection">
      <button
        onClick={onOpenModal}
        type="button"
        className="px-4 py-2 text-sm font-medium rounded-full bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa] transition-colors"
      >
        Rank
      </button>
      <button
        type="button"
        className="px-4 py-2 text-sm font-medium rounded-full bg-white border border-[#dadce0] text-[#9aa0a6] cursor-not-allowed"
        title="Coming soon"
      >
        Graph Ranking
      </button>
    </nav>
  );
}
