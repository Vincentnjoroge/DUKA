import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';

export default function SaleCompleteScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { receiptNumber, totalAmount, paymentMethod, changeDue, mpesaRef } = route.params || {};

  const paymentLabel = paymentMethod === 'cash' ? 'Cash' : 'M-Pesa';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Text style={styles.title}>Sale Complete!</Text>
        <Text style={styles.amount}>{CURRENCY_SYMBOL} {Number(totalAmount).toLocaleString()}</Text>

        <View style={styles.details}>
          {receiptNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Receipt #</Text>
              <Text style={styles.detailValue}>{receiptNumber}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment</Text>
            <Text style={styles.detailValue}>{paymentLabel}</Text>
          </View>
          {paymentMethod === 'cash' && changeDue > 0 && (
            <View style={[styles.detailRow, styles.changeRow]}>
              <Text style={styles.changeLabel}>Change Due</Text>
              <Text style={styles.changeValue}>{CURRENCY_SYMBOL} {Number(changeDue).toLocaleString()}</Text>
            </View>
          )}
          {mpesaRef && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>M-Pesa Ref</Text>
              <Text style={[styles.detailValue, { fontFamily: 'monospace' }]}>{mpesaRef}</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.newSaleBtn}
        onPress={() => nav.navigate('CashierTabs')}
        activeOpacity={0.8}
      >
        <Text style={styles.newSaleBtnText}>New Sale</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: SPACING.xxl },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 32, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.successLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  checkMark: { fontSize: 40, color: COLORS.success },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  amount: { fontSize: 32, fontWeight: '700', color: COLORS.primary, marginBottom: 24 },
  details: { width: '100%', gap: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 14, color: COLORS.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  changeRow: { backgroundColor: COLORS.successLight, borderRadius: 8, paddingHorizontal: 12, borderBottomWidth: 0 },
  changeLabel: { fontSize: 16, fontWeight: '600', color: COLORS.success },
  changeValue: { fontSize: 20, fontWeight: '700', color: COLORS.success },
  newSaleBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  newSaleBtnText: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 1 },
});
