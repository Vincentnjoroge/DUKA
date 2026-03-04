import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Flag indicating if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// MMKV storage adapter for Supabase Auth persistence
// Only use MMKV on native platforms; fall back to localStorage on web
let storageAdapter: {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

if (Platform.OS === 'web') {
  // Web fallback using localStorage
  storageAdapter = {
    getItem: (key: string) => {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    setItem: (key: string, value: string) => {
      try { localStorage.setItem(key, value); } catch {}
    },
    removeItem: (key: string) => {
      try { localStorage.removeItem(key); } catch {}
    },
  };
} else {
  // Native: use MMKV for performance
  // Lazy-require to avoid crash on web
  const { createMMKV } = require('react-native-mmkv');
  const storage = createMMKV({ id: 'supabase-auth' });
  storageAdapter = {
    getItem: (key: string) => storage.getString(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.remove(key),
  };
}

// Create Supabase client with a placeholder URL if not configured
// The app will show a "not configured" state in the UI
const placeholderUrl = 'https://placeholder.supabase.co';
const placeholderKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.placeholder';

export const supabase: SupabaseClient = createClient(
  supabaseUrl || placeholderUrl,
  supabaseAnonKey || placeholderKey,
  {
    auth: {
      storage: storageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export default supabase;
