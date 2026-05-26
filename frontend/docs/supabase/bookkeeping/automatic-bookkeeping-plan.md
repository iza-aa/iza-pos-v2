# Automatic Bookkeeping Plan

Dokumen ini menjelaskan konsep fitur `Bookkeeping` untuk IZA POS. Arah utamanya adalah pembukuan otomatis untuk F&B, sehingga owner tidak perlu input manual setiap transaksi dan cukup melihat hasil, mengecek exception, lalu approve closing.

## Product Goal

Bookkeeping bukan sekadar `Archives`. Bookkeeping adalah pusat catatan keuangan otomatis untuk owner:

- sales income otomatis dari order paid
- discount cost otomatis dari reward/discount
- refund/cancel adjustment otomatis
- COGS estimate otomatis dari recipe dan inventory usage
- stock purchase/restock otomatis menjadi cash out atau inventory movement
- shift closing otomatis dibuat dari transaksi per shift
- daily closing otomatis merangkum semua shift
- owner hanya review, approve, reopen, export, atau add adjustment jika ada selisih

## Core Principle

Owner tidak seharusnya menginput pembukuan harian dari nol. Sistem harus membaca data operasional, membentuk ledger, dan menampilkan hasil siap review.

Input manual dibuat seminimal mungkin:

- counted cash per shift
- operational expense yang tidak berasal dari sistem
- adjustment/correction
- notes/reason untuk cash difference, refund, atau exception

## Role Responsibility

### Owner

Owner adalah pemilik keputusan pembukuan final.

Owner boleh:

- melihat semua Bookkeeping tabs
- approve daily closing
- approve/reject adjustment
- reopen shift/daily closing
- melihat profit, COGS, margin, ledger, exceptions, reports
- export report
- lock period

### Manager

Manager hanya membantu operasional closing, bukan approval pembukuan final.

Manager boleh:

- submit shift closing
- input counted cash
- input shift note
- input small operational expense jika diberi permission
- melihat shift-level summary yang relevan

Manager tidak boleh:

- approve daily closing final
- edit auto ledger langsung
- melihat full profit/margin jika owner ingin membatasi
- delete bookkeeping record final

### Staff/Cashier

Staff/cashier hanya terlibat pada shift operasional.

Staff/cashier boleh:

- melakukan transaksi POS
- clock in/out
- submit cash count jika role/permission mengizinkan

Staff/cashier tidak boleh:

- melihat pembukuan owner
- approve closing
- melihat profit/margin

## Recommended Navigation

Main owner route:

```text
/owner/bookkeeping
```

Navbar label:

```text
Bookkeeping
```

Description:

```text
Automatic closing, ledger, margin, and financial reports.
```

## Sidebar Tabs

Recommended final tabs:

1. `Overview`
2. `Closings`
   - `Shift Closing`
   - `Daily Closing`
3. `Auto Ledger`
4. `Cost & Margin`
5. `Exceptions`
6. `Reports`

Why this structure:

- `Overview` gives owner the result.
- `Closings` groups shift and daily closing so sidebar does not become too long.
- `Auto Ledger` shows every financial movement.
- `Cost & Margin` explains profitability.
- `Exceptions` prevents owner from checking everything manually.
- `Reports` stores exportable bookkeeping outputs.

## Tab Details

### Overview

Purpose: Owner sees financial result immediately.

Content:

- DateRangeFilter default `Today`
- infobox summary:
  - Gross Sales
  - Discounts
  - Net Sales
  - Estimated COGS
  - Gross Profit
  - Operating Expenses
  - Net Profit Estimate
  - Cash Difference
  - Unresolved Exceptions
- payment method breakdown
- daily closing status
- latest unresolved exceptions
- latest generated reports

Rules:

- Use `DateRangeFilter`.
- Use `OWNER_SEMANTIC_TONES` from `theme.ts`.
- Infobox must not use decorative icons.
- If COGS data is incomplete, show `Cost Data Needed`, not fake profit.

### Closings > Shift Closing

Purpose: Manager/cashier closes operational shift; owner can audit.

Generated automatically from:

- orders in shift time window
- payment method
- cancellations/refunds
- discounts
- shift assignment
- cashier/manager activity

