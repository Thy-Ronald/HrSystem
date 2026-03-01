/**
 * useTeamPresence
 *
 * Loads the full team presence via HTTP on mount, then keeps every entry
 * up-to-date in real-time via Socket.IO events pushed by the backend's
 * Firestore onSnapshot listeners.
 *
 * Socket events consumed:
 *  - tracking:presence-update  { uid, name, email, effectiveStatus, presence }
 *  - tracking:employee-removed { uid }
 *
 * Falls back to a full re-fetch on socket reconnect so stale data never persists.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllPresence } from '../../../services/employeeTracking';
import { useSocket } from '../../../hooks/useSocket';

export function useTeamPresence() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  // Set of UIDs that received a live update in the last 2 s (used for row flash)
  const [recentlyUpdated, setRecentlyUpdated] = useState(() => new Set());

  const { subscribe, unsubscribe, emit, isConnected } = useSocket();
  const joinedRef = useRef(false);
  const prevConnected = useRef(false);
  const clearTimers = useRef({});  // uid → timeoutId

  // ── Initial HTTP fetch ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const result = await fetchAllPresence();
      setData(result ?? []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Mount: initial load + cleanup ───────────────────────────────────────
  useEffect(() => {
    load();
    return () => {
      emit('tracking:leave');
      joinedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Join room & re-fetch on (re)connect ────────────────────────────────
  useEffect(() => {
    if (isConnected) {
      if (!joinedRef.current) {
        emit('tracking:join');
        joinedRef.current = true;
      }
      // Re-fetch after reconnect to catch any missed updates
      if (prevConnected.current === false) {
        load();
      }
    } else {
      joinedRef.current = false;
    }
    prevConnected.current = isConnected;
  }, [isConnected, emit, load]);

  // ── Real-time socket event handlers ────────────────────────────────────
  useEffect(() => {
    const handleUpdate = (payload) => {
      setData((prev) => {
        const idx = prev.findIndex((e) => e.uid === payload.uid);
        if (idx === -1) return [...prev, payload];
        const next = [...prev];
        next[idx] = payload;
        return next;
      });
      setLastUpdated(new Date());

      // Flash this row for 2 s
      setRecentlyUpdated((prev) => new Set([...prev, payload.uid]));
      if (clearTimers.current[payload.uid]) clearTimeout(clearTimers.current[payload.uid]);
      clearTimers.current[payload.uid] = setTimeout(() => {
        setRecentlyUpdated((prev) => { const n = new Set(prev); n.delete(payload.uid); return n; });
        delete clearTimers.current[payload.uid];
      }, 2000);
    };

    const handleRemoved = ({ uid }) => {
      setData((prev) => prev.filter((e) => e.uid !== uid));
    };

    subscribe('tracking:presence-update', handleUpdate);
    subscribe('tracking:employee-removed', handleRemoved);

    return () => {
      unsubscribe('tracking:presence-update', handleUpdate);
      unsubscribe('tracking:employee-removed', handleRemoved);
    };
  }, [subscribe, unsubscribe]);

  return { data, loading, error, lastUpdated, recentlyUpdated, refresh: load };
}
