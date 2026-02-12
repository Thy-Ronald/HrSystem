import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Eye,
    Signal,
    Users,
    Trash2,
    Loader2,
    CheckCircle2,
    EyeOff
} from 'lucide-react';
import { UserAvatar } from '../../../components/UserAvatar';
import { useScreenRecorder } from '../../../hooks/useScreenRecorder';
import { useScreenShare } from '../../../hooks/useScreenShare';
import { useSocket } from '../../../hooks/useSocket';
import { useToast } from '../../../components/Toast';

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
    const [reconnecting, setReconnecting] = useState(false);
    const [reconnectSent, setReconnectSent] = useState(() => {
        return localStorage.getItem(`reconnect_sent_${session.sessionId}`) === 'true';
    });
    const toast = useToast();
    const { emit } = useSocket();
    const [fullVideoEl, setFullVideoEl] = useState(null); // Callback ref pattern
    const containerRef = useRef(null);

    // Recording Hook
    const { isRecording, formattedTime, startRecording, stopRecording } = useScreenRecorder();

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
        // Rely on 'fullVideoEl' state to know when the video element is mounted in the DOM
        if (showFullView && remoteStream && fullVideoEl) {
            fullVideoEl.srcObject = remoteStream;
            // Use requestAnimationFrame to ensure play happens after paint
            requestAnimationFrame(() => {
                fullVideoEl.play().catch(err => console.error('[CCTV] Fullscreen play error:', err));
            });

            // OPTIMIZATION: Pause the thumbnail video to save CPU/GPU (prevent double decoding)
            if (remoteVideoRef.current) {
                remoteVideoRef.current.pause();
            }
        } else {
            // Resume thumbnail when modal closes
            if (remoteVideoRef.current && remoteStream) {
                remoteVideoRef.current.play().catch(err => { });
            }
        }
    }, [showFullView, remoteStream, fullVideoEl]);

    // Viewport-aware streaming logic (Scalability Optimization)
    useEffect(() => {
        let timeoutId;
        let active = true;

        // DEBOUNCE: Only start viewing if stream is active AND (visible OR in full view)
        // Wait 300ms to ensure user is actually looking at this card (not just scrolling past)
        if (session.streamActive && (isVisible || showFullView) && !shareConnected) {
            setLoading(true);
            timeoutId = setTimeout(() => {
                if (active) startViewing(session.sessionId);
            }, 300);
        }
        // Stop viewing IMMEDIATELY if (NOT visible AND NOT in full view) OR stream stopped
        else if (((!isVisible && !showFullView) || !session.streamActive) && shareConnected) {
            stopViewing();
            setLoading(false);
            if (!session.streamActive && active) setShowFullView(false);
        }

        return () => {
            active = false;
            clearTimeout(timeoutId); // Cancel connection attempt if user scrolld away
        };
    }, [session.streamActive, isVisible, showFullView, shareConnected, startViewing, stopViewing, session.sessionId]);

    useEffect(() => {
        return () => stopViewing();
    }, [stopViewing]);

    // Reset reconnectSent state when session becomes active
    useEffect(() => {
        if (session.streamActive && reconnectSent) {
            setReconnectSent(false);
            localStorage.removeItem(`reconnect_sent_${session.sessionId}`);
        }
    }, [session.streamActive, reconnectSent, session.sessionId]);

    const handleRemoveClick = () => setShowConfirm(true);
    const handleConfirmRemove = async () => {
        try {
            // 1. Optimistic UI Update (call onRemove immediately to hide card)
            onRemove(session.sessionId);

            // 2. Call Backend API to terminate session
            const { deleteMonitoringSession } = await import('../../../services/api');
            await deleteMonitoringSession(session.sessionId);

            localStorage.removeItem(`reconnect_sent_${session.sessionId}`);
            toast.success(`Session with ${session.employeeName} ended`);
        } catch (error) {
            console.error("Failed to terminate session:", error);
            toast.error("Failed to fully terminate session");
        } finally {
            setShowConfirm(false);
        }
    };

    return (
        <div ref={containerRef} style={{ height: '100%' }}>
            <Card className={`h-full overflow-hidden transition-all duration-300 border-2 ${session.streamActive ? 'border-[#1a3e62] dark:border-blue-400 shadow-md' : 'border-slate-100 dark:border-slate-800 shadow-sm'} flex flex-col bg-white dark:bg-slate-950 hover:translate-y-[-4px] hover:shadow-xl`}>
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                            name={session.employeeName}
                            avatarUrl={session.avatarUrl}
                            size="sm"
                            className="border border-slate-100 dark:border-slate-800"
                        />
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{session.employeeName}</h3>
                        {session.streamActive && (
                            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
                            </div>
                        )}
                        {isRecording && (
                            <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-800 animate-pulse">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{formattedTime}</span>
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
                                    <Signal className="h-10 w-10 text-slate-500 dark:text-slate-400 mx-auto mb-2 opacity-50" />
                                ) : (
                                    <Users className="h-10 w-10 text-slate-500 dark:text-slate-400 mx-auto mb-2" />
                                )}

                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                                    {session.disconnectReason === 'offline' ? 'Offline' : 'Disconnected'}
                                </p>
                                {session.disconnectReason === 'offline' ? (
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[150px] mx-auto leading-tight">
                                        Waiting for user to come online or resume connection
                                    </p>
                                ) : (
                                    !session.streamActive && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">User ended session</p>
                                )}
                            </div>
                        )}
                        {loading && session.streamActive && (
                            <Loader2 className="absolute h-8 w-8 text-white animate-spin opacity-50" />
                        )}
                    </div>
                </div>
                <div className="p-3 flex gap-2 bg-slate-50/30 dark:bg-slate-900/30">
                    {session.streamActive ? (
                        <>
                            <Button
                                className="flex-1 bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold h-8 text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1a3e62]"
                                onClick={() => setShowFullView(true)}
                            >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                View
                            </Button>
                            <Button
                                variant="outline"
                                className={`flex-1 ${isRecording ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-transparent'} gap-1.5 h-8 text-xs`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isRecording) {
                                        stopRecording();
                                    } else {
                                        // Get stream from video element or session if available
                                        const videoEl = remoteVideoRef.current;
                                        if (videoEl && videoEl.srcObject) {
                                            startRecording(videoEl.srcObject, `recording-${session.employeeName}`);
                                        } else {
                                            toast.error("No active stream to record");
                                        }
                                    }
                                }}
                                title={isRecording ? "Stop Recording" : "Record Screen"}
                            >
                                <div className={`w-2 h-2 rounded-${isRecording ? 'sm' : 'full'} ${isRecording ? 'bg-rose-600' : 'bg-rose-500'} flex-shrink-0`} />
                                <span>{isRecording ? 'Stop' : 'Record'}</span>
                            </Button>
                        </>
                    ) : session.disconnectReason !== 'offline' ? (
                        <Button
                            className={`flex-1 ${reconnectSent ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} font-semibold h-9 rounded-lg shadow-sm transition-all`}
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (!session.employeeId) {
                                    toast.error("Employee information missing. Please remove and re-add.");
                                    return;
                                }

                                setReconnecting(true);
                                try {
                                    const { createMonitoringRequest } = await import('../../../services/api');
                                    await createMonitoringRequest(session.employeeId);
                                    toast.success(`Reconnection request sent to ${session.employeeName}`);
                                    setReconnectSent(true);
                                    localStorage.setItem(`reconnect_sent_${session.sessionId}`, 'true');

                                    // Keep the legacy socket event for legacy-compatible clients
                                    if (emit) {
                                        emit('monitoring:request-connection', { employeeName: session.employeeName });
                                    }
                                } catch (err) {
                                    toast.error(err.message || "Failed to send reconnection request");
                                } finally {
                                    setReconnecting(false);
                                }
                            }}
                            disabled={reconnecting || reconnectSent}
                        >
                            {reconnectSent ? (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Sent
                                </>
                            ) : reconnecting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Signal className="mr-2 h-4 w-4" />
                                    Reconnect
                                </>
                            )}
                        </Button>
                    ) : null}

                    <Button
                        variant="outline"
                        className={session.streamActive
                            ? "h-8 w-8 p-0 rounded-lg text-rose-600 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 flex-none"
                            : "flex-1 text-rose-600 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 h-9 rounded-lg"
                        }
                        onClick={handleRemoveClick}
                        title="Remove Session"
                    >
                        <Trash2 className={`${session.streamActive ? 'h-4 w-4' : 'mr-2 h-4 w-4'}`} />
                        {!session.streamActive && "Remove"}
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
                        <div className="px-5 py-3 flex justify-between items-center bg-slate-900 dark:bg-black border-b border-white/10 shrink-0">
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
                                ref={setFullVideoEl}
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
                <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">Stop Monitoring?</DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-slate-400 pt-2">
                            Are you sure you want to disconnect from <strong className="text-slate-900 dark:text-slate-100">{session.employeeName}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 pt-4">
                        <Button
                            variant="ghost"
                            onClick={() => setShowConfirm(false)}
                            className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
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

export default MonitoringSessionCard;
