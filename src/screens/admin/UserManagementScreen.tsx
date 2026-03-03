import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING } from '../../constants';
import { format } from 'date-fns';

export default function UserManagementScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'cashier').order('full_name');
    setUsers(data || []);
  };

  const addCashier = async () => {
    if (!newName.trim() || !newEmail.trim()) { Alert.alert('Required', 'Name and email required.'); return; }
    setSaving(true);
    // Create auth user with temporary password, then insert profile
    const tempPwd = `Duka${Math.random().toString(36).slice(2, 10)}!`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: newEmail.trim(), password: tempPwd, email_confirm: true,
    });
    if (authError) {
      // Fallback: use signUp if admin API not available
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: newEmail.trim(), password: tempPwd });
      if (signUpError) { setSaving(false); Alert.alert('Error', signUpError.message); return; }
      if (signUpData.user) {
        await supabase.from('users').insert({ id: signUpData.user.id, email: newEmail.trim(), full_name: newName.trim(), role: 'cashier' });
      }
    } else if (authData.user) {
      await supabase.from('users').insert({ id: authData.user.id, email: newEmail.trim(), full_name: newName.trim(), role: 'cashier' });
    }
    setSaving(false); setAddModal(false); setNewName(''); setNewEmail(''); load();
    Alert.alert('Cashier Added', `Temporary password: ${tempPwd}\nAsk them to reset via email.`);
  };

  const toggleActive = async (user: any) => {
    await supabase.from('users').update({ is_active: !user.is_active }).eq('id', user.id);
    load();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
        <Text style={styles.addBtnText}>+ Add Cashier</Text>
      </TouchableOpacity>

      <FlatList data={users} keyExtractor={u => u.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.full_name}</Text>
              <Text style={styles.rowEmail}>{item.email}</Text>
              <Text style={styles.rowLogin}>Last login: {item.last_login_at ? format(new Date(item.last_login_at), 'MMM d, HH:mm') : 'Never'}</Text>
            </View>
            <TouchableOpacity style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]} onPress={() => toggleActive(item)}>
              <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
        ListEmptyComponent={<Text style={styles.empty}>No cashiers yet</Text>}
      />

      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setAddModal(false)}>
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add Cashier</Text>
            <TextInput style={styles.modalInput} value={newName} onChangeText={setNewName} placeholder="Full Name" placeholderTextColor={COLORS.textLight} />
            <TextInput style={styles.modalInput} value={newEmail} onChangeText={setNewEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.textLight} />
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={addCashier} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Account</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  addBtn: { backgroundColor: COLORS.primary, margin: SPACING.lg, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, marginBottom: 8 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rowLogin: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  activeBadge: { backgroundColor: COLORS.successLight },
  inactiveBadge: { backgroundColor: COLORS.errorLight },
  statusText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
