import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet,
  Alert, ActivityIndicator, Switch, ScrollView,
} from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import { format } from 'date-fns';

export default function ShiftApprovalScreen() {
  const { user } = useAuthStore();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adminCash, setAdminCash] = useState('');
  const [ackDiscrepancies, setAckDiscrepancies] = useState(false);
  const [stockCounts, setStockCounts] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadShifts(); }, []);

  const loadShifts = async () => {
    const { data } = await supabase
      .from('shifts')
      .select('*, cashier:users!cashier_id(full_name)')
      .in('status', ['pending_open', 'pending_close'])
      .order('created_at', { ascending: false });
    setShifts(data || []);
    setLoading(false);
  };

  const loadStockCounts = async (shiftId: string, countType: string) => {
    const { data } = await supabase
      .from('shift_stock_counts')
      .select('*, product:products!product_id(name)')
      .eq('shift_id', shiftId)
      .eq('count_type', countType);
    setStockCounts(data || []);
  };

  const toggleExpand = async (shift: any) => {
    if (expanded === shift.id) { setExpanded(null); return; }
    setExpanded(shift.id);
    setRejectReason('');
    setAdminCash(shift.closing_cash?.toString() || '');
    setAckDiscrepancies(false);
    const type = shift.status === 'pending_open' ? 'opening' : 'closing';
    await loadStockCounts(shift.id, type);
  };

  const approveOpen = async (shift: any) => {
    setProcessing(true);
    await supabase.from('shifts').update({
      status: 'open', approved_by: user!.id, opened_at: new Date().toISOString(),
    }).eq('id', shift.id);
    await supabase.from('audit_log').insert({ user_id: user!.id, action: 'shift_open_approved', entity_type: 'shift', entity_id: shift.id });
    setProcessing(false);
    loadShifts();
    setExpanded(null);
  };

  const approveClose = async (shift: any) => {
    const hasDisc = shift.cash_discrepancy !== 0 || stockCounts.some((c: any) => c.difference !== 0);
    if (hasDisc && !ackDiscrepancies) {
      Alert.alert('Required', 'Please acknowledge discrepancies before approving.');
      return;
    }
    setProcessing(true);
    await supabase.from('shifts').update({
      status: 'closed', close_approved_by: user!.id, closed_at: new Date().toISOString(),
    }).eq('id', shift.id);
    await supabase.from('audit_log').insert({ user_id: user!.id, action: 'shift_close_approved', entity_type: 'shift', entity_id: shift.id });
    setProcessing(false);
    loadShifts();
    setExpanded(null);
  };

  const rejectShift = async (shift: any) => {
    if (!rejectReason.trim()) { Alert.alert('Required', 'Enter a rejection reason.'); return; }
    setProcessing(true);
    await supabase.from('shifts').update({
      status: 'rejected', rejection_notes: rejectReason.trim(),
    }).eq('id', shift.id);
    setProcessing(false);
    loadShifts();
    setExpanded(null);
  };

  const renderShift = ({ item }: { item: any }) => {
    const isOpen = item.status === 'pending_open';
    const isExpanded = expanded === item.id;
    const hasDisc = item.cash_discrepancy && item.cash_discrepancy !== 0;

    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item)}>
          <View style={styles.cardLeft}>
            <Text style={styles.cashierName}>{item.cashier?.full_name}</Text>
            <Text style={styles.cardTime}>{format(new Date(item.created_at), 'MMM d, HH:mm')}</Text>
          </View>
          <View style={[styles.typeBadge, isOpen ? styles.openBadge : styles.closeBadge]}>
            <Text style={styles.typeBadgeText}>{isOpen ? 'Open' : 'Close'}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <ScrollView style={styles.expandedContent} nestedScrollEnabled>
            {isOpen ? (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Opening Cash</Text>
                  <Text style={styles.detailValue}>{CURRENCY_SYMBOL} {Number(item.opening_cash).toLocaleString()}</Text>
                </View>
                <Text style={styles.sectionHeader}>Stock Counts</Text>
                {stockCounts.map(sc => (
                  <View key={sc.id} style={[styles.stockRow, sc.difference !== 0 && styles.discrepancyRow]}>
                    <Text style={styles.stockName} numberOfLines={1}>{sc.product?.name}</Text>
                    <Text style={styles.stockNum}>Sys: {sc.system_quantity}</Text>
                    <Text style={styles.stockNum}>Count: {sc.counted_quantity}</Text>
                    {sc.difference !== 0 && <Text style={styles.stockDiff}>{sc.difference > 0 ? '+' : ''}{sc.difference}</Text>}
                  </View>
                ))}
              </>
            ) : (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Expected Cash</Text>
                  <Text style={styles.detailValue}>{CURRENCY_SYMBOL} {Number(item.expected_cash || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cashier Counted</Text>
                  <Text style={styles.detailValue}>{CURRENCY_SYMBOL} {Number(item.closing_cash || 0).toLocaleString()}</Text>
                </View>
                {hasDisc && (
                  <View style={[styles.detailRow, styles.discrepancyHighlight]}>
                    <Text style={styles.discLabel}>Cash Discrepancy</Text>
                    <Text style={styles.discValue}>{CURRENCY_SYMBOL} {Number(item.cash_discrepancy).toLocaleString()}</Text>
                  </View>
                )}
                <Text style={styles.sectionHeader}>Stock Counts</Text>
                {stockCounts.map(sc => (
                  <View key={sc.id} style={[styles.stockRow, sc.difference !== 0 && styles.discrepancyRow]}>
                    <Text style={styles.stockName} numberOfLines={1}>{sc.product?.name}</Text>
                    <Text style={styles.stockNum}>Exp: {sc.system_quantity}</Text>
                    <Text style={styles.stockNum}>Count: {sc.counted_quantity}</Text>
                    {sc.difference !== 0 && <Text style={styles.stockDiff}>{sc.difference > 0 ? '+' : ''}{sc.difference}</Text>}
                  </View>
                ))}
                {(hasDisc || stockCounts.some(c => c.difference !== 0)) && (
                  <View style={styles.ackRow}>
                    <Switch value={ackDiscrepancies} onValueChange={setAckDiscrepancies} trackColor={{ true: COLORS.primary }} />
                    <Text style={styles.ackText}>I acknowledge the discrepancies</Text>
                  </View>
                )}
              </>
            )}

            <TextInput style={styles.notesInput} value={rejectReason} onChangeText={setRejectReason} placeholder="Rejection reason (required for reject)" placeholderTextColor={COLORS.textLight} multiline />

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectShift(item)} disabled={processing}>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, processing && { opacity: 0.5 }]}
                onPress={() => isOpen ? approveOpen(item) : approveClose(item)}
                disabled={processing}
              >
                {processing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.approveBtnText}>Approve</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <FlatList
      style={styles.container}
      data={shifts}
      keyExtractor={s => s.id}
      renderItem={renderShift}
      contentContainerStyle={{ padding: SPACING.lg }}
      ListEmptyComponent={<Text style={styles.emptyText}>No pending approvals</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  cardLeft: { flex: 1 },
  cashierName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cardTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  openBadge: { backgroundColor: COLORS.infoLight },
  closeBadge: { backgroundColor: COLORS.warningLight },
  typeBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  expandedContent: { paddingHorizontal: 16, paddingBottom: 16, maxHeight: 400 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 13, color: COLORS.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  discrepancyHighlight: { backgroundColor: COLORS.discrepancyBg, borderRadius: 8, paddingHorizontal: 10 },
  discLabel: { fontSize: 13, fontWeight: '600', color: COLORS.error },
  discValue: { fontSize: 16, fontWeight: '700', color: COLORS.error },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 12, marginBottom: 6 },
  stockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 },
  discrepancyRow: { backgroundColor: COLORS.discrepancyBg, borderRadius: 6, paddingHorizontal: 6 },
  stockName: { flex: 1, fontSize: 12, color: COLORS.text },
  stockNum: { fontSize: 12, color: COLORS.textSecondary, width: 60, textAlign: 'right' },
  stockDiff: { fontSize: 12, fontWeight: '700', color: COLORS.error, width: 36, textAlign: 'right' },
  ackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 10, backgroundColor: COLORS.warningLight, borderRadius: 8 },
  ackText: { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1 },
  notesInput: { backgroundColor: COLORS.background, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.text, marginTop: 12, borderWidth: 1, borderColor: COLORS.border, minHeight: 48 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rejectBtn: { flex: 1, backgroundColor: COLORS.errorLight, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.error },
  approveBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60, fontSize: 16 },
});
