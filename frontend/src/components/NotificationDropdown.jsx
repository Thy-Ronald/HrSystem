import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../utils/format';
import { calculateExpirationDate } from '../features/contracts/utils/contractHelpers';
import { Button } from "@/components/ui/button"
import { X, Bell, FileText, Trash2, MoreHorizontal, Circle, UserMinus, UserPlus, UserX, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Facebook-style notification dropdown component
 */
export function NotificationDropdown({ open, onClose, notifications, loading, onNotificationClick, isRead, onNavigate, clearAll, loadMore, hasMore, loadingMore, toggleRef }) {
  const dropdownRef = useRef(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showClearConfirm) return;

      // Don't close if clicking the toggle button itself
      if (toggleRef?.current && toggleRef.current.contains(event.target)) {
        return;
      }

      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (open || showClearConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onClose, showClearConfirm]);

  const handleNotificationClick = (notification) => {
    if (onNotificationClick && !isRead(notification.id)) {
      onNotificationClick(notification.id);
    }

    if (onNavigate) {
      if (notification.type === 'monitoring_disconnect' || notification.type === 'monitoring_request_declined') {
        onNavigate('monitoring');
      } else {
        onNavigate('contract-form');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openContractEditModal', {
            detail: { contractId: notification.data ? notification.data.id : notification.id }
          }));
        }, 100);
      }
    }
    onClose();
  };

  const handleClearAll = async () => {
    try {
      if (clearAll) await clearAll();
      setShowClearConfirm(false);
      onClose();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      setShowClearConfirm(false);
    }
  };

  const getDaysUntilExpiry = (contract) => {
    const expirationDate = calculateExpirationDate(contract.assessmentDate, contract.termMonths)
      || (contract.expirationDate ? new Date(contract.expirationDate) : null);
    if (!expirationDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expirationDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !isRead(n.id);
    return true;
  });

  const groupNotifications = (notifs) => {
    const today = [];
    const earlier = [];
    const now = new Date();
    notifs.forEach(n => {
      const created = new Date(n.created_at);
      const diffInHours = (now - created) / (1000 * 60 * 60);
      if (diffInHours < 24) today.push(n);
      else earlier.push(n);
    });
    return { today, earlier };
  };

  const { today, earlier } = groupNotifications(filteredNotifications);

  const renderNotificationItem = (notification) => {
    const read = isRead ? isRead(notification.id) : (notification.is_read || false);

    // Default values
    let icon = <Bell className="h-6 w-6 text-white" />;
    let iconBg = "bg-slate-500";
    let subtext = "";

    // Type-specific icon and color logic
    if (notification.type === 'contract_expiry') {
      const contract = notification.data || notification;
      const days = getDaysUntilExpiry(contract);
      icon = <FileText className="h-6 w-6 text-white" />;
      iconBg = "bg-blue-600";
      subtext = `${days !== null ? `(${days} days left)` : ''}`;
    } else if (notification.type === 'monitoring_disconnect') {
      icon = <UserMinus className="h-6 w-6 text-white" />;
      iconBg = "bg-rose-500";
    } else if (notification.type === 'monitoring_request_declined') {
      icon = <UserX className="h-6 w-6 text-white" />;
      iconBg = "bg-rose-600";
    } else if (notification.type === 'monitoring_new_request') {
      icon = <UserPlus className="h-6 w-6 text-white" />;
      iconBg = "bg-emerald-500";
    } else if (notification.type === 'error' || notification.type === 'alert') {
      icon = <AlertTriangle className="h-6 w-6 text-white" />;
      iconBg = "bg-amber-500";
    }

    return (
      <div
        key={notification.id}
        onClick={() => handleNotificationClick(notification)}
        className={`px-3 py-3 mx-2 my-1 rounded-lg transition-colors cursor-pointer flex items-center gap-4 hover:bg-slate-100 dark:hover:bg-slate-800 ${!read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
          }`}
      >
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center shadow-sm`}>
            {icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] leading-tight ${!read ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
            <span className="text-slate-900 dark:text-slate-100 font-bold">{notification.title}</span> {notification.message}
          </p>
          <p className={`text-xs mt-1 ${!read ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-500'}`}>
            {formatTimeAgo(notification.created_at)} • {formatAbsoluteTimestamp(notification.created_at)} {subtext}
          </p>
        </div>
        {!read && (
          <div className="flex-shrink-0 pr-1">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          </div>
        )}
      </div>
    );
  };

  function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSec = Math.floor((now - date) / 1000);
    if (diffInSec < 60) return 'Just now';
    if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m`;
    if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h`;
    if (diffInSec < 604800) return `${Math.floor(diffInSec / 86400)}d`;
    return formatDate(date);
  }

  function formatAbsoluteTimestamp(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  return (
    <>
      {open && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-slate-950 rounded-xl shadow-2xl border border-[#dadce0] dark:border-slate-800 z-[1000] flex flex-col overflow-hidden"
          style={{
            boxShadow: '0 12px 28px 0 rgba(0, 0, 0, 0.2), 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
            maxHeight: 'calc(100vh - 80px)',
            width: '360px'
          }}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setShowClearConfirm(true)}>
                  <MoreHorizontal className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === 'all' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === 'unread' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                Unread
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 custom-scrollbar" style={{ maxHeight: '500px', minHeight: '300px' }}>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-500">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-slate-900 dark:text-slate-100 text-lg">No notifications</p>
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="pb-2">
                {today.length > 0 && (
                  <>
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Today</span>
                    </div>
                    {today.map(renderNotificationItem)}
                  </>
                )}
                {earlier.length > 0 && (
                  <>
                    <div className="px-4 py-2 mt-2 flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Earlier</span>
                      {filter === 'all' && (
                        <button className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded">See all</button>
                      )}
                    </div>
                    {earlier.map(renderNotificationItem)}
                  </>
                )}
              </div>
            )}

            {/* Load More as "See all" footer or inline */}
            {hasMore && (
              <div className="px-4 py-2">
                <Button
                  variant="ghost"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold py-6 rounded-lg transition-all"
                >
                  {loadingMore ? (
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  ) : (
                    'Load More Notifications'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Clear All Notifications?</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 pt-2">
              Are you sure you want to delete all notifications? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowClearConfirm(false)} className="dark:hover:bg-slate-800">Cancel</Button>
            <Button variant="destructive" onClick={handleClearAll}>Yes, Clear All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
