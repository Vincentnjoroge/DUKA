import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import { format } from 'date-fns';

export default function ProductDetailScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { productId } = route.params;
  const [product, setProduct] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);

  useEffect(() => { loadProduct(); loadMovements(); }, []);

  const loadProduct = async () => {
    const { data } = await supabase.from('products').select('*, category:categories!category_id(name), supplier:suppliers!supplier_id(name)').eq('id', productId).single();
    setProduct(data);
  };
  const loadMovements = async () => {
    const { data } = await supabase.from('stock_movements').select('*, performer:users!performed_by(full_name)').eq('product_id', productId).order('created_at', { ascending: false }).limit(50);
    setMovements(data || []);
  };

  const deactivate = () => Alert.alert('Deactivate', `Are you sure you want to deactivate ${product?.name}?`, [
    { text: 'Cancel' },
    { text: 'Deactivate', style: 'destructive', onPress: async () => {
      await supabase.from('products').update({ is_active: false }).eq('id', productId);
      nav.goBack();
    }},
  ]);

  if (!product) return <View style={styles.center}><Text>Loading...</Text></View>;

  const margin = product.selling_price > 0 ? ((product.selling_price - product.buying_price) / product.selling_price * 100).toFixed(1) : '0';
  const typeBadgeColor: Record<string, string> = { sale: COLORS.error, sale_refund: COLORS.success, po_receive: COLORS.info, adjustment_add: COLORS.primaryLight, adjustment_remove: COLORS.warning, write_off: COLORS.error };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.imgCircle}><Text style={styles.imgText}>{product.name[0]}</Text></View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.meta}>{product.category?.name || 'Uncategorized'}</Text>
          </View>
        </View>
        <View style={styles.grid}>
          {[['SKU', product.sku], ['Barcode', product.barcode || '—'], ['Supplier', product.supplier?.name || '—'],
            ['Buying Price', `${CURRENCY_SYMBOL} ${Number(product.buying_price).toLocaleString()}`],
            ['Selling Price', `${CURRENCY_SYMBOL} ${Number(product.selling_price).toLocaleString()}`],
            ['Margin', `${margin}%`],
            ['Current Stock', product.current_stock.toString()],
            ['Reorder Level', product.reorder_level.toString()],
            ['Expiry', product.expiry_date || '—'],
          ].map(([label, value]) => (
            <View key={label} style={styles.gridItem}>
              <Text style={styles.gridLabel}>{label}</Text>
              <Text style={styles.gridValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => nav.navigate('AddProduct', { productId })}>
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.secondary }]} onPress={() => nav.navigate('StockAdjustment', { productId, productName: product.name })}>
          <Text style={styles.actionBtnText}>Adjust Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error }]} onPress={deactivate}>
          <Text style={styles.actionBtnText}>Deactivate</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Stock Movement History</Text>
      {movements.map(m => (
        <View key={m.id} style={styles.movementRow}>
          <View style={[styles.typeBadge, { backgroundColor: (typeBadgeColor[m.movement_type] || COLORS.border) + '20' }]}>
            <Text style={[styles.typeBadgeText, { color: typeBadgeColor[m.movement_type] || COLORS.text }]}>
              {m.movement_type.replace('_', ' ')}
            </Text>
          </View>
          <Text style={[styles.movementQty, m.quantity > 0 ? { color: COLORS.success } : { color: COLORS.error }]}>
            {m.quantity > 0 ? '+' : ''}{m.quantity}
          </Text>
          <View style={styles.movementInfo}>
            <Text style={styles.movementDate}>{format(new Date(m.created_at), 'MMM d, HH:mm')}</Text>
            {m.reason && <Text style={styles.movementReason} numberOfLines={1}>{m.reason}</Text>}
          </View>
        </View>
      ))}
      {movements.length === 0 && <Text style={styles.emptyText}>No stock movements yet</Text>}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: COLORS.surface, margin: SPACING.lg, borderRadius: 16, padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  imgCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primaryLight + '30', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  imgText: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  headerInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  gridItem: { width: '50%', paddingVertical: 8 },
  gridLabel: { fontSize: 11, color: COLORS.textSecondary },
  gridValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  actions: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 8, marginBottom: 16 },
  actionBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, paddingHorizontal: SPACING.lg, marginBottom: 8 },
  movementRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: SPACING.lg, marginBottom: 4, padding: 10, borderRadius: 8, gap: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  movementQty: { fontSize: 16, fontWeight: '700', width: 44, textAlign: 'right' },
  movementInfo: { flex: 1 },
  movementDate: { fontSize: 12, color: COLORS.textSecondary },
  movementReason: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, padding: 20 },
});
