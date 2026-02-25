import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * useTimelineRealtimeSync Hook
 * 
 * Responsible for:
 * - Socket.IO connection management
 * - Subscription to real-time updates
 * - Connection state tracking
 * - Automatic reconnection
 * 
 * Does NOT handle: Data state management (that's useTimelineData)
 */
export const useTimelineRealtime = (selectedUser, dateKey, onActivityUpdate, onScreenshotsUpdate) => {
    const [isConnected, setIsConnected] = useState(false);

    // Determine backend URL based on environment
    const getBackendUrl = () => {
        const envUrl = import.meta.env.VITE_BACKEND_URL;
        if (envUrl) return envUrl;

        if (import.meta.env.DEV) {
            return 'http://localhost:4000';
        }

        return window.location.origin;
    };

    const BACKEND_URL = getBackendUrl();

    useEffect(() => {
        if (!selectedUser || !dateKey || !onActivityUpdate || !onScreenshotsUpdate) return;

        // Connect to Socket.IO server
        const socket = io(BACKEND_URL, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling']
        });

        let subscriptionKey = null;

        // Handle connection
        const handleConnect = () => {
            console.log('[useTimelineRealtime] Connected to server:', BACKEND_URL);
            setIsConnected(true);

            // Subscribe to updates
            subscriptionKey = `${selectedUser.id}:${dateKey}`;
            socket.emit('timeline:subscribe', {
                userId: selectedUser.id,
                dateKey: dateKey
            });
        };

        // Handle subscription confirmation
        const handleSubscribed = (data) => {
            console.log('[useTimelineRealtime] Subscribed to', data);
        };

        // Handle activity updates
        const handleActivityUpdate = (data) => {
            console.log('[useTimelineRealtime] Activity update:', data);
            if (onActivityUpdate) {
                onActivityUpdate({
                    activities: data.activities,
                    topApps: data.topApps,
                    totalActiveMs: data.totalActiveMs
                });
            }
        };

        // Handle screenshot updates
        const handleScreenshotsUpdate = (data) => {
            console.log('[useTimelineRealtime] Screenshots update:', data);
            if (onScreenshotsUpdate) {
                onScreenshotsUpdate({
                    images: data.images
                });
            }
        };

        // Handle errors
        const handleError = (data) => {
            console.error('[useTimelineRealtime] Socket error:', data.error);
        };

        // Handle disconnect
        const handleDisconnect = () => {
            console.log('[useTimelineRealtime] Disconnected');
            setIsConnected(false);
        };

        // Register listeners
        socket.on('connect', handleConnect);
        socket.on('timeline:subscribed', handleSubscribed);
        socket.on('timeline:activity-updated', handleActivityUpdate);
        socket.on('timeline:screenshots-updated', handleScreenshotsUpdate);
        socket.on('timeline:error', handleError);
        socket.on('disconnect', handleDisconnect);

        // Cleanup on unmount
        return () => {
            socket.emit('timeline:unsubscribe');
            socket.disconnect();
        };
    }, [selectedUser, dateKey, onActivityUpdate, onScreenshotsUpdate, BACKEND_URL]);

    return {
        isConnected
    };
};
