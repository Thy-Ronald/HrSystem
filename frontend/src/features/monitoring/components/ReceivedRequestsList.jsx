import React, { useState } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Signal } from 'lucide-react';

import { UserAvatar } from '../../../components/UserAvatar';
import { useToast } from '../../../components/Toast'; // Still used for resume modal maybe? Or passed from hook?
import { useReceivedRequests } from '../hooks/useReceivedRequests';

const ReceivedRequestsList = React.memo(({ startSharing, stopSharing, isSharing, setJustReconnected }) => {
    const {
        requests,
        handleDecline,
        handleDisconnect,
        handleApprove
    } = useReceivedRequests({ isSharing, startSharing, stopSharing, setJustReconnected });

    const [confirmApproveId, setConfirmApproveId] = useState(null);
    const [confirmDeclineId, setConfirmDeclineId] = useState(null);
    const [confirmDisconnectId, setConfirmDisconnectId] = useState(null);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const toast = useToast();

    // Wrappers to handle UI state after hook actions
    const onDeclineConfirm = async () => {
        await handleDecline(confirmDeclineId);
        setConfirmDeclineId(null);
    };

    const onDisconnectConfirm = async () => {
        await handleDisconnect(confirmDisconnectId);
        setConfirmDisconnectId(null);
    };

    const onApproveConfirm = async () => {
        await handleApprove(confirmApproveId);
        setConfirmApproveId(null);
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
                                                        onClick={() => setConfirmDisconnectId(req.id)}
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
                            onClick={onDeclineConfirm}
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
                            onClick={onDisconnectConfirm}
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
                            onClick={onApproveConfirm}
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

export default ReceivedRequestsList;
