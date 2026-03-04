import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../../constants';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  titleRight?: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'accent' | 'warning' | 'error';
  accentColor?: string;
  style?: ViewStyle;
  padded?: boolean;
}

export default function Card({
  children,
  title,
  titleRight,
  onPress,
  variant = 'default',
  accentColor,
  style,
  padded = true,
}: CardProps) {
  const cardStyle = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    variant === 'accent' && { backgroundColor: COLORS.primary },
    variant === 'warning' && { borderLeftWidth: 4, borderLeftColor: COLORS.warning },
    variant === 'error' && { borderLeftWidth: 4, borderLeftColor: COLORS.error },
    accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : undefined,
    padded && styles.padded,
    style,
  ];

  const content = (
    <View style={cardStyle}>
      {title && (
        <View style={styles.titleRow}>
          <Text style={[styles.title, variant === 'accent' && styles.titleWhite]}>
            {title}
          </Text>
          {titleRight}
        </View>
      )}
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 12,
  },
  padded: {
    padding: SPACING.lg,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  titleWhite: {
    color: '#fff',
  },
});
