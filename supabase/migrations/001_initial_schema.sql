-- ============================================================
-- DUKA POS - Initial Database Schema
-- Supabase (PostgreSQL 15+)
-- Version: 1.0
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- 1. USERS (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('cashier', 'admin')),
    pin_hash TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_active ON public.users(is_active);

-- 2. CATEGORIES
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SUPPLIERS
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_active ON public.suppliers(is_active);

-- 4. PRODUCTS
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT UNIQUE,
    category_id UUID REFERENCES public.categories(id),
    supplier_id UUID REFERENCES public.suppliers(id),
    buying_price NUMERIC(12, 2) NOT NULL CHECK (buying_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
    current_stock INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    image_url TEXT,
    expiry_date DATE, -- Team insight: expiry tracking for RTDs/beers
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_supplier ON public.products(supplier_id);
CREATE INDEX idx_products_active ON public.products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_low_stock ON public.products(current_stock, reorder_level)
    WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_products_expiry ON public.products(expiry_date)
    WHERE expiry_date IS NOT NULL AND is_active = true;
CREATE INDEX idx_products_name_search ON public.products USING gin(to_tsvector('english', name));

-- 5. SHIFTS
CREATE TABLE public.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'pending_open'
        CHECK (status IN ('pending_open', 'open', 'pending_close', 'closed', 'rejected')),
    opening_cash NUMERIC(12, 2) NOT NULL,
    closing_cash NUMERIC(12, 2),
    expected_cash NUMERIC(12, 2),
    cash_discrepancy NUMERIC(12, 2),
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.users(id),
    close_approved_by UUID REFERENCES public.users(id),
    rejection_notes TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shifts_cashier ON public.shifts(cashier_id);
CREATE INDEX idx_shifts_status ON public.shifts(status);
CREATE INDEX idx_shifts_date ON public.shifts(created_at);

-- 6. SHIFT_STOCK_COUNTS (opening + closing per product)
CREATE TABLE public.shift_stock_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    count_type TEXT NOT NULL CHECK (count_type IN ('opening', 'closing')),
    system_quantity INTEGER NOT NULL,
    counted_quantity INTEGER NOT NULL,
    difference INTEGER NOT NULL GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shift_stock_counts_shift ON public.shift_stock_counts(shift_id);
CREATE INDEX idx_shift_stock_counts_type ON public.shift_stock_counts(shift_id, count_type);

-- 7. SALES
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number TEXT NOT NULL UNIQUE,
    shift_id UUID NOT NULL REFERENCES public.shifts(id),
    cashier_id UUID NOT NULL REFERENCES public.users(id),
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'mpesa_stk', 'mpesa_till')),
    payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    mpesa_ref TEXT,
    mpesa_phone TEXT,
    mpesa_checkout_request_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'completed', 'cancelled', 'refunded')),
    is_refund BOOLEAN NOT NULL DEFAULT false,
    original_sale_id UUID REFERENCES public.sales(id),
    refund_reason TEXT,
    synced BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sales_receipt ON public.sales(receipt_number);
CREATE INDEX idx_sales_shift ON public.sales(shift_id);
CREATE INDEX idx_sales_cashier ON public.sales(cashier_id);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_payment_status ON public.sales(payment_status);
CREATE INDEX idx_sales_date ON public.sales(created_at);
CREATE INDEX idx_sales_mpesa_checkout ON public.sales(mpesa_checkout_request_id)
    WHERE mpesa_checkout_request_id IS NOT NULL;
-- Team insight: index for stuck payment detection
CREATE INDEX idx_sales_pending_mpesa ON public.sales(created_at)
    WHERE payment_status = 'pending' AND payment_method IN ('mpesa_stk', 'mpesa_till');

-- 8. SALE_ITEMS
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL, -- Denormalized for receipt/history
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    line_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON public.sale_items(product_id);

-- 9. STOCK_MOVEMENTS (complete audit trail for every bottle)
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'sale', 'sale_refund', 'adjustment_add', 'adjustment_remove',
        'write_off', 'po_receive', 'opening_count', 'closing_count'
    )),
    quantity INTEGER NOT NULL, -- positive = stock in, negative = stock out
    reference_id UUID, -- sale_id, po_id, shift_id etc.
    reason TEXT,
    performed_by UUID NOT NULL REFERENCES public.users(id),
    -- Team insight: write-offs/adjustments require admin approval
    admin_approved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(created_at);
CREATE INDEX idx_stock_movements_ref ON public.stock_movements(reference_id)
    WHERE reference_id IS NOT NULL;

-- 10. PURCHASE_ORDERS
CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled')),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON public.purchase_orders(status);

-- 11. PURCHASE_ORDER_ITEMS
CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    quantity_received INTEGER NOT NULL DEFAULT 0,
    unit_cost NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL
);

CREATE INDEX idx_po_items_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_product ON public.purchase_order_items(product_id);

