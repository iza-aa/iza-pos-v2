create extension if not exists pgcrypto;

-- Bookkeeping manual QA seed.
-- Safe to rerun: generated rows use deterministic IDs/prefixes and are cleaned first.
-- This seed DOES NOT create staff, menu, category, inventory, recipe, or shift master data.
-- It uses existing staff/products/recipes/inventory so bookkeeping QA reflects the real store setup.

do $$
declare
  today_date date := (timezone('Asia/Jakarta', now()))::date;
  yesterday_date date := ((timezone('Asia/Jakarta', now()))::date - interval '1 day')::date;
  today_text text := to_char((timezone('Asia/Jakarta', now()))::date, 'YYYY-MM-DD');
  yesterday_text text := to_char(((timezone('Asia/Jakarta', now()))::date - interval '1 day')::date, 'YYYY-MM-DD');

  actor_staff_id uuid;
  actor_staff_code text;
  actor_staff_name text;
  actor_staff_role text;

  product_1_id uuid;
  product_1_name text;
  product_1_price numeric;
  product_2_id uuid;
  product_2_name text;
  product_2_price numeric;
  product_3_id uuid;
  product_3_name text;
  product_3_price numeric;

  order_today_cash_id uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
  order_today_qris_id uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2';
  order_today_cancelled_id uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3';
  order_yesterday_cash_id uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4';
  order_yesterday_card_id uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5';
  usage_today_id uuid := 'ffffffff-ffff-4fff-8fff-fffffffffff1';
  usage_yesterday_id uuid := 'ffffffff-ffff-4fff-8fff-fffffffffff2';

  today_cash_subtotal numeric;
  today_cash_discount numeric;
  today_qris_subtotal numeric;
  cancelled_subtotal numeric;
  yesterday_cash_subtotal numeric;
  yesterday_cash_discount numeric;
  yesterday_card_subtotal numeric;
