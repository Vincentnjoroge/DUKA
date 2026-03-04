import { useState, useCallback } from 'react';

/**
 * Hook for pull-to-refresh and manual refresh patterns.
 * Returns refreshing state and onRefresh handler.
 */
export function useRefresh(loadFn: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFn();
    } finally {
      setRefreshing(false);
    }
  }, [loadFn]);

  return { refreshing, onRefresh };
}
