import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useShiftStore } from '../../store/shiftStore';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import type { Product, StockCountEntry } from '../../types';

type Step = 'cash' | 'stock' | 'review';

export default function CloseShiftScreen() {
  const nav = useNavigation<any>();
  const { currentShift, closeShift, isLoading } = useShiftStore();

  const [step, setStep] = useState<Step>('cash');
  const [closingCash, setClosingCash] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [salesSummary, setSalesSummary] = useState({ totalSales: 0, totalRevenue: 0, cashRevenue: 0, mpesaRevenue: 0 });

  useEffect(() => {
    loadProducts();
    loadSalesSummary();
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

  const loadSalesSummary = async () => {
    if (!currentShift) return;
    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount, payment_method')
      .eq('shift_id', currentShift.id)
      .eq('status', 'completed');

    if (sales) {
      const totalRevenue = sales.reduce((s, r) => s + Number(r.total_amount), 0);
      const cashRevenue = sales.filter(s => s.payment_method === 'cash').reduce((s, r) => s + Number(r.total_amount), 0);
      setSalesSummary({
        totalSales: sales.length,
        totalRevenue,
        cashRevenue,
        mpesaRevenue: totalRevenue - cashRevenue,
      });
    }
  };

  // Team insight: Quick fill from system
  const quickFillFromSystem = () => {
    const filled: Record<string, string> = {};
    products.forEach(p => { filled[p.id] = String(p.current_stock); });
    setCounts(filled);
  };

  const goToStock = () => {
    const cash = parseFloat(closingCash);
    if (isNaN(cash) || cash < 0) {
      Alert.alert('Invalid', 'Enter a valid cash amount.');
      return;
    }
    setStep('stock');
  };

  const goToReview = () => {
    const missing = products.filter(p => !counts[p.id] && counts[p.id] !== '0');
    if (missing.length > 0) {
      Alert.alert('Incomplete', `Please count all products. ${missing.length} remaining.`);
      return;
    }
    setStep('review');
  };

  const handleSubmit = async () => {
    const cash = parseFloat(closingCash);
    const stockCounts: StockCountEntry[] = products.map(p => ({
      product_id: p.id,
      product_name: p.name,
      system_quantity: p.current_stock,
      counted_quantity: parseInt(counts[p.id] || '0', 10),
    }));

    const { error } = await closeShift(cash, stockCounts);
    if (error) {
      Alert.alert('Error', error);
    } else {
      nav.navigate('CashierDashboard');
    }
  };

  // ---- STEP 1: CASH COUNT ----
  if (step === 'cash') {
    return (
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepDot, styles.stepDotActive]} /><View style={styles.stepLine} />
          <View style={styles.stepDot} /><View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>
        <View style={styles.section}>
          <Text style={styles.stepTitle}>Step 1: Cash Count</Text>
          <Text style={styles.stepSubtitle}>Count all physical cash in the till</Text>
          <TextInput
            style={styles.cashInput}
            value={closingCash}
            onChangeText={setClosingCash}
            keyboardType="numeric"
            placeholder="Enter total cash"
            placeholderTextColor={COLORS.textLight}
            autoFocus
          />
          <Text style={styles.hint}>The system expected amount will be calculated after submission.</Text>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextBtn} onPress={goToStock}>
            <Text style={styles.nextBtnText}>Next: Stock Count</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---- STEP 2: STOCK COUNT ----
  if (step === 'stock') {
    return (
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepDot, styles.stepDotDone]} /><View style={[styles.stepLine, styles.stepLineDone]} />
          <View style={[styles.stepDot, styles.stepDotActive]} /><View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>
        <View style={styles.stockTopRow}>
          <Text style={styles.stepTitle}>Step 2: Stock Count</Text>
          <TouchableOpacity style={styles.quickFillBtn} onPress={quickFillFromSystem}>
            <Text style={styles.quickFillText}>Quick Fill</Text>
          </TouchableOpacity>
        </View>
        {loadingProducts ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={products}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
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
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('cash')}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={goToReview}>
            <Text style={styles.nextBtnText}>Next: Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---- STEP 3: REVIEW ----
  return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepDot, styles.stepDotDone]} /><View style={[styles.stepLine, styles.stepLineDone]} />
        <View style={[styles.stepDot, styles.stepDotDone]} /><View style={[styles.stepLine, styles.stepLineDone]} />
        <View style={[styles.stepDot, styles.stepDotActive]} />
      </View>
      <ScrollView contentContainerStyle={styles.reviewContent}>
        <Text style={styles.stepTitle}>Step 3: Review & Submit</Text>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewLabel}>Shift Summary</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Total Sales</Text>
            <Text style={styles.reviewValue}>{salesSummary.totalSales}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Total Revenue</Text>
            <Text style={styles.reviewValue}>{CURRENCY_SYMBOL} {salesSummary.totalRevenue.toLocaleString()}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Cash Sales</Text>
            <Text style={styles.reviewValue}>{CURRENCY_SYMBOL} {salesSummary.cashRevenue.toLocaleString()}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>M-Pesa Sales</Text>
            <Text style={styles.reviewValue}>{CURRENCY_SYMBOL} {salesSummary.mpesaRevenue.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewLabel}>Cash Count</Text>
          <Text style={styles.reviewBigValue}>{CURRENCY_SYMBOL} {parseFloat(closingCash || '0').toLocaleString()}</Text>
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewLabel}>Stock Counted</Text>
          <Text style={styles.reviewSub}>{products.length} products counted</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('stock')}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, isLoading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.submitBtnText}>Submit for Closure</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  stepDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.border },
  stepDotActive: { backgroundColor: COLORS.primary, width: 20, height: 20, borderRadius: 10 },
  stepDotDone: { backgroundColor: COLORS.success },
  stepLine: { width: 40, height: 3, backgroundColor: COLORS.border, marginHorizontal: 4 },
  stepLineDone: { backgroundColor: COLORS.success },
  section: { padding: SPACING.lg },
  stepTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4, paddingHorizontal: SPACING.lg },
  stepSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, paddingHorizontal: SPACING.lg },
  cashInput: { backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 28, fontWeight: '700', color: COLORS.text, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border, marginHorizontal: SPACING.lg },
  hint: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 12, paddingHorizontal: SPACING.lg },
  stockTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingBottom: 8 },
  quickFillBtn: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  quickFillText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  productInfo: { flex: 1, marginRight: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  systemStock: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  countInput: { width: 80, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  reviewContent: { padding: SPACING.lg, gap: 12 },
  reviewCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  reviewLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  reviewKey: { fontSize: 14, color: COLORS.textSecondary },
  reviewValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  reviewBigValue: { fontSize: 28, fontWeight: '700', color: COLORS.primary },
  reviewSub: { fontSize: 14, color: COLORS.textSecondary },
  footer: { flexDirection: 'row', padding: SPACING.lg, gap: 10, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  nextBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  backBtn: { flex: 0.5, backgroundColor: COLORS.background, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  backBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  submitBtn: { flex: 1, backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
