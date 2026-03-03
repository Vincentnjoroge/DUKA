import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING } from '../../constants';

const REPORTS = [
  { key: 'DailySalesReport', title: 'Daily Sales', desc: 'Revenue, items, and hourly breakdown', icon: '📅' },
  { key: 'StockMovementReport', title: 'Stock Movements', desc: 'All product in/out history', icon: '📦' },
  { key: 'ProfitLossReport', title: 'Profit & Loss', desc: 'Revenue vs COGS by product', icon: '📈' },
  { key: 'CashierPerformanceReport', title: 'Cashier Performance', desc: 'Shifts, sales, discrepancies', icon: '👤' },
  { key: 'BusinessPerformanceReport', title: 'Business Performance', desc: 'Trends, categories, comparisons', icon: '📊' },
];

export default function ReportsScreen() {
  const nav = useNavigation<any>();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.grid}>
      <Text style={styles.title}>Reports</Text>
      <View style={styles.cardsWrap}>
        {REPORTS.map(r => (
          <TouchableOpacity key={r.key} style={styles.card} onPress={() => nav.navigate(r.key)} activeOpacity={0.7}>
            <Text style={styles.icon}>{r.icon}</Text>
            <Text style={styles.cardTitle}>{r.title}</Text>
            <Text style={styles.cardDesc}>{r.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  grid: { padding: SPACING.lg },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  cardsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  icon: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
});
