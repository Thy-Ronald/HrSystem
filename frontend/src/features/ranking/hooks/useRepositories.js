/**
 * useRepositories Hook
 * Manages repository list loading and selection
 * 
 * Only displays timeriver/cnd_chat and timeriver/sacsys009 to reduce API calls
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchRepositories } from '../../../services/api';

// Allowed repositories - only these will be displayed
const ALLOWED_REPOS = ['timeriver/cnd_chat', 'timeriver/sacsys009'];

export function useRepositories() {
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [reposLoading, setReposLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Load repositories from API
   * Filters to only show allowed repositories
   */
  useEffect(() => {
    let mounted = true;

    const loadRepos = async () => {
      setReposLoading(true);
      try {
        const allRepos = await fetchRepositories();
        if (mounted) {
          // Filter to only show allowed repositories
          const filteredRepos = allRepos.filter(repo => 
            ALLOWED_REPOS.includes(repo.fullName)
          );
          
          setRepositories(filteredRepos);
          // Auto-select first repo if none selected
          if (filteredRepos.length > 0 && !selectedRepo) {
            const firstRepo = filteredRepos[0].fullName;
            setSelectedRepo(firstRepo);
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
  }, []);

  return {
    repositories,
    selectedRepo,
    setSelectedRepo: handleRepoChange,
    reposLoading,
    error,
  };
}
