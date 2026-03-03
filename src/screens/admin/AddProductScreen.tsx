import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';

export default function AddProductScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const editId = route.params?.productId;
  const isEdit = !!editId;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [openingStock, setOpeningStock] = useState('0');
  const [expiryDate, setExpiryDate] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLookups();
    if (isEdit) loadProduct();
  }, []);

  const loadLookups = async () => {
    const [catRes, supRes] = await Promise.all([
      supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order'),
      supabase.from('suppliers').select('id, name').eq('is_active', true).is('deleted_at', null).order('name'),
    ]);
    setCategories(catRes.data || []);
    setSuppliers(supRes.data || []);
  };

  const loadProduct = async () => {
    const { data } = await supabase.from('products').select('*').eq('id', editId).single();
    if (data) {
      setName(data.name); setSku(data.sku); setBarcode(data.barcode || '');
      setCategoryId(data.category_id || ''); setSupplierId(data.supplier_id || '');
      setBuyingPrice(data.buying_price.toString()); setSellingPrice(data.selling_price.toString());
      setReorderLevel(data.reorder_level.toString()); setExpiryDate(data.expiry_date || '');
    }
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Product name is required.'); return; }
    if (!buyingPrice || !sellingPrice) { Alert.alert('Required', 'Prices are required.'); return; }
    const bp = parseFloat(buyingPrice), sp = parseFloat(sellingPrice);
    if (sp < bp) {
      Alert.alert('Warning', 'Selling price is less than buying price. Continue?', [
        { text: 'Cancel' }, { text: 'Continue', onPress: () => doSave(bp, sp) },
      ]);
      return;
    }
    doSave(bp, sp);
  };

  const doSave = async (bp: number, sp: number) => {
    setSaving(true);
    const payload: any = {
      name: name.trim(), barcode: barcode.trim() || null,
      category_id: categoryId || null, supplier_id: supplierId || null,
      buying_price: bp, selling_price: sp,
      reorder_level: parseInt(reorderLevel) || 10,
      expiry_date: expiryDate || null,
    };
    if (!isEdit) { payload.current_stock = parseInt(openingStock) || 0; payload.sku = sku || undefined; }

    const { error } = isEdit
      ? await supabase.from('products').update(payload).eq('id', editId)
      : await supabase.from('products').insert(payload);

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    nav.goBack();
  };

  const Field = ({ label, value, onChange, keyboard = 'default', placeholder = '' }: any) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType={keyboard} placeholder={placeholder} placeholderTextColor={COLORS.textLight} />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg }} keyboardShouldPersistTaps="handled">
      <Field label="Product Name *" value={name} onChange={setName} placeholder="e.g. Johnnie Walker Black" />
      {!isEdit && <Field label="SKU" value={sku} onChange={setSku} placeholder="Auto-generated if empty" />}
      <Field label="Barcode" value={barcode} onChange={setBarcode} placeholder="Scan or type barcode" />

      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {categories.map(c => (
            <TouchableOpacity key={c.id} style={[styles.chip, categoryId === c.id && styles.chipActive]} onPress={() => setCategoryId(c.id)}>
              <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Supplier</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {suppliers.map(s => (
            <TouchableOpacity key={s.id} style={[styles.chip, supplierId === s.id && styles.chipActive]} onPress={() => setSupplierId(s.id)}>
              <Text style={[styles.chipText, supplierId === s.id && styles.chipTextActive]}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.priceRow}>
        <Field label="Buying Price *" value={buyingPrice} onChange={setBuyingPrice} keyboard="numeric" placeholder="0" />
        <Field label="Selling Price *" value={sellingPrice} onChange={setSellingPrice} keyboard="numeric" placeholder="0" />
      </View>

      <View style={styles.priceRow}>
        <Field label="Reorder Level" value={reorderLevel} onChange={setReorderLevel} keyboard="numeric" />
        {!isEdit && <Field label="Opening Stock" value={openingStock} onChange={setOpeningStock} keyboard="numeric" />}
      </View>

      <Field label="Expiry Date" value={expiryDate} onChange={setExpiryDate} placeholder="YYYY-MM-DD (optional)" />

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Update Product' : 'Save Product'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  field: { marginBottom: 16, flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  chipRow: { flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  priceRow: { flexDirection: 'row', gap: 12 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
