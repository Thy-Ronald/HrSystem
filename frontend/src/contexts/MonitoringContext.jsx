import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useScreenShare } from '../hooks/useScreenShare';
import { useToast } from '../components/Toast';

const MonitoringContext = createContext();

export const MonitoringProvider = ({ children }) => {
    const { user, isConnected: authConnected } = useAuth();
    const { socket, isConnected, emit, subscribe, unsubscribe } = useSocket();
    const toast = useToast();

    // Shared state
    const [sessionId, setSessionId] = useState(() => localStorage.getItem('monitoring_sessionId') || null);
    const [connectionCode, setConnectionCode] = useState(() => localStorage.getItem('monitoring_connectionCode') || '');
    const [loading, setLoading] = useState(false);

    // Admin state
    const [sessions, setSessions] = useState(() => {
        const saved = localStorage.getItem('monitoring_sessions');
        return saved ? JSON.parse(saved) : [];
    });

    // Employee state
    const [adminCount, setAdminCount] = useState(0);
    const [justReconnected, setJustReconnected] = useState(false);

    // Persistence effects
    useEffect(() => {
        if (sessionId) localStorage.setItem('monitoring_sessionId', sessionId);
        else localStorage.removeItem('monitoring_sessionId');
    }, [sessionId]);

    useEffect(() => {
        if (connectionCode) localStorage.setItem('monitoring_connectionCode', connectionCode);
        else localStorage.removeItem('monitoring_connectionCode');
    }, [connectionCode]);

    useEffect(() => {
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

        const handleCreated = ({ sessionId: sid, connectionCode: code }) => {
            console.log('[MonitoringContext] Session created/restored:', sid);
            setSessionId(sid);
            setLoading(false);
            if (code) setConnectionCode(code);
            setJustReconnected(true);
            toast.success('System ready');
        };

        const handleError = ({ message }) => {
            setLoading(false);
            toast.error(message);
        };

        const handleConnectSuccess = ({ sessionId: sid, employeeName, streamActive: active }) => {
            setSessions(prev => {
                const exists = prev.find(s => s.sessionId === sid);
                if (exists) {
                    return prev.map(s => s.sessionId === sid ? { ...s, streamActive: active } : s);
                }
                return [...prev, { sessionId: sid, employeeName, streamActive: active }];
            });
            toast.success(`Connected to ${employeeName}`);
        };

        const handleSessionJoined = ({ sessionId: sid, streamActive: active }) => {
            console.log(`[MonitoringContext] Joined session ${sid}, active: ${active}`);
            setSessions(prev => prev.map(s => s.sessionId === sid ? { ...s, streamActive: active } : s));
        };

        const handleConnectError = ({ message }) => {
            toast.error(message);
        };

        const onStart = ({ sessionId: id }) => {
            setSessions(prev => prev.map(s => s.sessionId === id ? { ...s, streamActive: true } : s));
        };

        const onStop = ({ sessionId: id }) => {
            setSessions(prev => prev.map(s => s.sessionId === id ? { ...s, streamActive: false } : s));
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
        };
    }, [isConnected, subscribe, unsubscribe, toast]);

    // Re-auth on refresh/navigation if we have a sessionId or connectionCode
    useEffect(() => {
        if (user && isConnected) {
            if (role === 'admin') {
                emit('monitoring:auth', { role: user.role, name: user.name });
                // Attempt to re-join existing sessions
                sessions.forEach(s => {
                    emit('monitoring:join-session', { sessionId: s.sessionId });
                });
            } else if (role === 'employee' && connectionCode) {
                emit('monitoring:auth', {
                    role: user.role,
                    name: user.name,
                    connectionCode: connectionCode.trim()
                });
            }
        }
    }, [user, isConnected, role, emit]); // connectionCode and sessions omitted from deps to avoid loop

    const value = {
        sessionId,
        connectionCode,
        setConnectionCode,
        loading,
        setLoading,
        sessions,
        setSessions,
        justReconnected,
        setJustReconnected,
        isSharing,
        shareError,
        startSharing,
        stopSharing,
        emit
    };

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
