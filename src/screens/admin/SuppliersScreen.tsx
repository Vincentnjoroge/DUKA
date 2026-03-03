import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, Alert, Pressable } from 'react-native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING } from '../../constants';

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    let q = supabase.from('suppliers').select('*').is('deleted_at', null).eq('is_active', true).order('name');
    if (search.length >= 2) q = q.ilike('name', `%${search}%`);
    const { data } = await q;
    setSuppliers(data || []);
  };

  useEffect(() => { load(); }, [search]);

  const openAdd = () => { setEditId(null); setForm({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' }); setModal(true); };
  const openEdit = (s: any) => { setEditId(s.id); setForm({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); setModal(true); };

  const save = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Supplier name is required.'); return; }
    if (editId) await supabase.from('suppliers').update(form).eq('id', editId);
    else await supabase.from('suppliers').insert(form);
    setModal(false); load();
  };

  const remove = (id: string) => Alert.alert('Delete', 'Deactivate this supplier?', [
    { text: 'Cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('suppliers').update({ deleted_at: new Date().toISOString() }).eq('id', id); load(); } },
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search suppliers..." placeholderTextColor={COLORS.textLight} />
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}><Text style={styles.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>
      <FlatList data={suppliers} keyExtractor={s => s.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => openEdit(item)} onLongPress={() => remove(item.id)}>
            <Text style={styles.rowName}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.contact_person}{item.phone ? ` • ${item.phone}` : ''}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No suppliers yet</Text>}
      />
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{editId ? 'Edit' : 'Add'} Supplier</Text>
            {(['name', 'contact_person', 'phone', 'email', 'address', 'notes'] as const).map(f => (
              <TextInput key={f} style={styles.modalInput} value={(form as any)[f]} onChangeText={v => setForm(prev => ({ ...prev, [f]: v }))} placeholder={f.replace('_', ' ')} placeholderTextColor={COLORS.textLight} />
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={save}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', padding: SPACING.md, gap: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  row: { backgroundColor: COLORS.surface, padding: 14, marginHorizontal: SPACING.md, marginTop: 6, borderRadius: 10 },
  rowName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
