import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../store/authStore';
import { useShiftStore } from '../../store/shiftStore';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import type { Product, StockCountEntry } from '../../types';

export default function OpenShiftScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuthStore();
  const { openShift, isLoading } = useShiftStore();

  const [openingCash, setOpeningCash] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, current_stock, barcode')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name');
    setProducts((data as Product[]) || []);
    setLoadingProducts(false);
  };

  // Team insight: Quick fill from system — copies current_stock to all counted fields
  const quickFillFromSystem = () => {
    const filled: Record<string, string> = {};
    products.forEach(p => { filled[p.id] = String(p.current_stock); });
    setCounts(filled);
  };

  const handleSubmit = async () => {
    const cash = parseFloat(openingCash);
    if (isNaN(cash) || cash < 0) {
      Alert.alert('Invalid', 'Please enter a valid opening cash amount.');
      return;
    }

    // Validate all products have counts
    const missing = products.filter(p => !counts[p.id] && counts[p.id] !== '0');
    if (missing.length > 0) {
      Alert.alert('Incomplete', `Please count all products. ${missing.length} remaining.`);
      return;
    }

    const stockCounts: StockCountEntry[] = products.map(p => ({
      product_id: p.id,
      product_name: p.name,
      system_quantity: p.current_stock,
      counted_quantity: parseInt(counts[p.id] || '0', 10),
    }));

    const { error } = await openShift(user!.id, cash, stockCounts);
    if (error) {
      Alert.alert('Error', error);
    } else {
      nav.goBack();
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productRow}>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.systemStock}>System: {item.current_stock}</Text>
      </View>
      <TextInput
        style={styles.countInput}
        value={counts[item.id] ?? ''}
        onChangeText={v => setCounts(prev => ({ ...prev, [item.id]: v }))}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={COLORS.textLight}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.cashSection}>
        <Text style={styles.sectionTitle}>Opening Cash Float</Text>
        <View style={styles.cashInputWrap}>
          <Text style={styles.currencyLabel}>{CURRENCY_SYMBOL}</Text>
          <TextInput
            style={styles.cashInput}
            value={openingCash}
            onChangeText={setOpeningCash}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
      </View>

      <View style={styles.stockHeader}>
        <Text style={styles.sectionTitle}>Opening Stock Count</Text>
        <TouchableOpacity style={styles.quickFillBtn} onPress={quickFillFromSystem}>
          <Text style={styles.quickFillText}>Quick Fill from System</Text>
        </TouchableOpacity>
      </View>

      {loadingProducts ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={p => p.id}
          renderItem={renderProduct}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit for Approval</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  cashSection: { padding: SPACING.lg, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  cashInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 },
  currencyLabel: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginRight: 8 },
  cashInput: { flex: 1, fontSize: 24, fontWeight: '700', color: COLORS.text, paddingVertical: 12 },
  stockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingBottom: 8 },
  quickFillBtn: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  quickFillText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  list: { flex: 1 },
  productRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  productInfo: { flex: 1, marginRight: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  systemStock: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  countInput: {
    width: 80, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 18, fontWeight: '700',
    color: COLORS.text, textAlign: 'center',
  },
  footer: { padding: SPACING.lg, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