Manual input:

- counted cash
- notes
- small expense if permission allows

Fields displayed:

- Shift
- Business Date
- Opened At
- Closed At
- Cashier/Manager
- Gross Sales
- Discounts
- Net Sales
- Cash Expected
- Cash Counted
- Cash Difference
- Non-Cash Sales
- Cancelled/Refund Count
- Status

Statuses:

- `open`
- `draft`
- `needs_review`
- `submitted`
- `closed`
- `reopened`

Actions:

- `Submit Shift Closing`
- `Edit Cash Count`
- `Add Note`
- `Reopen` owner only
- `View Source Orders`

### Closings > Daily Closing

Purpose: Owner approves final daily bookkeeping.

Generated automatically from shift closings.

Content:

- date selector
- all shift closing summaries
- total gross sales
- total discounts
- total net sales
- expected cash
- counted cash
- cash difference
- non-cash sales
- expenses
- estimated COGS
- gross profit estimate
- unresolved exceptions
- approval log

Status:

- `draft`
- `needs_review`
- `ready_to_close`
- `closed`
- `reopened`

Actions:

- `Approve Daily Closing`
- `Reopen Daily Closing`
- `Export Closing`
- `View Exceptions`

Business rule:

- Daily closing cannot be approved if required shift closing is missing.
- Daily closing can be approved with exceptions only if owner adds a note.

### Auto Ledger

Purpose: Show every automatic financial movement.

Entry types:

- `sales_income`
- `discount_cost`
- `refund`
- `cancellation_adjustment`
- `cogs_estimate`
- `stock_purchase`
- `expense`
- `cash_adjustment`
- `payment_settlement`
- `manual_adjustment`

Columns:

- Date/Time
- Type
- Category
- Source
- Payment Method
- Debit/Cash Out
- Credit/Cash In
- Amount
- Status
- Created By
- Actions

Actions:

- view source
- add correction
- export

Rules:

- Auto-generated entries should not be edited directly.
- Corrections must create adjustment entries.

### Cost & Margin

Purpose: Owner understands real F&B profitability.

Content:

- COGS Estimate
- Gross Margin
- Menu Margin Health
- Missing Recipe Count
- Missing Item Cost Count
- Stock Usage Value
- Top Cost Drivers
- Menu Profitability Table

Menu profitability columns:

- Menu Name
- Category
- Quantity Sold
- Revenue
- Estimated COGS
- Gross Profit
- Margin
- Status

Rules:

- If recipe is missing, status = `Cost Data Needed`.
- If item purchase cost is missing, status = `Item Cost Needed`.
- Do not claim accurate profit when COGS data is incomplete.

### Exceptions

Purpose: Owner reviews only issues, not every transaction.

Exception types:

- paid order missing payment method
- completed order unpaid
- unpaid order still active
- cancelled/refunded order missing reason
- menu sold without recipe
- inventory item missing cost
- negative stock
- cash difference
- missing shift closing
- daily closing not approved
- duplicate-looking transaction
- stock movement without source

Columns:

- Date
- Severity
- Type
- Description
- Source
- Suggested Fix
- Status
- Actions

Statuses:

- `open`
- `acknowledged`
- `resolved`
- `ignored_with_note`

Actions:

- view source
- mark resolved
- add note
- create adjustment

### Reports

Purpose: Store and export bookkeeping results.

Report types:

- Daily Closing Report
- Shift Closing Report
- Monthly P&L Estimate
- Sales Summary
- Payment Method Summary
- Expense Report
- COGS Report
- Inventory Cost Report
- Exception Report

Columns:

- Report Name
- Type
- Period
- Generated By
- Generated At
- Status
- Actions

Actions:

- preview
- download PDF
- download CSV
- regenerate
- delete draft

## Automatic Entry Rules

### Sales Income

Create ledger entry when:

- order is paid/settled
- order is not cancelled/refunded

Amount:

```text
net sales = gross sales - discount
```

### Discount Cost

Create ledger entry when:

- discount/reward/voucher is applied

Amount:

```text
discount value used by order
```

### Refund/Cancellation

Create adjustment when:

- paid order becomes refunded/cancelled
- cancelled order had prior income entry

Amount:

