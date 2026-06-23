begin;

-- Preserve historical legacy identifiers as table numbers before removing
-- the retired fulfillment schema. Existing table numbers take precedence.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'pager_number'
  ) then
    update public.orders
    set
      table_number = coalesce(
        nullif(trim(table_number::text), ''),
        nullif(trim(pager_number::text), '')
      ),
      fulfillment_method = 'table_service',
      order_type = 'Dine in'
    where fulfillment_method = 'pager'
       or pager_number is not null;
  else
    update public.orders
    set
      fulfillment_method = 'table_service',
      order_type = 'Dine in'
    where fulfillment_method = 'pager';
  end if;
end
$$;

-- Remove fulfillment constraints that still mention the retired pager value.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%fulfillment_method%'
  loop
    execute format(
      'alter table public.orders drop constraint %I',
      constraint_record.conname
    );
  end loop;
end
$$;

alter table public.orders
  add constraint orders_fulfillment_method_check
  check (
    fulfillment_method is null
    or fulfillment_method = 'counter_pickup'
    or (
      fulfillment_method = 'table_service'
      and nullif(trim(table_number::text), '') is not null
    )
  );

alter table public.orders
  drop column if exists pager_number;

commit;
