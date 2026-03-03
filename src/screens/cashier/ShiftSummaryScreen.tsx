import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../config/supabase';
import { useShiftStore } from '../../store/shiftStore';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import { format } from 'date-fns';
import type { Sale } from '../../types';

export default function ShiftSummaryScreen() {
  const { currentShift } = useShiftStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentShift) loadSales();
  }, [currentShift]);

  const loadSales = async () => {
    const { data } = await supabase
      .from('sales')
      .select('*, items:sale_items(count)')
      .eq('shift_id', currentShift!.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    setSales((data as Sale[]) || []);
    setLoading(false);
  };

  const totalRevenue = sales.reduce((s, sale) => s + Number(sale.total_amount), 0);
  const cashSales = sales.filter(s => s.payment_method === 'cash');
  const mpesaSales = sales.filter(s => s.payment_method !== 'cash');
  const cashTotal = cashSales.reduce((s, sale) => s + Number(sale.total_amount), 0);
  const mpesaTotal = mpesaSales.reduce((s, sale) => s + Number(sale.total_amount), 0);

  const renderSale = ({ item }: { item: Sale }) => (
    <View style={styles.saleRow}>
      <View style={styles.saleLeft}>
        <Text style={styles.saleReceipt}>{item.receipt_number}</Text>
        <Text style={styles.saleTime}>{format(new Date(item.created_at), 'HH:mm')}</Text>
      </View>
      <View style={[styles.methodBadge, item.payment_method === 'cash' ? styles.cashBadge : styles.mpesaBadge]}>
        <Text style={styles.methodText}>{item.payment_method === 'cash' ? 'Cash' : 'M-Pesa'}</Text>
      </View>
      <Text style={styles.saleAmount}>{CURRENCY_SYMBOL} {Number(item.total_amount).toLocaleString()}</Text>
    </View>
  );

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.cardsRow}>
        <View style={[styles.card, { backgroundColor: COLORS.primary }]}>
          <Text style={styles.cardLabel}>Revenue</Text>
          <Text style={styles.cardValue}>{CURRENCY_SYMBOL} {totalRevenue.toLocaleString()}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: COLORS.info }]}>
          <Text style={styles.cardLabel}>Sales</Text>
          <Text style={styles.cardValue}>{sales.length}</Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={[styles.card, { backgroundColor: COLORS.cash }]}>
          <Text style={styles.cardLabel}>Cash</Text>
          <Text style={styles.cardValue}>{CURRENCY_SYMBOL} {cashTotal.toLocaleString()}</Text>
          <Text style={styles.cardSub}>{cashSales.length} sales</Text>
        </View>
        <View style={[styles.card, { backgroundColor: COLORS.mpesa }]}>
          <Text style={styles.cardLabel}>M-Pesa</Text>
          <Text style={styles.cardValue}>{CURRENCY_SYMBOL} {mpesaTotal.toLocaleString()}</Text>
          <Text style={styles.cardSub}>{mpesaSales.length} sales</Text>
        </View>
      </View>

      {/* Transaction List */}
      <Text style={styles.sectionTitle}>Transactions</Text>
      <FlatList
        data={sales}
        keyExtractor={s => s.id}
        renderItem={renderSale}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No sales yet this shift</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  card: { flex: 1, borderRadius: 12, padding: 16 },
  cardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 4 },
  cardSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  saleRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, marginBottom: 6,
  },
  saleLeft: { flex: 1 },
  saleReceipt: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  saleTime: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 12 },
  cashBadge: { backgroundColor: COLORS.successLight },
  mpesaBadge: { backgroundColor: '#E8F5E9' },
  methodText: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  saleAmount: { fontSize: 14, fontWeight: '700', color: COLORS.text, minWidth: 80, textAlign: 'right' },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 14 },
});
