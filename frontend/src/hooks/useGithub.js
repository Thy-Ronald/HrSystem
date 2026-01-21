import { useMemo, useState } from 'react';
import { fetchGithubProfile } from '../services/api';

export function useGithub() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const topLanguages = useMemo(() => {
    if (!data?.languageUsage) return [];
    const entries = Object.entries(data.languageUsage);
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [data]);

  const fetchProfile = async () => {
    if (!username) {
      setError('Enter a GitHub username to continue');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetchGithubProfile(username);
      setData(response);
    } catch (err) {
      setError(err.message || 'Request failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return { username, setUsername, loading, data, error, topLanguages, fetchProfile };
}
