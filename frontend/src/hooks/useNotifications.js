import { useState, useEffect, useCallback } from 'react';
import { fetchExpiringContracts } from '../services/api';

/**
 * Custom hook for managing contract expiration notifications
 * Tracks read/unread state like Facebook notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set()); // Track read notification IDs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch contracts expiring within 7 days
      const expiringContracts = await fetchExpiringContracts(7);
      console.log('📬 Notifications loaded:', expiringContracts?.length || 0, 'contracts expiring within 7 days');
      const newNotifications = Array.isArray(expiringContracts) ? expiringContracts : [];
      
      // When new notifications arrive, only mark as unread if they're new (not in readIds)
      // This preserves read state when refreshing
      setNotifications(newNotifications);
    } catch (err) {
      console.error('❌ Error loading notifications:', err);
      setError(err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark a notification as read
  const markAsRead = useCallback((notificationId) => {
    setReadIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(notificationId);
      return newSet;
    });
  }, []);

  // Get unread notifications count
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  useEffect(() => {
    loadNotifications();
    
    // Refresh notifications every 5 minutes
    const interval = setInterval(() => {
      loadNotifications();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  return {
    notifications,
    loading,
    error,
    refresh: loadNotifications,
    count: unreadCount, // Only count unread notifications
    markAsRead,
    isRead: (id) => readIds.has(id),
  };
}
