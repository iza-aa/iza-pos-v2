begin;

alter table public.order_items
  add column if not exists assigned_barista_id uuid references public.staff(id) on delete set null,
  add column if not exists assigned_barista_by uuid references public.staff(id) on delete set null,
  add column if not exists assigned_barista_at timestamptz;

create index if not exists order_items_assigned_barista_id_idx
  on public.order_items (assigned_barista_id);

comment on column public.order_items.assigned_barista_id is
  'Optional cashier-recorded bar handler attribution for bar-routed items. It is not a required workflow confirmation.';

comment on column public.order_items.assigned_barista_by is
  'Staff account that recorded the optional bar handler attribution.';

comment on column public.order_items.assigned_barista_at is
  'Timestamp when the optional bar handler attribution was recorded.';

commit;
