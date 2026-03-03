import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';

interface POLine { productId: string; name: string; quantity: string; unitCost: string; }

export default function CreatePOScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuthStore();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<POLine[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('suppliers').select('id, name').eq('is_active', true).is('deleted_at', null).order('name').then(({ data }) => setSuppliers(data || []));
  }, []);

  const searchProducts = async (q: string) => {
    setProductSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.from('products').select('id, name, buying_price').eq('is_active', true).ilike('name', `%${q}%`).limit(10);
    setSearchResults(data || []);
  };

  const addLine = (p: any) => {
    if (lines.find(l => l.productId === p.id)) return;
    setLines([...lines, { productId: p.id, name: p.name, quantity: '1', unitCost: p.buying_price.toString() }]);
    setProductSearch(''); setSearchResults([]);
  };

  const updateLine = (idx: number, field: 'quantity' | 'unitCost', value: string) => {
    setLines(lines.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

  const totalAmount = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitCost) || 0), 0);

  const save = async (status: 'draft' | 'sent') => {
    if (!supplierId) { Alert.alert('Required', 'Select a supplier.'); return; }
    if (lines.length === 0) { Alert.alert('Required', 'Add at least one item.'); return; }
    setSaving(true);
    const { data: po, error } = await supabase.from('purchase_orders').insert({
      supplier_id: supplierId, status, total_amount: totalAmount, created_by: user!.id,
    }).select().single();
    if (error || !po) { setSaving(false); Alert.alert('Error', error?.message || 'Failed'); return; }

    const items = lines.map(l => ({
      purchase_order_id: po.id, product_id: l.productId,
      quantity_ordered: parseInt(l.quantity) || 1, unit_cost: parseFloat(l.unitCost) || 0,
      line_total: (parseInt(l.quantity) || 1) * (parseFloat(l.unitCost) || 0),
    }));
    await supabase.from('purchase_order_items').insert(items);
    setSaving(false); nav.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg }} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Supplier</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {suppliers.map(s => (
          <TouchableOpacity key={s.id} style={[styles.chip, supplierId === s.id && styles.chipActive]} onPress={() => setSupplierId(s.id)}>
            <Text style={[styles.chipText, supplierId === s.id && styles.chipTextActive]}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Add Products</Text>
      <TextInput style={styles.input} value={productSearch} onChangeText={searchProducts} placeholder="Search products..." placeholderTextColor={COLORS.textLight} />
      {searchResults.map(p => (
        <TouchableOpacity key={p.id} style={styles.searchRow} onPress={() => addLine(p)}>
          <Text style={styles.searchName}>{p.name}</Text>
          <Text style={styles.searchPrice}>{CURRENCY_SYMBOL} {p.buying_price}</Text>
        </TouchableOpacity>
      ))}

      {lines.length > 0 && (
        <>
          <Text style={[styles.label, { marginTop: 16 }]}>Order Items</Text>
          {lines.map((line, idx) => (
            <View key={line.productId} style={styles.lineRow}>
              <Text style={styles.lineName} numberOfLines={1}>{line.name}</Text>
              <TextInput style={styles.lineInput} value={line.quantity} onChangeText={v => updateLine(idx, 'quantity', v)} keyboardType="numeric" placeholder="Qty" />
              <TextInput style={styles.lineInput} value={line.unitCost} onChangeText={v => updateLine(idx, 'unitCost', v)} keyboardType="numeric" placeholder="Cost" />
              <TouchableOpacity onPress={() => removeLine(idx)}><Text style={styles.removeText}>X</Text></TouchableOpacity>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Order Value</Text>
            <Text style={styles.totalValue}>{CURRENCY_SYMBOL} {totalAmount.toLocaleString()}</Text>
          </View>
        </>
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.border }]} onPress={() => save('draft')} disabled={saving}>
          <Text style={[styles.btnText, { color: COLORS.text }]}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => save('sent')} disabled={saving}>
          <Text style={styles.btnText}>Save & Mark Sent</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  searchRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: COLORS.surface, borderRadius: 8, marginBottom: 4 },
  searchName: { fontSize: 13, color: COLORS.text },
  searchPrice: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, padding: 10, borderRadius: 8, marginBottom: 4 },
  lineName: { flex: 1, fontSize: 13, color: COLORS.text },
  lineInput: { width: 64, backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, color: COLORS.text, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border },
  removeText: { fontSize: 14, color: COLORS.error, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 2, borderTopColor: COLORS.primary, marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 32 },
  btn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
