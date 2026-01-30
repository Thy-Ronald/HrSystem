import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useScreenShare } from '../hooks/useScreenShare';
import { useToast, ToastContainer } from '../components/Toast';
import { useConnectionQuality } from '../hooks/useConnectionQuality';

const Monitoring = () => {
  const { socket, isConnected, emit, subscribe, unsubscribe } = useSocket();
  const [role, setRole] = useState(null);
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const [adminCount, setAdminCount] = useState(0);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const toast = useToast();

  const {
    isSharing,
    error: shareError,
    remoteStream,
    remoteVideoRef,
    startSharing,
    stopSharing,
    startViewing,
    stopViewing,
    isConnected: shareConnected,
    peerConnection,
  } = useScreenShare(role, sessionId);

  // Connection quality monitoring
  const connectionQuality = useConnectionQuality(peerConnection, shareConnected);

  // Handle authentication
  const handleAuth = useCallback(() => {
    if (!name.trim() || !role) {
      toast.error('Please enter your name and select a role');
      return;
    }

    if (name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long');
      return;
    }

    setLoading(true);
    emit('monitoring:auth', { role, name: name.trim() });
  }, [role, name, emit, toast]);

  // Handle session creation (employee)
  useEffect(() => {
    const handleSessionCreated = ({ sessionId: newSessionId, timeRemaining }) => {
      setSessionId(newSessionId);
      setSessionTimeRemaining(timeRemaining || 30);
      setLoading(false);
      toast.success('Session created successfully');
    };

    const handleAuthError = ({ message }) => {
      setLoading(false);
      toast.error(message || 'Authentication failed');
    };

    subscribe('monitoring:session-created', handleSessionCreated);
    subscribe('monitoring:error', handleAuthError);

    return () => {
      unsubscribe('monitoring:session-created', handleSessionCreated);
      unsubscribe('monitoring:error', handleAuthError);
    };
  }, [subscribe, unsubscribe, toast]);

  // Handle sessions list (admin)
  useEffect(() => {
    const handleSessionsList = ({ sessions: sessionsList }) => {
      setSessions(sessionsList);
      setSessionsLoading(false);
      setLoading(false);
    };

    const handleSessionAvailable = ({ sessionId: newSessionId, employeeName }) => {
      setSessions((prev) => {
        const exists = prev.find((s) => s.sessionId === newSessionId);
        if (!exists) {
          toast.info(`${employeeName} started a new session`);
          return [...prev, { sessionId: newSessionId, employeeName, streamActive: false }];
        }
        return prev;
      });
    };

    const handleSessionEnded = ({ sessionId: endedSessionId }) => {
      const endedSession = sessions.find((s) => s.sessionId === endedSessionId);
      if (endedSession) {
        toast.warning(`Session with ${endedSession.employeeName} has ended`);
      }
      setSessions((prev) => prev.filter((s) => s.sessionId !== endedSessionId));
      if (selectedSession?.sessionId === endedSessionId) {
        setSelectedSession(null);
        stopViewing();
      }
    };

    subscribe('monitoring:sessions-list', handleSessionsList);
    subscribe('monitoring:session-available', handleSessionAvailable);
    subscribe('monitoring:session-ended', handleSessionEnded);

    return () => {
      unsubscribe('monitoring:sessions-list', handleSessionsList);
      unsubscribe('monitoring:session-available', handleSessionAvailable);
      unsubscribe('monitoring:session-ended', handleSessionEnded);
    };
  }, [subscribe, unsubscribe, selectedSession, stopViewing]);

  // Handle stream status updates
  useEffect(() => {
    const handleStreamStarted = ({ sessionId: targetSessionId }) => {
      if (targetSessionId === sessionId) {
        setStreamActive(true);
        toast.success('Screen sharing started');
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === targetSessionId ? { ...s, streamActive: true } : s
        )
      );
    };

    const handleStreamStopped = ({ sessionId: targetSessionId }) => {
      if (targetSessionId === sessionId) {
        setStreamActive(false);
        toast.info('Screen sharing stopped');
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === targetSessionId ? { ...s, streamActive: false } : s
        )
      );
    };

    subscribe('monitoring:stream-started', handleStreamStarted);
    subscribe('monitoring:stream-stopped', handleStreamStopped);

    return () => {
      unsubscribe('monitoring:stream-started', handleStreamStarted);
      unsubscribe('monitoring:stream-stopped', handleStreamStopped);
    };
  }, [sessionId, subscribe, unsubscribe]);

  // Handle session joined (admin)
  useEffect(() => {
    const handleSessionJoined = ({ streamActive: active, employeeName }) => {
      setStreamActive(active);
      setLoading(false);
      if (active && selectedSession) {
        startViewing(selectedSession.sessionId);
        toast.success(`Connected to ${employeeName}'s stream`);
      } else {
        toast.info(`Joined ${employeeName}'s session. Waiting for stream...`);
      }
    };

    subscribe('monitoring:session-joined', handleSessionJoined);
    return () => unsubscribe('monitoring:session-joined', handleSessionJoined);
  }, [selectedSession, startViewing, subscribe, unsubscribe, toast]);

  // Handle admin join/leave notifications (employee)
  useEffect(() => {
    if (role !== 'employee') return;

    const handleAdminJoined = ({ adminName }) => {
      setAdminCount((prev) => prev + 1);
      toast.info(`${adminName} joined your session`);
    };

    const handleAdminLeft = ({ adminName }) => {
      setAdminCount((prev) => Math.max(0, prev - 1));
      toast.info(`${adminName} left your session`);
    };

    subscribe('monitoring:admin-joined', handleAdminJoined);
    subscribe('monitoring:admin-left', handleAdminLeft);

    return () => {
      unsubscribe('monitoring:admin-joined', handleAdminJoined);
      unsubscribe('monitoring:admin-left', handleAdminLeft);
    };
  }, [role, subscribe, unsubscribe, toast]);

  // Join session (admin)
  const handleJoinSession = (session) => {
    if (selectedSession?.sessionId === session.sessionId) {
      // Already viewing this session, leave it
      stopViewing();
      setSelectedSession(null);
      emit('monitoring:leave-session');
      toast.info('Left session');
    } else {
      // Join new session
      if (selectedSession) {
        stopViewing();
        emit('monitoring:leave-session');
      }
      setSelectedSession(session);
      setLoading(true);
      emit('monitoring:join-session', { sessionId: session.sessionId });
      toast.info(`Joining ${session.employeeName}'s session...`);
    }
  };

  // Reset on disconnect
  useEffect(() => {
    if (!isConnected && role) {
      toast.error('Connection lost. Please refresh the page.');
      setRole(null);
      setSessionId(null);
      setSelectedSession(null);
      setSessions([]);
    }
  }, [isConnected, role, toast]);

  // Update session time remaining (employee)
  useEffect(() => {
    if (role === 'employee' && sessionId && sessionTimeRemaining !== null) {
      const interval = setInterval(() => {
        setSessionTimeRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            toast.warning('Session will expire in 1 minute');
            return 0;
          }
          return prev - 1;
        });
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [role, sessionId, sessionTimeRemaining, toast]);

  // Not authenticated - show login form
  if (!role) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Remote Support</h2>
          <p className="text-sm text-gray-600 mb-6">
            Select your role and enter your name to continue
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="employee"
                    checked={role === 'employee'}
                    onChange={(e) => setRole(e.target.value)}
                    className="mr-2"
                  />
                  <span>Employee</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={(e) => setRole(e.target.value)}
                    className="mr-2"
                  />
                  <span>Admin</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              />
            </div>

            <button
              onClick={handleAuth}
              disabled={!isConnected}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isConnected ? 'Continue' : 'Connecting...'}
            </button>

            {!isConnected && (
              <p className="text-sm text-red-600 text-center">
                Not connected to server
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Employee view
  if (role === 'employee') {
    return (
      <>
        <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Screen Sharing - Employee View
              </h2>
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Sharing banner */}
            {isSharing && (
              <div className="bg-red-600 text-white px-4 py-3 rounded-md mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                  <span className="font-semibold">Sharing ON</span>
                  {adminCount > 0 && (
                    <span className="text-sm ml-2">
                      ({adminCount} admin{adminCount !== 1 ? 's' : ''} viewing)
                    </span>
                  )}
                  {sessionTimeRemaining !== null && (
                    <span className="text-sm ml-2 opacity-90">
                      • {sessionTimeRemaining} min remaining
                    </span>
                  )}
                </div>
                <button
                  onClick={stopSharing}
                  className="bg-white text-red-600 px-4 py-1 rounded-md hover:bg-red-50 font-medium"
                >
                  Stop Sharing
                </button>
              </div>
            )}

          {/* Error message */}
          {shareError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{shareError}</span>
            </div>
          )}

          {/* Main content */}
          <div className="bg-white rounded-lg shadow-md p-6">
            {!isSharing ? (
              <div className="text-center py-12">
                <div className="mb-6">
                  <svg
                    className="w-24 h-24 mx-auto text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">
                  Ready to Share
                </h3>
                <p className="text-gray-600 mb-6">
                  Click the button below to start sharing your screen. You'll be
                  asked to select which screen or window to share.
                </p>
                <button
                  onClick={startSharing}
                  disabled={!shareConnected || loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2 mx-auto"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Starting...
                    </>
                  ) : (
                    'Start Sharing'
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  Your screen is being shared. Admins can now view your screen.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Session ID: {sessionId}
                </p>
              </div>
            )}

            {!shareConnected && (
              <div className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                Connection lost. Please refresh the page.
              </div>
            )}
          </div>
        </div>
      </div>
      </>
    );
  }

  // Admin view
  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Screen Sharing - Admin View
            </h2>
            {/* Connection Status */}
            <div className="flex items-center gap-4">
              {connectionQuality.isConnecting && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting...
                </div>
              )}
              {connectionQuality.isConnected && (
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionQuality.quality === 'excellent' ? 'bg-green-500' :
                    connectionQuality.quality === 'good' ? 'bg-green-400' :
                    connectionQuality.quality === 'fair' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></div>
                  <span className="text-gray-600">
                    {connectionQuality.quality.charAt(0).toUpperCase() + connectionQuality.quality.slice(1)}
                    {connectionQuality.latency && ` • ${connectionQuality.latency}ms`}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Active Sessions
              </h3>

              {sessionsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-200 h-16 rounded-md"></div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No active sessions. Employees can start sharing to appear here.
                </p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <button
                      key={session.sessionId}
                      onClick={() => handleJoinSession(session)}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        selectedSession?.sessionId === session.sessionId
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">
                            {session.employeeName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500">
                              {session.streamActive ? (
                                <span className="text-green-600">● Sharing</span>
                              ) : (
                                <span className="text-gray-400">○ Waiting</span>
                              )}
                            </p>
                            {session.timeRemaining !== undefined && (
                              <span className="text-xs text-gray-400">
                                • {session.timeRemaining}m left
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedSession?.sessionId === session.sessionId && (
                          <span className="text-blue-600 text-sm">Viewing</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Video viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              {selectedSession ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Viewing: {selectedSession.employeeName}
                    </h3>
                    <button
                      onClick={() => {
                        stopViewing();
                        setSelectedSession(null);
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                      Stop Viewing
                    </button>
                  </div>

                  {loading && !streamActive ? (
                    <div className="bg-gray-100 rounded-lg p-12 text-center">
                      <svg className="animate-spin h-12 w-12 mx-auto text-gray-400 mb-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <p className="text-gray-600">Connecting to stream...</p>
                    </div>
                  ) : streamActive ? (
                    <div className="bg-black rounded-lg overflow-hidden relative">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-auto"
                        style={{ maxHeight: '70vh' }}
                      />
                      {connectionQuality.isConnecting && (
                        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                          Connecting...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-lg p-12 text-center">
                      <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-600">
                        Waiting for {selectedSession.employeeName} to start sharing...
                      </p>
                    </div>
                  )}

                  {shareError && (
                    <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{shareError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="w-24 h-24 mx-auto text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-600 mt-4">
                    Select a session from the list to start viewing
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Monitoring;
