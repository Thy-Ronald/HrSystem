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
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    // Only load notifications for authenticated admin users
    if (!isAuthenticated || user?.role !== 'admin') {
      setNotifications([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch all notifications (db + contracts)
      const data = await getNotifications();
      console.log('📬 Notifications loaded:', data?.length || 0);

      const newNotifications = Array.isArray(data) ? data : [];
      setNotifications(newNotifications);

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
    }
  }, [isAuthenticated, user]);

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
      // Reload notifications to get fresh data (contract expiry notifications are virtual)
      await loadNotifications();
      console.log('Notifications reloaded successfully');
    } catch (err) {
      console.error("Failed to delete all notifications", err);
      throw err; // Re-throw for UI to handle
    }
  }, [loadNotifications]);

  useEffect(() => {
    // Only load if user is authenticated and is admin
    if (isAuthenticated && user?.role === 'admin') {
      loadNotifications();

      // Setup real-time notification listener if socket is connected
      const handleNewNotification = async (notification) => {
        console.log('📬 Real-time notification received:', notification);
        setNotifications(prev => [notification, ...prev]);

        // Show browser push notification for disconnect and declined request events
        if (notification.type === 'monitoring_disconnect' || notification.type === 'monitoring_request_declined') {
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

      // Fallback: Refresh notifications every 5 minutes
      const interval = setInterval(() => {
        loadNotifications();
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
    error,
    refresh: loadNotifications,
    count: unreadCount, // Only count unread notifications
    markAsRead,
    isRead: (id) => readIds.has(id),
    clearAll,
  };
}
