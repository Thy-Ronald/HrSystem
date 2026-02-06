import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Inbox, X } from 'lucide-react';
import { UserAvatar } from '../../../components/UserAvatar';
import { useToast } from '../../../components/Toast';

const HistoryModal = ({ open, onOpenChange, sentRequests, setSentRequests }) => {
    const [confirmCancelId, setConfirmCancelId] = useState(null);
    const toast = useToast();

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md bg-white max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">
                            Request History
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-4">
                        {sentRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="bg-slate-50 p-3 rounded-full mb-3">
                                    <Inbox className="h-6 w-6 text-slate-400" />
                                </div>
                                <h3 className="text-sm font-medium text-slate-900">No requests found</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                                    You haven't sent any monitoring requests yet.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sentRequests.map(req => (
                                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar name={req.employee_name} size="sm" />
                                            <div>
                                                <div className="font-semibold text-slate-700">{req.employee_name}</div>
                                                <div className="text-xs text-slate-400">Sent {new Date(req.created_at).toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">
                                                Pending
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmCancelId(req.id);
                                                }}
                                                title="Cancel Request"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancel Confirmation Dialog */}
            <Dialog open={!!confirmCancelId} onOpenChange={(open) => !open && setConfirmCancelId(null)}>
                <DialogContent className="sm:max-w-xs bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900">Cancel Request?</DialogTitle>
                        <DialogDescription className="text-slate-500 pt-2">
                            Are you sure you want to cancel this monitoring request?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 pt-4">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmCancelId(null)}
                            className="text-slate-600 hover:bg-slate-100 font-medium"
                        >
                            Back
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-rose-600 hover:bg-rose-700 font-semibold"
                            onClick={async () => {
                                if (!confirmCancelId) return;
                                const requestId = confirmCancelId;

                                // Optimistic Update
                                const originalRequests = [...sentRequests];
                                setSentRequests(prev => prev.filter(r => r.id !== requestId));
                                setConfirmCancelId(null); // Close modal immediately

                                try {
                                    const { cancelMonitoringRequest } = await import('../../../services/api');
                                    await cancelMonitoringRequest(requestId);
                                } catch (e) {
                                    console.error("Cancel failed", e);
                                    setSentRequests(originalRequests); // Revert on failure
                                    toast.error("Failed to cancel request");
                                }
                            }}
                        >
                            Yes, Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default HistoryModal;
