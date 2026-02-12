import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useMonitoring } from '../contexts/MonitoringContext';
import { Button } from "@/components/ui/button";
import { Search, Plus, History, Monitor, Loader2 } from 'lucide-react';
import { useToast } from '../components/Toast';

// Imported Components
import MonitoringSessionCard from '../features/monitoring/components/MonitoringSessionCard';
import ReceivedRequestsList from '../features/monitoring/components/ReceivedRequestsList';
import HistoryModal from '../features/monitoring/components/HistoryModal';
import AddConnectionModal from '../features/monitoring/components/AddConnectionModal';

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
    stopViewing,
    resetSession,
    emit,
    connectionRequest,
    respondConnection
  } = useMonitoring();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sent Requests Logic (Admin View)
  const [sentRequests, setSentRequests] = useState([]);

  const fetchSent = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      const { getSentMonitoringRequests } = await import('../services/api');
      const data = await getSentMonitoringRequests();
      setSentRequests(data || []);
    } catch (e) {
      console.error('Failed to fetch sent requests', e);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSent();
      const interval = setInterval(fetchSent, 15000); // Poll every 15s to keep it fresh
      return () => clearInterval(interval);
    }
  }, [user, fetchSent]);

  // Listen to socket for updates
  const { subscribe, unsubscribe } = useSocket();
  useEffect(() => {
    const handleRefresh = (data) => {
      console.log('[Monitoring] Request status update received:', data);
      fetchSent();
    };

    subscribe('monitoring:connect-success', handleRefresh);
    subscribe('monitoring:request-declined', handleRefresh);
    subscribe('monitoring:disconnect', handleRefresh);

    return () => {
      unsubscribe('monitoring:connect-success', handleRefresh);
      unsubscribe('monitoring:request-declined', handleRefresh);
      unsubscribe('monitoring:disconnect', handleRefresh);
    };
  }, [subscribe, unsubscribe, fetchSent]);

  const toast = useToast();
  const role = user?.role || null;
  const name = user?.name || '';

  const handleRemoveSession = useCallback((id) => {
    setSessions(prev => prev.filter(s => s.sessionId !== id));
    emit('monitoring:leave-session', { sessionId: id });
  }, [emit, setSessions]);

  if (!role) return <div className="p-20 flex justify-center items-center"><Loader2 className="h-10 w-10 text-blue-600 animate-spin" /></div>;

  if (role === 'employee') {
    return (
      <div className="w-full min-h-full bg-white dark:bg-slate-950 flex flex-col">
        <style>{GLOBAL_STYLES}</style>

        {/* Page Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-normal text-[#202124] dark:text-slate-100 tracking-tight">
              Monitoring Requests
            </h1>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-8 flex-1 flex flex-col overflow-hidden">
          <ReceivedRequestsList
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <style>{GLOBAL_STYLES}</style>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search active sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowHistoryModal(true)}
            className="h-11 px-6 rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
          >
            <History className="mr-2 h-5 w-5" />
            History
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold h-11 px-6 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Connection
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-full mb-4">
              <Monitor className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No active sessions</h3>
            <p className="text-slate-500 max-w-xs text-center">
              Click 'New Connection' to request to monitor an employee.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <AddConnectionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        sessions={sessions}
        connectError={connectError}
        clearConnectError={clearConnectError}
      />

      <HistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        sentRequests={sentRequests}
        setSentRequests={setSentRequests}
      />
    </div>
  );
};

export default Monitoring;
