/**
 * useIssueUpdates Hook
 * 
 * Subscribes to real-time issue updates via Socket.IO.
 * Handles incremental state updates without full refetch.
 * 
 * Performance optimized:
 * - No polling
 * - No full refreshes
 * - Only incremental updates
 */

import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

/**
 * Custom hook for subscribing to real-time issue updates
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.selectedRepo - Currently selected repository (owner/repo)
 * @param {Function} options.onIssueUpdate - Callback when an issue is updated
 * @param {Object} options.cacheRef - Reference to the cache Map from useRankingData
 * @returns {Object} Hook state
 * - isConnected: Socket connection status
 * - connectionError: Error message if connection failed
 */
export function useIssueUpdates({ selectedRepo, onIssueUpdate, cacheRef }) {
  const { isConnected, connectionError, subscribe, unsubscribe, emit } = useSocket();
  const selectedRepoRef = useRef(selectedRepo);

  // Keep ref updated with latest selectedRepo
  useEffect(() => {
    selectedRepoRef.current = selectedRepo;
  }, [selectedRepo]);

  // Handle incoming issue:update events
  const handleIssueUpdate = useCallback((payload) => {
    console.log('[IssueUpdates] Received issue:update event:', payload);

    const { action, issue, repo } = payload;

    // Only process updates for the currently selected repo
    if (repo !== selectedRepoRef.current) {
      console.log(`[IssueUpdates] Ignoring update for ${repo}, current repo is ${selectedRepoRef.current}`);
      return;
    }

    // Notify parent component of the update
    if (onIssueUpdate) {
      onIssueUpdate({ action, issue, repo });
    }

    // Invalidate cache for this repo (all filters)
    // This ensures fresh data on next filter change
    if (cacheRef?.current) {
      const filters = ['today', 'yesterday', 'this-week', 'last-week', 'this-month'];
      filters.forEach(filter => {
        const cacheKey = `${repo}_${filter}`;
        cacheRef.current.delete(cacheKey);
      });
      console.log(`[IssueUpdates] Invalidated cache for repo: ${repo}`);
    }

  }, [onIssueUpdate, cacheRef]);

  // Subscribe to issue:update events when socket connects
  useEffect(() => {
    console.log('[IssueUpdates] Setting up issue:update subscription');
    
    subscribe('issue:update', handleIssueUpdate);

    // Cleanup on unmount
    return () => {
      console.log('[IssueUpdates] Cleaning up issue:update subscription');
      unsubscribe('issue:update', handleIssueUpdate);
    };
  }, [subscribe, unsubscribe, handleIssueUpdate]);

  // Optionally subscribe to specific repo channel for targeted updates
  useEffect(() => {
    if (selectedRepo && isConnected) {
      emit('subscribe:repo', selectedRepo);

      return () => {
        emit('unsubscribe:repo', selectedRepo);
      };
    }
  }, [selectedRepo, isConnected, emit]);

  return {
    isConnected,
    connectionError,
  };
}

export default useIssueUpdates;
