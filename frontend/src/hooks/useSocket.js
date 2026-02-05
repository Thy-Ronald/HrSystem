/**
 * useSocket Hook
 * 
 * Manages Socket.IO connection to the backend for real-time updates.
 * Uses a SINGLETON socket instance so all components share the same connection.
 * Features:
 * - Automatic connection on mount
 * - Automatic reconnection with exponential backoff
 * - Cleanup on unmount (only when last consumer unmounts)
 * - Connection status tracking
 */

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../utils/auth';

// Backend URL - matches the API base
const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Singleton socket instance
let socketInstance = null;
let connectionCount = 0;
let isConnectedState = false;
let connectionErrorState = null;
let listeners = new Set();

// Notify all subscribers of state changes
function notifyListeners() {
  listeners.forEach((listener) => listener());
}

// Get or create the singleton socket
function getSocket() {
  if (!socketInstance) {
    const token = getToken();

    socketInstance = io(SOCKET_URL, {
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,

      // Connection settings
      timeout: 20000,
      transports: ['websocket', 'polling'],

      // Authentication (for production JWT auth)
      auth: token ? { token } : {},
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected:', socketInstance.id);
      isConnectedState = true;
      connectionErrorState = null;
      notifyListeners();
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      isConnectedState = false;
      notifyListeners();

      // If server disconnected us, try to reconnect
      if (reason === 'io server disconnect') {
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message);
      connectionErrorState = error.message;
      notifyListeners();
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`[Socket.IO] Reconnected after ${attemptNumber} attempts, new socket ID: ${socketInstance.id}`);
      connectionErrorState = null;
      notifyListeners();
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('[Socket.IO] Reconnection failed after max attempts');
      connectionErrorState = 'Unable to connect to server. Please refresh the page.';
      notifyListeners();
    });
  }

  return socketInstance;
}

// Cleanup the socket when no consumers remain
function cleanupSocket() {
  if (socketInstance && connectionCount === 0) {
    console.log('[Socket.IO] Cleaning up socket connection (no active consumers)');
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
    isConnectedState = false;
    connectionErrorState = null;
  }
}

/**
 * Custom hook for Socket.IO connection management
 * 
 * @returns {Object} Socket state and methods
 * - socket: Socket.IO instance (or null if not connected)
 * - isConnected: Boolean connection status
 * - connectionError: Error message if connection failed
 * - subscribe: Function to subscribe to events
 * - unsubscribe: Function to unsubscribe from events
 * - emit: Function to emit events
 */
export function useSocket() {
  const [, forceUpdate] = useState({});

  // Real-time Optimization: Ensure socket is initialized IMMEDIATELY 
  // so child component effects can subscribe without waiting for a re-render/mount.
  if (!socketInstance && typeof window !== 'undefined') {
    getSocket();
  }

  // Use useSyncExternalStore for proper subscription to external state
  const isConnected = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => isConnectedState
  );

  const connectionError = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => connectionErrorState
  );

  useEffect(() => {
    // Get or create the singleton socket (already initialized in hook body, but for safety)
    const socket = getSocket();
    connectionCount++;
    console.log(`[Socket.IO] Consumer connected (total: ${connectionCount}), socket ID: ${socket.id}`);

    // Force update to ensure component has latest socket reference
    forceUpdate({});

    // Cleanup on unmount
    return () => {
      connectionCount--;
      console.log(`[Socket.IO] Consumer disconnected (remaining: ${connectionCount})`);

      // Only cleanup socket if no consumers remain
      // Use a timeout to handle React StrictMode double-mount
      setTimeout(() => {
        if (connectionCount === 0) {
          cleanupSocket();
        }
      }, 100);
    };
  }, []);

  /**
   * Subscribe to a Socket.IO event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  const subscribe = useCallback((event, callback) => {
    const s = socketInstance || getSocket();
    if (s) {
      s.on(event, callback);
    }
  }, []);

  /**
   * Unsubscribe from a Socket.IO event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler (optional, removes all if not provided)
   */
  const unsubscribe = useCallback((event, callback) => {
    if (socketInstance) {
      if (callback) {
        socketInstance.off(event, callback);
      } else {
        socketInstance.off(event);
      }
    }
  }, []);

  /**
   * Emit an event to the server
   * @param {string} event - Event name
   * @param {any} data - Data to send
   */
  const emit = useCallback((event, data) => {
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit(event, data);
    } else {
      console.warn(`[Socket.IO] Cannot emit '${event}': socket not connected`);
    }
  }, []);

  return {
    socket: socketInstance,
    isConnected,
    connectionError,
    subscribe,
    unsubscribe,
    emit,
  };
}

export default useSocket;
