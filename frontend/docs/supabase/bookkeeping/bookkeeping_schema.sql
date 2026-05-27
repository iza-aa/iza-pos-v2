create extension if not exists pgcrypto;

create table if not exists public.bookkeeping_entries (
  id uuid primary key default gen_random_uuid(),
  business_date date not null,
  entry_at timestamptz not null default now(),
  type text not null check (
    type in (
      'sales_income',
      'discount_cost',
      'tax_payable',
      'refund',
      'cancellation_adjustment',
      'cogs_estimate',
      'stock_purchase',
      'expense',
      'cash_adjustment',
      'payment_settlement',
      'manual_adjustment',
      'data_exception'
    )
  ),
  category text not null,
  amount numeric not null default 0,
  direction text not null check (direction in ('in', 'out', 'neutral')),
  payment_method text,
  source_table text,
  source_id text,
  source_label text,
  status text not null default 'posted' check (
    status in ('draft', 'posted', 'estimated', 'needs_review', 'voided')
  ),
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep the entry type constraint migration-safe when this script is rerun on
-- an existing project. The create-table check above only applies to fresh DBs.
alter table public.bookkeeping_entries
drop constraint if exists bookkeeping_entries_type_check;

alter table public.bookkeeping_entries
add constraint bookkeeping_entries_type_check
check (
  type in (
    'sales_income',
    'discount_cost',
    'tax_payable',
    'refund',
    'cancellation_adjustment',
    'cogs_estimate',
    'stock_purchase',
    'expense',
    'cash_adjustment',
    'payment_settlement',
    'manual_adjustment',
    'data_exception'
  )
);

create table if not exists public.bookkeeping_shift_closings (
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
  opening_cash numeric not null default 0,
  cash_expected numeric not null default 0,
  expected_drawer_cash numeric not null default 0,
  cash_counted numeric,
  cash_difference numeric,
  cash_to_deposit numeric not null default 0,
  closing_float numeric not null default 0,
  float_policy text not null default 'carry_float' check (
    float_policy in ('carry_float', 'new_float', 'deposit_all')
  ),
  non_cash_sales numeric not null default 0,
  cancelled_count integer not null default 0,
  refund_total numeric not null default 0,
  status text not null default 'draft' check (
    status in ('open', 'draft', 'needs_review', 'submitted', 'closed', 'reopened')
  ),
  notes text,
  snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_date, shift_id)
);

create table if not exists public.bookkeeping_daily_closings (
  id uuid primary key default gen_random_uuid(),
  business_date date not null unique,
  gross_sales numeric not null default 0,
  discount_total numeric not null default 0,
  net_sales numeric not null default 0,
  cogs_estimate numeric not null default 0,
  expense_total numeric not null default 0,
  gross_profit_estimate numeric not null default 0,
  net_profit_estimate numeric not null default 0,
  opening_cash_total numeric not null default 0,
  cash_expected numeric not null default 0,
  expected_drawer_cash numeric not null default 0,
  cash_counted numeric,
  cash_difference numeric,
  cash_to_deposit numeric not null default 0,
  closing_float_total numeric not null default 0,
  unresolved_exception_count integer not null default 0,
  status text not null default 'draft' check (
    status in ('draft', 'needs_review', 'ready_to_close', 'closed', 'reopened')
  ),
  approved_by text,
  approved_at timestamptz,
  notes text,
  snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookkeeping_expenses (
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

create table if not exists public.bookkeeping_exceptions (
  id uuid primary key default gen_random_uuid(),
  business_date date not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  type text not null,
  description text not null,
  source_table text,
  source_id text,
  suggested_fix text,
  status text not null default 'open' check (
    status in ('open', 'acknowledged', 'resolved', 'ignored_with_note')
  ),
  note text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookkeeping_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'generated' check (status in ('draft', 'generated', 'failed')),
  snapshot_json jsonb not null default '{}'::jsonb,
  generated_by text,
  generated_at timestamptz not null default now(),
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.bookkeeping_financial_settings (
  id text primary key default 'global',
  tax_enabled boolean not null default false,
  tax_label text not null default 'PPN',
  tax_rate numeric not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  service_charge_enabled boolean not null default false,
  service_charge_rate numeric not null default 0 check (
    service_charge_rate >= 0 and service_charge_rate <= 100
  ),
  prices_include_tax boolean not null default false,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_shift_daily_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id text not null,
  shift_id text not null,
  work_date date not null,
  status text not null default 'assigned' check (
    status in ('assigned', 'completed', 'cancelled')
  ),
  assigned_by text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, work_date)
);

create table if not exists public.staff_shift_weekly_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id text not null,
  weekday integer not null check (weekday between 1 and 7),
  shift_id text not null,
  status text not null default 'assigned' check (
    status in ('assigned', 'cancelled')
  ),
  assigned_by text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, weekday)
);

