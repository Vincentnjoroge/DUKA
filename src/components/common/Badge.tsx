import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../constants';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'mpesa';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: COLORS.successLight, text: COLORS.success },
  warning: { bg: COLORS.warningLight, text: COLORS.warning },
  error: { bg: COLORS.errorLight, text: COLORS.error },
  info: { bg: COLORS.infoLight, text: COLORS.info },
  neutral: { bg: COLORS.background, text: COLORS.textSecondary },
  mpesa: { bg: '#E8F5E9', text: COLORS.mpesa },
};

export default function Badge({ label, variant = 'neutral', size = 'sm', style }: BadgeProps) {
  const colors = BADGE_COLORS[variant];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        size === 'md' && styles.badgeMd,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text },
          size === 'md' && styles.textMd,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// Convenience helpers
export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    open: 'success',
    completed: 'success',
    received: 'success',
    pending_open: 'warning',
    pending_close: 'warning',
    pending: 'warning',
    partial: 'warning',
    draft: 'neutral',
    sent: 'info',
    closed: 'neutral',
    cancelled: 'error',
    failed: 'error',
    rejected: 'error',
    refunded: 'info',
  };

  return (
    <Badge
      label={status.replace(/_/g, ' ').toUpperCase()}
      variant={variantMap[status] || 'neutral'}
    />
  );
}

export function ExpiryBadge({ daysUntilExpiry }: { daysUntilExpiry: number }) {
  if (daysUntilExpiry < 0) return <Badge label="EXPIRED" variant="error" />;
  if (daysUntilExpiry <= 14) return <Badge label={`${daysUntilExpiry}d left`} variant="error" />;
  if (daysUntilExpiry <= 30) return <Badge label={`${daysUntilExpiry}d left`} variant="warning" />;
  return null;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textMd: {
    fontSize: 12,
  },
});
