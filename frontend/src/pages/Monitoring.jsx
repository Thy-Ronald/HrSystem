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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Search,
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
import { UserAvatar } from '../components/UserAvatar';

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
            <UserAvatar
              name={session.employeeName}
              avatarUrl={session.avatarUrl}
              size="sm"
              className="border border-slate-100"
            />
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
              <div className="text-center opacity-70">
                {session.disconnectReason === 'offline' ? (
                  <Signal className="h-10 w-10 text-slate-500 mx-auto mb-2 opacity-50" />
                ) : (
                  <Users className="h-10 w-10 text-slate-500 mx-auto mb-2" />
                )}

                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {session.disconnectReason === 'offline' ? 'Offline' : 'Disconnected'}
                </p>
                {/* Reconnect prompt for manual disconnects */}
                {session.disconnectReason !== 'offline' && !session.streamActive && (
                  <p className="text-[10px] text-slate-400 mt-1">User ended session</p>
                )}
              </div>
            )}
            {loading && session.streamActive && (
              <Loader2 className="absolute h-8 w-8 text-white animate-spin opacity-50" />
            )}
          </div>
        </div>
        <div className="p-3 flex gap-2 bg-slate-50/30">
          {session.streamActive ? (
            <Button
              className="flex-1 bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold h-9 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1a3e62]"
              onClick={() => setShowFullView(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Button>
          ) : (
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 rounded-lg shadow-sm"
              onClick={async (e) => {
                e.stopPropagation();
                // Import the send request logic or pass it down
                // Since we are inside Memoized component, need to be careful.
                // Ideally pass a 'onReconnect' prop.
                // For now, we unfortunately didn't pass onReconnect.
                // Quick fix: emit logic here or refactor parent. 
                // We have access to 'useSocket' indirectly? No it's prop drilling or context.
                // BUT MonitoringSessionCard uses useScreenShare... does NOT use useSocket directly.
                // Ref check: Line 82: const { emit } = useSocket(); -> It IS used!
                // So we can emit request connection directly.
                if (emit) {
                  emit('monitoring:request-connection', { employeeName: session.employeeName });
                  // Optimistic UI update or toast?
                }
              }}
            >
              <Signal className="mr-2 h-4 w-4" />
              Reconnect
            </Button>
          )}

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
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 bg-black border-slate-800 overflow-hidden [&>button]:text-white shadow-2xl rounded-2xl flex flex-col">
          <DialogDescription className="sr-only">
            Live screen share view of {session.employeeName}
          </DialogDescription>
          <DialogTitle className="sr-only">Screen Share</DialogTitle>
          <div className="w-full h-full flex flex-col">
            {/* Header - Relative positioning ensures it doesn't overlap the video content */}
            <div className="px-5 py-3 flex justify-between items-center bg-slate-900 border-b border-white/10 shrink-0">
              <h3 className="text-lg font-bold text-white tracking-tight">{session.employeeName}</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live Stream</span>
                </div>
              </div>
            </div>
            {/* Content Area / Video Frame */}
            <div className="flex-1 w-full flex items-center justify-center bg-slate-950 overflow-hidden min-h-0">
              <video
                ref={fullVideoRef}
                autoPlay
                playsInline
                muted
                className="max-w-full max-h-full object-contain shadow-2xl"
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

const PendingRequests = React.memo(({ startSharing, stopSharing, isSharing, setJustReconnected }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmApproveId, setConfirmApproveId] = useState(null);
  const [confirmDeclineId, setConfirmDeclineId] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const toast = useToast();
  const { subscribe, unsubscribe } = useSocket();

  const fetchRequests = useCallback(async () => {
    try {
      const { getMonitoringRequests } = await import('../services/api');
      const data = await getMonitoringRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();

    const handleNewRequest = (data) => {
      console.log('[Monitoring] Real-time request received:', data);
      fetchRequests();
    };

    // Real-time Optimization: Listen for new requests via socket
    subscribe('monitoring:new-request', handleNewRequest);

    // Fallback: Poll every 30 seconds to catch missed events (High Reliability)
    const interval = setInterval(() => {
      console.log('[Monitoring] Fallback polling for requests...');
      fetchRequests();
    }, 30000);

    return () => {
      unsubscribe('monitoring:new-request', handleNewRequest);
      clearInterval(interval);
    };
  }, [fetchRequests, subscribe, unsubscribe]);

  /* New State for Disconnect Confirmation */
  const [confirmDisconnectId, setConfirmDisconnectId] = useState(null);

  const handleDecline = async (requestId) => {
    try {
      const { respondToMonitoringRequest } = await import('../services/api');
      await respondToMonitoringRequest(requestId, 'rejected');
      toast.success('Request declined');
      setConfirmDeclineId(null);
      fetchRequests();
    } catch (error) {
      toast.error('Failed to decline request');
      setConfirmDeclineId(null);
    }
  }

  // Triggered when user clicks "Disconnect"
  const handleManualDisconnectClick = (requestId) => {
    setConfirmDisconnectId(requestId);
  };

  // Triggered when user confirms in the dialog
  const proceedWithDisconnect = async () => {
    if (!confirmDisconnectId) return;

    // 1. Stop sharing immediately (Realtime)
    if (isSharing) {
      stopSharing();
    }

    // 2. Persistent flag to prevent auto-resume
    localStorage.setItem('monitoring_manual_disconnect', 'true');

    // 3. Reject/Disconnect API call
    await handleDecline(confirmDisconnectId);

    setConfirmDisconnectId(null);
  };

  // Resume Sharing Logic (Strict: Backend-driven, User Gesture Required)
  const [resumeData, setResumeData] = useState(null);

  useEffect(() => {
    // 2. Socket Listen (Fallback/verification)
    // REMOVED: GlobalResumeSharingModal now handles this globally.
    // Keeping this useEffect structure if we need to listen to other things later, 
    // or we can remove the dependency on subscribe for this specific feature.

    /*
    const handleSessionCreated = (data) => {
      if (data.monitoringExpected) {
         // logic moved to GlobalResumeSharingModal
      }
    };
    subscribe('monitoring:session-created', handleSessionCreated);
    return () => unsubscribe('monitoring:session-created', handleSessionCreated);
    */
  }, []);

  const handleConfirmApprove = async () => {
    if (!confirmApproveId) return;

    try {
      localStorage.removeItem('monitoring_manual_disconnect');
      await startSharing();

      const { respondToMonitoringRequest } = await import('../services/api');
      await respondToMonitoringRequest(confirmApproveId, 'approved');

      toast.success('Request Approved & Sharing Started');
      setConfirmApproveId(null);
      setJustReconnected(false);
      fetchRequests();
    } catch (error) {
      console.error(error);
      toast.error('Failed to start sharing or approve request');
      setConfirmApproveId(null);
    }
  };

  return (
    <>
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white flex flex-col flex-1">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-sm">No pending requests.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-b border-slate-200">
                  <TableHead className="font-bold text-[#1a3e62] py-4 h-auto whitespace-nowrap pl-6">Admin Name</TableHead>
                  <TableHead className="font-bold text-[#1a3e62] py-4 h-auto whitespace-nowrap">Status</TableHead>
                  <TableHead className="font-bold text-[#1a3e62] py-4 h-auto whitespace-nowrap">Received At</TableHead>
                  <TableHead className="font-bold text-[#1a3e62] py-4 h-auto whitespace-nowrap text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(req => (
                  <TableRow key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-4 pl-6 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={req.admin_name}
                          avatarUrl={req.admin_avatar_url}
                          className="border-2 border-slate-100"
                        />

                        <div>
                          <div className="text-base font-medium flex items-center gap-2">
                            <span>{req.admin_name}</span>
                            {req.status === 'approved' && (
                              <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-normal">{req.admin_email}</div>
                        </div>
                        <span className="text-xs text-slate-400 font-normal">{req.admin_email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${req.status === 'approved'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                        }`}>
                        {req.status === 'approved' ? 'Active' : 'Pending Approval'}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-slate-600">{new Date(req.created_at).toLocaleString()}</TableCell>
                    <TableCell className="py-4 text-slate-600 text-right pr-6">
                      <div className="flex justify-end gap-2">
                        {req.status === 'approved' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium px-3"
                            onClick={() => handleManualDisconnectClick(req.id)}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium px-3"
                              onClick={() => setConfirmDeclineId(req.id)}
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 bg-[#1a3e62] hover:bg-[#122c46] text-white font-medium px-4 shadow-sm"
                              onClick={() => setConfirmApproveId(req.id)}
                            >
                              Approve
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!confirmDeclineId} onOpenChange={(open) => !open && setConfirmDeclineId(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">Decline Request?</DialogTitle>
            <DialogDescription className="text-slate-500 pt-2">
              Are you sure you want to decline this monitoring request? The admin will be notified of your decision.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="ghost"
              onClick={() => setConfirmDeclineId(null)}
              className="text-slate-600 hover:bg-slate-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDecline(confirmDeclineId)}
              className="bg-rose-600 hover:bg-rose-700 font-semibold"
            >
              Yes, Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDisconnectId} onOpenChange={(open) => !open && setConfirmDisconnectId(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">Stop Monitoring?</DialogTitle>
            <DialogDescription className="text-slate-500 pt-2">
              Are you sure you want to disconnect? This will <strong>immediately stop screen sharing</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="ghost"
              onClick={() => setConfirmDisconnectId(null)}
              className="text-slate-600 hover:bg-slate-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={proceedWithDisconnect}
              className="bg-rose-600 hover:bg-rose-700 font-semibold"
            >
              Yes, Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmApproveId} onOpenChange={(open) => !open && setConfirmApproveId(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Start Sharing?</DialogTitle>
            <DialogDescription className="text-slate-500 pt-2">
              Approving this request will prompt you to share your <strong>Entire Screen</strong>.
              <br /><br />
              Please select <strong>"Entire Screen"</strong> in the popup window that appears.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="ghost"
              onClick={() => setConfirmApproveId(null)}
              className="text-slate-600 hover:bg-slate-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold"
              onClick={handleConfirmApprove}
            >
              Confirm & Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResumeModal} onOpenChange={setShowResumeModal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Signal className="h-5 w-5 text-emerald-500" />
              Resume Monitoring?
            </DialogTitle>
            <DialogDescription className="text-slate-500 pt-2">
              You have an active monitoring session. Click below to resume screen sharing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                handleManualDisconnect(requests.find(r => r.status === 'approved')?.id);
                setShowResumeModal(false);
              }}
              className="text-slate-600 hover:bg-slate-100 font-medium"
            >
              Stop Monitoring
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={async () => {
                try {
                  localStorage.removeItem('monitoring_manual_disconnect');
                  await startSharing();
                  setShowResumeModal(false);
                } catch (e) {
                  toast.error('Failed to start sharing');
                }
              }}
            >
              Resume Sharing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

const Monitoring = () => {
  const { user } = useAuth();
  const { isConnected: socketConnected } = useSocket();
  const {
    sessionId,
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
    emit,
    connectionRequest,
    respondConnection,
    requestConnection
  } = useMonitoring();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [addFormCode, setAddFormCode] = useState('');
  const [addFormError, setAddFormError] = useState('');
  const [addFormLoading, setAddFormLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Only search if we haven't selected a user yet (to avoid searching for the selected name)
      if (showAddModal && addFormCode.length > 1 && !selectedUser) {
        try {
          // Ensure we import searchUsers from api.js first
          const results = await import('../services/api').then(m => m.searchUsers(addFormCode));

          // Filter out users we are already connected to
          // We check 'sessions' which now should contain employeeId if my recent backend change works
          // But even if it doesn't immediately, we can try to match by name or ID if available.
          // Note: Backend might need a restart to propagate the new 'employeeId' field in sessions list.
          const filteredResults = results.filter(u => {
            // Check if already in 'sessions'
            const isConnected = sessions.some(s =>
              s.employeeId === u.id || // Best check (requires backend update)
              s.employeeName === u.name // Fallback check
            );
            return !isConnected;
          });

          setSearchResults(filteredResults || []);
        } catch (err) {
          console.error("Search failed", err);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [addFormCode, showAddModal, selectedUser]);

  const toast = useToast();
  const role = user?.role || null;
  const name = user?.name || '';

  // Close modal when sessions update (if we just added one)
  useEffect(() => {
    if (showAddModal && sessions.length > 0) {
      setShowAddModal(false);
      setAddFormLoading(false);
      setAddFormCode('');
      setSelectedUser(null);
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

  const sendConnectionRequest = async () => {
    if (!selectedUser) {
      return setAddFormError('Please select a user from the search results');
    }

    setAddFormLoading(true);
    try {
      const { createMonitoringRequest } = await import('../services/api');
      await createMonitoringRequest(selectedUser.id);
      toast.success(`Request sent to ${selectedUser.name}`);
      setShowAddModal(false);
      setAddFormCode('');
      setSelectedUser(null);
      setSearchResults([]);
    } catch (error) {
      console.error('Request failed:', error);
      setAddFormError(error.message || 'Failed to send request');
    } finally {
      setAddFormLoading(false);
    }
  };


  if (!role) return <div className="p-20 flex justify-center items-center"><Loader2 className="h-10 w-10 text-blue-600 animate-spin" /></div>;


  if (role === 'employee') {
    return (
      <div className="w-full min-h-full bg-white flex flex-col">
        <style>{GLOBAL_STYLES}</style>

        {/* Page Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-normal text-[#202124] tracking-tight">
              Monitoring Requests
            </h1>
          </div>
          {isSharing && (
            <Button
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-bold shadow-sm"
              onClick={stopSharing}
            >
              Stop Sharing
            </Button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="p-8 flex-1 flex flex-col overflow-hidden">
          <PendingRequests
            startSharing={startSharing}
            stopSharing={stopSharing}
            isSharing={isSharing}
            setJustReconnected={setJustReconnected}
          />

          {/* Show error if any */}
          {shareError && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm text-center">
              {shareError}
            </div>
          )}
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{GLOBAL_STYLES}</style>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search active sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
          />
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold h-11 px-6 rounded-xl shadow-md transition-all active:scale-95"
        >
          <Plus className="mr-2 h-5 w-5" />
          New Connection
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
              Click 'New Connection' to request to monitor an employee.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sessions
              .filter(s => s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(s => (
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
            <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">Request Connection</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Search for an employee to request a monitoring session.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Employee Name</label>
            <input
              type="text"
              value={addFormCode}
              onChange={e => {
                setAddFormCode(e.target.value);
                setSelectedUser(null); // Clear selection if user types
                if (addFormError) setAddFormError('');
              }}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
            />
            {addFormError && <p className="text-rose-500 text-xs mt-1 font-medium">{addFormError}</p>}

            {searchResults.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-lg max-h-48 overflow-y-auto shadow-sm">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center"
                    onClick={() => {
                      setAddFormCode(user.name);
                      setSelectedUser(user);
                      setSearchResults([]);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                          <span className="text-xs font-bold text-slate-500">{user.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-700">{user.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{user.email}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-500 mt-2">
              This will send a request to the employee to accept the monitoring session.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false);
                setSearchResults([]);
                setAddFormCode('');
                setSelectedUser(null);
              }}
              className="text-slate-600 hover:bg-slate-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold px-6"
              onClick={sendConnectionRequest}
              disabled={addFormLoading}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Monitoring;
