import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import { format, subDays } from 'date-fns';

interface PLRow {
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
}

export default function ProfitLossReport() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<PLRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({ revenue: 0, cogs: 0, profit: 0 });

  useEffect(() => { loadReport(); }, []);

  const loadReport = async () => {
    setLoading(true);
    const startISO = `${startDate}T00:00:00.000Z`;
    const endISO = `${endDate}T23:59:59.999Z`;

    // Get completed sale items with product buying prices
    const { data: items } = await supabase
      .from('sale_items')
      .select(`
        product_id, product_name, quantity, unit_price, line_total,
        product:products!product_id(buying_price),
        sale:sales!sale_id(status, created_at)
      `)
      .gte('created_at', startISO)
      .lte('created_at', endISO);

    if (!items) { setLoading(false); return; }

    // Filter completed sales and aggregate by product
    const map = new Map<string, PLRow>();
    for (const item of items as any[]) {
      if (item.sale?.status !== 'completed') continue;
      const buyPrice = item.product?.buying_price || 0;
      const existing = map.get(item.product_id);
      const revenue = Number(item.line_total);
      const cogs = Number(buyPrice) * item.quantity;

      if (existing) {
        existing.units_sold += item.quantity;
        existing.revenue += revenue;
        existing.cogs += cogs;
        existing.gross_profit = existing.revenue - existing.cogs;
        existing.margin_pct = existing.revenue > 0 ? (existing.gross_profit / existing.revenue) * 100 : 0;
      } else {
        const profit = revenue - cogs;
        map.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product_name,
          units_sold: item.quantity,
          revenue,
          cogs,
          gross_profit: profit,
          margin_pct: revenue > 0 ? (profit / revenue) * 100 : 0,
        });
      }
    }

    const rows = Array.from(map.values()).sort((a, b) => b.gross_profit - a.gross_profit);
    const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
    const totalCogs = rows.reduce((s, r) => s + r.cogs, 0);
    setTotals({ revenue: totalRev, cogs: totalCogs, profit: totalRev - totalCogs });
    setData(rows);
    setLoading(false);
  };

  const renderRow = ({ item, index }: { item: PLRow; index: number }) => (
    <View style={[styles.row, index % 2 === 0 && styles.rowAlt]}>
      <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>{item.product_name}</Text>
      <Text style={[styles.cell, styles.numCell]}>{item.units_sold}</Text>
      <Text style={[styles.cell, styles.numCell]}>{item.revenue.toLocaleString()}</Text>
      <Text style={[styles.cell, styles.numCell]}>{item.cogs.toLocaleString()}</Text>
      <Text style={[styles.cell, styles.numCell, item.gross_profit < 0 && { color: COLORS.error }]}>
        {item.gross_profit.toLocaleString()}
      </Text>
      <Text style={[styles.cell, styles.numCell, { color: item.margin_pct >= 20 ? COLORS.success : COLORS.warning }]}>
        {item.margin_pct.toFixed(1)}%
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>From</Text>
          <TextInput style={styles.dateInput} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>To</Text>
          <TextInput style={styles.dateInput} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
        </View>
        <TouchableOpacity style={styles.goBtn} onPress={loadReport}>
          <Text style={styles.goBtnText}>Go</Text>
        </TouchableOpacity>
      </View>

      {/* Totals */}
      <View style={styles.totalsRow}>
        <View style={[styles.totalCard, { backgroundColor: COLORS.info }]}>
          <Text style={styles.totalLabel}>Revenue</Text>
          <Text style={styles.totalValue}>{CURRENCY_SYMBOL} {totals.revenue.toLocaleString()}</Text>
        </View>
        <View style={[styles.totalCard, { backgroundColor: COLORS.warning }]}>
          <Text style={styles.totalLabel}>COGS</Text>
          <Text style={styles.totalValue}>{CURRENCY_SYMBOL} {totals.cogs.toLocaleString()}</Text>
        </View>
        <View style={[styles.totalCard, { backgroundColor: totals.profit >= 0 ? COLORS.success : COLORS.error }]}>
          <Text style={styles.totalLabel}>Profit</Text>
          <Text style={styles.totalValue}>{CURRENCY_SYMBOL} {totals.profit.toLocaleString()}</Text>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 2 }]}>Product</Text>
        <Text style={[styles.headerCell, styles.numCell]}>Qty</Text>
        <Text style={[styles.headerCell, styles.numCell]}>Revenue</Text>
        <Text style={[styles.headerCell, styles.numCell]}>COGS</Text>
        <Text style={[styles.headerCell, styles.numCell]}>Profit</Text>
        <Text style={[styles.headerCell, styles.numCell]}>%</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={r => r.product_id}
          renderItem={renderRow}
          ListEmptyComponent={<Text style={styles.emptyText}>No sales data for this period</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filters: { flexDirection: 'row', padding: SPACING.md, gap: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  dateInput: { backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  goBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'flex-end', paddingBottom: 8 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  totalsRow: { flexDirection: 'row', padding: SPACING.md, gap: 8 },
  totalCard: { flex: 1, borderRadius: 10, padding: 12 },
  totalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  totalValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.primaryDark, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#fff' },
  numCell: { flex: 1, textAlign: 'right' },
  row: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowAlt: { backgroundColor: COLORS.surface },
  cell: { fontSize: 12, color: COLORS.text },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
});
