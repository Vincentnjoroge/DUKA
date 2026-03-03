import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING } from '../../constants';

export default function SettingsScreen() {
  const nav = useNavigation<any>();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('app_settings').select('key, value');
    const map: Record<string, string> = {};
    (data || []).forEach((s: any) => { map[s.key] = s.value; });
    setSettings(map);
    setLoading(false);
  };

  const update = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('app_settings').update({ value }).eq('key', key);
    }
    setSaving(false);
    Alert.alert('Saved', 'Settings updated successfully.');
  };

  const testMpesa = () => Alert.alert('Test M-Pesa', 'This will send a KSh 1 STK Push to your phone to verify credentials. Configure credentials first.');

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const isSandbox = settings.mpesa_environment === 'sandbox';

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const Field = ({ label, settingsKey, secure = false, keyboard = 'default' as any }: any) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={settings[settingsKey] || ''} onChangeText={v => update(settingsKey, v)} secureTextEntry={secure} keyboardType={keyboard} placeholderTextColor={COLORS.textLight} />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}>
      <Section title="Store Settings">
        <Field label="Store Name" settingsKey="store_name" />
        <Field label="Address" settingsKey="store_address" />
        <Field label="Phone" settingsKey="store_phone" keyboard="phone-pad" />
        <Field label="Email" settingsKey="store_email" keyboard="email-address" />
        <Field label="Admin Notification Email" settingsKey="admin_notification_email" keyboard="email-address" />
      </Section>

      <Section title="M-Pesa Settings">
        <View style={styles.envRow}>
          <Text style={styles.label}>Environment</Text>
          <View style={styles.envToggle}>
            <Text style={[styles.envLabel, isSandbox && { color: COLORS.primary }]}>Sandbox</Text>
            <Switch value={!isSandbox} onValueChange={v => update('mpesa_environment', v ? 'production' : 'sandbox')} trackColor={{ true: COLORS.error }} />
            <Text style={[styles.envLabel, !isSandbox && { color: COLORS.error, fontWeight: '700' }]}>Production</Text>
          </View>
          {!isSandbox && <Text style={styles.prodWarning}>LIVE M-Pesa — real money!</Text>}
        </View>
        <Field label="Consumer Key" settingsKey="mpesa_consumer_key" secure />
        <Field label="Consumer Secret" settingsKey="mpesa_consumer_secret" secure />
        <Field label="Shortcode" settingsKey="mpesa_shortcode" />
        <Field label="Passkey" settingsKey="mpesa_passkey" secure />
        <Field label="Till Number" settingsKey="mpesa_till_number" />
        <TouchableOpacity style={styles.testBtn} onPress={testMpesa}>
          <Text style={styles.testBtnText}>Test Connection</Text>
        </TouchableOpacity>
      </Section>

      <Section title="POS Settings">
        <Field label="Max Cashier Discount (%)" settingsKey="max_cashier_discount_pct" keyboard="numeric" />
        <Field label="Default Reorder Threshold" settingsKey="reorder_alert_threshold" keyboard="numeric" />
        <Field label="Daily Summary Time (HH:MM)" settingsKey="daily_summary_time" />
      </Section>

      <TouchableOpacity style={styles.usersBtn} onPress={() => nav.navigate('UserManagement')}>
        <Text style={styles.usersBtnText}>Manage Users</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save All Settings</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  input: { backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  envRow: { marginBottom: 12 },
  envToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  envLabel: { fontSize: 13, color: COLORS.textSecondary },
  prodWarning: { fontSize: 12, color: COLORS.error, fontWeight: '600', marginTop: 4 },
  testBtn: { backgroundColor: COLORS.info, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  testBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  usersBtn: { backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: COLORS.primary },
  usersBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
