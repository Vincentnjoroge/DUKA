import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';

export default function RefundScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { saleId } = route.params;
  const [sale, setSale] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('sales').select('*, items:sale_items(*)').eq('id', saleId).single();
    if (data) { setSale(data); setItems(data.items || []); }
  };

  const toggleItem = (itemId: string) => setSelected(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  const selectedItems = items.filter(i => selected[i.id]);
  const refundTotal = selectedItems.reduce((s, i) => s + Number(i.line_total), 0);

  const processRefund = async () => {
    if (selectedItems.length === 0) { Alert.alert('Select Items', 'Select at least one item to refund.'); return; }
    if (!reason.trim()) { Alert.alert('Required', 'Refund reason is required.'); return; }
    setProcessing(true);

    // Create refund sale
    const { data: refund, error } = await supabase.from('sales').insert({
      shift_id: sale.shift_id, cashier_id: user!.id, subtotal: -refundTotal,
      discount_amount: 0, total_amount: -refundTotal, payment_method: sale.payment_method,
      payment_status: 'completed', status: 'completed', is_refund: true,
      original_sale_id: saleId, refund_reason: reason.trim(),
    }).select().single();

    if (error || !refund) { setProcessing(false); Alert.alert('Error', error?.message || 'Failed'); return; }

    // Add refund items
    const refundItems = selectedItems.map(i => ({
      sale_id: refund.id, product_id: i.product_id, product_name: i.product_name,
      quantity: i.quantity, unit_price: i.unit_price, line_total: i.line_total,
    }));
    await supabase.from('sale_items').insert(refundItems);
    await supabase.from('audit_log').insert({ user_id: user!.id, action: 'refund_processed', entity_type: 'sale', entity_id: saleId, new_values: { refund_sale_id: refund.id, amount: refundTotal, reason: reason.trim() } });

    setProcessing(false);
    const isMpesa = sale.payment_method !== 'cash';
    if (isMpesa) {
      Alert.alert('Refund Created', `${CURRENCY_SYMBOL} ${refundTotal.toLocaleString()} refund recorded.\n\nFor M-Pesa: Manually reverse via Safaricom portal.\nCustomer phone: ${sale.mpesa_phone || 'N/A'}`, [{ text: 'OK', onPress: () => nav.goBack() }]);
    } else {
      Alert.alert('Refund Complete', `${CURRENCY_SYMBOL} ${refundTotal.toLocaleString()} refund processed. Return cash to customer.`, [{ text: 'OK', onPress: () => nav.goBack() }]);
    }
  };

  if (!sale) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg }}>
      <View style={styles.card}>
        <Text style={styles.receiptNum}>Receipt: {sale.receipt_number}</Text>
        <Text style={styles.saleMeta}>Original total: {CURRENCY_SYMBOL} {Number(sale.total_amount).toLocaleString()} • {sale.payment_method}</Text>
      </View>

      <Text style={styles.sectionTitle}>Select Items to Refund</Text>
      {items.map(item => (
        <TouchableOpacity key={item.id} style={[styles.itemRow, selected[item.id] && styles.itemSelected]} onPress={() => toggleItem(item.id)}>
          <View style={[styles.checkbox, selected[item.id] && styles.checkboxChecked]}>
            {selected[item.id] && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.product_name}</Text>
            <Text style={styles.itemMeta}>Qty: {item.quantity} × {CURRENCY_SYMBOL} {Number(item.unit_price).toLocaleString()}</Text>
          </View>
          <Text style={styles.itemTotal}>{CURRENCY_SYMBOL} {Number(item.line_total).toLocaleString()}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.refundTotal}>
        <Text style={styles.refundLabel}>Refund Amount</Text>
        <Text style={styles.refundValue}>{CURRENCY_SYMBOL} {refundTotal.toLocaleString()}</Text>
      </View>

      <Text style={styles.label}>Reason for Refund *</Text>
      <TextInput style={styles.reasonInput} value={reason} onChangeText={setReason} multiline placeholder="e.g. Customer returned defective product" placeholderTextColor={COLORS.textLight} textAlignVertical="top" />

      <TouchableOpacity style={[styles.refundBtn, (processing || selectedItems.length === 0) && { opacity: 0.5 }]} onPress={processRefund} disabled={processing || selectedItems.length === 0}>
        {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.refundBtnText}>Process Refund</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 16 },
  receiptNum: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  saleMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderRadius: 10, marginBottom: 6, gap: 12 },
  itemSelected: { backgroundColor: COLORS.errorLight, borderWidth: 1, borderColor: COLORS.error },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  checkmark: { color: '#fff', fontWeight: '700', fontSize: 14 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  refundTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: COLORS.discrepancyBg, borderRadius: 12, marginVertical: 16 },
  refundLabel: { fontSize: 16, fontWeight: '600', color: COLORS.error },
  refundValue: { fontSize: 24, fontWeight: '700', color: COLORS.error },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  reasonInput: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, minHeight: 80, marginBottom: 20 },
  refundBtn: { backgroundColor: COLORS.error, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  refundBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
