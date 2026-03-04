import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../../constants';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  onPress?: () => void;
  variant?: 'default' | 'accent' | 'alert' | 'warn';
  compact?: boolean;
  style?: ViewStyle;
}

export default function MetricCard({
  label,
  value,
  subtitle,
  color,
  onPress,
  variant = 'default',
  compact = false,
  style,
}: MetricCardProps) {
  const cardContent = (
    <View
      style={[
        styles.card,
        variant === 'accent' && styles.accent,
        variant === 'alert' && styles.alert,
        variant === 'warn' && styles.warn,
        compact && styles.compact,
        style,
      ]}
    >
      <Text
        style={[
          styles.value,
          color ? { color } : undefined,
          variant === 'accent' && styles.valueAccent,
          compact && styles.valueCompact,
        ]}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text
        style={[
          styles.label,
          variant === 'accent' && styles.labelAccent,
        ]}
      >
        {label}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, variant === 'accent' && styles.subtitleAccent]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.flex}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return <View style={styles.flex}>{cardContent}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  compact: {
    padding: SPACING.md,
  },
  accent: {
    backgroundColor: COLORS.primary,
  },
  alert: {
    backgroundColor: COLORS.errorLight,
  },
  warn: {
    backgroundColor: COLORS.warningLight,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  valueAccent: {
    color: '#fff',
    fontSize: 36,
  },
  valueCompact: {
    fontSize: 22,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  labelAccent: {
    color: 'rgba(255,255,255,0.8)',
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  subtitleAccent: {
    color: 'rgba(255,255,255,0.6)',
  },
});
