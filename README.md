# DUKA POS

A production-ready Point of Sale system built for Kenyan liquor stores and retail shops. Built with React Native (Expo), Supabase, and M-Pesa integration.

## Features

### Cashier Module
- **Shift Management** — Open/close shifts with cash float and stock counts, admin approval workflow
- **POS Screen** — Product search, barcode scanning, cart with preset quantities (2, 3, 6, 12)
- **Payment Processing** — Cash payments with change calculation, M-Pesa STK Push, M-Pesa Till/Paybill (C2B)
- **Recent Products** — Last 8 scanned items for fast repeat sales
- **Offline Sales** — Cash sales work offline with background sync

### Admin Module
- **Live Dashboard** — Real-time revenue, pending approvals, stuck payments, low stock alerts
- **Shift Approvals** — Review opening/closing stock counts, cash discrepancy detection
- **Inventory Management** — Products, categories, suppliers, expiry tracking, CSV import
- **Stock Adjustments** — Add/remove stock, write-offs with admin PIN verification
- **Purchase Orders** — Create, send, partial/full receive with stock auto-update
- **Reports** — Daily sales, stock movements, profit/loss, cashier performance, business trends
- **User Management** — Create/deactivate cashier accounts
- **M-Pesa Admin** — Stuck payment resolution, manual reference entry

### M-Pesa Integration
- STK Push with 90-second timeout (Kenyan mobile money reality)
- C2B Till/Paybill matching by account reference
- Manual reference fallback when callbacks fail
- Stuck payment detection and resolution screen
- Full callback logging for audit

### Security
- Role-based access control (Admin / Cashier)
- Row Level Security (RLS) on all tables
- 4-digit PIN lock with biometric fallback
- Admin PIN required for write-offs
- Full audit logging

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native 0.83 + Expo SDK 55 |
| State Management | Zustand 5 + MMKV persistence |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Payments | Safaricom Daraja API (M-Pesa) |
| Email | Resend (receipts + daily digest) |
| Language | TypeScript 5.9 |

## Project Structure

```
DUKA/
├── App.tsx                          # Root component
├── src/
│   ├── components/
│   │   ├── common/                  # Reusable UI components
│   │   │   ├── Button.tsx           # Multi-variant button
│   │   │   ├── Card.tsx             # Card container
│   │   │   ├── Input.tsx            # Form input with label/error
│   │   │   ├── Badge.tsx            # Status/expiry badges
│   │   │   ├── Modal.tsx            # Bottom sheet / center modal
│   │   │   ├── MetricCard.tsx       # Dashboard metric display
│   │   │   ├── SearchBar.tsx        # Search with scan button
│   │   │   ├── FilterChips.tsx      # Horizontal filter chips
│   │   │   ├── PinInput.tsx         # 4-digit PIN dots
│   │   │   ├── EmptyState.tsx       # Empty list placeholder
│   │   │   ├── LoadingScreen.tsx    # Full-screen loader
│   │   │   ├── ConfirmDialog.tsx    # Confirmation modal
│   │   │   ├── ScreenHeader.tsx     # Screen header bar
│   │   │   └── Divider.tsx          # Horizontal divider
│   │   ├── admin/                   # Admin-specific components
│   │   │   ├── ProductListItem.tsx  # Product row with badges
│   │   │   └── ShiftApprovalCard.tsx # Expandable approval card
│   │   └── cashier/                 # Cashier-specific components
│   │       └── CartItemRow.tsx      # Cart line item
│   ├── config/
│   │   └── supabase.ts             # Supabase client + MMKV auth
│   ├── constants/
│   │   └── index.ts                # Colors, spacing, app constants
│   ├── hooks/
│   │   ├── useAppState.ts          # Background/foreground lifecycle
│   │   ├── useDebounce.ts          # Value debouncer
│   │   ├── useRefresh.ts           # Pull-to-refresh helper
│   │   └── useSupabaseRealtime.ts  # Realtime subscription hook
│   ├── navigation/
│   │   ├── AppNavigator.tsx        # Root (auth state router)
│   │   ├── AuthNavigator.tsx       # Login + PIN lock
│   │   ├── CashierNavigator.tsx    # Cashier tabs + stack
│   │   └── AdminNavigator.tsx      # Admin tabs + stack
│   ├── screens/
│   │   ├── auth/                   # LoginScreen, PinLockScreen
│   │   ├── cashier/                # 7 screens (dashboard → close shift)
│   │   └── admin/                  # 21 screens (dashboard → reports)
│   ├── services/
│   │   ├── api.ts                  # Typed Supabase data access layer
│   │   └── offlineService.ts       # MMKV offline queue + sync
│   ├── store/
│   │   ├── authStore.ts            # Auth state (Zustand)
│   │   ├── cartStore.ts            # Cart state with persistence
│   │   └── shiftStore.ts           # Shift state with realtime
│   ├── types/
│   │   └── index.ts                # All TypeScript types
│   └── utils/
│       ├── format.ts               # Currency, date, phone formatting
│       ├── validation.ts           # Input validation helpers
│       ├── helpers.ts              # UUID, debounce, retry, etc.
│       └── csv.ts                  # CSV parsing + product validation
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # Full 13-table schema with RLS
│   └── functions/
│       ├── mpesa-stk-push/         # Initiate STK Push
│       ├── mpesa-callback/         # Process Safaricom callback
│       ├── mpesa-c2b-confirm/      # C2B confirmation (Till payments)
│       ├── mpesa-c2b-validation/   # C2B validation (accept all)
│       ├── daily-summary-email/    # Nightly owner digest
│       └── send-receipt-email/     # Per-sale receipt
└── .env.example                    # Environment template
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase account ([supabase.com](https://supabase.com))
- Safaricom Daraja API credentials ([developer.safaricom.co.ke](https://developer.safaricom.co.ke))
- Resend account for email ([resend.com](https://resend.com))

### 1. Clone & Install

```bash
git clone https://github.com/Vincentnjoroge/DUKA.git
cd DUKA
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project
2. Run the migration:
   ```bash
   # Via Supabase CLI
   supabase db push

   # Or manually: copy supabase/migrations/001_initial_schema.sql
   # into the SQL Editor in Supabase Dashboard and run it
   ```
