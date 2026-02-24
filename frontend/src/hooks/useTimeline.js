import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchTimelineUsers, fetchTimelineData } from '../services/api';
import { getAppData, generateTimeLabels } from '../lib/timeline-helpers';

/**
 * Custom hook for managing Timeline state and data operations.
 * Implements SRP by separating data orchestration from the UI.
 */
export const useTimeline = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [showScreenshots, setShowScreenshots] = useState(true);

    // Initial load of personnel
    useEffect(() => {
        const loadUsers = async () => {
            try {
                setLoadingUsers(true);
                const userList = await fetchTimelineUsers();
                setUsers(userList || []);
            } catch (err) {
                console.error('Failed to load users:', err);
                setError('Connection failed. Please check backend status.');
            } finally {
                setLoadingUsers(false);
            }
        };
        loadUsers();
    }, []);

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
