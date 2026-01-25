/**
 * RankingHeader Component
 * Main header with title and view mode selector
 */

import { ViewModeSelector } from './ViewModeSelector';

export function RankingHeader({
  viewMode,
  onViewChange,
  onOpenModal,
}) {
  return (
    <header className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-normal text-[#202124]">Ranking</h1>
        </div>
        <div className="flex items-center gap-2">
          <ViewModeSelector
            viewMode={viewMode}
            onViewChange={onViewChange}
            onOpenModal={onOpenModal}
          />
        </div>
      </div>
    </header>
  );
}