alter table public.bookkeeping_shift_closings
add column if not exists opening_cash numeric not null default 0;

alter table public.bookkeeping_shift_closings
add column if not exists expected_drawer_cash numeric not null default 0;

alter table public.bookkeeping_shift_closings
add column if not exists cash_to_deposit numeric not null default 0;

alter table public.bookkeeping_shift_closings
add column if not exists closing_float numeric not null default 0;

alter table public.bookkeeping_shift_closings
add column if not exists float_policy text not null default 'carry_float';

alter table public.bookkeeping_shift_closings
drop constraint if exists bookkeeping_shift_closings_float_policy_check;

alter table public.bookkeeping_shift_closings
add constraint bookkeeping_shift_closings_float_policy_check
check (float_policy in ('carry_float', 'new_float', 'deposit_all'));

alter table public.bookkeeping_daily_closings
add column if not exists opening_cash_total numeric not null default 0;

alter table public.bookkeeping_daily_closings
add column if not exists expected_drawer_cash numeric not null default 0;

alter table public.bookkeeping_daily_closings
add column if not exists cash_to_deposit numeric not null default 0;

alter table public.bookkeeping_daily_closings
add column if not exists closing_float_total numeric not null default 0;

create index if not exists bookkeeping_entries_business_date_idx
on public.bookkeeping_entries(business_date);

create index if not exists bookkeeping_entries_source_idx
on public.bookkeeping_entries(source_table, source_id);

create index if not exists bookkeeping_shift_closings_business_date_idx
on public.bookkeeping_shift_closings(business_date);

create index if not exists bookkeeping_exceptions_business_date_status_idx
on public.bookkeeping_exceptions(business_date, status);

create index if not exists staff_shift_daily_assignments_staff_date_idx
on public.staff_shift_daily_assignments(staff_id, work_date);

create index if not exists staff_shift_daily_assignments_shift_date_idx
on public.staff_shift_daily_assignments(shift_id, work_date);

create index if not exists staff_shift_weekly_assignments_staff_weekday_idx
on public.staff_shift_weekly_assignments(staff_id, weekday);

alter table public.bookkeeping_entries enable row level security;
alter table public.bookkeeping_shift_closings enable row level security;
alter table public.bookkeeping_daily_closings enable row level security;
alter table public.bookkeeping_expenses enable row level security;
alter table public.bookkeeping_exceptions enable row level security;
alter table public.bookkeeping_reports enable row level security;
alter table public.bookkeeping_financial_settings enable row level security;
alter table public.staff_shift_daily_assignments enable row level security;
alter table public.staff_shift_weekly_assignments enable row level security;

-- If the app still uses localStorage auth, sensitive writes should go through
-- server API routes with service role checks. These policies are for future
-- Supabase Auth role-claim mode.

drop policy if exists "owners can read bookkeeping entries" on public.bookkeeping_entries;
drop policy if exists "owners can read shift closings" on public.bookkeeping_shift_closings;
drop policy if exists "owners can read daily closings" on public.bookkeeping_daily_closings;
drop policy if exists "owners can read bookkeeping expenses" on public.bookkeeping_expenses;
drop policy if exists "owners can read bookkeeping exceptions" on public.bookkeeping_exceptions;
drop policy if exists "owners can read bookkeeping reports" on public.bookkeeping_reports;
drop policy if exists "owners can read bookkeeping financial settings" on public.bookkeeping_financial_settings;
drop policy if exists "owners can read staff shift daily assignments" on public.staff_shift_daily_assignments;
drop policy if exists "owners can read staff shift weekly assignments" on public.staff_shift_weekly_assignments;
drop policy if exists "owners can write bookkeeping entries" on public.bookkeeping_entries;
drop policy if exists "owners can update shift closings" on public.bookkeeping_shift_closings;
drop policy if exists "owners can insert shift closings" on public.bookkeeping_shift_closings;
drop policy if exists "owners can update daily closings" on public.bookkeeping_daily_closings;
drop policy if exists "owners can insert daily closings" on public.bookkeeping_daily_closings;
drop policy if exists "owners can write bookkeeping expenses" on public.bookkeeping_expenses;
drop policy if exists "owners can delete bookkeeping expenses" on public.bookkeeping_expenses;
drop policy if exists "owners can update bookkeeping exceptions" on public.bookkeeping_exceptions;
drop policy if exists "owners can insert bookkeeping exceptions" on public.bookkeeping_exceptions;
drop policy if exists "owners can write bookkeeping reports" on public.bookkeeping_reports;
drop policy if exists "owners can write bookkeeping financial settings" on public.bookkeeping_financial_settings;
drop policy if exists "owners can write staff shift daily assignments" on public.staff_shift_daily_assignments;
drop policy if exists "owners can write staff shift weekly assignments" on public.staff_shift_weekly_assignments;
drop policy if exists "managers can read operational bookkeeping closings" on public.bookkeeping_shift_closings;
drop policy if exists "managers can write operational bookkeeping closings" on public.bookkeeping_shift_closings;
drop policy if exists "staff can submit shift closings" on public.bookkeeping_shift_closings;
drop policy if exists "staff can insert shift closings" on public.bookkeeping_shift_closings;
drop policy if exists "staff can update shift closings" on public.bookkeeping_shift_closings;
drop policy if exists "managers can write bookkeeping expenses" on public.bookkeeping_expenses;
drop policy if exists "managers can write staff shift daily assignments" on public.staff_shift_daily_assignments;
drop policy if exists "managers can write staff shift weekly assignments" on public.staff_shift_weekly_assignments;

