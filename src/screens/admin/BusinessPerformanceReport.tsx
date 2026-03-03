import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import { format, subDays, subWeeks, startOfWeek, startOfMonth, eachDayOfInterval } from 'date-fns';

type Period = 'weekly' | 'monthly';

export default function BusinessPerformanceReport() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [loading, setLoading] = useState(false);
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; revenue: number }[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);
  const [stockValue, setStockValue] = useState(0);

  useEffect(() => { load(); }, [period]);

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const days = period === 'weekly' ? 7 : 30;
    const currentStart = format(subDays(now, days), 'yyyy-MM-dd');
    const previousStart = format(subDays(now, days * 2), 'yyyy-MM-dd');
    const previousEnd = format(subDays(now, days), 'yyyy-MM-dd');

    const [currentRes, prevRes, catRes, stockRes] = await Promise.all([
      supabase.from('sales').select('total_amount, created_at').eq('status', 'completed').gte('created_at', `${currentStart}T00:00:00Z`),
      supabase.from('sales').select('total_amount').eq('status', 'completed').gte('created_at', `${previousStart}T00:00:00Z`).lt('created_at', `${previousEnd}T00:00:00Z`),
      supabase.from('sale_items').select('product:products!product_id(category:categories!category_id(name)), line_total').gte('created_at', `${currentStart}T00:00:00Z`),
      supabase.from('products').select('current_stock, buying_price').eq('is_active', true).is('deleted_at', null),
    ]);

    const curSales = currentRes.data || [];
    const curTotal = curSales.reduce((s, r) => s + Number(r.total_amount), 0);
    const prevTotal = (prevRes.data || []).reduce((s: number, r: any) => s + Number(r.total_amount), 0);
    setCurrentTotal(curTotal);
    setPreviousTotal(prevTotal);

    // Daily breakdown
    const dateMap = new Map<string, number>();
    curSales.forEach(s => {
      const d = format(new Date(s.created_at), 'MMM dd');
      dateMap.set(d, (dateMap.get(d) || 0) + Number(s.total_amount));
    });
    setDailyRevenue(Array.from(dateMap.entries()).map(([date, revenue]) => ({ date, revenue })));

    // Category breakdown
    const catMap = new Map<string, number>();
    (catRes.data || []).forEach((i: any) => {
      const name = i.product?.category?.name || 'Other';
      catMap.set(name, (catMap.get(name) || 0) + Number(i.line_total));
    });
    setTopCategories(Array.from(catMap.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue));

    // Stock value
    const sv = (stockRes.data || []).reduce((s: number, p: any) => s + p.current_stock * Number(p.buying_price), 0);
    setStockValue(sv);

    setLoading(false);
  };

  const changePct = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1) : '—';
  const maxRev = Math.max(...dailyRevenue.map(d => d.revenue), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg }}>
      <View style={styles.toggleRow}>
        {(['weekly', 'monthly'] as Period[]).map(p => (
          <TouchableOpacity key={p} style={[styles.toggle, period === p && styles.toggleActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.toggleText, period === p && styles.toggleTextActive]}>{p === 'weekly' ? 'Weekly' : 'Monthly'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.summaryLabel}>This {period === 'weekly' ? 'Week' : 'Month'}</Text>
              <Text style={styles.summaryValue}>{CURRENCY_SYMBOL} {currentTotal.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: COLORS.info }]}>
              <Text style={styles.summaryLabel}>Previous</Text>
              <Text style={styles.summaryValue}>{CURRENCY_SYMBOL} {previousTotal.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: Number(changePct) >= 0 ? COLORS.success : COLORS.error }]}>
              <Text style={styles.summaryLabel}>Change</Text>
              <Text style={styles.summaryValue}>{changePct}%</Text>
            </View>
          </View>

          {/* Simple bar chart */}
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          <View style={styles.chartContainer}>
            {dailyRevenue.slice(-7).map(d => (
              <View key={d.date} style={styles.barCol}>
                <View style={[styles.bar, { height: Math.max(4, (d.revenue / maxRev) * 100) }]} />
                <Text style={styles.barLabel}>{d.date.split(' ')[1]}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Top Categories</Text>
          {topCategories.map((c, i) => (
            <View key={c.name} style={styles.catRow}>
              <Text style={styles.catRank}>{i + 1}</Text>
              <Text style={styles.catName}>{c.name}</Text>
              <Text style={styles.catRev}>{CURRENCY_SYMBOL} {c.revenue.toLocaleString()}</Text>
            </View>
          ))}

          <View style={[styles.stockValueCard]}>
            <Text style={styles.stockLabel}>Total Stock Value</Text>
            <Text style={styles.stockValue}>{CURRENCY_SYMBOL} {stockValue.toLocaleString()}</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  toggleRow: { flexDirection: 'row', marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 12, overflow: 'hidden' },
  toggle: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive: { color: '#fff' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 14 },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10, marginTop: 8 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 20 },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 20, backgroundColor: COLORS.primary, borderRadius: 4 },
  barLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderRadius: 10, marginBottom: 4, gap: 10 },
  catRank: { width: 24, fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  catName: { flex: 1, fontSize: 14, color: COLORS.text },
  catRev: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  stockValueCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 20, marginTop: 20, alignItems: 'center' },
  stockLabel: { fontSize: 14, color: COLORS.textSecondary },
  stockValue: { fontSize: 28, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
});
