import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client Configuration
 * 
 * Optimized defaults for the HR System:
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes
 * - cacheTime: 30 minutes - Keep unused data in cache for 30 minutes
 * - refetchOnWindowFocus: true - Refetch when user returns to tab
 * - retry: 1 - Retry failed requests once
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 30 * 60 * 1000, // 30 minutes
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
            // Don't refetch on mount if data is still fresh
            refetchOnMount: false,
        },
        mutations: {
            retry: 1,
        },
    },
});
