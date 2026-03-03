import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';

export default function ReceiveStockScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { poId } = route.params;
  const [po, setPO] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [received, setReceived] = useState<Record<string, string>>({});
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('purchase_orders').select('*, supplier:suppliers!supplier_id(name), items:purchase_order_items(*, product:products!product_id(name))').eq('id', poId).single();
    if (data) {
      setPO(data);
      setItems(data.items || []);
      const r: Record<string, string> = {};
      const c: Record<string, string> = {};
      (data.items || []).forEach((i: any) => { r[i.id] = '0'; c[i.id] = i.unit_cost.toString(); });
      setReceived(r); setCosts(c);
    }
  };

  const handleReceive = async () => {
    setSaving(true);
    let allReceived = true;
    for (const item of items) {
      const qty = parseInt(received[item.id] || '0');
      const cost = parseFloat(costs[item.id] || item.unit_cost.toString());
      if (qty > 0) {
        await supabase.from('purchase_order_items').update({
          quantity_received: item.quantity_received + qty, unit_cost: cost,
          line_total: item.quantity_ordered * cost,
        }).eq('id', item.id);
      }
      if (item.quantity_received + qty < item.quantity_ordered) allReceived = false;
    }

    await supabase.from('purchase_orders').update({
      status: allReceived ? 'received' : 'partial',
    }).eq('id', poId);

    setSaving(false);
    Alert.alert('Success', allReceived ? 'All stock received!' : 'Partial stock received.');
    nav.goBack();
  };

  if (!po) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.supplier}>{po.supplier?.name}</Text>
        <Text style={styles.headerMeta}>Total: {CURRENCY_SYMBOL} {Number(po.total_amount).toLocaleString()}</Text>
      </View>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 2 }]}>Product</Text>
        <Text style={styles.headerCell}>Ordered</Text>
        <Text style={styles.headerCell}>Received</Text>
        <Text style={styles.headerCell}>Cost</Text>
      </View>
      <FlatList data={items} keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>{item.product?.name}</Text>
            <Text style={styles.cell}>{item.quantity_ordered}</Text>
            <TextInput style={styles.qtyInput} value={received[item.id]} onChangeText={v => setReceived(p => ({ ...p, [item.id]: v }))} keyboardType="numeric" />
            <TextInput style={styles.qtyInput} value={costs[item.id]} onChangeText={v => setCosts(p => ({ ...p, [item.id]: v }))} keyboardType="numeric" />
          </View>
        )}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.receiveBtn, saving && { opacity: 0.5 }]} onPress={handleReceive} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.receiveBtnText}>Receive Stock</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  supplier: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.primaryDark, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  headerCell: { flex: 1, fontSize: 12, fontWeight: '700', color: '#fff', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  cell: { flex: 1, fontSize: 13, color: COLORS.text, textAlign: 'center' },
  qtyInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 6, fontSize: 14, fontWeight: '700', color: COLORS.text, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 2 },
  footer: { padding: SPACING.lg, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  receiveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  receiveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
