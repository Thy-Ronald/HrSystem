import { useState, useEffect, useCallback } from 'react';
import { fetchContracts, deleteContract } from '../../../services/api';

/**
 * Custom hook for managing contracts data
 * Handles loading, error states, and CRUD operations
 */
export function useContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchContracts();
      setContracts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading contracts:', err);
      setContracts([]);
      setError(err.message || 'Unable to load contracts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const removeContract = useCallback(async (contractId) => {
    try {
      await deleteContract(contractId);
      // Optimistically update the list
      setContracts(prev => prev.filter(c => c.id !== contractId));
      return true;
    } catch (err) {
      console.error('Error deleting contract:', err);
      // Reload to ensure consistency
      await loadContracts();
      throw err;
    }
  }, [loadContracts]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  return {
    contracts,
    loading,
    error,
    refresh: loadContracts,
    remove: removeContract,
  };
}
