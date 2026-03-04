import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Vibration,
  Platform,
} from 'react-native';
import { COLORS, PIN_LENGTH, SPACING } from '../../constants';

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  error?: boolean;
  autoFocus?: boolean;
}

export default function PinInput({
  length = PIN_LENGTH,
  onComplete,
  error = false,
  autoFocus = true,
}: PinInputProps) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (error) {
      setPin('');
      if (Platform.OS !== 'web') Vibration.vibrate(300);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [error]);

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
    setPin(cleaned);
    if (cleaned.length === length) {
      onComplete(cleaned);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              pin.length > i && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={pin}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        contextMenuHidden
        secureTextEntry
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dotError: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
