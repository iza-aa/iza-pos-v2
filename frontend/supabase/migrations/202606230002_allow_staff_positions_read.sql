begin;

alter table public.staff_positions enable row level security;

grant select on public.staff_positions to anon, authenticated;

drop policy if exists staff_positions_read_policy
  on public.staff_positions;

create policy staff_positions_read_policy
  on public.staff_positions
  for select
  to anon, authenticated
  using (true);

commit;