-- 12. APP_SETTINGS
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. AUDIT_LOG
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_date ON public.audit_log(created_at);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_suppliers BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_shifts BEFORE UPDATE ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_po BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-generate SKU if not provided
CREATE OR REPLACE FUNCTION public.generate_sku()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sku IS NULL OR NEW.sku = '' THEN
        NEW.sku := 'SKU-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_sku BEFORE INSERT ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.generate_sku();

-- Deduct stock on sale completion
CREATE OR REPLACE FUNCTION public.deduct_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        -- Deduct stock for each sale item
        UPDATE public.products p
        SET current_stock = p.current_stock - si.quantity
        FROM public.sale_items si
        WHERE si.sale_id = NEW.id
          AND si.product_id = p.id;

        -- Create stock movement records
        INSERT INTO public.stock_movements (product_id, movement_type, quantity, reference_id, performed_by)
        SELECT si.product_id, 'sale', -si.quantity, NEW.id, NEW.cashier_id
        FROM public.sale_items si
        WHERE si.sale_id = NEW.id;

        -- Set completed timestamp
        NEW.completed_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_stock_on_sale BEFORE UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_sale();

-- Restore stock on refund
CREATE OR REPLACE FUNCTION public.restore_stock_on_refund()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_refund = true AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
        -- Restore stock for refunded items
        UPDATE public.products p
        SET current_stock = p.current_stock + si.quantity
        FROM public.sale_items si
        WHERE si.sale_id = NEW.id
          AND si.product_id = p.id;

        -- Create stock movement records
        INSERT INTO public.stock_movements (product_id, movement_type, quantity, reference_id, performed_by)
        SELECT si.product_id, 'sale_refund', si.quantity, NEW.id, NEW.cashier_id
        FROM public.sale_items si
        WHERE si.sale_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_restore_stock_on_refund BEFORE UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_refund();

-- Add stock on PO receive
CREATE OR REPLACE FUNCTION public.add_stock_on_po_receive()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    IF NEW.status IN ('partial', 'received') AND OLD.status IN ('draft', 'sent', 'partial') THEN
        FOR item IN
            SELECT poi.product_id, poi.quantity_received, poi.unit_cost
            FROM public.purchase_order_items poi
            WHERE poi.purchase_order_id = NEW.id
              AND poi.quantity_received > 0
        LOOP
            -- Update product stock
            UPDATE public.products
            SET current_stock = current_stock + item.quantity_received
            WHERE id = item.product_id;

            -- Update buying price if changed
            UPDATE public.products
            SET buying_price = item.unit_cost
            WHERE id = item.product_id
              AND buying_price IS DISTINCT FROM item.unit_cost;

            -- Create stock movement
            INSERT INTO public.stock_movements
                (product_id, movement_type, quantity, reference_id, performed_by)
            VALUES
                (item.product_id, 'po_receive', item.quantity_received, NEW.id, NEW.created_by);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_stock_on_po_receive BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION public.add_stock_on_po_receive();

-- Generate receipt number
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
    today_str TEXT;
    seq INTEGER;
BEGIN
    IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
        today_str := to_char(now(), 'YYYY-MM-DD');
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(receipt_number FROM '-(\d+)$') AS INTEGER)
        ), 0) + 1
        INTO seq
        FROM public.sales
        WHERE receipt_number LIKE today_str || '-%';

        NEW.receipt_number := today_str || '-' || LPAD(seq::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_receipt_number BEFORE INSERT ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.generate_receipt_number();

-- Calculate expected cash and discrepancy on shift close
CREATE OR REPLACE FUNCTION public.calculate_shift_cash()
RETURNS TRIGGER AS $$
DECLARE
    cash_sales NUMERIC;
BEGIN
    IF NEW.status = 'pending_close' AND OLD.status = 'open' THEN
        -- Sum cash sales during this shift
        SELECT COALESCE(SUM(total_amount), 0)
        INTO cash_sales
        FROM public.sales
        WHERE shift_id = NEW.id
          AND payment_method = 'cash'
          AND status = 'completed';

        NEW.expected_cash := NEW.opening_cash + cash_sales;

        IF NEW.closing_cash IS NOT NULL THEN
            NEW.cash_discrepancy := NEW.closing_cash - NEW.expected_cash;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_shift_cash BEFORE UPDATE ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION public.calculate_shift_cash();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USERS: everyone can read active users, only admin can manage
CREATE POLICY users_select ON public.users FOR SELECT
    USING (true);
CREATE POLICY users_insert ON public.users FOR INSERT
    WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY users_update ON public.users FOR UPDATE
    USING (id = auth.uid() OR public.get_user_role() = 'admin');

-- CATEGORIES: everyone reads, admin manages
CREATE POLICY categories_select ON public.categories FOR SELECT
    USING (true);
CREATE POLICY categories_manage ON public.categories FOR ALL
    USING (public.get_user_role() = 'admin');

-- PRODUCTS: everyone reads active, admin manages
CREATE POLICY products_select ON public.products FOR SELECT
    USING (true);
CREATE POLICY products_manage ON public.products FOR INSERT
    WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY products_update ON public.products FOR UPDATE
    USING (public.get_user_role() = 'admin');
CREATE POLICY products_delete ON public.products FOR DELETE
    USING (public.get_user_role() = 'admin');

-- SUPPLIERS: admin only
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT
    USING (public.get_user_role() = 'admin');
CREATE POLICY suppliers_manage ON public.suppliers FOR ALL
    USING (public.get_user_role() = 'admin');

-- SHIFTS: cashier sees own, admin sees all
CREATE POLICY shifts_select ON public.shifts FOR SELECT
    USING (cashier_id = auth.uid() OR public.get_user_role() = 'admin');
CREATE POLICY shifts_insert ON public.shifts FOR INSERT
    WITH CHECK (cashier_id = auth.uid());
CREATE POLICY shifts_update ON public.shifts FOR UPDATE
    USING (cashier_id = auth.uid() OR public.get_user_role() = 'admin');

-- SHIFT_STOCK_COUNTS: via shift access
CREATE POLICY shift_stock_counts_select ON public.shift_stock_counts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shifts s
            WHERE s.id = shift_id
              AND (s.cashier_id = auth.uid() OR public.get_user_role() = 'admin')
        )
    );