3. Enable Realtime on `shifts` and `sales` tables:
   - Dashboard → Database → Replication → Enable for `shifts` and `sales`

### 3. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. M-Pesa Configuration

M-Pesa credentials are stored in `app_settings` table (not env vars) and configured via **Admin > Settings** in the app:

- Consumer Key / Secret (Daraja)
- Shortcode
- Passkey
- Callback URL (your Supabase Edge Function URL)
- Sandbox/Production toggle

### 5. Deploy Edge Functions

```bash
# Link your Supabase project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

# Deploy all functions
supabase functions deploy mpesa-stk-push
supabase functions deploy mpesa-callback
supabase functions deploy mpesa-c2b-confirm
supabase functions deploy mpesa-c2b-validation
supabase functions deploy daily-summary-email
supabase functions deploy send-receipt-email
```

### 6. Create First Admin User

1. Create a user in Supabase Auth (Dashboard → Authentication → Users → Add User)
2. Insert matching record in `public.users`:
   ```sql
   INSERT INTO public.users (id, email, full_name, role)
   VALUES ('auth-user-uuid-here', 'admin@yourstore.com', 'Store Owner', 'admin');
   ```

### 7. Run the App

```bash
# Start Expo development server
npx expo start

# Run on specific platform
npx expo start --android
npx expo start --ios
```

## Database Schema

13 tables with full RLS:

| Table | Purpose |
|-------|---------|
| `users` | Staff profiles (extends auth.users) |
| `categories` | Product categories |
| `suppliers` | Supplier directory |
| `products` | Product catalog with expiry tracking |
| `shifts` | Cashier shift lifecycle |
| `shift_stock_counts` | Opening/closing stock counts |
| `sales` | Sale transactions |
| `sale_items` | Line items per sale |
| `stock_movements` | All stock changes with audit trail |
| `purchase_orders` | Purchase orders to suppliers |
| `purchase_order_items` | PO line items |
| `app_settings` | Configurable app/M-Pesa settings |
| `audit_log` | Full action audit trail |

Key triggers:
- Auto-generate SKU on product create
- Auto-generate sequential receipt numbers
- Stock deduction on sale completion
- Stock restoration on refund
- Stock addition on PO receive
- `updated_at` auto-touch on all tables

## Shift Lifecycle

```
no_shift → pending_open → [admin approves] → open → pending_close → [admin approves] → closed
                         → [admin rejects] → rejected
```

- Opening: Cashier counts cash float + stock, waits for admin approval
- During: Process sales (cash/M-Pesa), view summary
- Closing: 3-step wizard (cash count → stock count → review), admin approval
- Discrepancies highlighted in red for admin review

## Architecture Decisions

1. **Single-store focus** — No multi-tenancy overhead. One Supabase project = one store.
2. **Offline-first for cash sales** — MMKV queue ensures no lost sales during connectivity drops.
3. **Supabase Realtime** — Instant shift approval notifications and M-Pesa payment confirmations.
4. **90-second M-Pesa timeout** — Realistic for Kenyan mobile money (network delays, slow PIN entry).
5. **Admin PIN for write-offs** — Shrinkage control per team recommendation.
6. **Stock counts at shift boundaries** — Dual-count system catches discrepancies immediately.

## Roadmap

### v1.1
- Barcode scanner integration (camera-based)
- Biometric authentication (fingerprint/face)
- Receipt PDF generation and sharing
- Push notifications for shift approvals

### v1.2
- Multi-store support
- Advanced reporting with charts
- Supplier auto-reorder triggers
- Customer loyalty tracking

### v2.0
- Web admin dashboard
- Advanced analytics and forecasting
- Integration with KRA eTIMS
- Multi-language support (Swahili)

## License

Proprietary. All rights reserved.
