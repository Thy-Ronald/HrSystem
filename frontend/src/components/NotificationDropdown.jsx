import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../utils/format';
import { calculateExpirationDate } from '../features/contracts/utils/contractHelpers';
import { Button } from "@/components/ui/button"
import { X, Bell, FileText, Trash2 } from "lucide-react"
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
export function NotificationDropdown({ open, onClose, notifications, loading, onNotificationClick, isRead, onNavigate, clearAll }) {
  const dropdownRef = useRef(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // CRITICAL: If the clear confirmation dialog is open, do NOT close the dropdown.
      // Radix UI Dialog renders in a portal, so clicks on it will be seen as "outside" the dropdown.
      if (showClearConfirm) {
        console.log('🛡️ Click outside ignored because Dialog is open');
        return;
      }

      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        console.log('🚪 Closing dropdown via click outside');
        onClose();
      }
    };

    // Only listen for clicks if the dropdown is open OR the confirmation is showing
    if (open || showClearConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onClose, showClearConfirm]);

  useEffect(() => {
    console.log('🔍 showClearConfirm state:', showClearConfirm);
  }, [showClearConfirm]);

  const handleNotificationClick = (contract) => {
    // Mark as read when clicked
    if (onNotificationClick && !isRead(contract.id)) {
      onNotificationClick(contract.id);
    }

    // Navigate based on type
    if (onNavigate) {
      if (contract.type === 'monitoring_disconnect' || contract.type === 'monitoring_request_declined') {
        onNavigate('monitoring');
      } else {
        // Default: Contract (or if type is missing/legacy)
        onNavigate('contract-form');

        // Trigger edit modal for this contract
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openContractEditModal', {
            detail: { contractId: contract.data ? contract.data.id : contract.id } // Handle nested data
          }));
        }, 100);
      }
    }

    // Close dropdown
    onClose();
  };

  const handleClearAll = async () => {
    console.log('🗑️ handleClearAll called');
    console.log('clearAll function:', clearAll);
    try {
      if (!clearAll) {
        console.error('clearAll function is undefined!');
        return;
      }
      console.log('Calling clearAll...');
      await clearAll();
      console.log('clearAll completed successfully');
      setShowClearConfirm(false);
      onClose();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      setShowClearConfirm(false);
      // Optionally show error toast
    }
  };
  // If we shouldn't show the dropdown but the confirmation is still open, 
  // we still need to render the Dialog part (portals).
  // However, it's cleaner to always render the Dialog at the bottom and 
  // just hide the dropdown div if !open

  const getDaysUntilExpiry = (contract) => {
    const expirationDate = calculateExpirationDate(contract.assessmentDate, contract.termMonths)
      || (contract.expirationDate ? new Date(contract.expirationDate) : null);

    if (!expirationDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expirationDate);
    expiry.setHours(0, 0, 0, 0);

    const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <>
      {open && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-[#dadce0] z-[1000] max-h-[600px] overflow-hidden flex flex-col"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#dadce0] flex items-center justify-between bg-white sticky top-0">
            <h3 className="text-lg font-semibold text-[#202124]">Notifications</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    console.log('🗑️ Trash button clicked!');
                    console.log('showClearConfirm:', showClearConfirm);
                    setShowClearConfirm(true);
                    console.log('setShowClearConfirm(true) called');
                  }}
                  className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full"
                  title="Clear all notifications"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-[#5f6368]">
                <div className="animate-spin h-6 w-6 border-2 border-[#1a73e8] border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-[#5f6368]">
                <div className="bg-slate-50 p-4 rounded-full mb-4 shadow-inner">
                  <Bell className="h-10 w-10 text-slate-300" />
                </div>
                <p className="font-medium">No notifications</p>
                <p className="text-sm">All contracts are up to date</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e4e6eb]">
                {notifications.map((notification) => {
                  const read = isRead ? isRead(notification.id) : (notification.is_read || false);

                  let icon = <FileText className="h-5 w-5 text-blue-600" />;
                  let bgColor = "bg-blue-50";
                  let title = notification.title;
                  let message = notification.message;
                  let subtext = "";

                  if (notification.type === 'contract_expiry') {
                    // ... existing contract logic ...
                    const contract = notification.data || notification;
                    const daysUntilExpiry = getDaysUntilExpiry(contract);
                    const expirationDate = calculateExpirationDate(contract.assessmentDate, contract.termMonths)
                      || (contract.expirationDate ? new Date(contract.expirationDate) : null);

                    subtext = (
                      <>
                        Expires: {expirationDate ? formatDate(expirationDate) : 'N/A'}
                        {daysUntilExpiry !== null && (
                          <span className="ml-2 font-medium text-[#e41e3f]">
                            ({daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'} left)
                          </span>
                        )}
                      </>
                    );
                  } else if (notification.type === 'monitoring_disconnect') {
                    icon = <div className="w-2 h-2 rounded-full bg-rose-500" />;
                    bgColor = "bg-rose-50";
                    subtext = <span className="text-xs text-slate-500">{new Date(notification.created_at).toLocaleString()}</span>
                  }

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 transition-colors cursor-pointer ${read ? 'bg-white' : 'bg-[#e7f3ff] hover:bg-[#d0e7ff]'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center`}>
                            {icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-[#050505] mb-1">
                                {title}
                              </p>
                              <p className="text-sm text-[#65676b] mb-1">
                                {message}
                              </p>
                              {subtext && <p className="text-xs text-[#65676b]">{subtext}</p>}
                            </div>
                            {!read && (
                              <div className="flex-shrink-0">
                                <div className="w-2 h-2 rounded-full bg-[#1877f2]"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-[#dadce0] bg-[#f0f2f5]">
              <Button
                variant="link"
                className="w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-700 hover:no-underline"
              >
                See All Notifications
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Clear All Confirmation Dialog - Outside dropdown for proper overlay */}
      <Dialog open={showClearConfirm} onOpenChange={(isOpen) => {
        console.log('Dialog onOpenChange:', isOpen);
        setShowClearConfirm(isOpen);
      }}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">Clear All Notifications?</DialogTitle>
            <DialogDescription className="text-slate-500 pt-2">
              Are you sure you want to delete all notifications? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowClearConfirm(false)}
              className="text-slate-600 hover:bg-slate-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              className="bg-rose-600 hover:bg-rose-700 font-semibold"
            >
              Yes, Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
