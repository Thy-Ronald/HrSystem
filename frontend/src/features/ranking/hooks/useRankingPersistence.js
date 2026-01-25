/**
 * useRankingPersistence Hook
 * Persists the in-memory ranking cache to localStorage across page reloads
 */
import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'hr_ranking_cache_v1';

export function useRankingPersistence(rankingHook) {
    const { getCacheSnapshot, restoreCache } = rankingHook;
    const isInitialMount = useRef(true);

    // Restore cache on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    restoreCache(parsed);
                    console.log('[Ranking Persistence] Cache restored from localStorage');
                }
            }
        } catch (error) {
            console.error('[Ranking Persistence] Error restoring cache:', error);
        }
        isInitialMount.current = false;
    }, [restoreCache]);

    // Persist cache on changes
    useEffect(() => {
        if (isInitialMount.current) return;

        // Simple debounced persistence could be added here if performance becomes an issue
        try {
            const snapshot = getCacheSnapshot();
            if (Object.keys(snapshot).length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
            }
        } catch (error) {
            console.error('[Ranking Persistence] Error saving cache:', error);
        }
    }, [getCacheSnapshot]);
}
