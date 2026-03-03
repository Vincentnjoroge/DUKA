import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import { format, subDays, differenceInHours } from 'date-fns';

export default function CashierPerformanceReport() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const start = `${startDate}T00:00:00Z`, end = `${endDate}T23:59:59Z`;
    const { data: shifts } = await supabase.from('shifts').select('*, cashier:users!cashier_id(full_name), sales:sales(total_amount, status)')
      .gte('created_at', start).lte('created_at', end).eq('status', 'closed');

    const map = new Map<string, any>();
    (shifts || []).forEach((s: any) => {
      const key = s.cashier_id;
      const e = map.get(key) || { name: s.cashier?.full_name, shifts: 0, hours: 0, sales: 0, revenue: 0, cashDisc: 0, stockDisc: 0 };
      e.shifts++;
      if (s.opened_at && s.closed_at) e.hours += differenceInHours(new Date(s.closed_at), new Date(s.opened_at));
      const completedSales = (s.sales || []).filter((sl: any) => sl.status === 'completed');
      e.sales += completedSales.length;
      e.revenue += completedSales.reduce((sum: number, sl: any) => sum + Number(sl.total_amount), 0);
      if (s.cash_discrepancy) e.cashDisc += Math.abs(Number(s.cash_discrepancy));
      map.set(key, e);
    });
    setData(Array.from(map.values()).sort((a, b) => b.revenue - a.revenue));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg }}>
      <View style={styles.dateRow}>
        <TextInput style={styles.dateInput} value={startDate} onChangeText={setStartDate} />
        <TextInput style={styles.dateInput} value={endDate} onChangeText={setEndDate} />
        <TouchableOpacity style={styles.goBtn} onPress={load}><Text style={styles.goBtnText}>Go</Text></TouchableOpacity>
      </View>

      {data.map((c, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardName}>{c.name}</Text>
          <View style={styles.statsGrid}>
            {[['Shifts', c.shifts], ['Hours', c.hours], ['Sales', c.sales],
              ['Revenue', `${CURRENCY_SYMBOL} ${c.revenue.toLocaleString()}`],
              ['Avg Sale', `${CURRENCY_SYMBOL} ${c.sales > 0 ? Math.round(c.revenue / c.sales).toLocaleString() : 0}`],
              ['Cash Disc.', `${CURRENCY_SYMBOL} ${c.cashDisc.toLocaleString()}`],
            ].map(([label, value]) => (
              <View key={label as string} style={styles.statItem}>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={[styles.statValue, label === 'Cash Disc.' && c.cashDisc > 0 ? { color: COLORS.error } : {}]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      {data.length === 0 && <Text style={styles.emptyText}>No closed shifts in this period</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dateInput: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  goBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  goBtnText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  statItem: { width: '33.33%', paddingVertical: 6 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  statValue: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
});
