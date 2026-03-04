// DUKA POS - Offline Queue Service
// Handles offline cash sales and syncs when connectivity restored

import { createMMKV } from 'react-native-mmkv';
import { supabase } from '../config/supabase';
import { OFFLINE_QUEUE_KEY, PRODUCT_CACHE_KEY } from '../constants';
import type { Product } from '../types';

const storage = createMMKV({ id: 'duka-offline' });

export interface OfflineOperation {
  id: string;
  type: 'sale';
  payload: any;
  createdAt: string;
  synced: boolean;
}

// ---- Product Cache ----
export const cacheProducts = async (): Promise<void> => {
  try {
    const { data } = await supabase
      .from('products')
      .select('id, name, sku, barcode, selling_price, current_stock, category_id, image_url, expiry_date')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name');

    if (data) {
      storage.set(PRODUCT_CACHE_KEY, JSON.stringify(data));
    }
  } catch {
    // Silent fail - cache may be stale but won't break
  }
};

export const getCachedProducts = (): Product[] => {
  const cached = storage.getString(PRODUCT_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }
  return [];
};

// ---- Offline Queue ----
export const getOfflineQueue = (): OfflineOperation[] => {
  const queue = storage.getString(OFFLINE_QUEUE_KEY);
  if (queue) {
    try {
      return JSON.parse(queue);
    } catch {
      return [];
    }
  }
  return [];
};

const saveQueue = (queue: OfflineOperation[]): void => {
  storage.set(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const enqueueOfflineSale = (salePayload: any): void => {
  const queue = getOfflineQueue();
  const op: OfflineOperation = {
    id: salePayload.id || `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'sale',
    payload: salePayload,
    createdAt: new Date().toISOString(),
    synced: false,
  };
  queue.push(op);
  saveQueue(queue);
};

export const syncOfflineQueue = async (): Promise<{ synced: number; failed: number }> => {
  const queue = getOfflineQueue();
  const pending = queue.filter(op => !op.synced);

  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const op of pending) {
    try {
      if (op.type === 'sale') {
        const { payload } = op;

        // Use the client-generated UUID to ensure idempotency
        const { data: existingSale } = await supabase
          .from('sales')
          .select('id')
          .eq('id', payload.id)
          .maybeSingle();

        if (existingSale) {
          // Already synced (idempotent check)
          op.synced = true;
          synced++;
          continue;
        }

        // Insert sale
        const { error: saleError } = await supabase
          .from('sales')
          .insert({
            id: payload.id,
            shift_id: payload.shift_id,
            cashier_id: payload.cashier_id,
            subtotal: payload.subtotal,
            discount_amount: payload.discount_amount,
            total_amount: payload.total_amount,
            payment_method: payload.payment_method,
            payment_status: 'completed',
            status: 'completed',
            synced: true,
          });

        if (saleError) {
          failed++;
          continue;
        }

        // Insert sale items
        if (payload.items && payload.items.length > 0) {
          const itemRows = payload.items.map((item: any) => ({
            sale_id: payload.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount_amount || 0,
            line_total: item.line_total,
          }));

          await supabase.from('sale_items').insert(itemRows);
        }

        op.synced = true;
        synced++;
      }
    } catch {
      failed++;
    }
  }

  // Save updated queue (remove synced items)
  const remaining = queue.filter(op => !op.synced);
  saveQueue(remaining);

  return { synced, failed };
};

export const getOfflineQueueSize = (): number => {
  return getOfflineQueue().filter(op => !op.synced).length;
};

export const clearOfflineQueue = (): void => {
  storage.remove(OFFLINE_QUEUE_KEY);
};
