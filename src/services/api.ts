// ============================================================
// DUKA POS - Supabase API Service Layer
// ============================================================
// Provides typed, reusable data access functions for all screens.

import { supabase } from '../config/supabase';
import type {
  Product, Sale, Shift, StockMovement, Supplier,
  PurchaseOrder, ShiftStockCount, Category, AppSettings,
} from '../types';

// --- Products ---

export async function fetchProducts(options?: {
  activeOnly?: boolean;
  categoryId?: string;
  search?: string;
  limit?: number;
}) {
  let query = supabase.from('products').select('*, category:categories(name), supplier:suppliers(name)');

  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true).is('deleted_at', null);
  }
  if (options?.categoryId) {
    query = query.eq('category_id', options.categoryId);
  }
  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`);
  }
  query = query.order('name').limit(options?.limit || 200);

  const { data, error } = await query;
  return { data: (data as Product[]) || [], error };
}

export async function fetchProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name), supplier:suppliers(name)')
    .eq('id', id)
    .single();
  return { data: data as Product | null, error };
}

export async function upsertProduct(product: Partial<Product>) {
  if (product.id) {
    return supabase.from('products').update(product).eq('id', product.id).select().single();
  }
  return supabase.from('products').insert(product).select().single();
}

// --- Categories ---

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  return { data: (data as Category[]) || [], error };
}

// --- Sales ---

export async function fetchSales(options?: {
  shiftId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  limit?: number;
}) {
  let query = supabase.from('sales').select('*, items:sale_items(*), cashier:users!cashier_id(full_name)');

  if (options?.shiftId) query = query.eq('shift_id', options.shiftId);
  if (options?.dateFrom) query = query.gte('created_at', options.dateFrom);
  if (options?.dateTo) query = query.lte('created_at', options.dateTo);
  if (options?.status) query = query.eq('status', options.status);

  query = query.order('created_at', { ascending: false }).limit(options?.limit || 100);
  const { data, error } = await query;
  return { data: (data as Sale[]) || [], error };
}

export async function fetchSale(id: string) {
  const { data, error } = await supabase
    .from('sales')
    .select('*, items:sale_items(*, product:products(name)), cashier:users!cashier_id(full_name)')
    .eq('id', id)
    .single();
  return { data: data as Sale | null, error };
}

// --- Shifts ---

export async function fetchShifts(options?: {
  status?: string | string[];
  cashierId?: string;
  limit?: number;
}) {
  let query = supabase.from('shifts').select('*, cashier:users!cashier_id(full_name)');

  if (options?.status) {
    if (Array.isArray(options.status)) {
      query = query.in('status', options.status);
    } else {
      query = query.eq('status', options.status);
    }
  }
  if (options?.cashierId) query = query.eq('cashier_id', options.cashierId);

  query = query.order('created_at', { ascending: false }).limit(options?.limit || 50);
  const { data, error } = await query;
  return { data: (data as Shift[]) || [], error };
}

export async function updateShift(id: string, updates: Partial<Shift>) {
  return supabase.from('shifts').update(updates).eq('id', id).select().single();
}

// --- Stock Counts ---

export async function fetchShiftStockCounts(shiftId: string, countType: 'opening' | 'closing') {
  const { data, error } = await supabase
    .from('shift_stock_counts')
    .select('*, product:products(name, current_stock)')
    .eq('shift_id', shiftId)
    .eq('count_type', countType);
  return { data: (data as ShiftStockCount[]) || [], error };
}

// --- Stock Movements ---

export async function fetchStockMovements(options?: {
  productId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  let query = supabase.from('stock_movements').select('*, product:products(name), performer:users!performed_by(full_name)');

  if (options?.productId) query = query.eq('product_id', options.productId);
  if (options?.type) query = query.eq('movement_type', options.type);
  if (options?.dateFrom) query = query.gte('created_at', options.dateFrom);
  if (options?.dateTo) query = query.lte('created_at', options.dateTo);

  query = query.order('created_at', { ascending: false }).limit(options?.limit || 100);
  const { data, error } = await query;
  return { data: (data as StockMovement[]) || [], error };
}

// --- Suppliers ---

export async function fetchSuppliers(activeOnly = true) {
  let query = supabase.from('suppliers').select('*').order('name');
  if (activeOnly) query = query.eq('is_active', true).is('deleted_at', null);
  const { data, error } = await query;
  return { data: (data as Supplier[]) || [], error };
}

export async function upsertSupplier(supplier: Partial<Supplier>) {
  if (supplier.id) {
    return supabase.from('suppliers').update(supplier).eq('id', supplier.id).select().single();
  }
  return supabase.from('suppliers').insert(supplier).select().single();
}

// --- Purchase Orders ---

export async function fetchPurchaseOrders(options?: { status?: string; limit?: number }) {
  let query = supabase.from('purchase_orders').select('*, supplier:suppliers(name), items:purchase_order_items(*, product:products(name))');

  if (options?.status) query = query.eq('status', options.status);
  query = query.order('created_at', { ascending: false }).limit(options?.limit || 50);

  const { data, error } = await query;
  return { data: (data as PurchaseOrder[]) || [], error };
}

// --- Settings ---

export async function fetchSettings() {
  const { data, error } = await supabase.from('app_settings').select('*');
  const settings: Record<string, string> = {};
  if (data) data.forEach((s: AppSettings) => { settings[s.key] = s.value; });
  return { data: settings, error };
}

export async function updateSetting(key: string, value: string) {
  return supabase.from('app_settings').update({ value }).eq('key', key);
}

// --- Audit Log ---

export async function createAuditLog(entry: {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
}) {
  return supabase.from('audit_log').insert(entry);
}

// --- Reports ---

export async function fetchDailySalesStats(dateFrom: string, dateTo: string) {
  const { data, error } = await supabase
    .from('sales')
    .select('total_amount, payment_method, created_at, items:sale_items(quantity)')
    .eq('status', 'completed')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo);
  return { data: data || [], error };
}

export async function fetchLowStockProducts(threshold?: number) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, current_stock, reorder_level')
    .eq('is_active', true)
    .is('deleted_at', null)
    .lte('current_stock', threshold || 10)
    .order('current_stock');
  return { data: data || [], error };
}

export async function fetchExpiringProducts(daysAhead = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysAhead);
  const { data, error } = await supabase
    .from('products')
    .select('id, name, expiry_date, current_stock')
    .eq('is_active', true)
    .is('deleted_at', null)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', threshold.toISOString().split('T')[0])
    .order('expiry_date');
  return { data: data || [], error };
}
