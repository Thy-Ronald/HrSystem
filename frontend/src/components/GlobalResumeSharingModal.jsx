import React, { useState, useEffect } from 'react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useToast } from './Toast';
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
} from "@/components/ui/dialog"
import { Signal, Loader2 } from 'lucide-react';

const GlobalResumeSharingModal = () => {
    const { startSharing } = useMonitoring();
    const [resumeData, setResumeData] = useState(null);
    const [triggerType, setTriggerType] = useState('login'); // default to login
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    // Check for resume flag on mount
    useEffect(() => {
        const storedExpected = localStorage.getItem('monitoring_resume_expected');
        const triggerType = localStorage.getItem('monitoring_trigger_type');

        if (storedExpected === 'true') {
            try {
                const data = JSON.parse(localStorage.getItem('monitoring_resume_data') || '{}');
                setResumeData(data);
                setTriggerType(triggerType || 'login');
                setIsOpen(true);
                // Clean up flag immediately
                localStorage.removeItem('monitoring_resume_expected');
                // We DON'T clear trigger_type here immediately because we need it for the render 
                // It will be cleared when we close or the user navigates away? 
                // Actually, just reading it once on render is enough if we store it in state, 
                // but reading from localStorage in render is fine if it persists until the user clicks something.
                // Let's clear it when we handle stop/resume.
            } catch (e) {
                console.error('Error parsing resume data', e);
            }
        }
    }, []);

    const handleResume = async () => {
        setLoading(true);
        try {
            // Remove the flag to prevent loop if it fails
            localStorage.removeItem('monitoring_resume_expected');
            localStorage.removeItem('monitoring_trigger_type');

            await startSharing();
            setIsOpen(false);
            toast.success('Sharing resumed successfully');
        } catch (error) {
            console.error('Failed to resume sharing:', error);
            toast.error('Failed to start sharing. Please try again from the dashboard.');
            // We keep the modal open or close it? 
            // Better to close it and let them try manually if it fails hard
            setIsOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        setLoading(true);
        try {
            const requestId = resumeData?.requestId;
            if (requestId) {
                const { respondToMonitoringRequest } = await import('../services/api');
                await respondToMonitoringRequest(requestId, 'rejected');
                toast.success('Monitoring session stopped');
            } else {
                // Fallback if no ID (should not happen with new backend)
                localStorage.removeItem('monitoring_resume_expected');
                localStorage.removeItem('monitoring_trigger_type');
                localStorage.removeItem('monitoring_sessionId');
                toast.info('Session cleared');
            }
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to stop session', error);
            toast.error('Failed to stop session');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Signal className="h-5 w-5 text-emerald-500" />
                        Resume Monitoring?
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 pt-2">
                        <DialogDescription className="text-slate-500 pt-2">
                            {triggerType === 'refresh'
                                ? <span>Your screen sharing session with <strong>{resumeData?.adminName || 'Admin'}</strong> was interrupted by a page refresh.<br />Click below to resume sharing.</span>
                                : <span>You have an active monitoring session with <strong>{resumeData?.adminName || 'Admin'}</strong>.<br />Click below to resume screen sharing immediately.</span>
                            }
                        </DialogDescription>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0 pt-4">
                    <Button
                        variant="ghost"
                        onClick={handleStop}
                        disabled={loading}
                        className="text-slate-600 hover:bg-slate-100 font-medium"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Stop Monitoring'}
                    </Button>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        onClick={handleResume}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Resume Sharing
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default GlobalResumeSharingModal;
