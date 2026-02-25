import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchTimelineUsers, fetchTimelineData } from '../services/api';
import { getAppData, generateTimeLabels } from '../lib/timeline-helpers';
import { useTimelineRealtime } from './useTimelineRealtime';

/**
 * Custom hook for managing Timeline state and data operations.
 * Implements SRP by separating data orchestration from the UI.
 * Persists state to sessionStorage for resilience across navigation.
 * Integrates real-time updates via Socket.IO.
 */
export const useTimeline = () => {
    const STORAGE_KEY = 'timelineState';
    const DATA_STORAGE_KEY = 'timelineData';

    // Initialize state from sessionStorage or defaults
    const getInitialState = () => {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to restore timeline state:', error);
        }
        return {
            date: new Date().toISOString().split('T')[0],
            selectedUser: null,
            showScreenshots: true
        };
    };

    const initialState = getInitialState();
    const [date, setDate] = useState(initialState.date);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(initialState.selectedUser);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [showScreenshots, setShowScreenshots] = useState(initialState.showScreenshots);

    // Handle real-time data updates from Socket.IO
    const handleRealtimeUpdate = useCallback((update) => {
        setData(prevData => {
            if (!prevData) return prevData;

            const updatedData = { ...prevData };

            if (update.type === 'activity') {
                updatedData.activityLogs = {
                    ...updatedData.activityLogs,
                    activities: update.activities,
                    topApps: update.topApps,
                    totalActiveMs: update.totalActiveMs
                };
                console.log('[useTimeline] Updated activity logs in real-time');
            } else if (update.type === 'screenshots') {
                updatedData.screenshots = {
                    ...updatedData.screenshots,
                    images: update.images
                };
                console.log('[useTimeline] Updated screenshots in real-time');
            }

            // Update sessionStorage with new data
            try {
                if (selectedUser && date) {
                    const dataKey = `${DATA_STORAGE_KEY}:${selectedUser.id}:${date}`;
                    sessionStorage.setItem(dataKey, JSON.stringify(updatedData));
                }
            } catch (err) {
                console.warn('Failed to save real-time data to storage:', err);
            }

            return updatedData;
        });
    }, [selectedUser, date]);

    // Setup real-time socket listener
    useTimelineRealtime(selectedUser, date, handleRealtimeUpdate);

    // Persist state to sessionStorage whenever it changes
    useEffect(() => {
        try {
            const stateToStore = {
                date,
                selectedUser,
                showScreenshots
            };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
        } catch (error) {
            console.warn('Failed to save timeline state:', error);
        }
    }, [date, selectedUser, showScreenshots]);

    // Persist fetched data to sessionStorage
    useEffect(() => {
        if (data && selectedUser && date) {
            try {
                const dataKey = `${DATA_STORAGE_KEY}:${selectedUser.id}:${date}`;
                sessionStorage.setItem(dataKey, JSON.stringify(data));
            } catch (error) {
                console.warn('Failed to save timeline data:', error);
            }
        }
    }, [data, selectedUser, date]);

    // Try to restore cached data from sessionStorage
    const restoreCachedData = useCallback(() => {
        if (selectedUser && date) {
            try {
                const dataKey = `${DATA_STORAGE_KEY}:${selectedUser.id}:${date}`;
                const cached = sessionStorage.getItem(dataKey);
                if (cached) {
                    setData(JSON.parse(cached));
                    return true;
                }
            } catch (error) {
                console.warn('Failed to restore cached data:', error);
            }
        }
        return false;
    }, [selectedUser, date]);

    // Initial load of personnel
    useEffect(() => {
        const loadUsers = async () => {
            try {
                setLoadingUsers(true);
                const userList = await fetchTimelineUsers();
                setUsers(userList || []);

                // If we had a selected user before, try to find them in the new list
                if (initialState.selectedUser && userList) {
                    const foundUser = userList.find(u => u.id === initialState.selectedUser.id);
                    if (foundUser) {
                        setSelectedUser(foundUser);
                    }
                }
            } catch (err) {
                console.error('Failed to load users:', err);
                setError('Connection failed. Please check backend status.');
            } finally {
                setLoadingUsers(false);
            }
        };
        loadUsers();
    }, []);

    // Restore cached data after user list is loaded
    useEffect(() => {
        if (!loadingUsers && selectedUser) {
            const hasCache = restoreCachedData();
            if (!hasCache) {
                setData(null);
            }
        }
    }, [selectedUser, loadingUsers, restoreCachedData]);

    const handleFetchData = useCallback(async () => {
        if (!selectedUser) return;
        try {
            setLoadingData(true);
            setError(null);
            const timelineData = await fetchTimelineData(selectedUser.id, date);
            setData(timelineData);
        } catch (err) {
            console.error('Failed to fetch timeline data:', err);
            setError('Unable to retrieve activity data for this period.');
        } finally {
            setLoadingData(false);
        }
    }, [selectedUser, date]);

    // Transformation Logic (Domain Models)
    const topApps = useMemo(() => {
        if (!data?.activityLogs?.topApps) return [];
        return data.activityLogs.topApps.map(app => ({
            name: app.name,
            duration: Math.round(app.totalMs / 1000 / 60),
            percent: Math.round(app.percentage),
            color: getAppData(app.name).color
        })).slice(0, 5);
    }, [data]);

    const timeLabels = useMemo(() => generateTimeLabels(), []);

    const toggleScreenshots = useCallback(() => {
        setShowScreenshots(prev => !prev);
    }, []);

    return {
        // State
        date,
        users,
        selectedUser,
        loadingUsers,
        loadingData,
        data,
        error,
        showScreenshots,
        topApps,
        timeLabels,

        // Setters/Actions
        setDate,
        setSelectedUser,
        handleFetchData,
        toggleScreenshots,
        setError
    };
};
