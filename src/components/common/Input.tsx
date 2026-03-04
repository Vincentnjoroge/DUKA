import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import { COLORS, SPACING } from '../../constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: React.ReactNode;
  rightAction?: { label: string; onPress: () => void };
  containerStyle?: ViewStyle;
  variant?: 'default' | 'large' | 'amount';
}

const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      rightIcon,
      rightAction,
      containerStyle,
      variant = 'default',
      style,
      ...inputProps
    },
    ref
  ) => {
    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        {hint && <Text style={styles.hint}>{hint}</Text>}
        <View style={styles.inputWrap}>
          <TextInput
            ref={ref}
            style={[
              styles.input,
              variant === 'large' && styles.inputLarge,
              variant === 'amount' && styles.inputAmount,
              error ? styles.inputError : undefined,
              rightAction || rightIcon ? styles.inputWithRight : undefined,
              style,
            ]}
            placeholderTextColor={COLORS.textLight}
            {...inputProps}
          />
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
          {rightAction && (
            <TouchableOpacity style={styles.rightAction} onPress={rightAction.onPress}>
              <Text style={styles.rightActionText}>{rightAction.label}</Text>
            </TouchableOpacity>
          )}
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';
export default Input;

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.lg,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: COLORS.text,
  },
  inputLarge: {
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 16,
  },
  inputAmount: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 14,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputWithRight: {
    paddingRight: 70,
  },
  rightIcon: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  rightAction: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  rightActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },
  error: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
});
