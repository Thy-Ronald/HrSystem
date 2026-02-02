import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useScreenShare } from '../hooks/useScreenShare';
import { useToast } from '../components/Toast';
import { useMonitoring } from '../contexts/MonitoringContext';
import {
  Card,
} from "@/components/ui/card"
import {
  Button,
} from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Plus,
  Eye,
  EyeOff,
  Signal,
  Users,
  X,
  Maximize2,
  Trash2,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Key,
  Loader2
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Styles & Animations
// ─────────────────────────────────────────────────────────────

const GLOBAL_STYLES = `
  @keyframes pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
  }
  @keyframes pulse-red {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.4); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(234, 67, 53, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(234, 67, 53, 0); }
  }
`;

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
    let active = true;
    // Only start viewing if stream is active AND (visible OR in full view)
    if (session.streamActive && (isVisible || showFullView) && !shareConnected) {
      setLoading(true);
      startViewing(session.sessionId);
    }
    // Stop viewing if (NOT visible AND NOT in full view) OR stream stopped
    else if (((!isVisible && !showFullView) || !session.streamActive) && shareConnected) {
      stopViewing();
      setLoading(false);
      if (!session.streamActive && active) setShowFullView(false);
    }
    return () => { active = false; };
  }, [session.streamActive, isVisible, showFullView, shareConnected, startViewing, stopViewing, session.sessionId]);

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
      <Card className={`h-full overflow-hidden transition-all duration-300 border-2 ${session.streamActive ? 'border-[#1a3e62] shadow-md' : 'border-slate-100 shadow-sm'} flex flex-col bg-white hover:translate-y-[-4px] hover:shadow-xl`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="font-bold text-slate-800 truncate">{session.employeeName}</h3>
            {session.streamActive && (
              <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
              </div>
            )}
          </div>
        </div>
        <div
          className={`relative w-full aspect-video bg-slate-900 overflow-hidden ${session.streamActive ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={() => session.streamActive && setShowFullView(true)}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {session.streamActive ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
                onPlay={() => setLoading(false)}
              />
            ) : (
              <div className="text-center opacity-40">
                <EyeOff className="h-10 w-10 text-slate-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Offline</p>
              </div>
            )}
            {loading && session.streamActive && (
              <Loader2 className="absolute h-8 w-8 text-white animate-spin opacity-50" />
            )}
          </div>
        </div>
        <div className="p-3 flex gap-2 bg-slate-50/30">
          <Button
            className="flex-1 bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold h-9 rounded-lg"
            disabled={!session.streamActive}
            onClick={() => setShowFullView(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 h-9 rounded-lg"
            onClick={handleRemoveClick}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
      </Card>

      <Dialog open={showFullView} onOpenChange={setShowFullView}>
        <DialogContent className="max-w-screen-xl w-[95vw] h-[90vh] p-0 bg-black border-slate-800 overflow-hidden [&>button]:text-white">
          <div className="relative w-full h-full flex flex-col">
            <div className="p-4 flex justify-between items-center bg-black/80 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 border-b border-white/5">
              <h3 className="text-xl font-bold text-white tracking-tight">{session.employeeName}</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Active Stream</span>
                </div>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center bg-slate-950">
              <video
                ref={fullVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">Stop Monitoring?</DialogTitle>
            <DialogDescription className="text-slate-500 pt-2">
              Are you sure you want to disconnect from <strong className="text-slate-900">{session.employeeName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowConfirm(false)}
              className="text-slate-600 hover:bg-slate-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              className="bg-rose-600 hover:bg-rose-700 font-semibold"
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

const Monitoring = () => {
  const { user } = useAuth();
  const { isConnected: socketConnected } = useSocket();
  const {
    sessionId,
    connectionCode,
    setConnectionCode,
    loading,
    setLoading,
    sessions,
    setSessions,
    adminCount,
    justReconnected,
    setJustReconnected,
    isSharing,
    shareError,
    connectError,
    clearConnectError,
    startSharing,
    stopSharing,
    resetSession,
    emit
  } = useMonitoring();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [addFormCode, setAddFormCode] = useState('');
  const [addFormError, setAddFormError] = useState('');
  const [addFormLoading, setAddFormLoading] = useState(false);

  const toast = useToast();
  const role = user?.role || null;
  const name = user?.name || '';

  const handleSubmitConnectionCode = useCallback(() => {
    if (!socketConnected) return toast.error('Check your connection');
    if (connectionCode.trim().length < 4) return toast.error('Min 4 characters required');
    setLoading(true);
    emit('monitoring:auth', { role: user.role, name: user.name, connectionCode: connectionCode.trim() });
  }, [user, socketConnected, connectionCode, emit, toast, setLoading]);

  const handleAddConnection = () => {
    const code = addFormCode.trim();
    if (!code) return setAddFormError('Code required');

    // Local check for duplicate connection
    const isDuplicate = sessions.some(s => s.connectionCode === code);
    if (isDuplicate) {
      return setAddFormError('Already connected to this session');
    }

    if (clearConnectError) clearConnectError();
    setAddFormLoading(true);
    emit('monitoring:connect-by-code', { connectionCode: code });
  };

  // Close modal when sessions update (if we just added one)
  useEffect(() => {
    if (showAddModal && sessions.length > 0) {
      setShowAddModal(false);
      setAddFormLoading(false);
      setAddFormCode('');
      setAddFormError('');
    }
  }, [sessions.length]);

  // Handle connection errors from context
  useEffect(() => {
    if (connectError && showAddModal) {
      setAddFormError(connectError);
      setAddFormLoading(false);
      // We don't clear context error here yet, maybe on modal close
    }
  }, [connectError, showAddModal]);

  // Clear errors when opening modal or changing code
  useEffect(() => {
    if (showAddModal) {
      setAddFormError('');
      setAddFormLoading(false);
      if (clearConnectError) clearConnectError();
    }
  }, [showAddModal]);

  const handleRemoveSession = (id) => {
    setSessions(prev => prev.filter(s => s.sessionId !== id));
    emit('monitoring:leave-session', { sessionId: id });
  };

  if (!role) return <div className="p-20 flex justify-center items-center"><Loader2 className="h-10 w-10 text-blue-600 animate-spin" /></div>;

  if (role === 'employee') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 p-6">
        <style>{GLOBAL_STYLES}</style>
        <div className="max-w-md w-full">
          {!sessionId ? (
            <Card className="rounded-3xl border-slate-200 p-8 text-center shadow-xl bg-white">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
                <Key className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Setup Connection</h2>
              <p className="text-slate-500 mb-8 font-medium">Enter a code for admins to connect to your screen.</p>
              <div className="relative mb-8">
                <input
                  type="text"
                  value={connectionCode}
                  onChange={(e) => setConnectionCode(e.target.value)}
                  placeholder="Enter code"
                  className="w-full px-4 py-4 rounded-xl border-2 border-slate-100 text-center text-2xl font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
              <Button
                className="w-full bg-[#1a3e62] hover:bg-[#122c46] text-white font-bold h-14 rounded-2xl transition-all shadow-lg active:scale-95 text-lg"
                onClick={handleSubmitConnectionCode}
                disabled={loading || connectionCode.trim().length < 4}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Start Session'}
              </Button>
            </Card>
          ) : (
            <Card className="rounded-3xl border-slate-200 overflow-hidden shadow-2xl bg-white">
              <div className="p-8 text-center">
                {!isSharing ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                      <Monitor className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                      {justReconnected ? 'Session Restored' : 'Ready to Share'}
                    </h2>
                    <p className="text-slate-500 mb-8 font-medium italic">
                      {justReconnected
                        ? 'Your connection was restored. Please resume sharing to allow admins to view your screen.'
                        : 'Admins can view your screen once you start sharing.'}
                    </p>
                    <div className="mb-8 p-6 bg-blue-50/50 rounded-2xl border-2 border-dashed border-blue-200 relative group">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-2">Connection Code</span>
                      <div className="text-4xl font-black text-blue-700 tracking-[0.2em] font-mono">{connectionCode}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowResetConfirm(true)}
                        className="absolute top-2 right-2 text-blue-400 hover:text-blue-600 hover:bg-white rounded-full h-8 w-8 shadow-sm transition-all"
                        title="Change Code"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      className="w-full bg-[#1a3e62] hover:bg-[#122c46] text-white font-bold h-14 rounded-2xl transition-all shadow-lg active:scale-95 text-lg"
                      onClick={() => {
                        startSharing();
                        setJustReconnected(false);
                      }}
                    >
                      {justReconnected ? 'Resume Sharing' : 'Start Sharing Screen'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4 border-2 border-emerald-100 animate-pulse">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-600 mb-1">Sharing Active</h2>
                    <p className="text-slate-500 mb-8 font-medium">Your screen is live for connected administrators.</p>
                    <div className="mb-8 flex justify-center">
                      <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className="text-left">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Session Code</span>
                          <span className="text-xl font-bold text-slate-700 tracking-wider font-mono">{connectionCode}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowResetConfirm(true)}
                          className="h-8 w-8 p-0 hover:bg-slate-200 rounded-full text-slate-400"
                        >
                          <X className="h-4 w-4 rotate-45" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-bold h-14 rounded-2xl transition-all shadow-sm active:scale-95 text-lg"
                      onClick={stopSharing}
                    >
                      Stop Sharing
                    </Button>
                  </>
                )}
                {shareError && <p className="text-rose-500 text-xs mt-4 font-bold uppercase tracking-wider">{shareError}</p>}
              </div>
            </Card>
          )}
        </div>
        <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">Change Connection Code?</DialogTitle>
              <DialogDescription className="text-slate-500 pt-2">
                Changing the code will disconnect any currently viewing administrators and stop your current screen share.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowResetConfirm(false)}
                className="text-slate-600 hover:bg-slate-100 font-medium"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="bg-rose-600 hover:bg-rose-700 font-semibold"
                onClick={() => {
                  resetSession();
                  setShowResetConfirm(false);
                }}
              >
                Change Code
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{GLOBAL_STYLES}</style>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monitoring Dashboard</h1>
          <p className="text-sm text-slate-500 font-medium">Manage and view active employee streams</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold h-11 px-6 rounded-xl shadow-md transition-all active:scale-95"
        >
          <Plus className="mr-2 h-5 w-5" />
          Connect New
        </Button>
      </div>

      {/* Content */}
      <div className="p-6 lg:p-10">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <Monitor className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No active sessions</h3>
            <p className="text-slate-500 max-w-xs text-center">
              Click the button above to connect to an employee using their session code.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sessions.map(s => (
              <MonitoringSessionCard
                key={s.sessionId}
                session={s}
                adminName={name}
                onRemove={handleRemoveSession}
              />
            ))}
          </div>
        )}
      </div>
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">Connect to Employee</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={addFormCode}
              onChange={e => {
                setAddFormCode(e.target.value);
                if (addFormError) setAddFormError('');
              }}
              placeholder="Enter code"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
            />
            {addFormError && <p className="text-rose-500 text-xs mt-1 font-medium">{addFormError}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setShowAddModal(false)}
              className="text-slate-600 hover:bg-slate-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold px-6"
              onClick={handleAddConnection}
              disabled={addFormLoading}
            >
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Monitoring;
