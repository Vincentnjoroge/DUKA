// ============================================================
// DUKA POS - Cross-platform Storage
// Uses MMKV on native, localStorage on web
// ============================================================

import { Platform } from 'react-native';

export interface StorageAdapter {
  getString(key: string): string | undefined;
  set(key: string, value: string | number | boolean): void;
  remove(key: string): boolean;
  contains(key: string): boolean;
  clearAll(): void;
}

function createWebStorage(): StorageAdapter {
  return {
    getString: (key: string) => {
      try { return localStorage.getItem(key) ?? undefined; } catch { return undefined; }
    },
    set: (key: string, value: string | number | boolean) => {
      try { localStorage.setItem(key, String(value)); } catch {}
    },
    remove: (key: string) => {
      try { localStorage.removeItem(key); return true; } catch { return false; }
    },
    contains: (key: string) => {
      try { return localStorage.getItem(key) !== null; } catch { return false; }
    },
    clearAll: () => {
      try { localStorage.clear(); } catch {}
    },
  };
}

function createNativeStorage(id: string): StorageAdapter {
  const { createMMKV } = require('react-native-mmkv');
  return createMMKV({ id });
}

/**
 * Create a cross-platform storage instance.
 * Uses MMKV on native platforms, localStorage on web.
 */
export function createStorage(id: string): StorageAdapter {
  if (Platform.OS === 'web') {
    return createWebStorage();
  }
  return createNativeStorage(id);
}
