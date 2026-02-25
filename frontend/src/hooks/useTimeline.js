import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchTimelineUsers } from '../services/api';
import { getAppData, generateTimeLabels } from '../lib/timeline-helpers';
import { useTimelineData } from './useTimelineData';
import { useTimelineRealtime } from './useTimelineRealtime';

/**
 * useTimeline Hook
 * 
 * Orchestrator hook that combines:
 * - useTimelineData: REST API + sessionStorage caching
 * - useTimelineRealtime: Socket.IO real-time updates
 * 
 * Responsibility:
 * - Manage user list state
 * - Persist user/date selection to sessionStorage
 * - Coordinate between data fetching and real-time sync
 * - Transform data into presentation models
 */
export const useTimeline = () => {
    const STORAGE_KEY = 'timelineState';

    // Initialize state from sessionStorage
    const getInitialState = () => {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('[useTimeline] Failed to restore state:', error);
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
    const [showScreenshots, setShowScreenshots] = useState(initialState.showScreenshots);

    // Use specialized data hook
    const {
        data,
        loading: loadingData,
        error,
        fetchData: fetchTimelineData,
        mergeData,
        setError
    } = useTimelineData(selectedUser, date);

    // Handle real-time activity updates
    const handleActivityUpdate = useCallback((activityData) => {
        console.log('[useTimeline] Activity update received, merging...');
        mergeData({
            activityLogs: {
                activities: activityData.activities,
                topApps: activityData.topApps,
                totalActiveMs: activityData.totalActiveMs
            }
        });
    }, [mergeData]);

    // Handle real-time screenshot updates
    const handleScreenshotsUpdate = useCallback((screenshotsData) => {
        console.log('[useTimeline] Screenshots update received, merging...');
        mergeData({
            screenshots: {
                images: screenshotsData.images
            }
        });
    }, [mergeData]);

    // Setup real-time sync with Socket.IO
    useTimelineRealtime(selectedUser, date, handleActivityUpdate, handleScreenshotsUpdate);

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
            console.warn('[useTimeline] Failed to save state:', error);
        }
    }, [date, selectedUser, showScreenshots]);

    // Load users on mount
    useEffect(() => {
        const loadUsers = async () => {
            try {
                setLoadingUsers(true);
                const userList = await fetchTimelineUsers();
                setUsers(userList || []);

                // Try to restore previously selected user
                if (initialState.selectedUser && userList) {
                    const foundUser = userList.find(u => u.id === initialState.selectedUser.id);
                    if (foundUser) {
                        setSelectedUser(foundUser);
                    }
                }
            } catch (err) {
                console.error('[useTimeline] Failed to load users:', err);
                setError('Connection failed. Please check backend status.');
            } finally {
                setLoadingUsers(false);
            }
        };
        loadUsers();
    }, []);

    // Transform data into presentation models
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

        // Actions
        setDate,
        setSelectedUser,
        handleFetchData: fetchTimelineData,
        toggleScreenshots,
        setError
    };
};