create policy "owners can read bookkeeping entries"
on public.bookkeeping_entries
for select
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can read shift closings"
on public.bookkeeping_shift_closings
for select
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can read daily closings"
on public.bookkeeping_daily_closings
for select
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can read bookkeeping expenses"
on public.bookkeeping_expenses
for select
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can read bookkeeping exceptions"
on public.bookkeeping_exceptions
for select
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can read bookkeeping reports"
on public.bookkeeping_reports
for select
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can read bookkeeping financial settings"
on public.bookkeeping_financial_settings
for select
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can read staff shift daily assignments"
on public.staff_shift_daily_assignments
for select
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can read staff shift weekly assignments"
on public.staff_shift_weekly_assignments
for select
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

-- Future Supabase Auth mode write policies. The current localStorage-auth app
-- should still route bookkeeping writes through server APIs using service role
-- checks, but these policies document and support the owner-only permission
-- model when JWT role claims are available.

create policy "owners can write bookkeeping entries"
on public.bookkeeping_entries
for insert
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can insert shift closings"
on public.bookkeeping_shift_closings
for insert
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can update shift closings"
on public.bookkeeping_shift_closings
for update
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can insert daily closings"
on public.bookkeeping_daily_closings
for insert
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can update daily closings"
on public.bookkeeping_daily_closings
for update
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can write bookkeeping expenses"
on public.bookkeeping_expenses
for all
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can delete bookkeeping expenses"
on public.bookkeeping_expenses
for delete
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can insert bookkeeping exceptions"
on public.bookkeeping_exceptions
for insert
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can update bookkeeping exceptions"
on public.bookkeeping_exceptions
for update
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can write bookkeeping reports"
on public.bookkeeping_reports
for insert
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can write bookkeeping financial settings"
on public.bookkeeping_financial_settings
for all
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can write staff shift daily assignments"
on public.staff_shift_daily_assignments
for all
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

create policy "owners can write staff shift weekly assignments"
on public.staff_shift_weekly_assignments
for all
using (coalesce(auth.jwt() ->> 'user_role', '') = 'owner')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'owner');

-- Operational closing ownership:
-- managers prepare shift assignments, opening cash, and expenses;
-- staff submit counted cash through End Shift;
-- owners review the resulting daily closing/report.

create policy "managers can read operational bookkeeping closings"
on public.bookkeeping_shift_closings
for select
using (coalesce(auth.jwt() ->> 'user_role', '') in ('owner', 'manager'));

create policy "managers can write operational bookkeeping closings"
on public.bookkeeping_shift_closings
for all
using (coalesce(auth.jwt() ->> 'user_role', '') = 'manager')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'manager');

create policy "staff can insert shift closings"
on public.bookkeeping_shift_closings
for insert
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'staff');

create policy "staff can update shift closings"
on public.bookkeeping_shift_closings
for update
using (coalesce(auth.jwt() ->> 'user_role', '') = 'staff')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'staff');

create policy "managers can write bookkeeping expenses"
on public.bookkeeping_expenses
for all
using (coalesce(auth.jwt() ->> 'user_role', '') = 'manager')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'manager');

create policy "managers can write staff shift daily assignments"
on public.staff_shift_daily_assignments
for all
using (coalesce(auth.jwt() ->> 'user_role', '') = 'manager')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'manager');

create policy "managers can write staff shift weekly assignments"
on public.staff_shift_weekly_assignments
for all
using (coalesce(auth.jwt() ->> 'user_role', '') = 'manager')
with check (coalesce(auth.jwt() ->> 'user_role', '') = 'manager');

notify pgrst, 'reload schema';
