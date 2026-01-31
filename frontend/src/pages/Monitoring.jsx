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
  Delete as DeleteIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  VpnKey as VpnKeyIcon,
  Monitor as MonitorIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
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
      { threshold: 0.1 }
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
    if (session.streamActive && isVisible && !shareConnected) {
      setLoading(true);
      emit('monitoring:join-session', { sessionId: session.sessionId });
      startViewing(session.sessionId);
    }
    else if ((!isVisible || !session.streamActive) && shareConnected) {
      stopViewing();
      setLoading(false);
      if (!session.streamActive) setShowFullView(false);
    }
  }, [session.streamActive, isVisible, shareConnected, startViewing, stopViewing, session.sessionId, emit]);

  useEffect(() => {
    return () => stopViewing();
  }, [stopViewing]);

  const handleRemoveClick = () => setShowConfirm(true);
  const handleConfirmRemove = () => {
    onRemove(session.sessionId);
    setShowConfirm(false);
  };

  return (
    <div ref={containerRef} style={{ height: '100%' }}>
      <Card variant="outlined" sx={{ height: '100%', borderRadius: 3, overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', borderColor: session.streamActive ? '#1976d2' : '#e0e0e0', borderWidth: session.streamActive ? 2 : 1, display: 'flex', flexDirection: 'column', bgcolor: 'white', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' } }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fcfcfc' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.employeeName}</Typography>
            {session.streamActive && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', animation: 'pulse 1.5s infinite' }} />
                <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 700, fontSize: '0.7rem' }}>Live</Typography>
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ width: '100%', pt: '56.25%', bgcolor: '#000', position: 'relative', overflow: 'hidden', cursor: session.streamActive ? 'pointer' : 'default' }} onClick={() => session.streamActive && setShowFullView(true)}>
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {session.streamActive ? (
              <video ref={remoteVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} onPlay={() => setLoading(false)} />
            ) : (
              <Box sx={{ textAlign: 'center', opacity: 0.5 }}>
                <VisibilityOffIcon sx={{ fontSize: 40, color: '#666', mb: 1 }} />
                <Typography variant="body2" sx={{ color: '#999', fontWeight: 600 }}>Offline</Typography>
              </Box>
            )}
            {loading && session.streamActive && <CircularProgress size={30} sx={{ position: 'absolute' }} />}
          </Box>
        </Box>
        <Box sx={{ p: 1.5, display: 'flex', gap: 1, bgcolor: '#f8f9fa' }}>
          <Button fullWidth variant="contained" disableElevation startIcon={<VisibilityIcon />} disabled={!session.streamActive} onClick={() => setShowFullView(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>View</Button>
          <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleRemoveClick} sx={{ textTransform: 'none', fontWeight: 600 }}>Remove</Button>
        </Box>
      </Card>

      <Dialog fullWidth maxWidth="md" open={showFullView} onClose={() => setShowFullView(false)} PaperProps={{ sx: { bgcolor: '#000', borderRadius: 2, overflow: 'hidden' } }}>
        <Box sx={{ position: 'relative', width: '100%', height: '90vh', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.8)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>{session.employeeName}</Typography>
            <IconButton onClick={() => setShowFullView(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={fullVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </Box>
        </Box>
      </Dialog>

      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Stop Monitoring?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to disconnect from <strong>{session.employeeName}</strong>?</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button onClick={handleConfirmRemove} variant="contained" color="error">Disconnect</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
});

const Monitoring = () => {
  const { user } = useAuth();
  const { isConnected, emit, subscribe, unsubscribe } = useSocket();
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [adminCount, setAdminCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connectionCode, setConnectionCode] = useState('');
  const [showConnectionCodeSetup, setShowConnectionCodeSetup] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormCode, setAddFormCode] = useState('');
  const [addFormError, setAddFormError] = useState('');
  const [addFormLoading, setAddFormLoading] = useState(false);

  const toast = useToast();
  const role = user?.role || null;
  const name = user?.name || '';

  const { isSharing, error: shareError, startSharing, stopSharing } = useScreenShare(role === 'employee' ? 'employee' : null, sessionId);

  const handleSubmitConnectionCode = useCallback(() => {
    if (!isConnected) return toast.error('Check your connection');
    if (connectionCode.trim().length < 4) return toast.error('Min 4 characters required');
    setLoading(true);
    emit('monitoring:auth', { role: user.role, name: user.name, connectionCode: connectionCode.trim() });
  }, [user, isConnected, connectionCode, emit, toast]);

  useEffect(() => {
    if (user && isConnected && role === 'admin') {
      emit('monitoring:auth', { role: user.role, name: user.name });
    }
  }, [user, isConnected, emit, role]);

  useEffect(() => {
    const handleCreated = ({ sessionId: sid, connectionCode: code }) => {
      setSessionId(sid);
      setLoading(false);
      setShowConnectionCodeSetup(false);
      if (code) setConnectionCode(code);
      toast.success('System ready');
    };
    const handleError = ({ message }) => { setLoading(false); toast.error(message); };

    subscribe('monitoring:session-created', handleCreated);
    subscribe('monitoring:error', handleError);
    return () => {
      unsubscribe('monitoring:session-created', handleCreated);
      unsubscribe('monitoring:error', handleError);
    };
  }, [subscribe, unsubscribe, toast]);

  useEffect(() => {
    if (role !== 'admin') return;
    const handleSuccess = ({ sessionId: sid, employeeName, streamActive: active }) => {
      setAddFormLoading(false);
      setShowAddModal(false);
      setAddFormCode('');
      setSessions(prev => prev.find(s => s.sessionId === sid) ? prev : [...prev, { sessionId: sid, employeeName, streamActive: active }]);
      toast.success(`Connected to ${employeeName}`);
    };
    const handleErr = ({ message }) => { setAddFormLoading(false); setAddFormError(message); };

    subscribe('monitoring:connect-success', handleSuccess);
    subscribe('monitoring:connect-error', handleErr);
    return () => {
      unsubscribe('monitoring:connect-success', handleSuccess);
      unsubscribe('monitoring:connect-error', handleErr);
    };
  }, [role, subscribe, unsubscribe, toast]);

  useEffect(() => {
    if (role !== 'admin') return;
    const onStart = ({ sessionId: id }) => setSessions(prev => prev.map(s => s.sessionId === id ? { ...s, streamActive: true } : s));
    const onStop = ({ sessionId: id }) => setSessions(prev => prev.map(s => s.sessionId === id ? { ...s, streamActive: false } : s));
    const onEnd = ({ sessionId: id }) => setSessions(prev => prev.filter(s => s.sessionId !== id));

    subscribe('monitoring:stream-started', onStart);
    subscribe('monitoring:stream-stopped', onStop);
    subscribe('monitoring:session-ended', onEnd);
    return () => {
      unsubscribe('monitoring:stream-started', onStart);
      unsubscribe('monitoring:stream-stopped', onStop);
      unsubscribe('monitoring:session-ended', onEnd);
    };
  }, [role, subscribe, unsubscribe]);

  useEffect(() => {
    if (role !== 'employee') return;
    const onJoin = ({ adminName }) => { setAdminCount(prev => prev + 1); toast.info(`${adminName} joined`); };
    const onLeave = () => setAdminCount(prev => Math.max(0, prev - 1));

    subscribe('monitoring:admin-joined', onJoin);
    subscribe('monitoring:admin-left', onLeave);
    return () => {
      unsubscribe('monitoring:admin-joined', onJoin);
      unsubscribe('monitoring:admin-left', onLeave);
    };
  }, [role, subscribe, unsubscribe, toast]);

  const handleAddConnection = () => {
    if (!addFormCode.trim()) return setAddFormError('Code required');
    setAddFormLoading(true);
    emit('monitoring:connect-by-code', { connectionCode: addFormCode.trim() });
  };

  const handleRemoveSession = (id) => {
    setSessions(prev => prev.filter(s => s.sessionId !== id));
    emit('monitoring:leave-session', { sessionId: id });
  };

  if (!role) return <Box sx={{ p: 10, textAlign: 'center' }}><CircularProgress /></Box>;

  if (role === 'employee') {
    return (
      <Box sx={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7f9', p: 3 }}>
        <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
        <Box sx={{ maxWidth: 500, width: '100%' }}>
          {showConnectionCodeSetup && !sessionId ? (
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #e0e6ed', p: 4, textAlign: 'center' }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(25, 118, 210, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                <VpnKeyIcon sx={{ fontSize: 32, color: '#1976d2' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Setup Connection</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Enter a code for admins to connect to your screen.</Typography>
              <input type="text" value={connectionCode} onChange={(e) => setConnectionCode(e.target.value)} placeholder="Enter code (min 4 chars)" style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e0e6ed', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px' }} />
              <Button fullWidth variant="contained" size="large" onClick={handleSubmitConnectionCode} disabled={loading || connectionCode.trim().length < 4} sx={{ py: 2, borderRadius: 3, fontWeight: 700 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Set Code & Continue'}
              </Button>
            </Card>
          ) : (
            <Card elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e0e6ed', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
              <Box sx={{ p: 4, textAlign: 'center' }}>
                {!isSharing ? (
                  <>
                    <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(25, 118, 210, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <MonitorIcon sx={{ fontSize: 32, color: '#1976d2' }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Ready to Share</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Admins can view your screen once you start sharing.</Typography>
                    <Box sx={{ mb: 4, p: 3, bgcolor: '#f8fbff', borderRadius: 3, border: '1px dashed #c2d6ff' }}>
                      <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 700, display: 'block', mb: 1 }}>CONNECTION CODE</Typography>
                      <Typography variant="h3" sx={{ fontWeight: 900, color: '#1976d2', letterSpacing: 4 }}>{connectionCode}</Typography>
                    </Box>
                    <Button fullWidth variant="contained" size="large" onClick={startSharing} sx={{ py: 2, borderRadius: 2, fontWeight: 700 }}>Start Sharing</Button>
                  </>
                ) : (
                  <>
                    <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(76, 175, 80, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, animation: 'pulse 2s infinite' }}>
                      <CheckCircleIcon sx={{ fontSize: 32, color: '#4caf50' }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Sharing Active</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Your screen is live for connected administrators.</Typography>
                    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center', gap: 3 }}>
                      <Box sx={{ textAlign: 'left' }}><Typography variant="caption" color="text.secondary">Viewers</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{adminCount}</Typography></Box>
                      <Box sx={{ textAlign: 'left' }}><Typography variant="caption" color="text.secondary">Code</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{connectionCode}</Typography></Box>
                    </Box>
                    <Button fullWidth variant="outlined" color="error" size="large" onClick={stopSharing} sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, borderWidth: 2 }}>Stop Sharing</Button>
                  </>
                )}
                {shareError && <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>{shareError}</Typography>}
              </Box>
            </Card>
          )}
        </Box>
        <style>{`@keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); } }`}</style>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <Box sx={{ borderBottom: '1px solid #eee', p: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'white' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Monitoring</Typography>
          <Typography variant="body2" color="text.secondary">Active employee screen sessions</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAddModal(true)} sx={{ borderRadius: 2 }}>Add New</Button>
      </Box>
      <Box sx={{ p: 5 }}>
        {sessions.length === 0 ? (
          <Box sx={{ py: 15, textAlign: 'center', bgcolor: 'white', borderRadius: 4, border: '2px dashed #eceff1' }}>
            <Typography variant="h6" color="text.secondary">No active sessions</Typography>
          </Box>
        ) : (
          <Grid container spacing={4}>
            {sessions.map(s => (
              <Grid item xs={12} sm={6} md={4} key={s.sessionId}>
                <MonitoringSessionCard session={s} adminName={name} onRemove={handleRemoveSession} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Connect to Employee</DialogTitle>
        <DialogContent>
          <input type="text" value={addFormCode} onChange={e => setAddFormCode(e.target.value)} placeholder="Enter code" style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '8px', border: '1px solid #ccc' }} />
          {addFormError && <Typography color="error" variant="caption">{addFormError}</Typography>}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddConnection} disabled={addFormLoading}>Connect</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Monitoring;
