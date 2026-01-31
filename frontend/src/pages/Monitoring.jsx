import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useScreenShare } from '../hooks/useScreenShare';
import { useToast, ToastContainer } from '../components/Toast';
import { useConnectionQuality } from '../hooks/useConnectionQuality';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Card,
  CardContent,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  SignalCellularAlt as SignalIcon
} from '@mui/icons-material';

const Monitoring = () => {
  const { user, token } = useAuth();
  const { socket, isConnected, emit, subscribe, unsubscribe } = useSocket();
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const [adminCount, setAdminCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Connection code states
  const [connectionCode, setConnectionCode] = useState('');
  const [showConnectionCodeSetup, setShowConnectionCodeSetup] = useState(true);

  // Admin "Add New" modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormCode, setAddFormCode] = useState('');
  const [addFormError, setAddFormError] = useState('');
  const [addFormLoading, setAddFormLoading] = useState(false);

  const toast = useToast();
  const role = user?.role || null;
  const name = user?.name || '';

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

  // Attach remoteStream to video element when both are available (admin)
  useEffect(() => {
    if (role === 'admin' && remoteStream && remoteVideoRef.current) {
      console.log('[Monitoring] Attaching remoteStream to video element via useEffect');
      remoteVideoRef.current.srcObject = remoteStream;
      // Force loading to false and ensure stream is considered active
      setLoading(false);
    }
  }, [role, remoteStream, remoteVideoRef]);

  // Employee: Submit connection code and create session
  const handleSubmitConnectionCode = useCallback(() => {
    if (!user || !token || !isConnected) {
      toast.error('Not connected to server');
      return;
    }

    if (connectionCode.trim().length < 4) {
      toast.error('Connection code must be at least 4 characters');
      return;
    }

    console.log('[Monitoring] Submitting connection code for employee:', { name: user.name, code: connectionCode });
    setLoading(true);
    emit('monitoring:auth', {
      role: user.role,
      name: user.name,
      connectionCode: connectionCode.trim()
    });
  }, [user, token, isConnected, connectionCode, emit, toast]);

  // Admin: Authenticate on connect (no session list, they connect via code)
  useEffect(() => {
    if (user && token && isConnected && role === 'admin') {
      console.log('[Monitoring] Admin authenticating with Socket.IO');
      setLoading(true);
      emit('monitoring:auth', { role: user.role, name: user.name });
    }
  }, [user, token, isConnected, emit, role]);

  // Handle session creation (employee)
  useEffect(() => {
    const handleSessionCreated = ({ sessionId: newSessionId, connectionCode: code }) => {
      setSessionId(newSessionId);
      setLoading(false);
      setIsAuthenticated(true);
      setShowConnectionCodeSetup(false);
      if (code) setConnectionCode(code);
      toast.success('Session created successfully');
    };

    const handleAuthError = ({ message }) => {
      setLoading(false);
      toast.error(message || 'Authentication failed');
    };

    // Admin auth success
    const handleAuthSuccess = () => {
      setLoading(false);
      setIsAuthenticated(true);
      console.log('[Monitoring] Admin authenticated successfully');
    };

    subscribe('monitoring:session-created', handleSessionCreated);
    subscribe('monitoring:auth-success', handleAuthSuccess);
    subscribe('monitoring:error', handleAuthError);

    return () => {
      unsubscribe('monitoring:session-created', handleSessionCreated);
      unsubscribe('monitoring:auth-success', handleAuthSuccess);
      unsubscribe('monitoring:error', handleAuthError);
    };
  }, [subscribe, unsubscribe, toast]);

  // Admin: Handle connect by code events
  useEffect(() => {
    if (role !== 'admin') return;

    const handleConnectSuccess = ({ sessionId: newSessionId, employeeName, streamActive: active, timeRemaining }) => {
      console.log('[Monitoring] Connected to employee session:', { newSessionId, employeeName, active });
      setAddFormLoading(false);
      setShowAddModal(false);
      setAddFormCode('');
      setAddFormError('');

      // Add to sessions list
      setSessions((prev) => {
        const exists = prev.find((s) => s.sessionId === newSessionId);
        if (!exists) {
          return [...prev, { sessionId: newSessionId, employeeName, streamActive: active, timeRemaining }];
        }
        return prev;
      });

      toast.success(`Connected to ${employeeName}'s session`);
    };

    const handleConnectError = ({ message }) => {
      console.log('[Monitoring] Connection error:', message);
      setAddFormLoading(false);
      setAddFormError(message);
    };

    subscribe('monitoring:connect-success', handleConnectSuccess);
    subscribe('monitoring:connect-error', handleConnectError);

    return () => {
      unsubscribe('monitoring:connect-success', handleConnectSuccess);
      unsubscribe('monitoring:connect-error', handleConnectError);
    };
  }, [role, subscribe, unsubscribe, toast]);

  // Admin: Submit connect by code form
  const handleAddConnection = useCallback(() => {
    if (!addFormCode.trim()) {
      setAddFormError('Please enter the connection code');
      return;
    }

    console.log('[Monitoring] Admin connecting by code:', { code: addFormCode });
    setAddFormLoading(true);
    setAddFormError('');
    emit('monitoring:connect-by-code', {
      connectionCode: addFormCode.trim()
    });
  }, [addFormCode, emit]);

  // Handle session ended event (admin)
  useEffect(() => {
    if (role !== 'admin') return;

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

    subscribe('monitoring:session-ended', handleSessionEnded);

    return () => {
      unsubscribe('monitoring:session-ended', handleSessionEnded);
    };
  }, [role, sessions, selectedSession, stopViewing, subscribe, unsubscribe, toast]);

  // Handle stream status updates (admin)
  useEffect(() => {
    if (role !== 'admin') return;

    // Debug: Log all Socket.IO events for admin
    const debugListener = (...args) => {
      console.log('[Monitoring] Socket.IO event received:', args);
    };
    socket?.onAny(debugListener);

    const handleStreamStarted = ({ sessionId: targetSessionId, employeeName }) => {
      console.log('========== STREAM STARTED EVENT RECEIVED ==========');
      console.log('[Monitoring] Stream started event received:', { targetSessionId, employeeName, currentSelectedSession: selectedSession });

      // Update session list
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.sessionId === targetSessionId ? { ...s, streamActive: true } : s
        );
        console.log('[Monitoring] Updated sessions list:', updated);
        return updated;
      });

      // Check if admin is viewing this session and update accordingly
      setSelectedSession((prev) => {
        const isViewing = prev?.sessionId === targetSessionId;
        console.log('[Monitoring] Checking if admin is viewing:', { isViewing, prevSessionId: prev?.sessionId, targetSessionId, prev });

        if (isViewing) {
          console.log('[Monitoring] Admin is viewing this session, updating streamActive and starting WebRTC connection');
          // Update streamActive state immediately
          setStreamActive(true);
          setLoading(true);
          // Small delay to ensure employee's peer connection is ready
          setTimeout(() => {
            console.log('[Monitoring] Initiating startViewing for session:', targetSessionId);
            startViewing(targetSessionId);
          }, 500);
          toast.success(`${employeeName || 'Employee'} started sharing`);
          // Return updated session with streamActive: true
          return { ...prev, streamActive: true };
        } else {
          console.log('[Monitoring] Admin is not viewing this session. Current selectedSession:', prev);
          return prev;
        }
      });
    };

    const handleStreamStopped = ({ sessionId: targetSessionId }) => {
      // Update session list
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === targetSessionId ? { ...s, streamActive: false } : s
        )
      );

      // If admin is viewing this session, stop viewing
      if (selectedSession?.sessionId === targetSessionId) {
        setStreamActive(false);
        stopViewing();
        toast.info('Screen sharing stopped');
      }
    };

    subscribe('monitoring:stream-started', handleStreamStarted);
    subscribe('monitoring:stream-stopped', handleStreamStopped);

    return () => {
      unsubscribe('monitoring:stream-started', handleStreamStarted);
      unsubscribe('monitoring:stream-stopped', handleStreamStopped);
      socket?.offAny(debugListener);
    };
  }, [role, selectedSession, startViewing, stopViewing, subscribe, unsubscribe, toast, socket]);

  // Handle session joined (admin)
  useEffect(() => {
    if (role !== 'admin') return;

    const handleSessionJoined = ({ streamActive: active, employeeName, sessionId: joinedSessionId }) => {
      console.log('[Monitoring] Session joined event received:', { active, employeeName, joinedSessionId, selectedSessionId: selectedSession?.sessionId });

      // Update selectedSession with streamActive status
      setSelectedSession((prev) => {
        if (prev?.sessionId === joinedSessionId) {
          console.log('[Monitoring] Updating selectedSession with streamActive:', active);
          return { ...prev, streamActive: active };
        }
        return prev;
      });

      setStreamActive(active);
      setLoading(false);

      // If stream is already active when joining, start viewing immediately
      if (active) {
        // Use a small delay to ensure selectedSession is updated
        setTimeout(() => {
          setSelectedSession((current) => {
            if (current?.sessionId === joinedSessionId) {
              console.log('[Monitoring] Stream already active, starting WebRTC connection');
              startViewing(current.sessionId);
              toast.success(`Connected to ${employeeName}'s stream`);
            }
            return current;
          });
        }, 50);
      } else {
        console.log('[Monitoring] Stream not active yet, waiting for employee to start sharing');
        toast.info(`Joined ${employeeName}'s session. Waiting for stream...`);
      }
    };

    subscribe('monitoring:session-joined', handleSessionJoined);
    return () => unsubscribe('monitoring:session-joined', handleSessionJoined);
  }, [role, selectedSession, startViewing, subscribe, unsubscribe, toast]);

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

  // Sync selectedSession with sessions list (admin) - ensures streamActive status is always current
  useEffect(() => {
    if (role !== 'admin' || !selectedSession) return;

    const latestSession = sessions.find(s => s.sessionId === selectedSession.sessionId);
    if (latestSession && latestSession.streamActive !== selectedSession.streamActive) {
      console.log('[Monitoring] Syncing selectedSession streamActive status:', {
        old: selectedSession.streamActive,
        new: latestSession.streamActive
      });
      setSelectedSession({ ...selectedSession, streamActive: latestSession.streamActive });
      if (latestSession.streamActive) {
        setStreamActive(true);
      }
    }
  }, [role, sessions, selectedSession]);

  // Join session (admin)
  const handleJoinSession = (session) => {
    if (selectedSession?.sessionId === session.sessionId) {
      // Already viewing this session, leave it
      stopViewing();
      setSelectedSession(null);
      setStreamActive(false);
      emit('monitoring:leave-session');
      toast.info('Left session');
    } else {
      // Join new session
      if (selectedSession) {
        stopViewing();
        emit('monitoring:leave-session');
      }
      // Get latest session from sessions list to ensure we have current streamActive status
      const latestSession = sessions.find(s => s.sessionId === session.sessionId) || session;
      setSelectedSession(latestSession);
      setStreamActive(latestSession.streamActive || false); // Use session's streamActive status
      setLoading(true);
      console.log('[Monitoring] Joining session:', latestSession.sessionId, 'streamActive:', latestSession.streamActive);
      emit('monitoring:join-session', { sessionId: latestSession.sessionId });
      toast.info(`Joining ${latestSession.employeeName}'s session...`);
    }
  };

  // Reset on disconnect (only show error if we were previously connected)
  const wasConnectedRef = useRef(false);
  useEffect(() => {
    if (isConnected) {
      wasConnectedRef.current = true;
    } else if (!isConnected && wasConnectedRef.current && user) {
      // Only show error if we were connected before and now disconnected
      toast.error('Connection lost. Please refresh the page.');
      setSessionId(null);
      setSelectedSession(null);
      setSessions([]);
      wasConnectedRef.current = false;
    }
  }, [isConnected, user, toast]);



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
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Screen Sharing - Employee View
                </h2>
                <p className="text-sm text-gray-500 mt-1">Logged in as {name}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Connection Status */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  <span className="text-sm text-gray-600">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
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
              {/* Connection Code Setup */}
              {showConnectionCodeSetup && !sessionId ? (
                <div className="text-center py-12">
                  <div className="mb-6">
                    <svg
                      className="w-24 h-24 mx-auto text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">
                    Set Your Connection Code
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Enter a code that admins will use to connect to your screen.
                    Share this code with your admin to allow them to view your screen.
                  </p>
                  <div className="max-w-xs mx-auto">
                    <input
                      type="text"
                      value={connectionCode}
                      onChange={(e) => setConnectionCode(e.target.value)}
                      placeholder="Enter connection code (min 4 chars)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-wider"
                      disabled={loading || !isConnected}
                    />
                    <button
                      onClick={handleSubmitConnectionCode}
                      disabled={!isConnected || loading || connectionCode.trim().length < 4}
                      className="mt-4 w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Creating Session...
                        </span>
                      ) : (
                        'Create Session'
                      )}
                    </button>
                    {!isConnected && (
                      <p className="text-sm text-red-500 mt-2">Connecting to server...</p>
                    )}
                  </div>
                </div>
              ) : !isSharing ? (
                <div className="text-center py-12">
                  {/* Show connection code prominently */}
                  <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-600 mb-2">Your Connection Code</p>
                    <p className="text-3xl font-bold text-blue-700 tracking-widest">{connectionCode}</p>
                    <p className="text-xs text-blue-500 mt-2">Share this code with your admin</p>
                  </div>

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
                    onClick={() => {
                      console.log('[Monitoring] Start sharing clicked', {
                        isConnected,
                        sessionId,
                        loading,
                        isSharing,
                        role,
                        user
                      });
                      startSharing();
                    }}
                    disabled={!isConnected || !sessionId || !isAuthenticated || loading || isSharing}
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
                  {/* Show connection code while sharing */}
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-600 mb-2">Your Connection Code</p>
                    <p className="text-3xl font-bold text-green-700 tracking-widest">{connectionCode}</p>
                  </div>
                  <p className="text-gray-600">
                    Your screen is being shared. Admins can now view your screen.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Session ID: {sessionId}
                  </p>
                </div>
              )}

              {shareError && (
                <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {shareError}
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
    <Box sx={{ width: '100%', minHeight: '100%', p: 0 }}>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      {/* Header Section */}
      <Box sx={{
        borderBottom: '1px solid #eee',
        p: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6" sx={{ color: '#333', fontWeight: 500 }}>
          Monitoring
        </Typography>
      </Box>

      <Box sx={{ p: 4 }}>
        <Card variant="outlined" sx={{ borderRadius: 1, border: '1px solid #eee' }}>
          <CardContent sx={{ p: '0 !important' }}>
            {/* Action Bar */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #eee' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowAddModal(true)}
                sx={{
                  textTransform: 'none',
                  bgcolor: '#1976d2',
                  '&:hover': { bgcolor: '#1565c0' }
                }}
              >
                Add New
              </Button>
            </Box>

            {/* Table */}
            <TableContainer component={Box}>
              <Table sx={{ minWidth: 650 }} aria-label="monitoring table">
                <TableHead>
                  <TableRow sx={{ '& th': { color: '#888', fontWeight: 500, borderBottom: '1px solid #eee' } }}>
                    <TableCell>Group Name</TableCell>
                    <TableCell align="center">Connection</TableCell>
                    <TableCell align="center">Count</TableCell>
                    <TableCell align="center">View</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                        <Typography variant="body2" sx={{ color: '#999' }}>
                          No Data
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => (
                      <TableRow key={session.sessionId} hover sx={{ '& td': { borderBottom: '1px solid #f9f9f9' } }}>
                        <TableCell component="th" scope="row">
                          {session.employeeName}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <SignalIcon sx={{ fontSize: 16, color: session.streamActive ? '#4caf50' : '#bdbdbd' }} />
                            {session.connectionCode || '-'}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {session.sessionId === selectedSession?.sessionId ? adminCount : (session.streamActive ? '1' : '0')}
                        </TableCell>
                        <TableCell align="center">
                          {session.streamActive ? (
                            <Chip
                              label="Live"
                              size="small"
                              sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 500, fontSize: '0.7rem' }}
                            />
                          ) : (
                            <Typography variant="caption" sx={{ color: '#999' }}>Offline</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant={selectedSession?.sessionId === session.sessionId ? "outlined" : "text"}
                            color={selectedSession?.sessionId === session.sessionId ? "error" : "primary"}
                            onClick={() => {
                              if (selectedSession?.sessionId === session.sessionId) {
                                stopViewing();
                                setSelectedSession(null);
                              } else {
                                handleJoinSession(session);
                              }
                            }}
                            sx={{ textTransform: 'none' }}
                          >
                            {selectedSession?.sessionId === session.sessionId ? "Stop" : "View"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Video Viewer Section */}
        {selectedSession && (
          <Box sx={{ mt: 4 }}>
            <Card variant="outlined" sx={{ borderRadius: 1, border: '1px solid #eee' }}>
              <Box sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #eee'
              }}>
                <Typography variant="subtitle1" fontWeight={500}>
                  Live Stream: {selectedSession.employeeName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {loading && <CircularProgress size={20} />}
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => {
                      stopViewing();
                      setSelectedSession(null);
                    }}
                  >
                    Close Viewer
                  </Button>
                </Box>
              </Box>
              <CardContent sx={{ p: 0, bgcolor: 'black', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    maxHeight: '70vh',
                    display: (selectedSession?.streamActive || !!remoteStream) ? 'block' : 'none'
                  }}
                  onLoadedMetadata={() => setLoading(false)}
                  onPlay={() => setLoading(false)}
                />
                {!selectedSession?.streamActive && !remoteStream && (
                  <Box sx={{ py: 10, textAlign: 'center', color: '#666' }}>
                    <VisibilityOffIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                    <Typography>Waiting for stream to start...</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      {/* Connection Code Modal */}
      {showAddModal && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          bgcolor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300
        }}>
          <Card sx={{ width: 400, borderRadius: 1 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Connect to Employee</Typography>
              <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
                Enter the employee's connection code to view their screen.
              </Typography>

              <Box component="div" sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#333', fontWeight: 500 }}>
                  Connection Code
                </Typography>
                <input
                  type="text"
                  value={addFormCode}
                  onChange={(e) => setAddFormCode(e.target.value)}
                  placeholder="Enter code"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                  style={{ fontSize: '0.9rem' }}
                />
                {addFormError && (
                  <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, display: 'block' }}>
                    {addFormError}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  onClick={() => { setShowAddModal(false); setAddFormCode(''); setAddFormError(''); }}
                  sx={{ color: '#666' }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disabled={addFormLoading}
                  onClick={handleAddConnection}
                >
                  {addFormLoading ? <CircularProgress size={20} /> : 'Connect'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default Monitoring;
