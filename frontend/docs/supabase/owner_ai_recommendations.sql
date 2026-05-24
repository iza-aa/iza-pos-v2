create extension if not exists pgcrypto;

create table if not exists public.owner_ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  category text not null check (
    category in ('overview', 'sales', 'rewards', 'inventory', 'staff', 'operations')
  ),
  local_date date not null,
  period_key text not null default 'today_vs_yesterday_v10',
  insights_json jsonb not null default '[]'::jsonb,
  snapshot_json jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null default '9999-12-31 23:59:59.999+00',
  generation_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, category, local_date, period_key)
);

alter table public.owner_ai_recommendations enable row level security;

drop policy if exists "owners can read own recommendation" on public.owner_ai_recommendations;
drop policy if exists "owners can insert own recommendation" on public.owner_ai_recommendations;
drop policy if exists "owners can update own recommendation" on public.owner_ai_recommendations;

create policy "owners can read own recommendation"
on public.owner_ai_recommendations
for select
using (
  auth.uid()::text = owner_id
  and coalesce(auth.jwt() ->> 'user_role', '') = 'owner'
);

create policy "owners can insert own recommendation"
on public.owner_ai_recommendations
for insert
with check (
  auth.uid()::text = owner_id
  and coalesce(auth.jwt() ->> 'user_role', '') = 'owner'
);

create policy "owners can update own recommendation"
on public.owner_ai_recommendations
for update
using (
  auth.uid()::text = owner_id
  and coalesce(auth.jwt() ->> 'user_role', '') = 'owner'
)
with check (
  auth.uid()::text = owner_id
  and coalesce(auth.jwt() ->> 'user_role', '') = 'owner'
);

-- If the app is using localStorage auth, keep client access routed through
-- /api/owner/recommendations/*. The server route uses the service role key.

-- Migration support for databases that already created the previous daily-only
-- unique constraint. This lets the app store one recommendation per owner,
-- category, generated date, and active dashboard filter period.
alter table public.owner_ai_recommendations
alter column expires_at set default '9999-12-31 23:59:59.999+00';

alter table public.owner_ai_recommendations
alter column period_key set default 'today_vs_yesterday_v10';

alter table public.owner_ai_recommendations
drop constraint if exists owner_ai_recommendations_owner_id_category_local_date_key;

create unique index if not exists owner_ai_recommendations_owner_category_date_period_key
on public.owner_ai_recommendations(owner_id, category, local_date, period_key);

notify pgrst, 'reload schema';
