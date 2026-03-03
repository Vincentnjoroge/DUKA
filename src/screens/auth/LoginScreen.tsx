import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { COLORS, FONTS, SPACING, APP_NAME } from '../../constants';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [secureEntry, setSecureEntry] = useState(true);
  const passwordRef = useRef<TextInput>(null);
  const { signIn, isLoading } = useAuthStore();

  const handleSignIn = async () => {
    Keyboard.dismiss();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { setError('Please enter your email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    const result = await signIn(trimmedEmail, password);
    if (result.error) setError(result.error);
  };

  const isFormValid = email.trim().length > 0 && password.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.branding}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoText}>D</Text>
          </View>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.tagline}>Point of Sale</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSubtitle}>Enter your credentials to continue</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={[styles.input, error && !email.trim() && styles.inputError]}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textLight}
              value={email}
              onChangeText={(t) => { setEmail(t); if (error) setError(null); }}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              editable={!isLoading}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={(t) => { setPassword(t); if (error) setError(null); }}
                secureTextEntry={secureEntry}
                autoCapitalize="none"
                textContentType="password"
                returnKeyType="go"
                editable={!isLoading}
                onSubmitEditing={handleSignIn}
              />
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => setSecureEntry(!secureEntry)}
              >
                <Text style={styles.toggleText}>{secureEntry ? 'Show' : 'Hide'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signInBtn, (!isFormValid || isLoading) && styles.signInBtnDisabled]}
            onPress={handleSignIn}
            disabled={!isFormValid || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.signInText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Contact your administrator if you need access.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xxl },
  branding: { alignItems: 'center', marginBottom: SPACING.xxxl },
  logoIcon: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  logoText: { fontSize: 36, fontWeight: '700', color: COLORS.primary },
  appName: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: 2 },
  tagline: { fontSize: 14, color: COLORS.primaryLight, marginTop: 4, letterSpacing: 1 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.xxxl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xxl },
  errorBox: { backgroundColor: COLORS.errorLight, borderRadius: 8, padding: SPACING.md, marginBottom: SPACING.lg },
  errorText: { fontSize: 13, color: COLORS.error, fontWeight: '500' },
  inputGroup: { marginBottom: SPACING.lg },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.text, marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: SPACING.lg, paddingVertical: Platform.OS === 'ios' ? 16 : 12, fontSize: 16, color: COLORS.text,
  },
  inputError: { borderColor: COLORS.error },
  passwordWrap: { position: 'relative' as const },
  passwordInput: { paddingRight: 70 },
  toggleBtn: { position: 'absolute' as const, right: 16, top: 0, bottom: 0, justifyContent: 'center' as const },
  toggleText: { fontSize: 13, fontWeight: '600', color: COLORS.primaryLight },
  signInBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 8, minHeight: 52,
  },
  signInBtnDisabled: { backgroundColor: COLORS.disabled },
  signInText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  footer: { textAlign: 'center', color: COLORS.primaryLight, fontSize: 12, marginTop: SPACING.xxl, opacity: 0.8 },
});
