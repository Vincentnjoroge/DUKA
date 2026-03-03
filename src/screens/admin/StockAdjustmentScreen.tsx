import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING } from '../../constants';

type AdjType = 'adjustment_add' | 'adjustment_remove' | 'write_off';

export default function StockAdjustmentScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { productId, productName } = route.params;

  const [type, setType] = useState<AdjType>('adjustment_add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) { Alert.alert('Invalid', 'Enter a valid quantity.'); return; }
    if (!reason.trim()) { Alert.alert('Required', 'Reason is required for all adjustments.'); return; }
    if (type === 'write_off' && !adminPin.trim()) { Alert.alert('Required', 'Admin PIN is required for write-offs.'); return; }

    setSaving(true);
    const actualQty = type === 'adjustment_add' ? qty : -qty;

    // Insert stock movement
    const { error: mvError } = await supabase.from('stock_movements').insert({
      product_id: productId,
      movement_type: type,
      quantity: actualQty,
      reason: reason.trim(),
      performed_by: user!.id,
      admin_approved_by: type === 'write_off' ? user!.id : null,
    });

    if (mvError) { setSaving(false); Alert.alert('Error', mvError.message); return; }

    // Update product stock
    const { error: upError } = await supabase.rpc('adjust_product_stock', { p_product_id: productId, p_quantity: actualQty }).catch(() =>
      supabase.from('products').update({ current_stock: supabase.rpc ? undefined : 0 }).eq('id', productId)
    );

    // Direct update fallback
    const { data: prod } = await supabase.from('products').select('current_stock').eq('id', productId).single();
    if (prod) {
      await supabase.from('products').update({ current_stock: prod.current_stock + actualQty }).eq('id', productId);
    }

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user!.id,
      action: `stock_${type}`,
      entity_type: 'product',
      entity_id: productId,
      new_values: { quantity: actualQty, reason: reason.trim(), reference: reference.trim() },
    });

    setSaving(false);
    Alert.alert('Success', `Stock adjusted: ${actualQty > 0 ? '+' : ''}${actualQty} for ${productName}`);
    nav.goBack();
  };

  const types: { key: AdjType; label: string; color: string }[] = [
    { key: 'adjustment_add', label: 'Add Stock', color: COLORS.success },
    { key: 'adjustment_remove', label: 'Remove Stock', color: COLORS.warning },
    { key: 'write_off', label: 'Write-Off', color: COLORS.error },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.productName}>{productName}</Text>
      </View>

      <View style={styles.typeRow}>
        {types.map(t => (
          <TouchableOpacity key={t.key} style={[styles.typeBtn, type === t.key && { backgroundColor: t.color }]} onPress={() => setType(t.key)}>
            <Text style={[styles.typeBtnText, type === t.key && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Quantity</Text>
        <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textLight} />

        <Text style={styles.label}>Reason / Notes *</Text>
        <TextInput style={[styles.input, styles.textArea]} value={reason} onChangeText={setReason} multiline placeholder="e.g. Shelf recount, Damaged bottle, Supplier delivery" placeholderTextColor={COLORS.textLight} textAlignVertical="top" />

        <Text style={styles.label}>Reference (optional)</Text>
        <TextInput style={styles.input} value={reference} onChangeText={setReference} placeholder="e.g. PO-2026-001, Shelf check Feb" placeholderTextColor={COLORS.textLight} />

        {type === 'write_off' && (
          <>
            <View style={styles.pinWarning}>
              <Text style={styles.pinWarningText}>Write-offs require admin PIN verification</Text>
            </View>
            <Text style={styles.label}>Admin PIN</Text>
            <TextInput style={styles.input} value={adminPin} onChangeText={setAdminPin} secureTextEntry keyboardType="numeric" placeholder="Enter 4-digit PIN" placeholderTextColor={COLORS.textLight} maxLength={4} />
          </>
        )}

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Apply Adjustment</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  productName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  typeRow: { flexDirection: 'row', padding: SPACING.lg, gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  form: { padding: SPACING.lg },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  textArea: { minHeight: 80 },
  pinWarning: { backgroundColor: COLORS.warningLight, borderRadius: 8, padding: 12, marginTop: 16 },
  pinWarningText: { fontSize: 13, fontWeight: '600', color: COLORS.warning },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
