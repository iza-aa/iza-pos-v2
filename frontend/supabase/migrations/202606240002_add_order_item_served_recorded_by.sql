begin;

alter table public.order_items
  add column if not exists served_recorded_by uuid references public.staff(id) on delete set null;

create index if not exists order_items_served_recorded_by_idx
  on public.order_items (served_recorded_by);

comment on column public.order_items.served_recorded_by is
  'Staff account that recorded the serve or handoff action. served_by may represent the actual handoff staff when one is selected.';

commit;
