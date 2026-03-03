import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING } from '../../constants';
import { format, subDays } from 'date-fns';

const TYPES = ['all', 'sale', 'po_receive', 'adjustment_add', 'adjustment_remove', 'write_off'];
const TYPE_COLORS: Record<string, string> = { sale: COLORS.error, sale_refund: COLORS.success, po_receive: COLORS.info, adjustment_add: COLORS.primaryLight, adjustment_remove: COLORS.warning, write_off: COLORS.error };

export default function StockMovementReport() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState('all');
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('stock_movements').select('*, product:products!product_id(name), performer:users!performed_by(full_name)')
      .gte('created_at', `${startDate}T00:00:00Z`).lte('created_at', `${endDate}T23:59:59Z`).order('created_at', { ascending: false }).limit(200);
    if (typeFilter !== 'all') q = q.eq('movement_type', typeFilter);
    const { data } = await q;
    setMovements(data || []);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <View style={styles.dateRow}>
          <TextInput style={styles.dateInput} value={startDate} onChangeText={setStartDate} placeholder="From" />
          <TextInput style={styles.dateInput} value={endDate} onChangeText={setEndDate} placeholder="To" />
          <TouchableOpacity style={styles.goBtn} onPress={load}><Text style={styles.goBtnText}>Go</Text></TouchableOpacity>
        </View>
        <FlatList horizontal data={TYPES} keyExtractor={t => t} showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.chip, typeFilter === item && styles.chipActive]} onPress={() => { setTypeFilter(item); load(); }}>
              <Text style={[styles.chipText, typeFilter === item && styles.chipTextActive]}>{item === 'all' ? 'All' : item.replace('_', ' ')}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
      <Text style={styles.countText}>{movements.length} movements</Text>
      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <FlatList data={movements} keyExtractor={m => m.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[item.movement_type] || COLORS.border) + '20' }]}>
                <Text style={[styles.typeText, { color: TYPE_COLORS[item.movement_type] || COLORS.text }]}>{item.movement_type.replace('_', ' ')}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowProduct} numberOfLines={1}>{item.product?.name}</Text>
                <Text style={styles.rowMeta}>{format(new Date(item.created_at), 'MMM d, HH:mm')} • {item.performer?.full_name || ''}</Text>
                {item.reason && <Text style={styles.rowReason} numberOfLines={1}>{item.reason}</Text>}
              </View>
              <Text style={[styles.rowQty, item.quantity > 0 ? { color: COLORS.success } : { color: COLORS.error }]}>
                {item.quantity > 0 ? '+' : ''}{item.quantity}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filters: { padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dateInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  goBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  goBtnText: { color: '#fff', fontWeight: '700' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginRight: 6 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  countText: { fontSize: 12, color: COLORS.textSecondary, paddingHorizontal: SPACING.md, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, marginRight: 8 },
  typeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  rowInfo: { flex: 1 },
  rowProduct: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  rowMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  rowReason: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  rowQty: { fontSize: 16, fontWeight: '700', minWidth: 44, textAlign: 'right' },
});
