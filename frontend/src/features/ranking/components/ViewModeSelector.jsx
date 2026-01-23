/**
 * ViewModeSelector Component
 * Toggle between Rank and Graph Ranking views
 */

import { VIEW_MODES } from '../constants';

export function ViewModeSelector({ viewMode, onViewChange }) {
  return (
    <nav className="flex items-center gap-2" aria-label="View mode selection">
      <button
        onClick={() => onViewChange(VIEW_MODES.RANK)}
        type="button"
        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
          viewMode === VIEW_MODES.RANK
            ? 'bg-[#c2e7ff] text-[#001d35] shadow-sm'
            : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa]'
        }`}
      >
        Rank
      </button>
      <button
        onClick={() => onViewChange(VIEW_MODES.GRAPH)}
        type="button"
        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
          viewMode === VIEW_MODES.GRAPH
            ? 'bg-[#c2e7ff] text-[#001d35] shadow-sm'
            : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa]'
        }`}
      >
        Graph Ranking
      </button>
    </nav>
  );
}
