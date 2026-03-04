import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import { StatusBadge } from '../common/Badge';
import Button from '../common/Button';
import { formatDateTime, formatCurrency } from '../../utils/format';
import type { Shift } from '../../types';

interface ShiftApprovalCardProps {
  shift: Shift & { cashier?: { full_name: string } };
  onApprove: (shiftId: string) => void;
  onReject: (shiftId: string) => void;
  loading?: boolean;
}

export default function ShiftApprovalCard({
  shift,
  onApprove,
  onReject,
  loading = false,
}: ShiftApprovalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDiscrepancy = shift.cash_discrepancy != null && Math.abs(shift.cash_discrepancy) > 0;

  return (
    <View style={[styles.card, hasDiscrepancy && styles.cardDiscrepancy]}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)}>
        <View>
          <Text style={styles.cashierName}>{shift.cashier?.full_name || 'Unknown'}</Text>
          <Text style={styles.date}>{formatDateTime(shift.created_at)}</Text>
        </View>
        <StatusBadge status={shift.status} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.details}>
          <View style={styles.row}>
            <Text style={styles.label}>Opening Cash:</Text>
            <Text style={styles.value}>{formatCurrency(shift.opening_cash)}</Text>
          </View>
          {shift.closing_cash !== null && (
            <View style={styles.row}>
              <Text style={styles.label}>Closing Cash:</Text>
              <Text style={styles.value}>{formatCurrency(shift.closing_cash)}</Text>
            </View>
          )}
          {shift.expected_cash !== null && (
            <View style={styles.row}>
              <Text style={styles.label}>Expected Cash:</Text>
              <Text style={styles.value}>{formatCurrency(shift.expected_cash)}</Text>
            </View>
          )}
          {hasDiscrepancy && (
            <View style={[styles.row, styles.discrepancyRow]}>
              <Text style={styles.discrepancyLabel}>Discrepancy:</Text>
              <Text style={styles.discrepancyValue}>
                {shift.cash_discrepancy! > 0 ? '+' : ''}{formatCurrency(shift.cash_discrepancy!)}
              </Text>
            </View>
          )}
          {shift.notes && (
            <View style={styles.notesRow}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.notes}>{shift.notes}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              title="Reject"
              onPress={() => onReject(shift.id)}
              variant="outline"
              size="sm"
              disabled={loading}
              style={styles.actionBtn}
            />
            <Button
              title="Approve"
              onPress={() => onApprove(shift.id)}
              variant="primary"
              size="sm"
              loading={loading}
              style={styles.actionBtn}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardDiscrepancy: {
    backgroundColor: COLORS.discrepancyBg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  cashierName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  date: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  details: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: { fontSize: 13, color: COLORS.textSecondary },
  value: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  discrepancyRow: {
    backgroundColor: COLORS.warningLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
  },
  discrepancyLabel: { fontSize: 13, fontWeight: '600', color: COLORS.warning },
  discrepancyValue: { fontSize: 13, fontWeight: '700', color: COLORS.error },
  notesRow: { marginTop: 8 },
  notes: { fontSize: 13, color: COLORS.text, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.lg,
  },
  actionBtn: { flex: 1 },
});
