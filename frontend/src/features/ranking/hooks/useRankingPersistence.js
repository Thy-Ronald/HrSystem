/**
 * useRankingPersistence Hook
 * Manages localStorage persistence for ranking state
 */

import { useEffect, useRef } from 'react';
import { loadFromStorage, saveToStorage, clearStorage } from '../utils/storage';
import { STORAGE_KEYS, CURRENT_CACHE_VERSION } from '../constants';
import { getCacheKey } from '../utils/dataTransform';

export function useRankingPersistence({
  activeFilter,
  viewMode,
  rankingData,
  selectedRepo,
  getCacheSnapshot,
  restoreCache,
  setRankingData,
}) {
  const isInitialMount = useRef(true);

  /**
   * Initialize state from localStorage on mount
   */
  useEffect(() => {
    const savedVersion = loadFromStorage(STORAGE_KEYS.CACHE_VERSION, 0);
    
    // If cache version is outdated, clear all cached data
    if (savedVersion !== CURRENT_CACHE_VERSION) {
      console.log('Cache version changed, clearing old cache...');
      clearStorage([
        STORAGE_KEYS.CACHE,
        STORAGE_KEYS.RANKING_DATA,
      ]);
      saveToStorage(STORAGE_KEYS.CACHE_VERSION, CURRENT_CACHE_VERSION);
      isInitialMount.current = false;
      return;
    }

    // Restore cache
    const savedCache = loadFromStorage(STORAGE_KEYS.CACHE, {});
    if (savedCache && Object.keys(savedCache).length > 0) {
      restoreCache(savedCache);
      
      // Restore data for current repo/filter
      const savedRepo = loadFromStorage(STORAGE_KEYS.SELECTED_REPO, '');
      const savedFilter = loadFromStorage(STORAGE_KEYS.ACTIVE_FILTER, 'today');
      
      if (savedRepo) {
        const cacheKey = getCacheKey(savedRepo, savedFilter);
        const cachedData = savedCache[cacheKey];
        if (cachedData) {
          setRankingData(cachedData);
        }
      }
    }
    
    isInitialMount.current = false;
  }, [restoreCache, setRankingData]);

  /**
   * Persist active filter to localStorage
   */
  useEffect(() => {
    if (!isInitialMount.current) {
      saveToStorage(STORAGE_KEYS.ACTIVE_FILTER, activeFilter);
    }
  }, [activeFilter]);

  /**
   * Persist view mode to localStorage
   */
  useEffect(() => {
    if (!isInitialMount.current) {
      saveToStorage(STORAGE_KEYS.VIEW_MODE, viewMode);
    }
  }, [viewMode]);

  /**
   * Persist ranking data to localStorage
   */
  useEffect(() => {
    if (!isInitialMount.current && rankingData.length > 0) {
      saveToStorage(STORAGE_KEYS.RANKING_DATA, rankingData);
    }
  }, [rankingData]);

  /**
   * Persist selected repo to localStorage
   */
  useEffect(() => {
    if (!isInitialMount.current && selectedRepo) {
      saveToStorage(STORAGE_KEYS.SELECTED_REPO, selectedRepo);
    }
  }, [selectedRepo]);

  /**
   * Persist cache to localStorage periodically
   */
  useEffect(() => {
    if (isInitialMount.current) return;

    const saveInterval = setInterval(() => {
      const cacheSnapshot = getCacheSnapshot();
      if (cacheSnapshot && Object.keys(cacheSnapshot).length > 0) {
        saveToStorage(STORAGE_KEYS.CACHE, cacheSnapshot);
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [getCacheSnapshot]);

  return {
    isInitialMount: isInitialMount.current,
  };
}
