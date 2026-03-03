import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useShiftStore } from '../../store/shiftStore';
import { useCartStore } from '../../store/cartStore';
import { COLORS, SPACING } from '../../constants';
import { format } from 'date-fns';

export default function CashierDashboard() {
  const nav = useNavigation<any>();
  const { user, signOut } = useAuthStore();
  const { currentShift, isLoading, fetchCurrentShift, subscribeToShiftUpdates } = useShiftStore();
  const { restoreCart } = useCartStore();

  useEffect(() => {
    if (user) fetchCurrentShift(user.id);
    restoreCart();
  }, [user]);

  useEffect(() => {
    if (currentShift?.id) {
      const unsub = subscribeToShiftUpdates(currentShift.id);
      return unsub;
    }
  }, [currentShift?.id]);

  useEffect(() => {
    if (currentShift?.status === 'open') {
      nav.navigate('CashierTabs');
    }
  }, [currentShift?.status]);

  const status = currentShift?.status ?? 'no_shift';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{user?.full_name}</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <View style={[styles.badge, status === 'open' && styles.badgeOpen,
          status === 'pending_open' && styles.badgePending,
          status === 'pending_close' && styles.badgePending,
          status === 'rejected' && styles.badgeRejected]}>
          <Text style={styles.badgeText}>
            {status === 'no_shift' ? 'No Active Shift'
              : status === 'pending_open' ? 'Pending Approval'
              : status === 'open' ? 'Shift Open'
              : status === 'pending_close' ? 'Closing Pending'
              : status === 'rejected' ? 'Rejected'
              : status}
          </Text>
        </View>
      </View>

      {isLoading && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />}

      {!isLoading && status === 'no_shift' && (
        <TouchableOpacity style={styles.startBtn} onPress={() => nav.navigate('OpenShift')} activeOpacity={0.8}>
          <Text style={styles.startBtnText}>Start Your Shift</Text>
        </TouchableOpacity>
      )}

      {!isLoading && status === 'pending_open' && (
        <View style={styles.waitingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.waitingText}>Waiting for Manager Approval</Text>
          <Text style={styles.waitingSubText}>Opening cash: KSh {currentShift?.opening_cash?.toLocaleString()}</Text>
        </View>
      )}

      {!isLoading && status === 'pending_close' && (
        <View style={styles.waitingCard}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text style={styles.waitingText}>Waiting for Close Approval</Text>
        </View>
      )}

      {!isLoading && status === 'rejected' && (
        <View style={styles.rejectedCard}>
          <Text style={styles.rejectedTitle}>Shift Rejected</Text>
          <Text style={styles.rejectedNotes}>{currentShift?.rejection_notes || 'No reason provided.'}</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => nav.navigate('OpenShift')}>
            <Text style={styles.startBtnText}>Resubmit</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xxl },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  date: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  signOutBtn: { padding: 8 },
  signOutText: { fontSize: 14, color: COLORS.error, fontWeight: '600' },
  statusCard: { alignItems: 'center', marginBottom: SPACING.xxl },
  badge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.border },
  badgeOpen: { backgroundColor: COLORS.successLight },
  badgePending: { backgroundColor: COLORS.warningLight },
  badgeRejected: { backgroundColor: COLORS.errorLight },
  badgeText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  startBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 20,
    alignItems: 'center', marginTop: 40, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  startBtnText: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  waitingCard: { alignItems: 'center', marginTop: 60, gap: 16 },
  waitingText: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  waitingSubText: { fontSize: 14, color: COLORS.textSecondary },
  rejectedCard: { alignItems: 'center', marginTop: 40, gap: 12 },
  rejectedTitle: { fontSize: 18, fontWeight: '700', color: COLORS.error },
  rejectedNotes: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
});
