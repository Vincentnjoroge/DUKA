import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, CURRENCY_SYMBOL, MPESA_STUCK_PAYMENT_THRESHOLD_MIN } from '../../constants';
import { format, differenceInMinutes } from 'date-fns';

export default function StuckPaymentsScreen() {
  const { user } = useAuthStore();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [manualRef, setManualRef] = useState('');
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const threshold = new Date(Date.now() - MPESA_STUCK_PAYMENT_THRESHOLD_MIN * 60000).toISOString();
    const { data } = await supabase.from('sales')
      .select('*, cashier:users!cashier_id(full_name)')
      .eq('payment_status', 'pending')
      .in('payment_method', ['mpesa_stk', 'mpesa_till'])
      .lt('created_at', threshold)
      .order('created_at', { ascending: true });
    setSales(data || []);
    setLoading(false);
  };

  const markPaid = async (saleId: string) => {
    if (!manualRef.trim()) { Alert.alert('Required', 'Enter the M-Pesa reference.'); return; }
    await supabase.from('sales').update({
      payment_status: 'completed', status: 'completed',
      mpesa_ref: manualRef.trim().toUpperCase(),
      completed_at: new Date().toISOString(),
    }).eq('id', saleId);
    await supabase.from('audit_log').insert({
      user_id: user!.id, action: 'stuck_payment_manual_resolve',
      entity_type: 'sale', entity_id: saleId,
      new_values: { mpesa_ref: manualRef.trim(), note: resolveNote.trim() },
    });
    setResolveModal(null); setManualRef(''); setResolveNote(''); load();
  };

  const cancelSale = (saleId: string) => {
    Alert.alert('Cancel Sale', 'This will cancel the pending sale. Are you sure?', [
      { text: 'No' },
      { text: 'Cancel Sale', style: 'destructive', onPress: async () => {
        await supabase.from('sales').update({ payment_status: 'failed', status: 'cancelled' }).eq('id', saleId);
        await supabase.from('audit_log').insert({ user_id: user!.id, action: 'stuck_payment_cancelled', entity_type: 'sale', entity_id: saleId });
        load();
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Payments pending &gt; {MPESA_STUCK_PAYMENT_THRESHOLD_MIN} minutes</Text>
        <Text style={styles.headerCount}>{sales.length} stuck</Text>
      </View>
      <FlatList data={sales} keyExtractor={s => s.id}
        renderItem={({ item }) => {
          const minsAgo = differenceInMinutes(new Date(), new Date(item.created_at));
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.receipt}>{item.receipt_number}</Text>
                  <Text style={styles.meta}>{item.cashier?.full_name} • {format(new Date(item.created_at), 'HH:mm')}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.amount}>{CURRENCY_SYMBOL} {Number(item.total_amount).toLocaleString()}</Text>
                  <Text style={styles.elapsed}>{minsAgo} min ago</Text>
                </View>
              </View>
              <View style={styles.methodRow}>
                <Text style={styles.methodBadge}>{item.payment_method === 'mpesa_stk' ? 'STK Push' : 'Till'}</Text>
                {item.mpesa_phone && <Text style={styles.phone}>{item.mpesa_phone}</Text>}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.resolveBtn} onPress={() => { setResolveModal(item.id); setManualRef(''); setResolveNote(''); }}>
                  <Text style={styles.resolveBtnText}>Mark Paid</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelSale(item.id)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        contentContainerStyle={{ padding: SPACING.lg }}
        ListEmptyComponent={<Text style={styles.empty}>No stuck payments</Text>}
      />

      <Modal visible={!!resolveModal} transparent animationType="slide" onRequestClose={() => setResolveModal(null)}>
        <Pressable style={styles.overlay} onPress={() => setResolveModal(null)}>
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Mark Payment as Received</Text>
            <Text style={styles.modalLabel}>M-Pesa Reference *</Text>
            <TextInput style={styles.modalInput} value={manualRef} onChangeText={setManualRef} autoCapitalize="characters" placeholder="e.g. SHK7A1B2C3" placeholderTextColor={COLORS.textLight} />
            <Text style={styles.modalLabel}>Note (optional)</Text>
            <TextInput style={styles.modalInput} value={resolveNote} onChangeText={setResolveNote} placeholder="e.g. Verified from bank statement" placeholderTextColor={COLORS.textLight} />
            <TouchableOpacity style={styles.confirmBtn} onPress={() => resolveModal && markPaid(resolveModal)}>
              <Text style={styles.confirmBtnText}>Confirm Payment</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, backgroundColor: COLORS.warningLight },
  headerText: { fontSize: 13, color: COLORS.warning, fontWeight: '600' },
  headerCount: { fontSize: 16, fontWeight: '700', color: COLORS.warning },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  receipt: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  elapsed: { fontSize: 12, color: COLORS.error, fontWeight: '600', marginTop: 2 },
  methodRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  methodBadge: { fontSize: 11, fontWeight: '700', color: COLORS.mpesa, backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  phone: { fontSize: 12, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  resolveBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  resolveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  cancelBtn: { flex: 1, backgroundColor: COLORS.errorLight, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.error },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60, fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  modalInput: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  confirmBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
