// ============================================================
// DUKA POS - Validation Utilities
// ============================================================

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate Kenyan phone number (0712345678 or 254712345678 or +254712345678) */
export function isValidKenyanPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return true;
  if (digits.startsWith('0') && digits.length === 10) return true;
  return false;
}

/** Validate 4-digit PIN */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Validate barcode (at least 4 digits/chars) */
export function isValidBarcode(barcode: string): boolean {
  return barcode.trim().length >= 4;
}

/** Validate M-Pesa reference code format (alphanumeric, 10+ chars) */
export function isValidMpesaRef(ref: string): boolean {
  return /^[A-Z0-9]{8,}$/i.test(ref.trim());
}

/** Validate currency amount (positive, max 2 decimals) */
export function isValidAmount(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0 && /^\d+(\.\d{1,2})?$/.test(value);
}

/** Validate positive integer */
export function isPositiveInteger(value: string): boolean {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && num.toString() === value;
}

/** Check if string is non-empty after trimming */
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

// --- Form Validation Helpers ---

export interface ValidationRule {
  field: string;
  value: string | number;
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (val: string | number) => boolean;
    message: string;
  }[];
}

/** Validate a set of rules, returns first error or null */
export function validateFields(rules: ValidationRule[]): { field: string; message: string } | null {
  for (const { field, value, rules: fieldRules } of rules) {
    for (const rule of fieldRules) {
      const strVal = String(value);
      if (rule.required && !isNonEmpty(strVal)) return { field, message: rule.message };
      if (rule.minLength && strVal.length < rule.minLength) return { field, message: rule.message };
      if (rule.maxLength && strVal.length > rule.maxLength) return { field, message: rule.message };
      if (rule.pattern && !rule.pattern.test(strVal)) return { field, message: rule.message };
      if (rule.custom && !rule.custom(value)) return { field, message: rule.message };
    }
  }
  return null;
}
