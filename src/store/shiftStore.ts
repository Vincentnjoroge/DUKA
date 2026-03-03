import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { Shift, ShiftStockCount, StockCountEntry } from '../types';

interface ShiftState {
  currentShift: Shift | null;
  isLoading: boolean;

  // Actions
  fetchCurrentShift: (cashierId: string) => Promise<void>;
  openShift: (
    cashierId: string,
    openingCash: number,
    stockCounts: StockCountEntry[]
  ) => Promise<{ error: string | null; shiftId: string | null }>;
  closeShift: (
    closingCash: number,
    stockCounts: StockCountEntry[]
  ) => Promise<{ error: string | null }>;
  subscribeToShiftUpdates: (shiftId: string) => () => void;
  setCurrentShift: (shift: Shift | null) => void;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentShift: null,
  isLoading: false,

  fetchCurrentShift: async (cashierId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*, cashier:users!cashier_id(*), approver:users!approved_by(*)')
        .eq('cashier_id', cashierId)
        .in('status', ['pending_open', 'open', 'pending_close'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        set({ isLoading: false });
        return;
      }

      set({ currentShift: data as Shift | null, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  openShift: async (cashierId, openingCash, stockCounts) => {
    set({ isLoading: true });
    try {
      // Create shift
      const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          cashier_id: cashierId,
          status: 'pending_open',
          opening_cash: openingCash,
        })
        .select()
        .single();

      if (shiftError || !shift) {
        set({ isLoading: false });
        return { error: shiftError?.message || 'Failed to create shift.', shiftId: null };
      }

      // Insert opening stock counts
      const countRows = stockCounts.map((sc) => ({
        shift_id: shift.id,
        product_id: sc.product_id,
        count_type: 'opening' as const,
        system_quantity: sc.system_quantity,
        counted_quantity: sc.counted_quantity ?? 0,
      }));

      const { error: countError } = await supabase
        .from('shift_stock_counts')
        .insert(countRows);

      if (countError) {
        set({ isLoading: false });
        return { error: 'Shift created but stock counts failed: ' + countError.message, shiftId: shift.id };
      }

      set({ currentShift: shift as Shift, isLoading: false });
      return { error: null, shiftId: shift.id };
    } catch {
      set({ isLoading: false });
      return { error: 'Unexpected error opening shift.', shiftId: null };
    }
  },

  closeShift: async (closingCash, stockCounts) => {
    const shift = get().currentShift;
    if (!shift) return { error: 'No active shift.' };

    set({ isLoading: true });
    try {
      // Insert closing stock counts
      const countRows = stockCounts.map((sc) => ({
        shift_id: shift.id,
        product_id: sc.product_id,
        count_type: 'closing' as const,
        system_quantity: sc.system_quantity,
        counted_quantity: sc.counted_quantity ?? 0,
      }));

      const { error: countError } = await supabase
        .from('shift_stock_counts')
        .insert(countRows);

      if (countError) {
        set({ isLoading: false });
        return { error: 'Stock count submission failed: ' + countError.message };
      }

      // Update shift to pending_close
      const { data, error } = await supabase
        .from('shifts')
        .update({
          status: 'pending_close',
          closing_cash: closingCash,
        })
        .eq('id', shift.id)
        .select()
        .single();

      if (error) {
        set({ isLoading: false });
        return { error: error.message };
      }

      set({ currentShift: data as Shift, isLoading: false });
      return { error: null };
    } catch {
      set({ isLoading: false });
      return { error: 'Unexpected error closing shift.' };
    }
  },

  subscribeToShiftUpdates: (shiftId: string) => {
    const channel = supabase
      .channel(`shift-${shiftId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shifts',
          filter: `id=eq.${shiftId}`,
        },
        (payload) => {
          const updated = payload.new as Shift;
          set({ currentShift: updated });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  setCurrentShift: (shift) => set({ currentShift: shift }),
}));
