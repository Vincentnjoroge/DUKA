import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, CURRENCY_SYMBOL, MPESA_STUCK_PAYMENT_THRESHOLD_MIN } from '../../constants';
import { format, startOfDay, endOfDay, startOfWeek, subWeeks } from 'date-fns';

export default function AdminDashboard() {
  const nav = useNavigation<any>();
  const { user, signOut } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [stuckPayments, setStuckPayments] = useState(0);
  const [weekRevenue, setWeekRevenue] = useState(0);
  const [lastWeekRevenue, setLastWeekRevenue] = useState(0);

  const loadData = useCallback(async () => {
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString();

    const [salesRes, pendingRes, shiftRes, stockRes, stuckRes, weekRes, lastWeekRes] = await Promise.all([
      supabase.from('sales').select('total_amount').eq('status', 'completed').gte('created_at', todayStart).lte('created_at', todayEnd),
      supabase.from('shifts').select('id', { count: 'exact', head: true }).in('status', ['pending_open', 'pending_close']),
      supabase.from('shifts').select('*, cashier:users!cashier_id(full_name)').eq('status', 'open').limit(1).maybeSingle(),
      supabase.from('products').select('id, name, current_stock, reorder_level').eq('is_active', true).is('deleted_at', null).lte('current_stock', 10).order('current_stock'),
      supabase.from('sales').select('id', { count: 'exact', head: true })
        .eq('payment_status', 'pending').in('payment_method', ['mpesa_stk', 'mpesa_till'])
        .lt('created_at', new Date(Date.now() - MPESA_STUCK_PAYMENT_THRESHOLD_MIN * 60000).toISOString()),
      supabase.from('sales').select('total_amount').eq('status', 'completed').gte('created_at', thisWeekStart),
      supabase.from('sales').select('total_amount').eq('status', 'completed').gte('created_at', lastWeekStart).lt('created_at', thisWeekStart),
    ]);

    setTodayRevenue(salesRes.data?.reduce((s: number, r: any) => s + Number(r.total_amount), 0) ?? 0);
    setTodaySales(salesRes.data?.length ?? 0);
    setPendingApprovals(pendingRes.count ?? 0);
    setActiveShift(shiftRes.data);
    setLowStock((stockRes.data ?? []).filter((p: any) => p.current_stock <= p.reorder_level));
    setStuckPayments(stuckRes.count ?? 0);
    setWeekRevenue(weekRes.data?.reduce((s: number, r: any) => s + Number(r.total_amount), 0) ?? 0);
    setLastWeekRevenue(lastWeekRes.data?.reduce((s: number, r: any) => s + Number(r.total_amount), 0) ?? 0);
  }, []);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const channel = supabase.channel('admin-dash').on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => loadData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };
  const weekDiff = lastWeekRevenue > 0 ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue * 100).toFixed(1) : '—';

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>DUKA Admin</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
        </View>
        <TouchableOpacity onPress={signOut}><Text style={styles.signOut}>Sign Out</Text></TouchableOpacity>
      </View>

      {/* Revenue */}
      <View style={[styles.card, styles.revenueCard]}>
        <Text style={styles.cardLabelWhite}>Today's Revenue</Text>
        <Text style={styles.revenueAmount}>{CURRENCY_SYMBOL} {todayRevenue.toLocaleString()}</Text>
        <Text style={styles.salesCount}>{todaySales} sale{todaySales !== 1 ? 's' : ''}</Text>
      </View>

      {/* Action Cards Row */}
      <View style={styles.row}>
        <TouchableOpacity style={[styles.actionCard, pendingApprovals > 0 && styles.actionCardAlert]} onPress={() => nav.navigate('ShiftApproval')}>
          <Text style={styles.actionNum}>{pendingApprovals}</Text>
          <Text style={styles.actionLabel}>Pending Approvals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, stuckPayments > 0 && styles.actionCardWarn]} onPress={() => nav.navigate('StuckPayments')}>
          <Text style={styles.actionNum}>{stuckPayments}</Text>
          <Text style={styles.actionLabel}>Stuck Payments</Text>
        </TouchableOpacity>
      </View>

      {/* Active Shift */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Shift</Text>
        {activeShift ? (
          <View>
            <Text style={styles.shiftName}>{activeShift.cashier?.full_name}</Text>
            <Text style={styles.shiftTime}>Since {format(new Date(activeShift.opened_at || activeShift.created_at), 'HH:mm')}</Text>
          </View>
        ) : (
          <Text style={styles.noData}>No active shift</Text>
        )}
      </View>

      {/* Week Comparison */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Comparison</Text>
        <View style={styles.compRow}>
          <View style={styles.compItem}>
            <Text style={styles.compLabel}>This Week</Text>
            <Text style={styles.compValue}>{CURRENCY_SYMBOL} {weekRevenue.toLocaleString()}</Text>
          </View>
          <View style={styles.compItem}>
            <Text style={styles.compLabel}>Last Week</Text>
            <Text style={styles.compValue}>{CURRENCY_SYMBOL} {lastWeekRevenue.toLocaleString()}</Text>
          </View>
          <View style={styles.compItem}>
            <Text style={styles.compLabel}>Change</Text>
            <Text style={[styles.compValue, { color: weekRevenue >= lastWeekRevenue ? COLORS.success : COLORS.error }]}>
              {weekDiff}%
            </Text>
          </View>
        </View>
      </View>

      {/* Low Stock */}
      {lowStock.length > 0 && (
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: COLORS.warning }]}>
          <Text style={styles.cardTitle}>Low Stock Alerts ({lowStock.length})</Text>
          {lowStock.slice(0, 8).map(p => (
            <View key={p.id} style={styles.lowStockRow}>
              <Text style={styles.lowStockName}>{p.name}</Text>
              <Text style={[styles.lowStockQty, p.current_stock === 0 && { color: COLORS.error }]}>
                {p.current_stock} left
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.xxl },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  date: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  signOut: { fontSize: 14, color: COLORS.error, fontWeight: '600' },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginHorizontal: SPACING.lg, marginBottom: 12 },
  revenueCard: { backgroundColor: COLORS.primary },
  cardLabelWhite: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  revenueAmount: { fontSize: 36, fontWeight: '700', color: '#fff', marginVertical: 4 },
  salesCount: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  row: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 10, marginBottom: 12 },
  actionCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, alignItems: 'center' },
  actionCardAlert: { backgroundColor: COLORS.errorLight },
  actionCardWarn: { backgroundColor: COLORS.warningLight },
  actionNum: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  actionLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  shiftName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  shiftTime: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  noData: { fontSize: 14, color: COLORS.textSecondary },
  compRow: { flexDirection: 'row', gap: 12 },
  compItem: { flex: 1 },
  compLabel: { fontSize: 11, color: COLORS.textSecondary },
  compValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  lowStockRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  lowStockName: { fontSize: 13, color: COLORS.text, flex: 1 },
  lowStockQty: { fontSize: 13, fontWeight: '600', color: COLORS.warning },
});
