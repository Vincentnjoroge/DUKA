import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../constants';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  showScanButton?: boolean;
  onScan?: () => void;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  showScanButton = false,
  onScan,
  autoFocus = false,
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      {showScanButton && (
        <TouchableOpacity style={styles.scanBtn} onPress={onScan}>
          <Text style={styles.scanBtnText}>SCAN</Text>
        </TouchableOpacity>
      )}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={() => onChangeText('')}>
          <Text style={styles.clearBtnText}>X</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scanBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  scanBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearBtn: {
    position: 'absolute',
    right: SPACING.md + 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  clearBtnText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
});
