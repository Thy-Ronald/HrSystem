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
  IconButton,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  SignalCellularAlt as SignalIcon,
  People as PeopleIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const MonitoringSessionCard = React.memo(({ session, adminName, onRemove }) => {
  const {
    error: shareError,
    remoteStream,
    remoteVideoRef,
    startViewing,
    stopViewing,
    isConnected: shareConnected,
  } = useScreenShare('admin', session.sessionId);

  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFullView, setShowFullView] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { emit } = useSocket();
  const fullVideoRef = useRef(null);
  const containerRef = useRef(null);

  // Intersection Observer to detect visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 } // 10% visible is enough to start
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef]);

  // Sync stream to full view video element
  useEffect(() => {
    let timeoutId;
    if (showFullView && remoteStream) {
      timeoutId = setTimeout(() => {
        if (fullVideoRef.current) {
          fullVideoRef.current.srcObject = remoteStream;
          fullVideoRef.current.play().catch(err => console.error('[CCTV] Fullscreen play error:', err));
        }
      }, 200);
    }
    return () => clearTimeout(timeoutId);
  }, [showFullView, remoteStream]);

  // Viewport-aware streaming logic (Scalability Optimization)
  useEffect(() => {
    // Only start viewing if session is active AND card is visible in viewport
    if (session.streamActive && isVisible && !shareConnected) {
      console.log(`[CCTV] Viewport enter: Starting view for ${session.employeeName}`);
      setLoading(true);
      emit('monitoring:join-session', { sessionId: session.sessionId });
      startViewing(session.sessionId);
    }
    // Stop viewing if card is NOT visible OR stream becomes inactive
    else if ((!isVisible || !session.streamActive) && shareConnected) {
      console.log(`[CCTV] Viewport exit/Stream stop: Cleaning up for ${session.employeeName}`);
      stopViewing();
      setLoading(false);
      if (!session.streamActive) setShowFullView(false);
    }
  }, [session.streamActive, isVisible, shareConnected, startViewing, stopViewing, session.sessionId, session.employeeName, emit]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopViewing();
    };
  }, [stopViewing]);

  const handleRemoveClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmRemove = () => {
    onRemove(session.sessionId);
    setShowConfirm(false);
  };

  return (
    <div ref={containerRef} style={{ height: '100%' }}>
      <Card
        variant="outlined"
        sx={{
          height: '100%',
          borderRadius: 3,
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderColor: session.streamActive ? '#1976d2' : '#e0e0e0',
          borderWidth: session.streamActive ? 2 : 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'white',
          boxShadow: session.streamActive ? '0 12px 32px rgba(25, 118, 210, 0.15)' : 'none',
          '&:hover': {
            borderColor: '#1976d2',
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
          }
        }}
      >
        {/* Card Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fcfcfc' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1a1a1a' }}>
              {session.employeeName}
            </Typography>
            {session.streamActive && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4caf50', animation: 'pulse 1.5s infinite' }} />
                <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Live Feed</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Video Body */}
        <Box sx={{
          width: '100%',
          pt: '60%',
          bgcolor: '#000',
          position: 'relative',
          overflow: 'hidden',
          cursor: session.streamActive ? 'pointer' : 'default'
        }} onClick={() => session.streamActive && setShowFullView(true)}>
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {session.streamActive ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
                onLoadedMetadata={() => setLoading(false)}
                onPlay={() => setLoading(false)}
              />
            ) : (
              <Box sx={{ textAlign: 'center', opacity: 0.5 }}>
                <VisibilityOffIcon sx={{ fontSize: 48, color: '#666', mb: 1 }} />
                <Typography variant="body2" sx={{ color: '#999', fontWeight: 600 }}>
                  Connection Offline
                </Typography>
              </Box>
            )}

            {loading && session.streamActive && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.4)' }}>
                <CircularProgress size={40} thickness={4} sx={{ color: 'white' }} />
              </Box>
            )}
          </Box>
        </Box>

        {/* Action Footer */}
        <Box sx={{ p: 1.5, display: 'flex', gap: 1, bgcolor: '#f8f9fa', borderTop: '1px solid #f0f0f0' }}>
          <Button
            fullWidth
            variant="contained"
            disableElevation
            startIcon={<VisibilityIcon />}
            disabled={!session.streamActive}
            onClick={() => setShowFullView(true)}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 600,
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' }
            }}
          >
            View
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleRemoveClick}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 600,
              borderColor: '#ffcdd2',
              color: '#d32f2f',
              '&:hover': { bgcolor: '#ffebee', borderColor: '#d32f2f' }
            }}
          >
            Remove
          </Button>
        </Box>
      </Card>

      {/* Fullscreen Modal View */}
      <Dialog
        fullWidth
        maxWidth="md"
        open={showFullView}
        onClose={() => setShowFullView(false)}
        PaperProps={{
          sx: { bgcolor: '#000', borderRadius: 2, overflow: 'hidden' }
        }}
      >
        <Box sx={{ position: 'relative', width: '100%', height: '90vh', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'rgba(0,0,0,0.8)',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1
          }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
              Live Stream: {session.employeeName}
            </Typography>
            <IconButton onClick={() => setShowFullView(false)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000' }}>
            <video
              ref={fullVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </Box>
        </Box>
      </Dialog>

      {/* Removal Confirmation Dialog */}
      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        PaperProps={{
          sx: { borderRadius: 3, p: 1, maxWidth: 400 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem' }}>Stop Monitoring?</DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <DialogContentText sx={{ color: '#444' }}>
            Are you sure you want to disconnect from <strong>{session.employeeName}</strong>?
            This will terminate the active session and remove them from your dashboard.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            fullWidth
            onClick={() => setShowConfirm(false)}
            sx={{ color: '#777', textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Go Back
          </Button>
          <Button
            fullWidth
            onClick={handleConfirmRemove}
            variant="contained"
            color="error"
            disableElevation
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: '#d32f2f'
            }}
          >
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>

      <style>
        {`@keyframes pulse { 0% { transform: scale(0.9); opacity: 0.7; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(0.9); opacity: 0.7; } }`}
      </style>
    </div>
  );
});

const Monitoring = () => {
  const { user, token } = useAuth();
  const { socket, isConnected, emit, subscribe, unsubscribe } = useSocket();
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [adminCount, setAdminCount] = useState(0);
  const [loading, setLoading] = useState(false);
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
    startSharing,
    stopSharing,
  } = useScreenShare(role === 'employee' ? 'employee' : null, sessionId);


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
    };

    subscribe('monitoring:session-ended', handleSessionEnded);

    return () => {
      unsubscribe('monitoring:session-ended', handleSessionEnded);
    };
  }, [role, sessions, subscribe, unsubscribe, toast]);

  // Handle stream status updates (admin)
  useEffect(() => {
    if (role !== 'admin') return;

    const handleStreamStarted = ({ sessionId: targetSessionId, employeeName }) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === targetSessionId ? { ...s, streamActive: true } : s
        )
      );
      toast.success(`${employeeName || 'Employee'} started sharing`);
    };

    const handleStreamStopped = ({ sessionId: targetSessionId }) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === targetSessionId ? { ...s, streamActive: false } : s
        )
      );
      toast.info('Screen sharing stopped');
    };

    subscribe('monitoring:stream-started', handleStreamStarted);
    subscribe('monitoring:stream-stopped', handleStreamStopped);

    return () => {
      unsubscribe('monitoring:stream-started', handleStreamStarted);
      unsubscribe('monitoring:stream-stopped', handleStreamStopped);
    };
  }, [role, subscribe, unsubscribe, toast]);

  // Handle session joined (admin)
  useEffect(() => {
    if (role !== 'admin') return;

    const handleSessionJoined = ({ streamActive: active, employeeName, sessionId: joinedSessionId }) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === joinedSessionId ? { ...s, streamActive: active } : s
        )
      );
    };

    subscribe('monitoring:session-joined', handleSessionJoined);
    return () => unsubscribe('monitoring:session-joined', handleSessionJoined);
  }, [role, subscribe, unsubscribe]);

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


  // Reset on disconnect
  useEffect(() => {
    if (!isConnected && user) {
      setSessionId(null);
      setSessions([]);
    }
  }, [isConnected, user]);

  const handleRemoveSession = (id) => {
    setSessions(prev => prev.filter(s => s.sessionId !== id));
    emit('monitoring:leave-session', { sessionId: id });
    toast.info('Connection removed');
  };



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
        p: 4,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        bgcolor: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ color: '#1a1a1a', fontWeight: 800, mb: 0.5, letterSpacing: '-0.5px' }}>
              Monitoring
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
              View active employee screens and support sessions in real-time
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddModal(true)}
            sx={{
              textTransform: 'none',
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' },
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
              mt: 0.5
            }}
          >
            Add New
          </Button>
        </Box>
      </Box>

      <Box sx={{ p: 5 }}>
        {sessions.length === 0 ? (
          <Box sx={{ py: 15, textAlign: 'center', bgcolor: 'white', borderRadius: 4, border: '2px dashed #eceff1' }}>
            <Typography variant="h6" sx={{ color: '#b0bec5', fontWeight: 600, mb: 1 }}>
              No active sessions available
            </Typography>
            <Typography variant="body2" sx={{ color: '#cfd8dc' }}>
              Click the "Add New" button above to connect to an employee
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={4}>
            {sessions.map((session) => (
              <Grid item xs={12} sm={6} md={4} key={session.sessionId}>
                <MonitoringSessionCard
                  session={session}
                  adminName={name}
                  onRemove={handleRemoveSession}
                />
              </Grid>
            ))}
          </Grid>
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
