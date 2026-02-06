import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import { useToast } from '../../../components/Toast';

export const useReceivedRequests = ({ isSharing, startSharing, stopSharing, setJustReconnected }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    const { subscribe, unsubscribe } = useSocket();

    const fetchRequests = useCallback(async () => {
        try {
            const { getMonitoringRequests } = await import('../../../services/api');
            const response = await getMonitoringRequests();
            // Extract array from response (handleResponse returns whole object if no .data field)
            const data = response?.requests || (Array.isArray(response) ? response : []);
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

        const handleRequestCancelled = (data) => {
            console.log('[Monitoring] Request cancelled:', data);
            // Optimistically remove from list
            setRequests((prev) => prev.filter(req => req.id != data.requestId));
            toast.info("Monitoring request was cancelled by the admin");
        };

        // Real-time Optimization: Listen for new requests via socket
        subscribe('monitoring:new-request', handleNewRequest);
        subscribe('monitoring:request-cancelled', handleRequestCancelled);

        // Fallback: Poll every 60 seconds to catch missed events (High Reliability)
        // OPTIMIZATION: Only poll if tab is visible to save bandwidth/battery
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchRequests();
            }
        }, 60000);

        return () => {
            unsubscribe('monitoring:new-request', handleNewRequest);
            unsubscribe('monitoring:request-cancelled', handleRequestCancelled);
            clearInterval(interval);
        };
    }, [fetchRequests, subscribe, unsubscribe]);

    const handleDecline = async (requestId) => {
        try {
            const { respondToMonitoringRequest } = await import('../../../services/api');
            await respondToMonitoringRequest(requestId, 'rejected');
            toast.success('Request declined');
            fetchRequests();
            return true;
        } catch (error) {
            toast.error('Failed to decline request');
            return false;
        }
    };

    const handleDisconnect = async (requestId) => {
        // 1. Stop sharing immediately
        if (isSharing) stopSharing();

        // 2. Persistent flag
        localStorage.setItem('monitoring_manual_disconnect', 'true');

        // 3. API Call
        return await handleDecline(requestId);
    };

    const handleApprove = async (requestId) => {
        try {
            localStorage.removeItem('monitoring_manual_disconnect');

            // 1. Start sharing FIRST
            await startSharing();

            // 2. Approve in DB
            const { respondToMonitoringRequest } = await import('../../../services/api');
            await respondToMonitoringRequest(requestId, 'approved');

            toast.success('Request Approved & Sharing Started');
            setJustReconnected(false);
            fetchRequests();
            return true;
        } catch (error) {
            console.error('[Monitoring] Approval/Sharing failed:', error);

            const isCancellation = error.name === 'NotAllowedError' || error.message?.includes('Permission denied');
            if (isCancellation) {
                toast.info('Screen sharing cancelled. Request remains pending.');
            } else {
                toast.error('Failed to start sharing or approve request');
            }
            return false;
        }
    };

    return {
        requests,
        loading,
        handleDecline,
        handleDisconnect,
        handleApprove
    };
};
