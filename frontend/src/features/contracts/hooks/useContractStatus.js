import { useState, useEffect, useCallback } from 'react';
import { getContractStatus } from '../utils/contractHelpers';

/**
 * Custom hook for real-time contract status updates
 * Updates every minute to recalculate status labels
 */
export function useContractStatus() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const getStatus = useCallback((contract) => {
    return getContractStatus(contract, currentTime);
  }, [currentTime]);

  return { currentTime, getStatus };
}
