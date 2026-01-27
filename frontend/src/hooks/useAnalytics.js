import { useState, useEffect } from 'react';
import {
  getAnalyticsOverview,
  getDailyActivityTrends,
  getTopContributors,
  getLanguageDistribution,
} from '../services/api';

export function useAnalyticsOverview(filter = 'this-month') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getAnalyticsOverview(filter);
        if (!cancelled) {
          setData(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load analytics overview');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [filter]);

  return { data, loading, error };
}

export function useDailyActivityTrends(filter = 'this-month') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getDailyActivityTrends(filter);
        if (!cancelled) {
          setData(result.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load activity trends');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [filter]);

  return { data, loading, error };
}

export function useTopContributors(limit = 10, filter = 'this-month') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getTopContributors(limit, filter);
        if (!cancelled) {
          setData(result.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load top contributors');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [limit, filter]);

  return { data, loading, error };
}

export function useLanguageDistribution(filter = 'all') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getLanguageDistribution(filter);
        if (!cancelled) {
          setData(result.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load language distribution');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [filter]);

  return { data, loading, error };
}
