import { useState, useEffect, useCallback } from 'react';
import { getNotifications, markNotificationRead, deleteAllNotifications } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from './useSocket';
import { requestNotificationPermission, showBrowserNotification } from '../utils/notifications';

/**
 * Custom hook for managing notifications
 * Tracks read/unread state
 * Only loads notifications for admin users
 */
export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set()); // Track read notification IDs (locally for optimistic UI)
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 4;

  const loadNotifications = useCallback(async (pageNum = 1, append = false) => {
    // Only load notifications for authenticated users
    if (!isAuthenticated) {
      setNotifications([]);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      // Fetch notifications with pagination
      const data = await getNotifications(pageNum, limit);
      console.log(`📬 Notifications loaded (page ${pageNum}):`, data?.notifications?.length || 0);

      const newNotifications = Array.isArray(data?.notifications) ? data.notifications : [];

      setNotifications(prev => {
        if (append) {
          // Append but filter out duplicates just in case (e.g. real-time ones added)
          const existingIds = new Set(prev.map(n => n.id));
          const filteredNew = newNotifications.filter(n => !existingIds.has(n.id));
          return [...prev, ...filteredNew];
        }
        return newNotifications;
      });

      setHasMore(data?.hasMore || false);

      // Update readIds based on backend state
      const serverReadIds = new Set(newNotifications.filter(n => n.is_read).map(n => n.id));
      setReadIds(prev => {
        const combined = new Set(prev);
        serverReadIds.forEach(id => combined.add(id));
        return combined;
      });

    } catch (err) {
      // Handle 403 Forbidden gracefully (user might not be admin)
      if (err.status === 403 || err.message?.includes('Forbidden')) {
        console.log('📬 Notifications not available (admin only)');
        setNotifications([]);
        setError(null); // Don't show error for permission issues
      } else {
        console.error('❌ Error loading notifications:', err);
        setError(err.message);
        setNotifications([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isAuthenticated, user]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await loadNotifications(nextPage, true);
  }, [page, hasMore, loadingMore, loadNotifications]);

  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId) => {
    // Optimistic update
    setReadIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(notificationId);
      return newSet;
    });

    try {
      await markNotificationRead(notificationId);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  }, []);

  // Get unread notifications count
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  // Clear all notifications
  const clearAll = useCallback(async () => {
    console.log('🚀 clearAll function called');
    try {
      console.log('Calling deleteAllNotifications API...');
      await deleteAllNotifications();
      console.log('deleteAllNotifications completed, reloading...');
      // Reset to page 1 and reload
      setPage(1);
      await loadNotifications(1, false);
      console.log('Notifications reloaded successfully');
    } catch (err) {
      console.error("Failed to delete all notifications", err);
      throw err; // Re-throw for UI to handle
    }
  }, [loadNotifications]);

  useEffect(() => {
    // Only load if user is authenticated
    if (isAuthenticated) {
      // Reset to page 1 on mount or auth change
      setPage(1);
      loadNotifications(1, false);

      // Setup real-time notification listener if socket is connected
      const handleNewNotification = async (notification) => {
        console.log('📬 Real-time notification received:', notification);
        // Add to the top of the list
        setNotifications(prev => {
          // Check if already exists (prevent duplicates if fetch and socket happen close together)
          if (prev.some(n => n.id === notification.id)) return prev;
          return [notification, ...prev];
        });

        // Show browser push notification for monitoring events
        if (
          notification.type === 'monitoring_disconnect' ||
          notification.type === 'monitoring_request_declined' ||
          notification.type === 'monitoring_new_request'
        ) {
          // Request permission on first notification (better UX than on page load)
          const permission = await requestNotificationPermission();

          if (permission === 'granted') {
            showBrowserNotification(notification.title, {
              body: notification.message,
              tag: notification.type,
              requireInteraction: false,
              onClick: () => {
                // Focus window and navigate to monitoring page
                window.focus();
                if (window.location.pathname !== '/monitoring') {
                  window.location.href = '/monitoring';
                }
              }
            });
          }
        }
      };

      if (socket && isConnected) {
        console.log('📬 Setting up real-time notification listener');
        socket.on('notification:new', handleNewNotification);
      }

      // Fallback: Refresh notifications every 5 minutes (reset to page 1)
      const interval = setInterval(() => {
        setPage(1);
        loadNotifications(1, false);
      }, 5 * 60 * 1000);

      return () => {
        if (socket) {
          socket.off('notification:new', handleNewNotification);
        }
        clearInterval(interval);
      };
    } else {
      // Clear notifications if user is not admin
      setNotifications([]);
      setError(null);
    }
  }, [loadNotifications, isAuthenticated, user, socket, isConnected]);

  return {
    notifications,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    refresh: () => {
      setPage(1);
      loadNotifications(1, false);
    },
    count: unreadCount, // Only count unread notifications
    markAsRead,
    isRead: (id) => readIds.has(id),
    clearAll,
  };
}