begin
  select id, staff_code, name, role
  into actor_staff_id, actor_staff_code, actor_staff_name, actor_staff_role
  from public.staff
  where coalesce(status, 'active') = 'active'
  order by
    case role
      when 'owner' then 0
      when 'manager' then 1
      else 2
    end,
    created_at nulls last,
    name
  limit 1;

  if actor_staff_id is null then
    raise exception 'Bookkeeping dummy seed needs at least one existing active staff row.';
  end if;

  with ranked_products as (
    select
      p.id,
      p.name,
      coalesce(p.price, 0)::numeric as price,
      row_number() over (
        order by
          case
            when exists (
              select 1
              from public.recipes r
              join public.recipe_ingredients ri on ri.recipe_id = r.id
              join public.inventory_items ii on ii.id = ri.inventory_item_id
              where r.product_id = p.id
                and r.recipe_type = 'base'
                and coalesce(ii.cost_per_unit, 0) > 0
            ) then 0
            when exists (
              select 1
              from public.recipes r
              join public.recipe_ingredients ri on ri.recipe_id = r.id
              where r.product_id = p.id
                and r.recipe_type = 'base'
            ) then 1
            else 2
          end,
          p.name
      ) as rn
    from public.products p
    where coalesce(p.available, true) = true
      and coalesce(p.price, 0) > 0
  )
  select id, name, price
  into product_1_id, product_1_name, product_1_price
  from ranked_products
  where rn = 1;

  with ranked_products as (
    select
      p.id,
      p.name,
      coalesce(p.price, 0)::numeric as price,
      row_number() over (
        order by
          case
            when exists (
              select 1
              from public.recipes r
              join public.recipe_ingredients ri on ri.recipe_id = r.id
              join public.inventory_items ii on ii.id = ri.inventory_item_id
              where r.product_id = p.id
                and r.recipe_type = 'base'
                and coalesce(ii.cost_per_unit, 0) > 0
            ) then 0
            when exists (
              select 1
              from public.recipes r
              join public.recipe_ingredients ri on ri.recipe_id = r.id
              where r.product_id = p.id
                and r.recipe_type = 'base'
            ) then 1
            else 2
          end,
          p.name
      ) as rn
    from public.products p
    where coalesce(p.available, true) = true
      and coalesce(p.price, 0) > 0
  )
  select id, name, price
  into product_2_id, product_2_name, product_2_price
  from ranked_products
  where rn = 2;

  with ranked_products as (
    select
      p.id,
      p.name,
      coalesce(p.price, 0)::numeric as price,
      row_number() over (
        order by
          case
            when exists (
              select 1
              from public.recipes r
              join public.recipe_ingredients ri on ri.recipe_id = r.id
              join public.inventory_items ii on ii.id = ri.inventory_item_id
              where r.product_id = p.id
                and r.recipe_type = 'base'
                and coalesce(ii.cost_per_unit, 0) > 0
            ) then 0
            when exists (
              select 1
              from public.recipes r
              join public.recipe_ingredients ri on ri.recipe_id = r.id
              where r.product_id = p.id
                and r.recipe_type = 'base'
            ) then 1
            else 2
          end,
          p.name
      ) as rn
    from public.products p
    where coalesce(p.available, true) = true
      and coalesce(p.price, 0) > 0
  )
  select id, name, price
  into product_3_id, product_3_name, product_3_price
  from ranked_products
  where rn = 3;

  if product_1_id is null then
    raise exception 'Bookkeeping dummy seed needs at least one existing available product with price greater than 0.';
  end if;

  product_2_id := coalesce(product_2_id, product_1_id);
  product_2_name := coalesce(product_2_name, product_1_name);
  product_2_price := coalesce(product_2_price, product_1_price);
  product_3_id := coalesce(product_3_id, product_1_id);
  product_3_name := coalesce(product_3_name, product_1_name);
  product_3_price := coalesce(product_3_price, product_1_price);

  today_cash_subtotal := (product_1_price * 2) + product_3_price;
  today_cash_discount := least(5000, greatest(today_cash_subtotal - 1000, 0));
  today_qris_subtotal := product_2_price * 2;
  cancelled_subtotal := product_2_price;
  yesterday_cash_subtotal := (product_1_price * 2) + product_2_price + product_3_price;
  yesterday_cash_discount := least(10000, greatest(yesterday_cash_subtotal - 1000, 0));
  yesterday_card_subtotal := product_3_price * 2;

  delete from public.bookkeeping_reports
  where generated_by = 'bookkeeping-dummy-seed';

  delete from public.bookkeeping_entries
  where source_id in (
    order_today_cash_id::text,
    order_today_qris_id::text,
    order_today_cancelled_id::text,
    order_yesterday_cash_id::text,
    order_yesterday_card_id::text,
    usage_today_id::text,
    usage_yesterday_id::text
  )
  or source_id like 'bookkeeping-dummy-%';

  delete from public.bookkeeping_exceptions
  where source_id like 'bookkeeping-dummy-%'
     or business_date in (today_date, yesterday_date);

  delete from public.bookkeeping_expenses
  where created_by = 'bookkeeping-dummy-seed'
     or note like 'Bookkeeping dummy%';

  delete from public.usage_transaction_details
  where usage_transaction_id in (usage_today_id, usage_yesterday_id);

  delete from public.usage_transactions
  where id in (usage_today_id, usage_yesterday_id);

  delete from public.order_items
  where order_id in (
    order_today_cash_id,
    order_today_qris_id,
    order_today_cancelled_id,
    order_yesterday_cash_id,
    order_yesterday_card_id
  );

  delete from public.orders
  where id in (
    order_today_cash_id,
    order_today_qris_id,
    order_today_cancelled_id,
    order_yesterday_cash_id,
    order_yesterday_card_id
  )
  or order_number like 'BK-DUMMY-%';

  insert into public.orders (
    id,
    order_number,
    customer_name,
    table_number,
    table_id,
    order_source,
    order_type,
    fulfillment_method,
    pickup_code,
    status,
    subtotal,
    tax,
    discount,
    total,
    payment_method,
    payment_status,
    created_by,
    created_by_role,
    created_by_staff_code,
    created_by_staff_name,
    created_by_code,
    notes,
    created_at,
    completed_at
  )
  values
    (
      order_today_cash_id,
      'BKD-' || to_char(today_date, 'MMDD') || '-01',
      'BK Today Cash',
      null,
      null,
      'pos',
      'Dine in',
      'counter_pickup',
      'BK001',
      'completed',
      today_cash_subtotal,
      0,
      today_cash_discount,
      today_cash_subtotal - today_cash_discount,
      'Cash',
      'paid',
      actor_staff_id,
      actor_staff_role,
      actor_staff_code,
      left(actor_staff_name, 20),
      actor_staff_code,
      'Bookkeeping dummy today cash order using existing menu data',
      today_date + time '09:15:00',
      today_date + time '09:28:00'
    ),
    (
      order_today_qris_id,
      'BKD-' || to_char(today_date, 'MMDD') || '-02',
      'BK Today QRIS',
      null,
      null,
      'pos',
      'Take Away',
      'counter_pickup',
      'BK002',
      'completed',
      today_qris_subtotal,
      0,
      0,
      today_qris_subtotal,
      'QRIS',
      'paid',
      actor_staff_id,
      actor_staff_role,
      actor_staff_code,
      left(actor_staff_name, 20),
      actor_staff_code,
      'Bookkeeping dummy today non-cash order using existing menu data',
      today_date + time '16:45:00',
      today_date + time '16:58:00'
    ),
    (
      order_today_cancelled_id,
      'BKD-' || to_char(today_date, 'MMDD') || '-03',
      'BK Cancelled',
      null,
      null,
      'pos',
      'Dine in',
      'counter_pickup',
      'BK003',
      'cancelled',
      cancelled_subtotal,
      0,
      0,
      cancelled_subtotal,
      'Cash',
      'cancelled',
      actor_staff_id,
      actor_staff_role,
      actor_staff_code,
      left(actor_staff_name, 20),
      actor_staff_code,
      'Bookkeeping dummy cancelled order using existing menu data',
      today_date + time '18:10:00',
      null
    ),
    (
      order_yesterday_cash_id,
      'BKD-' || to_char(yesterday_date, 'MMDD') || '-01',
      'BK Yesterday Cash',
      null,
      null,
      'pos',
      'Dine in',
      'counter_pickup',
      'BK004',
      'completed',
      yesterday_cash_subtotal,
      0,
      yesterday_cash_discount,
      yesterday_cash_subtotal - yesterday_cash_discount,
      'Cash',
      'paid',
      actor_staff_id,
      actor_staff_role,
      actor_staff_code,
      left(actor_staff_name, 20),
      actor_staff_code,
      'Bookkeeping dummy yesterday cash order using existing menu data',
      yesterday_date + time '10:30:00',
      yesterday_date + time '10:44:00'
    ),
    (
      order_yesterday_card_id,
      'BKD-' || to_char(yesterday_date, 'MMDD') || '-02',
      'BK Yesterday Card',
      null,
      null,
      'pos',
      'Take Away',
      'counter_pickup',
      'BK005',
      'completed',
      yesterday_card_subtotal,
      0,
      0,
      yesterday_card_subtotal,
      'Card',
      'paid',
      actor_staff_id,
      actor_staff_role,
      actor_staff_code,
      left(actor_staff_name, 20),
      actor_staff_code,
      'Bookkeeping dummy yesterday card order using existing menu data',
      yesterday_date + time '17:20:00',
      yesterday_date + time '17:31:00'
    );

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    base_price,
    variants,
    total_price,
    kitchen_status,
    served,
    ready_at,
    served_at,
    served_by
  )
  values
    (order_today_cash_id, product_1_id, product_1_name, 2, product_1_price, null, product_1_price * 2, 'ready', true, today_date + time '09:20:00', today_date + time '09:28:00', actor_staff_id),
    (order_today_cash_id, product_3_id, product_3_name, 1, product_3_price, null, product_3_price, 'ready', true, today_date + time '09:22:00', today_date + time '09:28:00', actor_staff_id),
    (order_today_qris_id, product_2_id, product_2_name, 2, product_2_price, null, product_2_price * 2, 'ready', true, today_date + time '16:50:00', today_date + time '16:58:00', actor_staff_id),
    (order_today_cancelled_id, product_2_id, product_2_name, 1, product_2_price, null, product_2_price, 'not_required', false, null, null, null),
    (order_yesterday_cash_id, product_1_id, product_1_name, 2, product_1_price, null, product_1_price * 2, 'ready', true, yesterday_date + time '10:35:00', yesterday_date + time '10:44:00', actor_staff_id),
    (order_yesterday_cash_id, product_3_id, product_3_name, 1, product_3_price, null, product_3_price, 'ready', true, yesterday_date + time '10:36:00', yesterday_date + time '10:44:00', actor_staff_id),
    (order_yesterday_cash_id, product_2_id, product_2_name, 1, product_2_price, null, product_2_price, 'ready', true, yesterday_date + time '10:37:00', yesterday_date + time '10:44:00', actor_staff_id),
    (order_yesterday_card_id, product_3_id, product_3_name, 2, product_3_price, null, product_3_price * 2, 'ready', true, yesterday_date + time '17:24:00', yesterday_date + time '17:31:00', actor_staff_id);

  insert into public.usage_transactions (id, transaction_type, notes, performed_by, performed_by_name, created_at)
  values
    (usage_today_id, 'order_usage', 'Bookkeeping dummy today ingredient usage from existing recipes', actor_staff_id, actor_staff_name, today_date + time '19:00:00'),
    (usage_yesterday_id, 'order_usage', 'Bookkeeping dummy yesterday ingredient usage from existing recipes', actor_staff_id, actor_staff_name, yesterday_date + time '19:00:00');

  insert into public.usage_transaction_details (
    usage_transaction_id,
    inventory_item_id,
    ingredient_name,
    quantity_used,
    unit,
    previous_stock,
    new_stock
  )
  select
    usage_today_id,
    ri.inventory_item_id,
    coalesce(ri.ingredient_name, ii.name, 'Ingredient'),
    ri.quantity_needed * sold.quantity,
    ri.unit,
    coalesce(ii.current_stock, 0),
    greatest(coalesce(ii.current_stock, 0) - (ri.quantity_needed * sold.quantity), 0)
  from (
    values
      (product_1_id, 2::numeric),
      (product_2_id, 2::numeric),
      (product_3_id, 1::numeric)
  ) as sold(product_id, quantity)
  join public.recipes r on r.product_id = sold.product_id and r.recipe_type = 'base'
  join public.recipe_ingredients ri on ri.recipe_id = r.id
  left join public.inventory_items ii on ii.id = ri.inventory_item_id;

  insert into public.usage_transaction_details (
    usage_transaction_id,
    inventory_item_id,
    ingredient_name,
    quantity_used,
    unit,
    previous_stock,
    new_stock
  )
  select
    usage_yesterday_id,
    ri.inventory_item_id,
    coalesce(ri.ingredient_name, ii.name, 'Ingredient'),
    ri.quantity_needed * sold.quantity,
    ri.unit,
    coalesce(ii.current_stock, 0),
    greatest(coalesce(ii.current_stock, 0) - (ri.quantity_needed * sold.quantity), 0)
  from (
    values
      (product_1_id, 2::numeric),
      (product_2_id, 1::numeric),
      (product_3_id, 3::numeric)
  ) as sold(product_id, quantity)
  join public.recipes r on r.product_id = sold.product_id and r.recipe_type = 'base'
  join public.recipe_ingredients ri on ri.recipe_id = r.id
  left join public.inventory_items ii on ii.id = ri.inventory_item_id;

  insert into public.bookkeeping_expenses (
    expense_date,
    category,
    amount,
    payment_method,
    vendor,
    receipt_url,
    note,
    created_by
  )
  values
    (today_date, 'Packaging', 18000, 'cash', 'Existing Supplier', null, 'Bookkeeping dummy today packaging expense', 'bookkeeping-dummy-seed'),
    (yesterday_date, 'Utilities', 25000, 'bank_transfer', 'Existing Utility Vendor', null, 'Bookkeeping dummy yesterday utility expense', 'bookkeeping-dummy-seed');

  raise notice 'Bookkeeping dummy seed inserted for % and % using staff % and products: %, %, %',
    yesterday_text,
    today_text,
    actor_staff_code,
    product_1_name,
    product_2_name,
    product_3_name;
end $$;
