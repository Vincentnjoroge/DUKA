import { useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
  channelName?: string;
}

/**
 * Hook for subscribing to Supabase Realtime changes on a table.
 * Auto-cleans up the subscription on unmount.
 */
export function useSupabaseRealtime(
  options: RealtimeOptions,
  callback: (payload: any) => void,
  enabled = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const { table, event = '*', filter, schema = 'public', channelName } = options;
    const name = channelName || `${table}-${Date.now()}`;

    const channel = supabase
      .channel(name)
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        callback
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [options.table, options.event, options.filter, enabled]);
}
