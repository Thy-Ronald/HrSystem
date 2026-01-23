/**
 * RankingHeader Component
 * Main header with title, refresh button, and view mode selector
 */

import { RefreshButton } from './RefreshButton';
import { ViewModeSelector } from './ViewModeSelector';
import { RepositorySelect } from './RepositorySelect';

export function RankingHeader({ 
  viewMode, 
  onViewChange, 
  onRefresh, 
  isRefreshing, 
  refreshError, 
  repositories, 
  selectedRepo, 
  onRepoChange, 
  reposLoading,
}) {
  return (
    <header className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-normal text-[#202124]">Ranking</h1>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <RefreshButton 
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              error={refreshError}
            />
          )}
          <ViewModeSelector 
            viewMode={viewMode}
            onViewChange={onViewChange}
          />
        </div>
      </div>
      <div className="flex items-center">
        <RepositorySelect
          repositories={repositories}
          selectedRepo={selectedRepo}
          onRepoChange={onRepoChange}
          loading={reposLoading}
        />
      </div>
    </header>
  );
}
