import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import { format } from 'date-fns';

export default function DailySalesReport() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [metrics, setMetrics] = useState({ revenue: 0, cash: 0, mpesa: 0, sales: 0, items: 0, avg: 0 });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [shiftInfo, setShiftInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadReport(); }, []);

  const loadReport = async () => {
    setLoading(true);
    const start = `${date}T00:00:00.000Z`, end = `${date}T23:59:59.999Z`;

    const [salesRes, itemsRes, shiftRes] = await Promise.all([
      supabase.from('sales').select('total_amount, payment_method').eq('status', 'completed').gte('created_at', start).lte('created_at', end),
      supabase.from('sale_items').select('product_name, quantity, line_total').gte('created_at', start).lte('created_at', end),
      supabase.from('shifts').select('*, cashier:users!cashier_id(full_name)').gte('created_at', start).lte('created_at', end).limit(3),
    ]);

    const sales = salesRes.data || [];
    const revenue = sales.reduce((s, r) => s + Number(r.total_amount), 0);
    const cashRev = sales.filter(s => s.payment_method === 'cash').reduce((s, r) => s + Number(r.total_amount), 0);
    const allItems = itemsRes.data || [];
    const totalItems = allItems.reduce((s, r) => s + r.quantity, 0);

    setMetrics({ revenue, cash: cashRev, mpesa: revenue - cashRev, sales: sales.length, items: totalItems, avg: sales.length > 0 ? revenue / sales.length : 0 });

    // Top products
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
    allItems.forEach(i => {
      const e = productMap.get(i.product_name) || { name: i.product_name, qty: 0, revenue: 0 };
      e.qty += i.quantity; e.revenue += Number(i.line_total);
      productMap.set(i.product_name, e);
    });
    setTopProducts(Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 10));
    setShiftInfo((shiftRes.data || [])[0]);
    setLoading(false);
  };

  const MetricCard = ({ label, value, color = COLORS.text }: any) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg }}>
      <View style={styles.dateRow}>
        <TextInput style={styles.dateInput} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <TouchableOpacity style={styles.goBtn} onPress={loadReport}><Text style={styles.goBtnText}>Load</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <>
          <View style={styles.metricsGrid}>
            <MetricCard label="Revenue" value={`${CURRENCY_SYMBOL} ${metrics.revenue.toLocaleString()}`} color={COLORS.primary} />
            <MetricCard label="Cash" value={`${CURRENCY_SYMBOL} ${metrics.cash.toLocaleString()}`} color={COLORS.cash} />
            <MetricCard label="M-Pesa" value={`${CURRENCY_SYMBOL} ${metrics.mpesa.toLocaleString()}`} color={COLORS.mpesa} />
            <MetricCard label="Sales" value={metrics.sales.toString()} />
            <MetricCard label="Items Sold" value={metrics.items.toString()} />
            <MetricCard label="Avg Sale" value={`${CURRENCY_SYMBOL} ${Math.round(metrics.avg).toLocaleString()}`} />
          </View>

          <Text style={styles.sectionTitle}>Top 10 Products</Text>
          {topProducts.map((p, i) => (
            <View key={p.name} style={styles.topRow}>
              <Text style={styles.topRank}>{i + 1}</Text>
              <Text style={styles.topName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.topQty}>{p.qty} units</Text>
              <Text style={styles.topRev}>{CURRENCY_SYMBOL} {p.revenue.toLocaleString()}</Text>
            </View>
          ))}

          {shiftInfo && (
            <View style={styles.shiftCard}>
              <Text style={styles.sectionTitle}>Shift</Text>
              <Text style={styles.shiftText}>{shiftInfo.cashier?.full_name} • {shiftInfo.status}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dateInput: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  goBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  goBtnText: { color: '#fff', fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  metricCard: { width: '31%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12 },
  metricLabel: { fontSize: 11, color: COLORS.textSecondary },
  metricValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginTop: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 10, borderRadius: 8, marginBottom: 4, gap: 8 },
  topRank: { width: 24, fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  topName: { flex: 1, fontSize: 13, color: COLORS.text },
  topQty: { fontSize: 12, color: COLORS.textSecondary },
  topRev: { fontSize: 13, fontWeight: '600', color: COLORS.primary, minWidth: 70, textAlign: 'right' },
  shiftCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginTop: 12 },
  shiftText: { fontSize: 14, color: COLORS.textSecondary },
});
