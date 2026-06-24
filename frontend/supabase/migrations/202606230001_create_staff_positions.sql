begin;

create table if not exists public.staff_positions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  position text not null,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_positions_position_check
    check (position in ('cashier', 'barista', 'kitchen', 'waiter')),
  constraint staff_positions_staff_position_key
    unique (staff_id, position)
);

create index if not exists staff_positions_staff_id_idx
  on public.staff_positions (staff_id);

create unique index if not exists staff_positions_one_active_primary_idx
  on public.staff_positions (staff_id)
  where is_primary = true and is_active = true;

grant select, insert, update, delete on public.staff_positions
  to anon, authenticated, service_role;

alter table public.staff_positions enable row level security;

drop policy if exists staff_positions_read_policy
  on public.staff_positions;

create policy staff_positions_read_policy
  on public.staff_positions
  for select
  to anon, authenticated
  using (true);

insert into public.staff_positions (
  staff_id,
  position,
  is_primary,
  is_active
)
select
  staff.id,
  case
    when lower(trim(staff.staff_type)) in ('cashier', 'kasir') then 'cashier'
    when lower(trim(staff.staff_type)) in ('bar', 'barista', 'bartender') then 'barista'
    when lower(trim(staff.staff_type)) in ('kitchen', 'cook', 'chef', 'dapur') then 'kitchen'
    when lower(trim(staff.staff_type)) in ('server', 'waiter', 'waitress', 'pelayan') then 'waiter'
    else null
  end,
  true,
  true
from public.staff
where lower(trim(coalesce(staff.role, ''))) = 'staff'
  and staff.staff_type is not null
  and trim(staff.staff_type) <> ''
  and lower(trim(staff.staff_type)) in (
    'cashier',
    'kasir',
    'bar',
    'barista',
    'bartender',
    'kitchen',
    'cook',
    'chef',
    'dapur',
    'server',
    'waiter',
    'waitress',
    'pelayan'
  )
on conflict (staff_id, position) do update
set
  is_primary = true,
  is_active = true,
  updated_at = now();

comment on table public.staff_positions is
  'Fixed operational positions owned by a staff account. Access migration reads staff_type only as a temporary compatibility fallback.';

comment on column public.staff_positions.is_primary is
  'Preferred position for labels/default navigation. It does not remove access from other active positions.';

create or replace function public.set_staff_positions(
  p_staff_id uuid,
  p_positions text[],
  p_primary_position text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  normalized_positions text[] := coalesce(p_positions, array[]::text[]);
begin
  if exists (
    select 1
    from unnest(normalized_positions) as requested_position
    where requested_position not in ('cashier', 'barista', 'kitchen', 'waiter')
  ) then
    raise exception 'Invalid staff position';
  end if;

  if cardinality(normalized_positions) = 0 then
    delete from public.staff_positions
    where staff_id = p_staff_id;

    update public.staff
    set
      staff_type = null,
      updated_at = now()
    where id = p_staff_id;

    return;
  end if;

  if p_primary_position is null
    or not (p_primary_position = any(normalized_positions))
  then
    raise exception 'Primary position must be one of the selected positions';
  end if;

  delete from public.staff_positions
  where staff_id = p_staff_id
    and not (position = any(normalized_positions));

  update public.staff_positions
  set
    is_primary = false,
    updated_at = now()
  where staff_id = p_staff_id;

  insert into public.staff_positions (
    staff_id,
    position,
    is_primary,
    is_active
  )
  select
    p_staff_id,
    requested_position,
    requested_position = p_primary_position,
    true
  from unnest(normalized_positions) as requested_position
  on conflict (staff_id, position) do update
  set
    is_primary = excluded.is_primary,
    is_active = true,
    updated_at = now();

  update public.staff
  set
    staff_type = p_primary_position,
    updated_at = now()
  where id = p_staff_id;
end;
$$;

grant execute on function public.set_staff_positions(uuid, text[], text)
  to anon, authenticated, service_role;

commit;
