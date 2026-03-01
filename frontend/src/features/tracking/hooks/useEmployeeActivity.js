/**
 * useEmployeeActivity
 * Fetches a single employee's daily activity data on demand.
 */

import { useState, useCallback } from 'react';
import { fetchUserActivity } from '../../../services/employeeTracking';

export function useEmployeeActivity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (targetUid, date) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUserActivity(targetUid, date);
      setData(result);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, load, clear };
}
