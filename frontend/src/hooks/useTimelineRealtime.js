import { useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom hook for managing real-time timeline updates via Socket.IO
 * Subscribes to Firestore changes and updates the UI in real-time
 */
export const useTimelineRealtime = (selectedUser, dateKey, onDataUpdate) => {
    // Determine backend URL based on environment
    const getBackendUrl = () => {
        // In production or when explicitly set
        const envUrl = import.meta.env.VITE_BACKEND_URL;
        if (envUrl) return envUrl;

        // In development, use the vite proxy target (http://localhost:4000)
        if (import.meta.env.DEV) {
            return 'http://localhost:4000';
        }

        // Production fallback: use current domain
        return window.location.origin;
    };

    const BACKEND_URL = getBackendUrl();

    useEffect(() => {
        if (!selectedUser || !dateKey) return;

        // Connect to Socket.IO server
        const socket = io(BACKEND_URL, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling']
        });

        // Subscribe to timeline updates
        const handleConnect = () => {
            console.log('[TimelineRealtime] Connected to server:', BACKEND_URL);
            socket.emit('timeline:subscribe', {
                userId: selectedUser.id,
                dateKey: dateKey
            });
        };

        // Handle activity log updates
        const handleActivityUpdate = (data) => {
            console.log('[TimelineRealtime] Activity update received:', data);
            if (data.userId === selectedUser.id && data.dateKey === dateKey) {
                onDataUpdate({
                    type: 'activity',
                    activities: data.activities,
                    topApps: data.topApps,
                    totalActiveMs: data.totalActiveMs
                });
            }
        };

        // Handle screenshot updates
        const handleScreenshotsUpdate = (data) => {
            console.log('[TimelineRealtime] Screenshots update received:', data);
            if (data.userId === selectedUser.id && data.dateKey === dateKey) {
                onDataUpdate({
                    type: 'screenshots',
                    images: data.images
                });
            }
        };

        // Handle errors
        const handleError = (data) => {
            console.error('[TimelineRealtime] Socket error:', data.error);
        };

        // Handle subscription confirmation
        const handleSubscribed = (data) => {
            console.log('[TimelineRealtime] Subscribed to', data);
        };

        // Handle disconnect
        const handleDisconnect = () => {
            console.log('[TimelineRealtime] Disconnected from server');
        };

        socket.on('connect', handleConnect);
        socket.on('timeline:activity-updated', handleActivityUpdate);
        socket.on('timeline:screenshots-updated', handleScreenshotsUpdate);
        socket.on('timeline:error', handleError);
        socket.on('timeline:subscribed', handleSubscribed);
        socket.on('disconnect', handleDisconnect);

        // Cleanup on unmount or when dependencies change
        return () => {
            socket.emit('timeline:unsubscribe');
            socket.disconnect();
        };
    }, [selectedUser, dateKey, onDataUpdate, BACKEND_URL]);
};
