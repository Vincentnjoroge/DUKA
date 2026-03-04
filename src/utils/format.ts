// ============================================================
// DUKA POS - Formatting Utilities
// ============================================================

import { CURRENCY_SYMBOL } from '../constants';
import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';

// --- Currency ---

/** Format a number as KES currency string */
export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL} ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Format a number as compact (e.g. 1.2K, 3.5M) */
export function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

// --- Dates ---

/** Format date as "Mar 3, 2026" */
export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy');
}

/** Format date as "03/03/2026" */
export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy');
}

/** Format date as "Monday, March 3" */
export function formatDateLong(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE, MMMM d');
}

/** Format date as "14:30" (24hr) */
export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'HH:mm');
}

/** Format date as "14:30:45" */
export function formatTimeWithSeconds(dateStr: string): string {
  return format(parseISO(dateStr), 'HH:mm:ss');
}

/** Format as "Mar 3, 14:30" */
export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, HH:mm');
}

/** Format as "2 hours ago", "3 days ago" */
export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

/** Calculate days until a date (negative = past) */
export function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date());
}

/** Format a duration in hours and minutes from two ISO date strings */
export function formatDuration(startStr: string, endStr: string): string {
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  const diffMs = end.getTime() - start.getTime();
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

// --- Phone ---

/** Format a Kenyan phone number for display: 254712345678 → 0712 345 678 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) {
    const local = '0' + digits.slice(3);
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return phone;
}

/** Normalize a phone to 254XXXXXXXXX format */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    return '254' + digits.slice(1);
  }
  if (digits.startsWith('+254')) {
    return digits.slice(1);
  }
  return digits;
}

// --- Percentages ---

/** Format a decimal as percentage: 0.156 → "15.6%" */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format margin: revenue, cost → "23.5%" */
export function formatMargin(revenue: number, cost: number): string {
  if (revenue === 0) return '0%';
  return formatPercent((revenue - cost) / revenue);
}

// --- Stock / Quantity ---

/** Format quantity with unit (singular/plural) */
export function formatQuantity(qty: number, unit = 'unit'): string {
  if (qty === 1) return `${qty} ${unit}`;
  return `${qty} ${unit}s`;
}

// --- Receipt ---

/** Generate a display receipt number: "2026-03-03-00015" → "#00015" */
export function formatReceiptShort(receiptNumber: string): string {
  const parts = receiptNumber.split('-');
  return `#${parts[parts.length - 1]}`;
}
