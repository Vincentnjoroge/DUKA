import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Alert, Modal, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useCartStore } from '../../store/cartStore';
import { useShiftStore } from '../../store/shiftStore';
import { COLORS, SPACING, CURRENCY_SYMBOL, PRESET_QUANTITIES, MIN_SEARCH_CHARS } from '../../constants';
import type { Product } from '../../types';

export default function POSScreen() {
  const nav = useNavigation<any>();
  const { items, addItem, removeItem, updateQuantity, subtotal, discountTotal, total, itemCount, recentProducts } = useCartStore();
  const { currentShift } = useShiftStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [recentProductsList, setRecentProductsList] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [discountModal, setDiscountModal] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [presetQtyItem, setPresetQtyItem] = useState<string | null>(null);

  useEffect(() => {
    if (recentProducts.length > 0) loadRecentProducts();
  }, [recentProducts]);

  const loadRecentProducts = async () => {
    if (recentProducts.length === 0) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .in('id', recentProducts)
      .eq('is_active', true);
    if (data) {
      // Sort by recentProducts order
      const sorted = recentProducts
        .map(id => data.find((p: Product) => p.id === id))
        .filter(Boolean) as Product[];
      setRecentProductsList(sorted);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < MIN_SEARCH_CHARS) { setSearchResults([]); setShowSearch(false); return; }
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .ilike('name', `%${query}%`)
      .limit(15);
    setSearchResults((data as Product[]) || []);
    setShowSearch(true);
  }, []);

  const handleAddProduct = (product: Product) => {
    if (product.current_stock <= 0) {
      Alert.alert('Low Stock', `${product.name} has 0 stock. Sale will create a discrepancy at shift close.`);
    }
    addItem(product);
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleCharge = () => {
    if (items.length === 0) { Alert.alert('Empty Cart', 'Add products before charging.'); return; }
    nav.navigate('Payment');
  };

  const handleEndShift = () => {
    nav.navigate('CloseShift');
  };

  const applyDiscount = () => {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return;
    // Apply as percentage off subtotal
    const discAmt = Math.min((val / 100) * subtotal(), subtotal());
    // Distribute evenly across items (simplified)
    items.forEach(item => {
      const itemShare = (item.line_total / subtotal()) * discAmt;
      useCartStore.getState().applyItemDiscount(item.product_id, itemShare);
    });
    setDiscountModal(false);
    setDiscountValue('');
  };

  const renderCartItem = ({ item }: { item: typeof items[0] }) => (
    <Pressable
      style={styles.cartItem}
      onLongPress={() => setPresetQtyItem(item.product_id)}
    >
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={1}>{item.product_name}</Text>
        <Text style={styles.cartItemPrice}>{CURRENCY_SYMBOL} {item.unit_price.toLocaleString()}</Text>
      </View>
      <View style={styles.qtyControls}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.product_id, item.quantity - 1)}>
          <Text style={styles.qtyBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.product_id, item.quantity + 1)}>
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.lineTotal}>{CURRENCY_SYMBOL} {item.line_total.toLocaleString()}</Text>
      <TouchableOpacity onPress={() => removeItem(item.product_id)} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>X</Text>
      </TouchableOpacity>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <TouchableOpacity style={styles.scanBtn}>
          <Text style={styles.scanBtnText}>SCAN</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Search Results Dropdown */}
      {showSearch && searchResults.length > 0 && (
        <View style={styles.searchDropdown}>
          {searchResults.map(p => (
            <TouchableOpacity key={p.id} style={styles.searchResultRow} onPress={() => handleAddProduct(p)}>
              <Text style={styles.searchResultName}>{p.name}</Text>
              <View style={styles.searchResultMeta}>
                <Text style={styles.searchResultPrice}>{CURRENCY_SYMBOL} {p.selling_price}</Text>
                <Text style={[styles.searchResultStock, p.current_stock <= 0 && { color: COLORS.error }]}>
                  Stock: {p.current_stock}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Products (team insight) */}
      {!showSearch && recentProductsList.length > 0 && items.length === 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent</Text>
          <FlatList
            horizontal
            data={recentProductsList}
            keyExtractor={p => p.id}
            renderItem={({ item: p }) => (
              <TouchableOpacity style={styles.recentChip} onPress={() => handleAddProduct(p)}>
                <Text style={styles.recentChipText} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.recentChipPrice}>{CURRENCY_SYMBOL} {p.selling_price}</Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Cart */}
      <FlatList
        data={items}
        keyExtractor={i => i.product_id}
        renderItem={renderCartItem}
        style={styles.cartList}
        ListEmptyComponent={
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>Cart is empty</Text>
            <Text style={styles.emptyCartSub}>Search or scan products to add</Text>
          </View>
        }
      />

      {/* Preset Qty Modal (team insight) */}
      <Modal visible={!!presetQtyItem} transparent animationType="fade" onRequestClose={() => setPresetQtyItem(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPresetQtyItem(null)}>
          <View style={styles.presetModal}>
            <Text style={styles.presetTitle}>Quick Quantity</Text>
            <View style={styles.presetRow}>
              {PRESET_QUANTITIES.map(q => (
                <TouchableOpacity key={q} style={styles.presetBtn}
                  onPress={() => { if (presetQtyItem) updateQuantity(presetQtyItem, q); setPresetQtyItem(null); }}>
                  <Text style={styles.presetBtnText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Discount Modal */}
      <Modal visible={discountModal} transparent animationType="slide" onRequestClose={() => setDiscountModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDiscountModal(false)}>
          <View style={styles.discountModalContent}>
            <Text style={styles.discountTitle}>Apply Discount (%)</Text>
            <TextInput
              style={styles.discountInput}
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="numeric"
              placeholder="e.g. 5"
              placeholderTextColor={COLORS.textLight}
              autoFocus
            />
            <TouchableOpacity style={styles.discountApplyBtn} onPress={applyDiscount}>
              <Text style={styles.discountApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Footer */}
      <View style={styles.cartFooter}>
        <View style={styles.totalsRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{CURRENCY_SYMBOL} {subtotal().toLocaleString()}</Text>
        </View>
        {discountTotal() > 0 && (
          <View style={styles.totalsRow}>
            <Text style={[styles.totalLabel, { color: COLORS.warning }]}>Discount</Text>
            <Text style={[styles.totalValue, { color: COLORS.warning }]}>-{CURRENCY_SYMBOL} {discountTotal().toLocaleString()}</Text>
          </View>
        )}
        <View style={styles.totalsRow}>
          <Text style={styles.grandTotalLabel}>TOTAL</Text>
          <Text style={styles.grandTotalValue}>{CURRENCY_SYMBOL} {total().toLocaleString()}</Text>
        </View>
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.discountBtn} onPress={() => setDiscountModal(true)}>
            <Text style={styles.discountBtnText}>Discount</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chargeBtn, items.length === 0 && styles.chargeBtnDisabled]}
            onPress={handleCharge}
            disabled={items.length === 0}
          >
            <Text style={styles.chargeBtnText}>
              Charge {CURRENCY_SYMBOL} {total().toLocaleString()}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.endShiftLink} onPress={handleEndShift}>
          <Text style={styles.endShiftText}>End Shift</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchSection: { flexDirection: 'row', padding: SPACING.md, gap: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  scanBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  searchDropdown: { position: 'absolute', top: 64, left: 0, right: 0, zIndex: 1000, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 300, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
  searchResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchResultName: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  searchResultMeta: { alignItems: 'flex-end' },
  searchResultPrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  searchResultStock: { fontSize: 11, color: COLORS.textSecondary },
  recentSection: { padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  recentTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  recentChip: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: COLORS.border, minWidth: 100 },
  recentChipText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  recentChipPrice: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  cartList: { flex: 1 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  cartItemPrice: { fontSize: 12, color: COLORS.textSecondary },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8 },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  qtyValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, minWidth: 24, textAlign: 'center' },
  lineTotal: { fontSize: 14, fontWeight: '700', color: COLORS.text, minWidth: 70, textAlign: 'right' },
  removeBtn: { marginLeft: 8, padding: 4 },
  removeBtnText: { fontSize: 14, color: COLORS.error, fontWeight: '700' },
  emptyCart: { alignItems: 'center', marginTop: 60 },
  emptyCartText: { fontSize: 18, color: COLORS.textSecondary },
  emptyCartSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  cartFooter: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderTopWidth: 2, borderTopColor: COLORS.primary },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 14, color: COLORS.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  grandTotalLabel: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  grandTotalValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  footerActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  discountBtn: { flex: 1, backgroundColor: COLORS.background, borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  discountBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  chargeBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  chargeBtnDisabled: { backgroundColor: COLORS.disabled },
  chargeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  endShiftLink: { alignItems: 'center', marginTop: 12, padding: 4 },
  endShiftText: { fontSize: 13, color: COLORS.error, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  presetModal: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, width: '85%' as any, maxWidth: 320 },
  presetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 16 },
  presetRow: { flexDirection: 'row', justifyContent: 'space-around' },
  presetBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  presetBtnText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  discountModalContent: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, width: '85%' as any, maxWidth: 340 },
  discountTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  discountInput: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 24, fontWeight: '700', textAlign: 'center', color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  discountApplyBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  discountApplyText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
