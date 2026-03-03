import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: COLORS.border, color: COLORS.text },
  sent: { bg: COLORS.infoLight, color: COLORS.info },
  partial: { bg: COLORS.warningLight, color: COLORS.warning },
  received: { bg: COLORS.successLight, color: COLORS.success },
  cancelled: { bg: COLORS.errorLight, color: COLORS.error },
};

export default function PurchaseOrdersScreen() {
  const nav = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    let q = supabase.from('purchase_orders').select('*, supplier:suppliers!supplier_id(name), items:purchase_order_items(count)').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setOrders(data || []);
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {['all', 'draft', 'sent', 'partial'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList data={orders} keyExtractor={o => o.id}
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
          return (
            <TouchableOpacity style={styles.row} onPress={() => item.status === 'sent' || item.status === 'partial' ? nav.navigate('ReceiveStock', { poId: item.id }) : null}>
              <View style={styles.rowLeft}>
                <Text style={styles.supplierName}>{item.supplier?.name || 'Unknown'}</Text>
                <Text style={styles.rowDate}>{format(new Date(item.created_at), 'MMM d, yyyy')}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowAmount}>{CURRENCY_SYMBOL} {Number(item.total_amount).toLocaleString()}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.color }]}>{item.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>No purchase orders</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('CreatePO')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filterRow: { flexDirection: 'row', padding: SPACING.md, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, marginBottom: 8 },
  rowLeft: { flex: 1 },
  supplierName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowAmount: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '700' },
});
