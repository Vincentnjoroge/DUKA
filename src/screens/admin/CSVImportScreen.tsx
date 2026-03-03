import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { COLORS, SPACING } from '../../constants';

interface ParsedRow { name: string; barcode: string; sku: string; category: string; buying_price: number; selling_price: number; current_stock: number; reorder_level: number; valid: boolean; error: string; }

export default function CSVImportScreen() {
  const nav = useNavigation<any>();
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);

  const parseCSV = () => {
    const lines = csvText.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) { Alert.alert('Error', 'CSV must have a header row and at least one data row.'); return; }
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const obj: any = {};
      headers.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
      const bp = parseFloat(obj.buying_price || obj.buyingprice || '0');
      const sp = parseFloat(obj.selling_price || obj.sellingprice || '0');
      const stock = parseInt(obj.current_stock || obj.stock || '0');
      const reorder = parseInt(obj.reorder_level || obj.reorderlevel || '10');
      let valid = true, error = '';
      if (!obj.name) { valid = false; error = 'Missing name'; }
      else if (isNaN(sp) || sp <= 0) { valid = false; error = 'Invalid selling price'; }
      rows.push({ name: obj.name || '', barcode: obj.barcode || '', sku: obj.sku || '', category: obj.category || '', buying_price: bp, selling_price: sp, current_stock: stock, reorder_level: reorder, valid, error });
    }
    setParsed(rows);
  };

  const doImport = async () => {
    const validRows = parsed.filter(r => r.valid);
    if (validRows.length === 0) { Alert.alert('No valid rows'); return; }
    setImporting(true);
    let created = 0, updated = 0, skipped = 0;
    for (const row of validRows) {
      try {
        if (row.barcode) {
          const { data: existing } = await supabase.from('products').select('id').eq('barcode', row.barcode).maybeSingle();
          if (existing) {
            await supabase.from('products').update({ name: row.name, buying_price: row.buying_price, selling_price: row.selling_price, reorder_level: row.reorder_level }).eq('id', existing.id);
            updated++;
            continue;
          }
        }
        await supabase.from('products').insert({ name: row.name, barcode: row.barcode || null, buying_price: row.buying_price, selling_price: row.selling_price, current_stock: row.current_stock, reorder_level: row.reorder_level });
        created++;
      } catch { skipped++; }
    }
    skipped += parsed.filter(r => !r.valid).length;
    setResult({ created, updated, skipped });
    setImporting(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg }}>
      <Text style={styles.title}>Import Products from CSV</Text>
      <Text style={styles.hint}>Paste CSV data below. Required columns: name, selling_price{'\n'}Optional: barcode, sku, category, buying_price, current_stock, reorder_level</Text>
      <TextInput style={styles.csvInput} value={csvText} onChangeText={setCsvText} multiline placeholder={'name,barcode,buying_price,selling_price,current_stock\nTusker Lager,5012345678901,150,220,48\nSmirnoff Vodka 750ml,5012345678902,900,1400,12'} placeholderTextColor={COLORS.textLight} textAlignVertical="top" />
      <TouchableOpacity style={styles.parseBtn} onPress={parseCSV}>
        <Text style={styles.parseBtnText}>Parse CSV</Text>
      </TouchableOpacity>

      {parsed.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Preview ({parsed.filter(r => r.valid).length} valid / {parsed.length} total)</Text>
          {parsed.slice(0, 10).map((row, i) => (
            <View key={i} style={[styles.previewRow, !row.valid && styles.invalidRow]}>
              <Text style={styles.previewName}>{row.name || '(empty)'}</Text>
              <Text style={styles.previewPrice}>{row.selling_price}</Text>
              {!row.valid ? <Text style={styles.errorText}>{row.error}</Text> : <Text style={styles.validText}>OK</Text>}
            </View>
          ))}
          {parsed.length > 10 && <Text style={styles.moreText}>... and {parsed.length - 10} more rows</Text>}

          <TouchableOpacity style={[styles.importBtn, importing && { opacity: 0.5 }]} onPress={doImport} disabled={importing}>
            {importing ? <ActivityIndicator color="#fff" /> : <Text style={styles.importBtnText}>Import {parsed.filter(r => r.valid).length} Valid Rows</Text>}
          </TouchableOpacity>
        </>
      )}

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Import Complete</Text>
          <Text style={styles.resultLine}>Created: {result.created}</Text>
          <Text style={styles.resultLine}>Updated: {result.updated}</Text>
          <Text style={styles.resultLine}>Skipped: {result.skipped}</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => nav.goBack()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  hint: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 20 },
  csvInput: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, fontSize: 13, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, minHeight: 140, fontFamily: 'monospace' },
  parseBtn: { backgroundColor: COLORS.info, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  parseBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 10, borderRadius: 8, marginBottom: 4, gap: 8 },
  invalidRow: { backgroundColor: COLORS.errorLight },
  previewName: { flex: 1, fontSize: 13, color: COLORS.text },
  previewPrice: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  errorText: { fontSize: 11, color: COLORS.error, fontWeight: '600' },
  validText: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  moreText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 4 },
  importBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  importBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resultCard: { backgroundColor: COLORS.successLight, borderRadius: 14, padding: 20, marginTop: 20, alignItems: 'center' },
  resultTitle: { fontSize: 18, fontWeight: '700', color: COLORS.success, marginBottom: 8 },
  resultLine: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 32, paddingVertical: 12, marginTop: 12 },
  doneBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