CREATE POLICY shift_stock_counts_insert ON public.shift_stock_counts FOR INSERT
    WITH CHECK (true);

-- SALES: cashier sees own shift's sales, admin sees all
CREATE POLICY sales_select ON public.sales FOR SELECT
    USING (cashier_id = auth.uid() OR public.get_user_role() = 'admin');
CREATE POLICY sales_insert ON public.sales FOR INSERT
    WITH CHECK (cashier_id = auth.uid());
CREATE POLICY sales_update ON public.sales FOR UPDATE
    USING (cashier_id = auth.uid() OR public.get_user_role() = 'admin');

-- SALE_ITEMS: via sale access
CREATE POLICY sale_items_select ON public.sale_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_id
              AND (s.cashier_id = auth.uid() OR public.get_user_role() = 'admin')
        )
    );
CREATE POLICY sale_items_insert ON public.sale_items FOR INSERT
    WITH CHECK (true);

-- STOCK_MOVEMENTS: admin only for viewing, system inserts via triggers
CREATE POLICY stock_movements_select ON public.stock_movements FOR SELECT
    USING (public.get_user_role() = 'admin');
CREATE POLICY stock_movements_insert ON public.stock_movements FOR INSERT
    WITH CHECK (true);

-- PURCHASE_ORDERS: admin only
CREATE POLICY po_select ON public.purchase_orders FOR SELECT
    USING (public.get_user_role() = 'admin');
CREATE POLICY po_manage ON public.purchase_orders FOR ALL
    USING (public.get_user_role() = 'admin');

-- PO_ITEMS: admin only
CREATE POLICY po_items_select ON public.purchase_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            WHERE po.id = purchase_order_id
              AND public.get_user_role() = 'admin'
        )
    );
CREATE POLICY po_items_manage ON public.purchase_order_items FOR ALL
    USING (public.get_user_role() = 'admin');

-- APP_SETTINGS: admin only
CREATE POLICY app_settings_select ON public.app_settings FOR SELECT
    USING (public.get_user_role() = 'admin');
CREATE POLICY app_settings_manage ON public.app_settings FOR ALL
    USING (public.get_user_role() = 'admin');

-- AUDIT_LOG: admin read-only, system inserts
CREATE POLICY audit_log_select ON public.audit_log FOR SELECT
    USING (public.get_user_role() = 'admin');
CREATE POLICY audit_log_insert ON public.audit_log FOR INSERT
    WITH CHECK (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default categories for a Kenyan liquor store
INSERT INTO public.categories (name, description, sort_order) VALUES
    ('Spirits', 'Whiskey, Vodka, Gin, Rum, Brandy, etc.', 1),
    ('Beer', 'Local and imported beers', 2),
    ('Wine', 'Red, white, rosé, sparkling', 3),
    ('RTDs', 'Ready-to-drink cocktails and premixes', 4),
    ('Soft Drinks', 'Sodas, juices, water, mixers', 5),
    ('Cigarettes', 'Tobacco products', 6),
    ('Other', 'Snacks, accessories, etc.', 7);

-- Default app settings
INSERT INTO public.app_settings (key, value, is_encrypted) VALUES
    ('store_name', 'My Liquor Store', false),
    ('store_address', '', false),
    ('store_phone', '', false),
    ('store_email', '', false),
    ('admin_notification_email', '', false),
    ('currency', 'KES', false),
    ('max_cashier_discount_pct', '10', false),
    ('reorder_alert_threshold', '10', false),
    ('daily_summary_time', '23:00', false),
    ('mpesa_environment', 'sandbox', false),
    ('mpesa_consumer_key', '', true),
    ('mpesa_consumer_secret', '', true),
    ('mpesa_shortcode', '', true),
    ('mpesa_passkey', '', true),
    ('mpesa_till_number', '', true),
    ('mpesa_callback_url', '', false),
    ('mpesa_c2b_confirmation_url', '', false),
    ('mpesa_c2b_validation_url', '', false);

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================

-- Enable realtime for shift approvals and sale status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
