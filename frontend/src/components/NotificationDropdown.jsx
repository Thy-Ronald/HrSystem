import { useEffect, useRef } from 'react';
import { formatDate } from '../utils/format';
import { calculateExpirationDate } from '../features/contracts/utils/contractHelpers';

/**
 * Facebook-style notification dropdown component
 */
export function NotificationDropdown({ open, onClose, notifications, loading, onNotificationClick, isRead, onNavigate }) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onClose]);

  const handleNotificationClick = (contract) => {
    // Mark as read when clicked
    if (onNotificationClick && !isRead(contract.id)) {
      onNotificationClick(contract.id);
    }

    // Navigate to contracts screen
    if (onNavigate) {
      onNavigate('contract-form');

      // Trigger edit modal for this contract after a short delay to allow navigation
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openContractEditModal', {
          detail: { contractId: contract.id }
        }));
      }, 100);
    }

    // Close dropdown
    onClose();
  };

  if (!open) return null;

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
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-[#dadce0] z-[1000] max-h-[600px] overflow-hidden flex flex-col"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#dadce0] flex items-center justify-between bg-white sticky top-0">
        <h3 className="text-lg font-semibold text-[#202124]">Notifications</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#f0f2f5] rounded-full transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
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
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 opacity-30">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="font-medium">No notifications</p>
            <p className="text-sm">All contracts are up to date</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e4e6eb]">
            {notifications.map((contract) => {
              const daysUntilExpiry = getDaysUntilExpiry(contract);
              const expirationDate = calculateExpirationDate(contract.assessmentDate, contract.termMonths)
                || (contract.expirationDate ? new Date(contract.expirationDate) : null);
              const read = isRead ? isRead(contract.id) : false;

              return (
                <div
                  key={contract.id}
                  onClick={() => handleNotificationClick(contract)}
                  className={`px-4 py-3 transition-colors cursor-pointer ${read ? 'bg-white' : 'bg-[#e7f3ff] hover:bg-[#d0e7ff]'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-[#e4e6eb] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#050505] mb-1">
                            Contract Expiring Soon
                          </p>
                          <p className="text-sm text-[#65676b] mb-1">
                            <span className="font-medium text-[#050505]">{contract.name}</span> - {contract.position}
                          </p>
                          <p className="text-xs text-[#65676b]">
                            Expires: {expirationDate ? formatDate(expirationDate) : 'N/A'}
                            {daysUntilExpiry !== null && (
                              <span className="ml-2 font-medium text-[#e41e3f]">
                                ({daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'} left)
                              </span>
                            )}
                          </p>
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
          <button className="w-full text-center text-sm font-semibold text-[#1877f2] hover:underline">
            See All Notifications
          </button>
        </div>
      )}
    </div>
  );
}
