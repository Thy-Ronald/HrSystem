/**
 * useRepositories Hook
 * Manages repository list loading and selection using React Query
 * 
 * Only displays timeriver/cnd_chat and timeriver/sacsys009 to reduce API calls
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRepositories } from '../../../services/api';

// Allowed repositories - only these will be displayed
const ALLOWED_REPOS = ['timeriver/cnd_chat', 'timeriver/sacsys009'];

export function useRepositories() {
  const [selectedRepo, setSelectedRepo] = useState('');

  // Fetch repositories with React Query
  const { data: allRepos = [], isLoading: reposLoading, error } = useQuery({
    queryKey: ['repositories'],
    queryFn: fetchRepositories,
    staleTime: 10 * 60 * 1000, // 10 minutes (repos don't change often)
  });

  // Filter to only show allowed repositories
  const repositories = allRepos.filter(repo =>
    ALLOWED_REPOS.includes(repo.fullName)
  );

  // Auto-select first repo if none selected
  useEffect(() => {
    if (repositories.length > 0 && !selectedRepo) {
      const firstRepo = repositories[0].fullName;
      setSelectedRepo(firstRepo);
    }
  }, [repositories, selectedRepo]);

  return {
    repositories,
    selectedRepo,
    setSelectedRepo,
    reposLoading,
    error: error?.message || '',
  };
}

