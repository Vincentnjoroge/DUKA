import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import Badge, { ExpiryBadge } from '../common/Badge';
import { daysUntil } from '../../utils/format';
import type { Product } from '../../types';

interface ProductListItemProps {
  product: Product;
  onPress: (product: Product) => void;
}

export default function ProductListItem({ product, onPress }: ProductListItemProps) {
  const isLowStock = product.current_stock <= product.reorder_level;
  const isOutOfStock = product.current_stock <= 0;
  const expiryDays = product.expiry_date ? daysUntil(product.expiry_date) : null;

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(product)} activeOpacity={0.7}>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.sku}>{product.sku}</Text>
      </View>
      <View style={styles.badges}>
        {isOutOfStock && <Badge label="OUT" variant="error" />}
        {isLowStock && !isOutOfStock && <Badge label="LOW" variant="warning" />}
        {expiryDays !== null && <ExpiryBadge daysUntilExpiry={expiryDays} />}
      </View>
      <View style={styles.meta}>
        <Text style={styles.stock}>
          {product.current_stock} in stock
        </Text>
        <Text style={styles.price}>
          {CURRENCY_SYMBOL} {product.selling_price.toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  main: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  sku: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 4, marginHorizontal: 8 },
  meta: { alignItems: 'flex-end' },
  stock: { fontSize: 12, color: COLORS.textSecondary },
  price: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginTop: 2 },
});
