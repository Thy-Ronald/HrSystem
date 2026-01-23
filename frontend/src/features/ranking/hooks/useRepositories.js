/**
 * useRepositories Hook
 * Manages repository list loading and selection
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchRepositories } from '../../../services/api';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { STORAGE_KEYS } from '../constants';

export function useRepositories() {
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SELECTED_REPO, '')
  );
  const [reposLoading, setReposLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Load repositories from API
   */
  useEffect(() => {
    let mounted = true;

    const loadRepos = async () => {
      setReposLoading(true);
      try {
        const repos = await fetchRepositories();
        if (mounted) {
          setRepositories(repos);
          // Auto-select first repo if none selected
          if (repos.length > 0 && !selectedRepo) {
            const firstRepo = repos[0].fullName;
            setSelectedRepo(firstRepo);
            saveToStorage(STORAGE_KEYS.SELECTED_REPO, firstRepo);
          }
        }
      } catch (err) {
        console.error('Error loading repositories:', err);
        if (mounted) {
          setError('Failed to load repositories');
        }
      } finally {
        if (mounted) {
          setReposLoading(false);
        }
      }
    };

    loadRepos();
    return () => { mounted = false; };
  }, []); // Only run once on mount

  /**
   * Handle repository change
   * @param {string} repo - New repository full name
   */
  const handleRepoChange = useCallback((repo) => {
    setSelectedRepo(repo);
    saveToStorage(STORAGE_KEYS.SELECTED_REPO, repo);
  }, []);

  return {
    repositories,
    selectedRepo,
    setSelectedRepo: handleRepoChange,
    reposLoading,
    error,
  };
}
