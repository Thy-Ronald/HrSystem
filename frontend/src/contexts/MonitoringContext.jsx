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
        if (!saved) return [];
        // Reset streamActive on mount — the real value is fetched from the server once the socket
        // connects. Keeping stale streamActive:true from localStorage causes session cards to
        // immediately attempt WebRTC before the socket has re-authenticated, leaving them stuck
        // on a loading spinner.
        // Reset volatile state — real values come from the server once connected.
        // Clearing disconnectReason prevents stale 'offline' cards from showing
        // during the auth handshake after a server restart.
        return JSON.parse(saved).map(s => ({ ...s, streamActive: false, disconnectReason: null }));
    });
    const [connectError, setConnectError] = useState(null);

    // Employee state
    const [adminCount, setAdminCount] = useState(0);
    const [justReconnected, setJustReconnected] = useState(false);
    const [connectionRequest, setConnectionRequest] = useState(null); // { adminName, adminSocketId }
    const [resumeData, setResumeData] = useState(null);
    const joinedSessionsRef = useRef(new Set());

    // Persistence effects
    useEffect(() => {
        if (sessionId) localStorage.setItem('monitoring_sessionId', sessionId);
        else localStorage.removeItem('monitoring_sessionId');
    }, [sessionId]);

    const sessionsRef = useRef(sessions);
    const sessionsWriteTimerRef = useRef(null);
    useEffect(() => {
        sessionsRef.current = sessions;
        // Debounce the localStorage write — sessions can change many times per second
        // (e.g. during stream-started/stopped bursts). Writing on every change blocks the
        // main thread with JSON serialization. 500 ms gives a nice balance: state is
        // persisted quickly enough to survive a refresh, without burdening every render.
        clearTimeout(sessionsWriteTimerRef.current);
        sessionsWriteTimerRef.current = setTimeout(() => {
            localStorage.setItem('monitoring_sessions', JSON.stringify(sessions));
        }, 500);
        return () => clearTimeout(sessionsWriteTimerRef.current);
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

        const handleCreated = ({ sessionId: sid, monitoringExpected, activeRequest }) => {
            console.log('[MonitoringContext] Session created/restored:', sid);
            setSessionId(sid);
            setLoading(false);
            setJustReconnected(true);

            if (monitoringExpected && activeRequest) {
                console.log('[MonitoringContext] Server expecting resume for request:', activeRequest.requestId);
                setResumeData(activeRequest);
                // Also persist to localStorage in case they refresh while the modal is open
                localStorage.setItem('monitoring_resume_expected', 'true');
                localStorage.setItem('monitoring_resume_data', JSON.stringify(activeRequest));
                localStorage.setItem('monitoring_trigger_type', 'login');
            }
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
                    return prev.map(s => s.sessionId === sid ? {
                        ...s,
                        employeeId,
                        // Never downgrade streamActive — only monitoring:stream-stopped should set it false
                        streamActive: s.streamActive || active,
                        // Never clear existing avatarUrl if new value is absent
                        avatarUrl: avatarUrl || s.avatarUrl,
                        lastSocketUpdate: Date.now()
                    } : s);
                }
                return [...prev, { sessionId: sid, employeeName, employeeId, avatarUrl, streamActive: active, lastSocketUpdate: Date.now() }];
            });
            setConnectError(null);
            toast.success(`Connected to ${employeeName}`);
        };

        const handleSessionJoined = ({ sessionId: sid, avatarUrl, streamActive: active }) => {
            console.log(`[MonitoringContext] Syncing session-joined for ${sid}, active: ${active}`);
            setSessions(prev => prev.map(s => s.sessionId === sid ? {
                ...s,
                // Never downgrade — session-joined may carry stale streamActive:false
                streamActive: s.streamActive || active,
                avatarUrl: avatarUrl || s.avatarUrl,
                lastSocketUpdate: Date.now()
            } : s));
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
            // toast.info(`${adminName} joined`); 
        };

        const onLeave = () => {
            setAdminCount(prev => Math.max(0, prev - 1));
        };

        const handleConnectionRequest = ({ adminName, adminSocketId, adminUserId }) => {
            setConnectionRequest({ adminName, adminSocketId, adminUserId });
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
                // Check by sessionId first (duplicate event)
                if (prev.find(s => s.sessionId === newSession.sessionId)) return prev;
                // After a server restart, the employee gets a NEW sessionId. Replace any existing
                // card for the same employee so the old 'offline' card doesn't linger.
                const withoutOld = prev.filter(s => String(s.employeeId) !== String(newSession.employeeId));
                return [...withoutOld, newSession];
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
            getToken().then(token => {
                emit('monitoring:auth', { token, role: user.role, name: user.name });
            });
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
            const fetchedSessions = Array.isArray(response) ? response : (response?.data || []);

            setSessions(prev => {
                return fetchedSessions.map(fs => {
                    const existing = prev.find(p => p.sessionId === fs.sessionId);

                    // If this session hasn't been joined yet (fresh refresh / first load),
                    // force streamActive:false so WebRTC doesn't start until
                    // monitoring:session-joined fires — which only happens AFTER the server
                    // has registered the admin's new socket ID in session.adminSocketIds.
                    // This prevents the answer being dropped by the server's security check
                    // and the card being stuck on a loading spinner.
                    const alreadyJoined = joinedSessionsRef.current.has(fs.sessionId);

                    if (existing) {
                        // Race condition protection: If we had a socket update in the last 5 seconds,
                        // don't let the (potentially stale) API response overwrite the status.
                        const socketUpdateThreshold = 5000;
                        const isRecentlyUpdatedBySocket = existing.lastSocketUpdate && (Date.now() - existing.lastSocketUpdate < socketUpdateThreshold);

                        return {
                            ...fs,
                            ...existing,
                            streamActive: alreadyJoined
                                ? (isRecentlyUpdatedBySocket ? existing.streamActive : fs.streamActive)
                                : false,
                        };
                    }
                    return { ...fs, streamActive: alreadyJoined ? fs.streamActive : false };
                });
            });

            // Room Join Optimization (Admin): Ensure we are in rooms for all listed sessions
            // so we get real-time status updates even for non-visible cards.
            if (fetchedSessions.length > 0 && isConnected) {
                fetchedSessions.forEach(fs => {
                    if (!joinedSessionsRef.current.has(fs.sessionId)) {
                        console.log(`[MonitoringContext] Joining room for session: ${fs.sessionId}`);
                        emit('monitoring:join-session', { sessionId: fs.sessionId });
                        joinedSessionsRef.current.add(fs.sessionId);
                    }
                });
            }

            setConnectError(null);
        } catch (err) {
            console.error('[MonitoringContext] Fetch failed:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [role, isConnected, emit]);

    // Re-fetch sessions once auth is confirmed (admin only).
    // This guarantees monitoring:join-session is emitted AFTER the server has processed
    // monitoring:auth — so the admin's new socket ID is added to session.adminSocketIds
    // before any WebRTC offer is sent. Without this, a slow getToken() could cause
    // join-session to be silently dropped (socket.data.authenticated not yet true),
    // leaving the card stuck on a loading spinner after refresh.
    useEffect(() => {
        if (role !== 'admin') return;
        const handleAuthSuccess = () => {
            // Clear join tracking so fetchSessions re-emits join-session for all sessions
            joinedSessionsRef.current.clear();
            fetchSessions(true);
        };
        subscribe('monitoring:auth-success', handleAuthSuccess);
        return () => unsubscribe('monitoring:auth-success', handleAuthSuccess);
    }, [role, subscribe, unsubscribe, fetchSessions]);

    // Clear joined tracking when socket disconnects to ensure re-join on next connection
    useEffect(() => {
        if (!isConnected) {
            joinedSessionsRef.current.clear();
        }
    }, [isConnected]);

    // Initial fetch — real-time socket events handle subsequent updates
    useEffect(() => {
        if (role === 'admin' && isConnected) {
            fetchSessions();
        }
    }, [fetchSessions, role, isConnected]);

    // Stable string derived from session IDs — used in the auto-join effect deps so the
    // effect only re-runs when the actual set of sessions changes, not on every render.
    const sessionIdList = useMemo(() => sessions.map(s => s.sessionId).join(','), [sessions]);

    // Join all sessions when admin re-authenticates or sessions list changes
    useEffect(() => {
        if (role === 'admin' && isConnected) {
            sessions.forEach(s => {
                // Optimization: Use joinedSessionsRef to avoid redundant join emits
                if (!joinedSessionsRef.current.has(s.sessionId)) {
                    emit('monitoring:join-session', { sessionId: s.sessionId });
                    joinedSessionsRef.current.add(s.sessionId);
                }
            });
        }
    }, [isConnected, role, sessionIdList, emit]); // sessionIdList is stable unless sessions actually change

    const resetSession = useCallback(() => {
        stopSharing();
        setSessionId(null);
        setJustReconnected(false);
        localStorage.removeItem('monitoring_sessionId');
        toast.info('Session reset.');
        // Re-auth to get new session
        if (isConnected && role === 'employee') {
            getToken().then(token => {
                emit('monitoring:auth', { token, role: user.role, name: user.name });
            });
        }
    }, [stopSharing, toast, isConnected, role, user, emit]);

    const clearConnectError = useCallback(() => setConnectError(null), []);

    const respondConnection = useCallback((adminSocketId, accepted) => {
        const req = connectionRequest;
        emit('monitoring:respond-connection', {
            adminSocketId,
            adminUserId: req?.adminUserId,
            adminName: req?.adminName,
            accepted,
        });
        setConnectionRequest(null);
    }, [emit, connectionRequest]);

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
        respondConnection,
        resumeData,
        setResumeData
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
        respondConnection,
        resumeData,
        setResumeData
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
