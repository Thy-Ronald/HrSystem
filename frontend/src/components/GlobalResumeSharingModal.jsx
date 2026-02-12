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
    const { resumeData, setResumeData, startSharing } = useMonitoring();
    const [triggerType, setTriggerType] = useState('login'); // default to login
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    // 1. Check for legacy resume flag on mount (Refresh case)
    useEffect(() => {
        const storedExpected = localStorage.getItem('monitoring_resume_expected');
        const storedTrigger = localStorage.getItem('monitoring_trigger_type');

        if (storedExpected === 'true') {
            try {
                const data = JSON.parse(localStorage.getItem('monitoring_resume_data') || '{}');
                setResumeData(data);
                setTriggerType(storedTrigger || 'refresh');
                setIsOpen(true);
                // Clean up flag immediately
                localStorage.removeItem('monitoring_resume_expected');
            } catch (e) {
                console.error('Error parsing resume data', e);
            }
        }
    }, [setResumeData]);

    // 2. React to context-driven resume state (Login case)
    useEffect(() => {
        if (resumeData && !isOpen) {
            setIsOpen(true);
            // If it came from context, it's likely a login or async restoration
            const storedTrigger = localStorage.getItem('monitoring_trigger_type');
            setTriggerType(storedTrigger || 'login');
        }
    }, [resumeData, isOpen]);

    const handleResume = async () => {
        setLoading(true);
        try {
            // Remove flags to prevent loop
            localStorage.removeItem('monitoring_resume_expected');
            localStorage.removeItem('monitoring_trigger_type');
            localStorage.removeItem('monitoring_resume_data');

            await startSharing();
            setResumeData(null);
            setIsOpen(false);
            toast.success('Sharing resumed successfully');
        } catch (error) {
            console.error('Failed to resume sharing:', error);
            toast.error('Failed to start sharing. Please try again from the dashboard.');
            setIsOpen(false);
            setResumeData(null);
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
                toast.info('Session cleared');
            }

            localStorage.removeItem('monitoring_resume_expected');
            localStorage.removeItem('monitoring_trigger_type');
            localStorage.removeItem('monitoring_resume_data');
            localStorage.removeItem('monitoring_sessionId');

            setResumeData(null);
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
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setResumeData(null);
            }
            setIsOpen(open);
        }}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Signal className="h-5 w-5 text-emerald-500" />
                        Resume Monitoring?
                    </DialogTitle>
                    <div className="text-slate-500 dark:text-slate-400 pt-2 text-sm">
                        {triggerType === 'refresh'
                            ? <span>Your screen sharing session with <strong>{resumeData?.adminName || 'Admin'}</strong> was interrupted by a page refresh.<br />Click below to resume sharing.</span>
                            : <span>You have an active monitoring session with <strong>{resumeData?.adminName || 'Admin'}</strong>.<br />Click below to resume screen sharing immediately.</span>
                        }
                    </div>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0 pt-4">
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
