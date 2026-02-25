import { useState, useEffect, useCallback } from 'react';
import { fetchTimelineData } from '../services/api';

/**
 * useTimelineData Hook
 * 
 * Responsible for:
 * - Managing timeline data state
 * - Handling REST API calls
 * - Managing sessionStorage cache
 * - Loading states and errors
 * 
 * Does NOT handle: Real-time updates (that's useTimelineRealtimeSync)
 */
export const useTimelineData = (selectedUser, dateKey) => {
    const DATA_STORAGE_KEY = 'timelineData';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Try to restore cached data from sessionStorage
    const restoreCachedData = useCallback(() => {
        if (selectedUser && dateKey) {
            try {
                const cacheKey = `${DATA_STORAGE_KEY}:${selectedUser.id}:${dateKey}`;
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    setData(JSON.parse(cached));
                    return true;
                }
            } catch (err) {
                console.warn('[useTimelineData] Failed to restore cached data:', err);
            }
        }
        return false;
    }, [selectedUser, dateKey]);

    // Persist data to sessionStorage whenever it changes
    useEffect(() => {
        if (data && selectedUser && dateKey) {
            try {
                const cacheKey = `${DATA_STORAGE_KEY}:${selectedUser.id}:${dateKey}`;
                sessionStorage.setItem(cacheKey, JSON.stringify(data));
            } catch (err) {
                console.warn('[useTimelineData] Failed to save data to cache:', err);
            }
        }
    }, [data, selectedUser, dateKey]);

    // Try to restore cached data when user/date changes
    useEffect(() => {
        if (selectedUser && dateKey) {
            const hasCache = restoreCachedData();
            if (!hasCache) {
                setData(null);
            }
        }
    }, [selectedUser, dateKey, restoreCachedData]);

    // Fetch data from API
    const fetchData = useCallback(async () => {
        if (!selectedUser || !dateKey) return;

        try {
            setLoading(true);
            setError(null);
            const timelineData = await fetchTimelineData(selectedUser.id, dateKey);
            setData(timelineData);
        } catch (err) {
            console.error('[useTimelineData] Failed to fetch data:', err);
            setError('Unable to retrieve activity data for this period.');
        } finally {
            setLoading(false);
        }
    }, [selectedUser, dateKey]);

    // Update data with merged values (for real-time updates)
    const mergeData = useCallback((updates) => {
        setData(prevData => {
            if (!prevData) return prevData;

            const merged = { ...prevData };

            if (updates.activityLogs) {
                merged.activityLogs = {
                    ...merged.activityLogs,
                    ...updates.activityLogs
                };
            }

            if (updates.screenshots) {
                merged.screenshots = {
                    ...merged.screenshots,
                    ...updates.screenshots
                };
            }

            return merged;
        });
    }, []);

    return {
        data,
        loading,
        error,
        fetchData,
        mergeData,
        setData,
        setError
    };
};
