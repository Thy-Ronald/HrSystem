/**
 * useRepositories Hook
 * Manages repository list loading and selection using React Query
 * 
 * Only displays timeriver/cnd_chat and timeriver/sacsys009 to reduce API calls
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRepositories } from '../../../services/api';

export function useRepositories() {
  const [selectedRepo, setSelectedRepo] = useState('');

  // Fetch repositories with React Query
  const { data: repositories = [], isLoading: reposLoading, error } = useQuery({
    queryKey: ['repositories'],
    queryFn: fetchRepositories,
    staleTime: 10 * 60 * 1000, // 10 minutes (repos don't change often)
  });



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

