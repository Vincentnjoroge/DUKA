import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useCartStore } from '../../store/cartStore';
import { useShiftStore } from '../../store/shiftStore';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, CURRENCY_SYMBOL, MPESA_STK_TIMEOUT_MS, MPESA_PHONE_PREFIX } from '../../constants';

type Tab = 'cash' | 'mpesa';
type MpesaMode = 'stk' | 'till';

export default function PaymentScreen() {
  const nav = useNavigation<any>();
  const { items, total, subtotal, discountTotal, clearCart } = useCartStore();
  const { currentShift } = useShiftStore();
  const { user } = useAuthStore();

  const [tab, setTab] = useState<Tab>('cash');
  const [mpesaMode, setMpesaMode] = useState<MpesaMode>('stk');

  // Cash
  const [amountReceived, setAmountReceived] = useState('');
  const changeDue = Math.max(0, parseFloat(amountReceived || '0') - total());

  // M-Pesa STK
  const [phone, setPhone] = useState(MPESA_PHONE_PREFIX);
  const [stkLoading, setStkLoading] = useState(false);
  const [stkWaiting, setStkWaiting] = useState(false);
  const [stkTimeout, setStkTimeout] = useState(false);
  const [manualRefMode, setManualRefMode] = useState(false);
  const [manualRef, setManualRef] = useState('');
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Listen for realtime sale updates (M-Pesa callback)
  useEffect(() => {
    if (!pendingSaleId) return;
    const channel = supabase
      .channel(`sale-${pendingSaleId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sales',
        filter: `id=eq.${pendingSaleId}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.payment_status === 'completed') {
          if (timerRef.current) clearTimeout(timerRef.current);
          setStkWaiting(false);
          clearCart();
          nav.navigate('SaleComplete', {
            saleId: pendingSaleId,
            receiptNumber: updated.receipt_number,
            totalAmount: updated.total_amount,
            paymentMethod: updated.payment_method,
            mpesaRef: updated.mpesa_ref,
          });
        } else if (updated.payment_status === 'failed') {
          setStkWaiting(false);
          Alert.alert('Payment Failed', 'M-Pesa payment was not completed. Try again or use cash.');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pendingSaleId]);

  const createSaleRecord = async (paymentMethod: string) => {
    const saleItems = items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount,
      line_total: item.line_total,
    }));

    const { data: sale, error } = await supabase
      .from('sales')
      .insert({
        shift_id: currentShift!.id,
        cashier_id: user!.id,
        subtotal: subtotal(),
        discount_amount: discountTotal(),
        total_amount: total(),
        payment_method: paymentMethod,
        payment_status: 'pending',
        status: 'draft',
      })
      .select()
      .single();

    if (error || !sale) throw new Error(error?.message || 'Failed to create sale');

    // Insert sale items
    const itemRows = saleItems.map(si => ({ ...si, sale_id: sale.id }));
    const { error: itemError } = await supabase.from('sale_items').insert(itemRows);
    if (itemError) throw new Error(itemError.message);

    return sale;
  };

  // ---- CASH PAYMENT ----
  const handleCashPayment = async () => {
    const received = parseFloat(amountReceived);
    if (isNaN(received) || received < total()) {
      Alert.alert('Insufficient', 'Amount received must be at least the total.');
      return;
    }
    try {
      const sale = await createSaleRecord('cash');
      // Complete sale immediately
      const { data: updated } = await supabase
        .from('sales')
        .update({ payment_status: 'completed', status: 'completed' })
        .eq('id', sale.id)
        .select()
        .single();

      // Send receipt email (fire & forget)
      supabase.functions.invoke('send-receipt-email', { body: { sale_id: sale.id } }).catch(() => {});

      clearCart();
      nav.navigate('SaleComplete', {
        saleId: sale.id,
        receiptNumber: updated?.receipt_number || sale.receipt_number,
        totalAmount: total(),
        paymentMethod: 'cash',
        changeDue: received - total(),
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // ---- STK PUSH ----
  const handleSTKPush = async () => {
    if (phone.length < 12) {
      Alert.alert('Invalid Phone', 'Enter a valid phone number (e.g. 254712345678)');
      return;
    }
    setStkLoading(true);
    try {
      const sale = await createSaleRecord('mpesa_stk');
      setPendingSaleId(sale.id);

      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone,
          amount: total(),
          sale_id: sale.id,
          receipt_number: sale.receipt_number,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'STK Push failed');

      setStkLoading(false);
      setStkWaiting(true);

      // Team insight: 90-second timeout
      timerRef.current = setTimeout(() => {
        setStkWaiting(false);
        setStkTimeout(true);
      }, MPESA_STK_TIMEOUT_MS);
    } catch (err: any) {
      setStkLoading(false);
      Alert.alert('M-Pesa Error', err.message);
    }
  };

  // ---- MANUAL REF CONFIRMATION ----
  const handleManualConfirm = async () => {
    if (!manualRef.trim()) {
      Alert.alert('Required', 'Enter the M-Pesa reference code.');
      return;
    }
    if (!pendingSaleId) return;
    try {
      await supabase
        .from('sales')
        .update({
          payment_status: 'completed',
          status: 'completed',
          mpesa_ref: manualRef.trim().toUpperCase(),
          mpesa_phone: phone,
          completed_at: new Date().toISOString(),
        })
        .eq('id', pendingSaleId);

      await supabase.from('audit_log').insert({
        user_id: user!.id,
        action: 'mpesa_manual_confirm',
        entity_type: 'sale',
        entity_id: pendingSaleId,
        new_values: { mpesa_ref: manualRef.trim(), phone },
      });

      supabase.functions.invoke('send-receipt-email', { body: { sale_id: pendingSaleId } }).catch(() => {});
      clearCart();
      nav.navigate('SaleComplete', {
        saleId: pendingSaleId,
        totalAmount: total(),
        paymentMethod: 'mpesa_stk',
        mpesaRef: manualRef.trim().toUpperCase(),
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // ---- TILL PAYMENT ----
  const handleTillPayment = async () => {
    try {
      const sale = await createSaleRecord('mpesa_till');
      setPendingSaleId(sale.id);
      setStkWaiting(true);

      // Listen via realtime (C2B callback will match)
      timerRef.current = setTimeout(() => {
        setStkWaiting(false);
        setStkTimeout(true);
      }, MPESA_STK_TIMEOUT_MS * 2); // Longer wait for till
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Due</Text>
          <Text style={styles.totalAmount}>{CURRENCY_SYMBOL} {total().toLocaleString()}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'cash' && styles.tabActive]}
            onPress={() => { setTab('cash'); setStkWaiting(false); setStkTimeout(false); }}
          >
            <Text style={[styles.tabText, tab === 'cash' && styles.tabTextActive]}>Cash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'mpesa' && styles.tabActive]}
            onPress={() => setTab('mpesa')}
          >
            <Text style={[styles.tabText, tab === 'mpesa' && styles.tabTextActive]}>M-Pesa</Text>
          </TouchableOpacity>
        </View>

        {/* CASH TAB */}
        {tab === 'cash' && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Amount Received</Text>
            <TextInput
              style={styles.amountInput}
              value={amountReceived}
              onChangeText={setAmountReceived}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.textLight}
              autoFocus
            />
            <View style={styles.changeRow}>
              <Text style={styles.changeLabel}>Change Due</Text>
              <Text style={[styles.changeAmount, changeDue > 0 && { color: COLORS.success }]}>
                {CURRENCY_SYMBOL} {changeDue.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, parseFloat(amountReceived || '0') < total() && styles.btnDisabled]}
              onPress={handleCashPayment}
              disabled={parseFloat(amountReceived || '0') < total()}
            >
              <Text style={styles.confirmBtnText}>Confirm Payment</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* M-PESA TAB */}
        {tab === 'mpesa' && !stkWaiting && !stkTimeout && !manualRefMode && (
          <View style={styles.section}>
            <View style={styles.mpesaTabs}>
              <TouchableOpacity
                style={[styles.mpesaTab, mpesaMode === 'stk' && styles.mpesaTabActive]}
                onPress={() => setMpesaMode('stk')}
              >
                <Text style={[styles.mpesaTabText, mpesaMode === 'stk' && styles.mpesaTabTextActive]}>STK Push</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mpesaTab, mpesaMode === 'till' && styles.mpesaTabActive]}
                onPress={() => setMpesaMode('till')}
              >
                <Text style={[styles.mpesaTabText, mpesaMode === 'till' && styles.mpesaTabTextActive]}>Till</Text>
              </TouchableOpacity>
            </View>

            {mpesaMode === 'stk' && (
              <>
                <Text style={styles.inputLabel}>Customer Phone Number</Text>
                <TextInput
                  style={styles.amountInput}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="254712345678"
                  placeholderTextColor={COLORS.textLight}
                  maxLength={12}
                />
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.mpesaBtn, stkLoading && styles.btnDisabled]}
                  onPress={handleSTKPush}
                  disabled={stkLoading}
                >
                  {stkLoading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.confirmBtnText}>Send Payment Request</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {mpesaMode === 'till' && (
              <>
                <View style={styles.tillBox}>
                  <Text style={styles.tillLabel}>Tell customer to pay to:</Text>
                  <Text style={styles.tillNumber}>Till / Paybill</Text>
                  <Text style={styles.tillNote}>Amount: {CURRENCY_SYMBOL} {total().toLocaleString()}</Text>
                  <Text style={styles.tillNote}>Account Ref: Receipt Number</Text>
                </View>
                <TouchableOpacity style={[styles.confirmBtn, styles.mpesaBtn]} onPress={handleTillPayment}>
                  <Text style={styles.confirmBtnText}>Waiting for Payment...</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.manualLink} onPress={() => setManualRefMode(true)}>
                  <Text style={styles.manualLinkText}>Enter M-Pesa ref manually</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* STK Waiting */}
        {tab === 'mpesa' && stkWaiting && (
          <View style={styles.waitingSection}>
            <ActivityIndicator size="large" color={COLORS.mpesa} />
            <Text style={styles.waitingText}>Waiting for Customer...</Text>
            <Text style={styles.waitingSubText}>Check customer phone for M-Pesa PIN prompt</Text>
            <TouchableOpacity style={styles.manualLink} onPress={() => { setStkWaiting(false); setManualRefMode(true); }}>
              <Text style={styles.manualLinkText}>Customer says they paid? Enter ref manually</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STK Timeout */}
        {tab === 'mpesa' && stkTimeout && !manualRefMode && (
          <View style={styles.waitingSection}>
            <Text style={styles.timeoutTitle}>No Response Received</Text>
            <Text style={styles.waitingSubText}>The payment request timed out. Customer may have cancelled or entered wrong PIN.</Text>
            <TouchableOpacity style={[styles.confirmBtn, styles.mpesaBtn]} onPress={() => { setStkTimeout(false); }}>
              <Text style={styles.confirmBtnText}>Retry STK Push</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manualLink} onPress={() => { setStkTimeout(false); setManualRefMode(true); }}>
              <Text style={styles.manualLinkText}>Customer has confirmation? Enter ref manually</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manualLink} onPress={() => { setTab('cash'); setStkTimeout(false); }}>
              <Text style={[styles.manualLinkText, { color: COLORS.error }]}>Switch to Cash</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual Ref Entry (team insight) */}
        {manualRefMode && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>M-Pesa Reference Code</Text>
            <Text style={styles.manualHint}>Ask customer to show confirmation SMS</Text>
            <TextInput
              style={styles.amountInput}
              value={manualRef}
              onChangeText={setManualRef}
              placeholder="e.g. SHK7A1B2C3"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="characters"
              autoFocus
            />
            <TouchableOpacity style={[styles.confirmBtn, styles.mpesaBtn]} onPress={handleManualConfirm}>
              <Text style={styles.confirmBtnText}>Confirm by Reference</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manualLink} onPress={() => setManualRefMode(false)}>
              <Text style={styles.manualLinkText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg },
  totalSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 16 },
  totalLabel: { fontSize: 14, color: COLORS.textSecondary },
  totalAmount: { fontSize: 36, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff' },
  section: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  amountInput: { backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, fontWeight: '700', color: COLORS.text, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  changeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 },
  changeLabel: { fontSize: 16, color: COLORS.textSecondary },
  changeAmount: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  confirmBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  mpesaBtn: { backgroundColor: COLORS.mpesa },
  btnDisabled: { opacity: 0.5 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  mpesaTabs: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  mpesaTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  mpesaTabActive: { backgroundColor: COLORS.mpesa, borderColor: COLORS.mpesa },
  mpesaTabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  mpesaTabTextActive: { color: '#fff' },
  tillBox: { backgroundColor: COLORS.background, borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16 },
  tillLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  tillNumber: { fontSize: 28, fontWeight: '700', color: COLORS.primary },
  tillNote: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  waitingSection: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  waitingText: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  waitingSubText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  timeoutTitle: { fontSize: 18, fontWeight: '700', color: COLORS.warning },
  manualLink: { marginTop: 16, padding: 8, alignItems: 'center' },
  manualLinkText: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '600', textDecorationLine: 'underline' },
  manualHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
});
