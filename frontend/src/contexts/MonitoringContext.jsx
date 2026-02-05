import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useScreenShare } from '../hooks/useScreenShare';
import { useToast } from '../components/Toast';
import { getToken } from '../utils/auth';

const MonitoringContext = createContext();

export const MonitoringProvider = ({ children }) => {
    const { user, isConnected: authConnected } = useAuth();
    const { socket, isConnected, emit, subscribe, unsubscribe } = useSocket();
    const toast = useToast();

    // Shared state
    const [sessionId, setSessionId] = useState(() => localStorage.getItem('monitoring_sessionId') || null);
    const [loading, setLoading] = useState(false);

    // Admin state
    const [sessions, setSessions] = useState(() => {
        const saved = localStorage.getItem('monitoring_sessions');
        return saved ? JSON.parse(saved) : [];
    });
    const [connectError, setConnectError] = useState(null);

    // Employee state
    const [adminCount, setAdminCount] = useState(0);
    const [justReconnected, setJustReconnected] = useState(false);
    const [connectionRequest, setConnectionRequest] = useState(null); // { adminName, adminSocketId }

    // Persistence effects
    useEffect(() => {
        if (sessionId) localStorage.setItem('monitoring_sessionId', sessionId);
        else localStorage.removeItem('monitoring_sessionId');
    }, [sessionId]);

    const sessionsRef = useRef(sessions);
    useEffect(() => {
        sessionsRef.current = sessions;
        localStorage.setItem('monitoring_sessions', JSON.stringify(sessions));
    }, [sessions]);

    // Screen sharing hook (attached to provider so it persists navigation)
    const role = user?.role || null;
    const { isSharing, error: shareError, startSharing: startSharingBase, stopSharing } = useScreenShare(
        role === 'employee' ? 'employee' : null,
        sessionId
    );

    const startSharing = useCallback(async () => {
        const stream = await startSharingBase();
        return stream;
    }, [startSharingBase]);

    // Socket event handlers
    useEffect(() => {
        if (!isConnected) return;

        const handleCreated = ({ sessionId: sid }) => {
            console.log('[MonitoringContext] Session created/restored:', sid);
            setSessionId(sid);
            setLoading(false);
            setJustReconnected(true);
            // toast.success('System ready'); // Reduced noise
        };

        const handleError = ({ message, sessionId: errSessionId }) => {
            setLoading(false);

            // If the error is about a missing session, clean it up from our list
            if (message.includes('Session not found') || message.includes('expired')) {
                console.warn(`[MonitoringContext] Session dead, cleaning up: ${errSessionId || 'unknown'}`);
                if (errSessionId) {
                    setSessions(prev => prev.filter(s => s.sessionId !== errSessionId));
                }
            } else {
                toast.error(message);
            }
        };

        const handleConnectSuccess = ({ sessionId: sid, employeeName, employeeId, avatarUrl, streamActive: active }) => {
            setSessions(prev => {
                const exists = prev.find(s => s.sessionId === sid);
                if (exists) {
                    return prev.map(s => s.sessionId === sid ? { ...s, employeeId, streamActive: active, avatarUrl, lastSocketUpdate: Date.now() } : s);
                }
                return [...prev, { sessionId: sid, employeeName, employeeId, avatarUrl, streamActive: active, lastSocketUpdate: Date.now() }];
            });
            setConnectError(null);
            toast.success(`Connected to ${employeeName}`);
        };

        const handleSessionJoined = ({ sessionId: sid, avatarUrl, streamActive: active }) => {
            console.log(`[MonitoringContext] Syncing session-joined for ${sid}, active: ${active}`);
            setSessions(prev => prev.map(s => s.sessionId === sid ? { ...s, streamActive: active, avatarUrl, lastSocketUpdate: Date.now() } : s));
        };

        const handleConnectError = ({ message }) => {
            setConnectError(message);
            toast.error(message);
        };

        const onStart = ({ sessionId: id }) => {
            console.log(`[MonitoringContext] Incoming stream-started for ${id}`);
            setSessions(prev => {
                const updated = prev.map(s => s.sessionId === id ? { ...s, streamActive: true, lastSocketUpdate: Date.now() } : s);
                console.log(`[MonitoringContext] Updated sessions (after start):`, updated.find(s => s.sessionId === id));
                return updated;
            });
        };

        const onStop = ({ sessionId: id, reason }) => {
            console.log(`[MonitoringContext] Incoming stream-stopped for ${id}, reason: ${reason}`);
            setSessions(prev => {
                const updated = prev.map(s => s.sessionId === id ? { ...s, streamActive: false, disconnectReason: reason, lastSocketUpdate: Date.now() } : s);
                console.log(`[MonitoringContext] Updated sessions (after stop):`, updated.find(s => s.sessionId === id));
                return updated;
            });
        };

        const onEnd = ({ sessionId: id }) => {
            setSessions(prev => prev.filter(s => s.sessionId !== id));
        };

        const onJoin = ({ adminName }) => {
            setAdminCount(prev => prev + 1);
            toast.info(`${adminName} joined`);
        };

        const onLeave = () => {
            setAdminCount(prev => Math.max(0, prev - 1));
        };

        const handleConnectionRequest = ({ adminName, adminSocketId }) => {
            setConnectionRequest({ adminName, adminSocketId });
        };

        const handleRequestSent = ({ employeeName }) => {
            toast.success(`Request sent to ${employeeName}`);
        };

        const handleRequestDenied = ({ employeeName }) => {
            toast.error(`Connection request denied by ${employeeName}`);
        };

        const handleNewSession = (newSession) => {
            console.log('[MonitoringContext] Real-time: New session available:', newSession.sessionId);
            setSessions(prev => {
                const exists = prev.find(s => s.sessionId === newSession.sessionId);
                if (exists) return prev;
                return [...prev, newSession];
            });
            // Automatically join the room for this new session
            emit('monitoring:join-session', { sessionId: newSession.sessionId });
        };

        subscribe('monitoring:session-created', handleCreated);
        subscribe('monitoring:error', handleError);
        subscribe('monitoring:connect-success', handleConnectSuccess);
        subscribe('monitoring:connect-error', handleConnectError);
        subscribe('monitoring:session-joined', handleSessionJoined);
        subscribe('monitoring:stream-started', onStart);
        subscribe('monitoring:stream-stopped', onStop);
        subscribe('monitoring:session-ended', onEnd);
        subscribe('monitoring:admin-joined', onJoin);
        subscribe('monitoring:admin-left', onLeave);
        subscribe('monitoring:connection-request', handleConnectionRequest);
        subscribe('monitoring:request-sent', handleRequestSent);
        subscribe('monitoring:request-denied', handleRequestDenied);
        subscribe('monitoring:new-session', handleNewSession);

        return () => {
            unsubscribe('monitoring:session-created', handleCreated);
            unsubscribe('monitoring:error', handleError);
            unsubscribe('monitoring:connect-success', handleConnectSuccess);
            unsubscribe('monitoring:connect-error', handleConnectError);
            unsubscribe('monitoring:session-joined', handleSessionJoined);
            unsubscribe('monitoring:stream-started', onStart);
            unsubscribe('monitoring:stream-stopped', onStop);
            unsubscribe('monitoring:session-ended', onEnd);
            unsubscribe('monitoring:admin-joined', onJoin);
            unsubscribe('monitoring:admin-left', onLeave);
            unsubscribe('monitoring:connection-request', handleConnectionRequest);
            unsubscribe('monitoring:request-sent', handleRequestSent);
            unsubscribe('monitoring:request-denied', handleRequestDenied);
            unsubscribe('monitoring:new-session', handleNewSession);
        };
    }, [isConnected, subscribe, unsubscribe, toast]);

    // Re-auth on refresh/navigation
    useEffect(() => {
        if (user && isConnected) {
            if (role === 'admin') {
                emit('monitoring:auth', { token: getToken(), role: user.role, name: user.name });
            } else if (role === 'employee') {
                // Employee auths without code now
                emit('monitoring:auth', {
                    token: getToken(),
                    role: user.role,
                    name: user.name
                });
            }
        } else if (!user && isSharing) {
            // User logged out, stop sharing immediately
            console.log('[Monitoring] User logged out, stopping share');
            stopSharing();
        }
    }, [user, isConnected, role]); // sessions omitted from deps to avoid loop

    const fetchSessions = useCallback(async (silent = false) => {
        if (role !== 'admin' || !isConnected) return;
        if (!silent) setLoading(true);
        try {
            const { getMonitoringSessions } = await import('../services/api');
            const response = await getMonitoringSessions();
            const fetchedSessions = response.data || [];

            setSessions(prev => {
                // Merge logic: preserve streamActive/avatarUrl if we have more recent socket data
                // but use fetched data as base
                return fetchedSessions.map(fs => {
                    const existing = prev.find(p => p.sessionId === fs.sessionId);
                    if (existing) {
                        // Race condition protection: If we had a socket update in the last 5 seconds,
                        // don't let the (potentially stale) API response overwrite the status.
                        const socketUpdateThreshold = 5000;
                        const isRecentlyUpdatedBySocket = existing.lastSocketUpdate && (Date.now() - existing.lastSocketUpdate < socketUpdateThreshold);

                        return {
                            ...fs,
                            ...existing,
                            streamActive: isRecentlyUpdatedBySocket ? existing.streamActive : fs.streamActive
                        };
                    }
                    return fs;
                });
            });
            setConnectError(null);
        } catch (err) {
            console.error('[MonitoringContext] Fetch failed:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [role, isConnected]);

    // Initial fetch and polling
    useEffect(() => {
        if (role === 'admin' && isConnected) {
            fetchSessions();
            const interval = setInterval(() => fetchSessions(true), 30000);
            return () => clearInterval(interval);
        }
    }, [fetchSessions, role, isConnected]);

    // Join all sessions when admin re-authenticates or sessions list changes
    useEffect(() => {
        if (role === 'admin' && isConnected) {
            console.log(`[MonitoringContext] Joining ${sessions.length} session rooms...`);
            sessions.forEach(s => {
                emit('monitoring:join-session', { sessionId: s.sessionId });
            });
        }
    }, [isConnected, role, sessions.map(s => s.sessionId).join(',')]); // Precise dependency on session IDs

    const resetSession = useCallback(() => {
        stopSharing();
        setSessionId(null);
        setJustReconnected(false);
        localStorage.removeItem('monitoring_sessionId');
        toast.info('Session reset.');
        // Re-auth to get new session
        if (isConnected && role === 'employee') {
            emit('monitoring:auth', { role: user.role, name: user.name });
        }
    }, [stopSharing, toast, isConnected, role, user, emit]);

    const clearConnectError = useCallback(() => setConnectError(null), []);

    const respondConnection = useCallback((adminSocketId, accepted) => {
        emit('monitoring:respond-connection', { adminSocketId, accepted });
        setConnectionRequest(null);
    }, [emit]);

    const value = useMemo(() => ({
        sessionId,
        loading,
        setLoading,
        sessions,
        setSessions,
        connectError,
        clearConnectError,
        justReconnected,
        setJustReconnected,
        resetSession,
        isSharing,
        shareError,
        startSharing,
        stopSharing,
        emit,
        connectionRequest,
        setConnectionRequest,
        respondConnection
    }), [
        sessionId,
        loading,
        sessions,
        connectError,
        clearConnectError,
        justReconnected,
        resetSession,
        isSharing,
        shareError,
        startSharing,
        stopSharing,
        emit,
        connectionRequest,
        respondConnection
    ]);

    return (
        <MonitoringContext.Provider value={value}>
            {children}
        </MonitoringContext.Provider>
    );
};

export const useMonitoring = () => {
    const context = useContext(MonitoringContext);
    if (!context) {
        throw new Error('useMonitoring must be used within a MonitoringProvider');
    }
    return context;
};
