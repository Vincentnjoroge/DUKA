import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../../constants';

interface DividerProps {
  label?: string;
  style?: ViewStyle;
}

export default function Divider({ label, style }: DividerProps) {
  if (!label) {
    return <View style={[styles.line, style]} />;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    fontWeight: '600',
  },
});
