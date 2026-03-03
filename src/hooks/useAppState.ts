// DUKA POS - App State Hook
// Handles background/foreground transitions for PIN lock and offline sync

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { syncOfflineQueue, cacheProducts } from '../services/offlineService';
import { SESSION_TIMEOUT_MS } from '../constants';

export function useAppState() {
  const { isAuthenticated, lockScreen } = useAuthStore();
  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextAppState.match(/background|inactive/)) {
        // App going to background
        backgroundTimestamp.current = Date.now();
      }

      if (appState.current.match(/background|inactive/) && nextAppState === 'active') {
        // App coming to foreground
        if (isAuthenticated && backgroundTimestamp.current) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          if (elapsed >= SESSION_TIMEOUT_MS) {
            lockScreen();
          }
        }

        // Sync offline queue when coming back online
        syncOfflineQueue().catch(() => {});

        // Refresh product cache
        if (isAuthenticated) {
          cacheProducts().catch(() => {});
        }
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isAuthenticated, lockScreen]);
}
