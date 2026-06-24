begin;

alter table public.staff_shift_weekly_assignments enable row level security;
alter table public.staff_shift_daily_assignments enable row level security;

grant select on public.staff_shift_weekly_assignments to anon, authenticated;
grant select on public.staff_shift_daily_assignments to anon, authenticated;

drop policy if exists staff_shift_weekly_assignments_read_policy
  on public.staff_shift_weekly_assignments;

create policy staff_shift_weekly_assignments_read_policy
  on public.staff_shift_weekly_assignments
  for select
  to anon, authenticated
  using (true);

drop policy if exists staff_shift_daily_assignments_read_policy
  on public.staff_shift_daily_assignments;

create policy staff_shift_daily_assignments_read_policy
  on public.staff_shift_daily_assignments
  for select
  to anon, authenticated
  using (true);

commit;
