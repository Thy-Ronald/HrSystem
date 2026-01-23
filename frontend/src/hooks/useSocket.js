/**
 * useSocket Hook
 * 
 * Manages Socket.IO connection to the backend for real-time updates.
 * Features:
 * - Automatic connection on mount
 * - Automatic reconnection with exponential backoff
 * - Cleanup on unmount
 * - Connection status tracking
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// Backend URL - matches the API base
const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

/**
 * Custom hook for Socket.IO connection management
 * 
 * @returns {Object} Socket state and methods
 * - socket: Socket.IO instance (or null if not connected)
 * - isConnected: Boolean connection status
 * - connectionError: Error message if connection failed
 * - subscribe: Function to subscribe to events
 * - unsubscribe: Function to unsubscribe from events
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    // Initialize Socket.IO connection with reconnection options
    const socket = io(SOCKET_URL, {
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,      // Start with 1 second
      reconnectionDelayMax: 30000,  // Max 30 seconds between attempts
      randomizationFactor: 0.5,     // Add randomness to prevent thundering herd
      
      // Connection settings
      timeout: 20000,               // Connection timeout
      transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[Socket.IO] Connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptRef.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      setIsConnected(false);
      
      // If server disconnected us, try to reconnect
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message);
      setConnectionError(error.message);
      reconnectAttemptRef.current++;
      
      // Log reconnection attempts
      console.log(`[Socket.IO] Reconnection attempt ${reconnectAttemptRef.current}`);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket.IO] Reconnected after ${attemptNumber} attempts`);
      setConnectionError(null);
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket.IO] Reconnection failed after max attempts');
      setConnectionError('Unable to connect to server. Please refresh the page.');
    });

    // Cleanup on unmount - disconnect socket
    return () => {
      console.log('[Socket.IO] Cleaning up socket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /**
   * Subscribe to a Socket.IO event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  const subscribe = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  /**
   * Unsubscribe from a Socket.IO event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler (optional, removes all if not provided)
   */
  const unsubscribe = useCallback((event, callback) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  /**
   * Emit an event to the server
   * @param {string} event - Event name
   * @param {any} data - Data to send
   */
  const emit = useCallback((event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    subscribe,
    unsubscribe,
    emit,
  };
}

export default useSocket;
