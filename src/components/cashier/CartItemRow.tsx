import React from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, CURRENCY_SYMBOL } from '../../constants';
import type { CartItem } from '../../types';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onLongPress?: (productId: string) => void;
}

export default function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  onLongPress,
}: CartItemRowProps) {
  return (
    <Pressable
      style={styles.container}
      onLongPress={() => onLongPress?.(item.product_id)}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.product_name}</Text>
        <Text style={styles.price}>{CURRENCY_SYMBOL} {item.unit_price.toLocaleString()}</Text>
      </View>
      <View style={styles.qtyControls}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
        >
          <Text style={styles.qtyBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.lineTotal}>
        {CURRENCY_SYMBOL} {item.line_total.toLocaleString()}
      </Text>
      <TouchableOpacity onPress={() => onRemove(item.product_id)} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>X</Text>
      </TouchableOpacity>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  price: { fontSize: 12, color: COLORS.textSecondary },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  qtyValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, minWidth: 24, textAlign: 'center' },
  lineTotal: { fontSize: 14, fontWeight: '700', color: COLORS.text, minWidth: 70, textAlign: 'right' },
  removeBtn: { marginLeft: 8, padding: 4 },
  removeBtnText: { fontSize: 14, color: COLORS.error, fontWeight: '700' },
});
