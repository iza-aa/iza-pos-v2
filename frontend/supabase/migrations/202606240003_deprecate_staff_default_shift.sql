begin;

-- Staff schedules are now controlled by the roster calendar:
-- public.staff_shift_daily_assignments and public.staff_shift_weekly_assignments.
--
-- Keep public.staff.shift_id for legacy compatibility for now, but clear old
-- default-shift values so the application cannot accidentally display or reuse
-- stale assignments such as "Shift Malam" from the staff row.
update public.staff
set
  shift_id = null,
  updated_at = now()
where shift_id is not null;

comment on column public.staff.shift_id is
  'Deprecated. Do not use for scheduling. Use staff_shift_daily_assignments or staff_shift_weekly_assignments instead.';

commit;
