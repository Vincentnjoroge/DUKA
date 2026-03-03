// ============================================================
// DUKA POS - Type Definitions
// ============================================================

// --- Enums ---

export type UserRole = 'cashier' | 'admin';

export type ShiftStatus =
  | 'pending_open'
  | 'open'
  | 'pending_close'
  | 'closed'
  | 'rejected';

export type PaymentMethod = 'cash' | 'mpesa_stk' | 'mpesa_till';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type SaleStatus = 'draft' | 'completed' | 'cancelled' | 'refunded';

export type StockMovementType =
  | 'sale'
  | 'sale_refund'
  | 'adjustment_add'
  | 'adjustment_remove'
  | 'write_off'
  | 'po_receive'
  | 'opening_count'
  | 'closing_count';

export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'partial'
  | 'received'
  | 'cancelled';

// --- Database Row Types ---

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  pin_hash: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category_id: string | null;
  supplier_id: string | null;
  buying_price: number;
  selling_price: number;
  current_stock: number;
  reorder_level: number;
  image_url: string | null;
  expiry_date: string | null; // Team insight: expiry tracking
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  supplier?: Supplier;
}

export interface Shift {
  id: string;
  cashier_id: string;
  status: ShiftStatus;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_discrepancy: number | null;
  opened_at: string | null;
  closed_at: string | null;
  approved_by: string | null;
  close_approved_by: string | null;
  rejection_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  cashier?: User;
  approver?: User;
}

export interface ShiftStockCount {
  id: string;
  shift_id: string;
  product_id: string;
  count_type: 'opening' | 'closing';
  system_quantity: number;
  counted_quantity: number;
  difference: number;
  created_at: string;
  // Joined
  product?: Product;
}

export interface Sale {
  id: string;
  receipt_number: string;
  shift_id: string;
  cashier_id: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  mpesa_ref: string | null;
  mpesa_phone: string | null;
  mpesa_checkout_request_id: string | null;
  status: SaleStatus;
  is_refund: boolean;
  original_sale_id: string | null;
  refund_reason: string | null;
  synced: boolean;
  created_at: string;
  completed_at: string | null;
  // Joined
  items?: SaleItem[];
  cashier?: User;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  created_at: string;
  // Joined
  product?: Product;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity: number; // positive = add, negative = remove
  reference_id: string | null;
  reason: string | null;
  performed_by: string;
  admin_approved_by: string | null; // Team insight: write-offs need admin approval
  created_at: string;
  // Joined
  product?: Product;
  performer?: User;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  line_total: number;
  // Joined
  product?: Product;
}

export interface AppSettings {
  id: string;
  key: string;
  value: string;
  is_encrypted: boolean;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// --- App State Types ---

export interface CartItem {
  product_id: string;
  product_name: string;
  barcode: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  max_stock: number;
}

export interface StockCountEntry {
  product_id: string;
  product_name: string;
  system_quantity: number;
  counted_quantity: number | null;
}

// --- API Response Types ---

export interface MpesaSTKResponse {
  CheckoutRequestID: string;
  MerchantRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaCallbackResult {
  success: boolean;
  mpesa_ref: string | null;
  error_message: string | null;
}

// --- Report Types ---

export interface DailySalesSummary {
  date: string;
  total_revenue: number;
  cash_revenue: number;
  mpesa_revenue: number;
  total_sales: number;
  total_items: number;
  avg_sale_value: number;
}

export interface ProductSalesReport {
  product_id: string;
  product_name: string;
  category: string;
  units_sold: number;
  revenue: number;
  cost: number;
  gross_profit: number;
  margin_pct: number;
}

export interface CashierPerformance {
  cashier_id: string;
  cashier_name: string;
  total_shifts: number;
  total_hours: number;
  total_sales: number;
  total_revenue: number;
  avg_sale_value: number;
  cash_discrepancies: number;
  stock_discrepancies: number;
}
