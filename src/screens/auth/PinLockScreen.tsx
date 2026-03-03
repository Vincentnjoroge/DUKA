import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, PIN_LENGTH, MAX_PIN_ATTEMPTS } from '../../constants';
import { useAuthStore } from '../../store/authStore';

const KEYS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']] as const;

export default function PinLockScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { user, pinAttempts, unlockWithPin, signOut } = useAuthStore();
  const remaining = MAX_PIN_ATTEMPTS - pinAttempts;

  const handleKey = useCallback(async (key: string) => {
    if (isVerifying) return;
    if (key === 'del') { setPin(p => p.slice(0, -1)); setError(null); return; }
    if (key === '') return;
    const next = pin + key;
    if (next.length > PIN_LENGTH) return;
    setPin(next);
    setError(null);
    if (next.length === PIN_LENGTH) {
      setIsVerifying(true);
      const result = await unlockWithPin(next);
      if (result.error) {
        if (Platform.OS !== 'web') Vibration.vibrate(200);
        setError(result.error);
        setPin('');
      }
      setIsVerifying(false);
    }
  }, [pin, isVerifying, unlockWithPin]);

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';
  const firstName = user?.full_name?.split(' ')[0] ?? 'User';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <Text style={styles.greeting}>Welcome back, {firstName}</Text>
        <Text style={styles.instruction}>Enter your PIN to unlock</Text>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled, error && styles.dotError]} />
        ))}
      </View>

      <View style={styles.feedback}>
        {error ? <Text style={styles.errorText}>{error}</Text>
          : remaining < MAX_PIN_ATTEMPTS && remaining > 0
            ? <Text style={styles.attemptsText}>{remaining} attempt{remaining !== 1 ? 's' : ''} remaining</Text>
            : <Text> </Text>}
      </View>

      <View style={styles.pad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.padRow}>
            {row.map((key, ki) => {
              if (key === '') return <View key={`e${ki}`} style={styles.keyEmpty} />;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.key, key === 'del' && styles.keyDel]}
                  onPress={() => handleKey(key)}
                  activeOpacity={0.6}
                  disabled={isVerifying}
                >
                  <Text style={key === 'del' ? styles.delText : styles.keyText}>
                    {key === 'del' ? 'Delete' : key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.signOut} onPress={signOut} disabled={isVerifying}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const DOT = 16, KEY = 72;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl },
  header: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  greeting: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 4 },
  instruction: { fontSize: 14, color: COLORS.primaryLight },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2, borderColor: COLORS.primaryLight },
  dotFilled: { backgroundColor: '#fff', borderColor: '#fff' },
  dotError: { borderColor: COLORS.error },
  feedback: { height: 32, justifyContent: 'center', marginBottom: 20 },
  errorText: { fontSize: 13, color: COLORS.errorLight, fontWeight: '500', textAlign: 'center' },
  attemptsText: { fontSize: 13, color: COLORS.secondaryLight, fontWeight: '500' },
  pad: { gap: 12 },
  padRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  key: { width: KEY, height: KEY, borderRadius: KEY / 2, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  keyEmpty: { width: KEY, height: KEY },
  keyDel: { backgroundColor: 'transparent' },
  keyText: { fontSize: 28, color: '#fff' },
  delText: { fontSize: 14, fontWeight: '600', color: COLORS.primaryLight },
  signOut: { marginTop: 32, padding: 8 },
  signOutText: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '500', textDecorationLine: 'underline' },
});
