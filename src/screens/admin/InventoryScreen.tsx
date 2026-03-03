import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING, CURRENCY_SYMBOL, EXPIRY_WARNING_DAYS } from '../../constants';
import { differenceInDays } from 'date-fns';

type Filter = 'all' | 'low' | 'out';

export default function InventoryScreen() {
  const nav = useNavigation<any>();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [categories, setCategories] = useState<any[]>([]);
  const [catFilter, setCatFilter] = useState<string | null>(null);

  useEffect(() => { loadProducts(); loadCategories(); }, []);

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order');
    setCategories(data || []);
  };

  const loadProducts = useCallback(async () => {
    let q = supabase.from('products').select('*, category:categories!category_id(name)').eq('is_active', true).is('deleted_at', null).order('name');
    if (search.length >= 2) q = q.ilike('name', `%${search}%`);
    if (catFilter) q = q.eq('category_id', catFilter);
    const { data } = await q;
    let results = data || [];
    if (filter === 'low') results = results.filter((p: any) => p.current_stock > 0 && p.current_stock <= p.reorder_level);
    else if (filter === 'out') results = results.filter((p: any) => p.current_stock <= 0);
    setProducts(results);
  }, [search, filter, catFilter]);

  useEffect(() => { loadProducts(); }, [search, filter, catFilter]);

  const getStockBadge = (p: any) => {
    if (p.current_stock <= 0) return { label: 'Out', bg: COLORS.errorLight, color: COLORS.error };
    if (p.current_stock <= p.reorder_level) return { label: 'Low', bg: COLORS.warningLight, color: COLORS.warning };
    return { label: 'In Stock', bg: COLORS.successLight, color: COLORS.success };
  };

  const isNearExpiry = (p: any) => {
    if (!p.expiry_date) return false;
    return differenceInDays(new Date(p.expiry_date), new Date()) <= EXPIRY_WARNING_DAYS[0];
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search products..." placeholderTextColor={COLORS.textLight} />
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.topBtn} onPress={() => nav.navigate('CSVImport')}>
            <Text style={styles.topBtnText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBtn} onPress={() => nav.navigate('Suppliers')}>
            <Text style={styles.topBtnText}>Suppliers</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'low', 'out'] as Filter[]).map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={products}
        keyExtractor={p => p.id}
        renderItem={({ item }) => {
          const badge = getStockBadge(item);
          const expiry = isNearExpiry(item);
          return (
            <TouchableOpacity style={styles.productRow} onPress={() => nav.navigate('ProductDetail', { productId: item.id })}>
              <View style={[styles.imgPlaceholder, { backgroundColor: COLORS.primaryLight + '30' }]}>
                <Text style={styles.imgText}>{item.name[0]}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productMeta}>{item.category?.name || 'Uncategorized'} • {item.barcode || 'No barcode'}</Text>
                <View style={styles.productBottom}>
                  <Text style={styles.productPrice}>{CURRENCY_SYMBOL} {Number(item.selling_price).toLocaleString()}</Text>
                  <Text style={styles.productStock}>Stock: {item.current_stock}</Text>
                </View>
              </View>
              <View style={styles.badges}>
                <View style={[styles.stockBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.stockBadgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
                {expiry && (
                  <View style={[styles.stockBadge, { backgroundColor: COLORS.errorLight }]}>
                    <Text style={[styles.stockBadgeText, { color: COLORS.error }]}>Expiring</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No products found</Text>}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('AddProduct')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInput: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  topActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  topBtn: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  topBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  filterRow: { flexDirection: 'row', padding: SPACING.md, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#fff' },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 12 },
  imgPlaceholder: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  imgText: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  productMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  productBottom: { flexDirection: 'row', gap: 12, marginTop: 4 },
  productPrice: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  productStock: { fontSize: 12, color: COLORS.textSecondary },
  badges: { gap: 4, alignItems: 'flex-end' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stockBadgeText: { fontSize: 10, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '700' },
});