```text
negative value of impacted net sales
```

### COGS Estimate

Create estimate when:

- paid order has menu items
- menu recipe exists
- inventory item cost exists

If recipe/cost missing:

- do not create fake COGS
- create exception

### Stock Purchase

Create entry when:

- inventory/restock transaction adds stock and has purchase value

Amount:

```text
quantity * unit cost
```

### Expense

Create entry when:

- expense is manually entered
- expense has date, category, amount, payment method

## Suggested Database Tables

### `bookkeeping_entries`

```sql
create table public.bookkeeping_entries (
  id uuid primary key default gen_random_uuid(),
  business_date date not null,
  entry_at timestamptz not null default now(),
  type text not null,
  category text not null,
  amount numeric not null default 0,
  direction text not null check (direction in ('in', 'out', 'neutral')),
  payment_method text,
  source_table text,
  source_id text,
  source_label text,
  status text not null default 'posted',
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `bookkeeping_shift_closings`

```sql
create table public.bookkeeping_shift_closings (
  id uuid primary key default gen_random_uuid(),
  business_date date not null,
  shift_id text,
  shift_name text not null,
  opened_at timestamptz,
  closed_at timestamptz,
  submitted_by text,
  gross_sales numeric not null default 0,
  discount_total numeric not null default 0,
  net_sales numeric not null default 0,
  cash_expected numeric not null default 0,
  cash_counted numeric,
  cash_difference numeric,
  non_cash_sales numeric not null default 0,
  cancelled_count integer not null default 0,
  refund_total numeric not null default 0,
  status text not null default 'draft',
  notes text,
  snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_date, shift_id)
);
```

### `bookkeeping_daily_closings`

```sql
create table public.bookkeeping_daily_closings (
  id uuid primary key default gen_random_uuid(),
  business_date date not null unique,
  gross_sales numeric not null default 0,
  discount_total numeric not null default 0,
  net_sales numeric not null default 0,
  cogs_estimate numeric not null default 0,
  expense_total numeric not null default 0,
  gross_profit_estimate numeric not null default 0,
  net_profit_estimate numeric not null default 0,
  cash_expected numeric not null default 0,
  cash_counted numeric,
  cash_difference numeric,
  unresolved_exception_count integer not null default 0,
  status text not null default 'draft',
  approved_by text,
  approved_at timestamptz,
  notes text,
  snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `bookkeeping_expenses`

```sql
create table public.bookkeeping_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category text not null,
  amount numeric not null,
  payment_method text,
  vendor text,
  receipt_url text,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `bookkeeping_exceptions`

```sql
create table public.bookkeeping_exceptions (
  id uuid primary key default gen_random_uuid(),
  business_date date not null,
  severity text not null default 'medium',
  type text not null,
  description text not null,
  source_table text,
  source_id text,
  suggested_fix text,
  status text not null default 'open',
  note text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `bookkeeping_reports`

```sql
create table public.bookkeeping_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'generated',
  snapshot_json jsonb not null default '{}'::jsonb,
  generated_by text,
  generated_at timestamptz not null default now(),
  file_url text,
  created_at timestamptz not null default now()
);
```

## RLS / Permission Direction

Owner:

- select all bookkeeping tables
- insert/update approval fields
- reopen closing
- create adjustment
- generate reports

Manager:

- select limited shift closing data
- update `cash_counted` and `notes` for assigned/current shift
- insert operational expense if permission exists
- cannot update daily closing approval
- cannot delete ledger

Staff:

- no access to owner bookkeeping
- optional shift cash count only if explicitly allowed

Implementation note:

- If app still uses localStorage auth, client must not write directly to sensitive bookkeeping tables.
- Use API routes with server-side role checks for approval, closing, ledger generation, and report generation.

## Folder Structure

Recommended frontend structure:

```text
frontend/
  app/
    owner/
      bookkeeping/
        page.tsx
    manager/
      shift-closing/
        page.tsx
    api/
      owner/
        bookkeeping/
          overview/
            route.ts
          ledger/
            route.ts
          closings/
            daily/
              route.ts
            shift/
              route.ts
          exceptions/
            route.ts
          reports/
            generate/
              route.ts
            route.ts
      manager/
        shift-closing/
          route.ts
  app/
    components/
      owner/
        bookkeeping/
          OwnerBookkeeping.tsx
          BookkeepingSidebar.tsx
          tabs/
            OverviewTab.tsx
            ClosingsTab.tsx
            AutoLedgerTab.tsx
            CostMarginTab.tsx
            ExceptionsTab.tsx
            ReportsTab.tsx
          closings/
            ShiftClosingPanel.tsx
            DailyClosingPanel.tsx
            ClosingStatusBadge.tsx
          ledger/
            LedgerTable.tsx
            LedgerDetailModal.tsx
          expenses/
            ExpenseFormModal.tsx
            ExpenseTable.tsx
          exceptions/
            ExceptionTable.tsx
            ExceptionDetailModal.tsx
          reports/
            ReportGenerator.tsx
            ReportHistoryTable.tsx
            ReportPreviewModal.tsx
      manager/
        shift-closing/
          ManagerShiftClosing.tsx
          CashCountForm.tsx
          ShiftClosingSummary.tsx
  lib/
    services/
      bookkeeping/
        bookkeepingTypes.ts
        bookkeepingPeriod.ts
        bookkeepingEntryBuilder.ts
        ledgerService.ts
        shiftClosingService.ts
        dailyClosingService.ts
        expenseService.ts
        costMarginService.ts
        exceptionService.ts
        reportService.ts
        permissionService.ts
  docs/
    supabase/
      bookkeeping/
        automatic-bookkeeping-plan.md
        bookkeeping_schema.sql
```

## Component Standards

Follow `frontend/standarisasiUIUX.md`.

Rules:

- Use `SidebarTabset` for Bookkeeping tabs.
- Use `DateRangeFilter` and default to `Today`.
- Use `StandardTable` for all tables.
- Use title and description before every table.
- Use `OWNER_SEMANTIC_TONES` from `theme.ts`.
- Infobox/cards should not use decorative icons.
- Action buttons in tables should use icon-only buttons with `title` and `aria-label`.
- Do not use nested card inside card.
- Do not claim accurate profit if COGS data is incomplete.

## MVP Phases

### Phase 1: UI Shell + Read-only Overview

- Add `/owner/bookkeeping`
- Add sidebar tabs
- Build Overview from existing orders
- Build read-only Auto Ledger from order data
- Use standard UI components

Definition of Done:

- owner can open Bookkeeping
- tabs work
- DateRangeFilter works
- overview uses real order data
- tables use `StandardTable`

### Phase 2: Shift Closing

- Add shift closing API
- Auto-generate shift closing draft from orders
- Manager can submit counted cash
- Owner can view shift closing

Definition of Done:

- shift closing draft can be generated
- cash expected/counted/difference works
- manager cannot approve daily closing

### Phase 3: Daily Closing

- Daily closing summarizes shift closings
- Owner can approve/reopen daily closing
- Exceptions block or warn approval

Definition of Done:

- owner can approve daily closing
- approved closing stores snapshot
- reopening requires owner

### Phase 4: Cost & Margin

- Connect recipe/inventory cost data
- Show COGS estimate
- Show menu profitability
- Create exceptions for missing recipe/cost

Definition of Done:

- no fake profit when cost data is missing
- menu profitability table shows status clearly

### Phase 5: Reports

- Generate daily, shift, monthly, expense, and COGS reports
- Store report snapshots
- Export CSV/PDF if supported

Definition of Done:

- report history works
- generated report can be viewed later
- report data comes from snapshots, not live recomputation only

## Risk Notes

- COGS accuracy depends on recipe and inventory cost completeness.
- Payment settlement may not equal POS payment date for QRIS/e-wallet.
- Cash count must be manually confirmed.
- Closing snapshots should be immutable after approval; corrections should use adjustment records.
- Avoid full accounting debit/credit complexity in MVP.

## Final Recommendation

Build Bookkeeping as an automatic owner workflow, not a manual archive page.

Final tab structure:

```text
Overview
Closings
  Shift Closing
  Daily Closing
Auto Ledger
Cost & Margin
Exceptions
Reports
```

This gives owner the result, manager the operational closing workflow, and the system enough structure to keep financial records trustworthy.
