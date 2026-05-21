create table if not exists public.owner_ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  category text not null check (
    category in ('overview', 'sales', 'rewards', 'inventory', 'staff', 'operations')
  ),
  local_date date not null,
  period_key text not null default 'today_vs_yesterday',
  insights_json jsonb not null default '[]'::jsonb,
  snapshot_json jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  generation_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, category, local_date)
);

alter table public.owner_ai_recommendations enable row level security;

-- Option A: use these policies if Supabase Auth JWT includes user_role = owner.
drop policy if exists "owners can read own recommendation" on public.owner_ai_recommendations;
create policy "owners can read own recommendation"
on public.owner_ai_recommendations
for select
using (
  auth.uid()::text = owner_id
  and coalesce(auth.jwt() ->> 'user_role', '') = 'owner'
);

drop policy if exists "owners can insert own recommendation" on public.owner_ai_recommendations;
create policy "owners can insert own recommendation"
on public.owner_ai_recommendations
for insert
with check (
  auth.uid()::text = owner_id
  and coalesce(auth.jwt() ->> 'user_role', '') = 'owner'
);

drop policy if exists "owners can update own recommendation" on public.owner_ai_recommendations;
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

-- Option B for the current localStorage-auth flow:
-- keep direct client writes disabled and access this table only through
-- /api/owner/recommendations/* using SUPABASE_SERVICE_ROLE_KEY.
