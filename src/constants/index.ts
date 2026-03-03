// ============================================================
// DUKA POS - Application Constants
// ============================================================

export const APP_NAME = 'DUKA POS';
export const CURRENCY = 'KES';
export const CURRENCY_SYMBOL = 'KSh';

// PIN / Auth
export const PIN_LENGTH = 4;
export const MAX_PIN_ATTEMPTS = 3;
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes background = re-auth

// M-Pesa (Team insight: increased timeout from 30s to 90s)
export const MPESA_STK_TIMEOUT_MS = 90 * 1000; // 90 seconds for STK push
export const MPESA_PHONE_PREFIX = '254';
export const MPESA_STUCK_PAYMENT_THRESHOLD_MIN = 10; // Flag payments pending > 10 min

// Cart / POS
export const MAX_CASHIER_DISCOUNT_PCT = 10; // Default max discount % without admin PIN
export const PRESET_QUANTITIES = [2, 3, 6, 12]; // Team insight: crate presets
export const RECENT_PRODUCTS_COUNT = 8; // Team insight: last 8 scanned
export const MIN_SEARCH_CHARS = 2;

// Stock
export const DEFAULT_REORDER_LEVEL = 10;
export const EXPIRY_WARNING_DAYS = [30, 14]; // Team insight: expiry alerts at 30 and 14 days

// Receipt
export const RECEIPT_DATE_FORMAT = 'yyyy-MM-dd';
export const RECEIPT_NUMBER_FORMAT = 'yyyy-MM-dd-'; // Followed by 5-digit sequence

// Reports
export const DAILY_SUMMARY_HOUR = 23; // 23:00 daily email

// Offline
export const OFFLINE_QUEUE_KEY = 'duka_offline_queue';
export const PRODUCT_CACHE_KEY = 'duka_product_cache';
export const CART_PERSIST_KEY = 'duka_cart';

// Colors
export const COLORS = {
  primary: '#1B5E20',       // Deep green — trust, money
  primaryLight: '#4CAF50',
  primaryDark: '#0D3B0E',
  secondary: '#FF6F00',     // Amber — action, M-Pesa orange
  secondaryLight: '#FFA726',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  textLight: '#BDBDBD',
  error: '#D32F2F',
  errorLight: '#FFCDD2',
  success: '#2E7D32',
  successLight: '#C8E6C9',
  warning: '#F57F17',
  warningLight: '#FFF9C4',
  info: '#1565C0',
  infoLight: '#BBDEFB',
  border: '#E0E0E0',
  disabled: '#9E9E9E',
  cash: '#2E7D32',
  mpesa: '#4CAF50',         // M-Pesa green
  discrepancyBg: '#FFEBEE', // Red tint for discrepancies
} as const;

// Typography
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    display: 36,
  },
} as const;

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;
