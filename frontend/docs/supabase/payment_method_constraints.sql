-- Align payment method values across orders and payment_transactions.
-- Run this after the base POS schema exists.

update public.orders
set payment_method = case lower(payment_method)
  when 'cash' then 'Cash'
  when 'qris' then 'QRIS'
  when 'scan' then 'QRIS'
  when 'card' then 'Card'
  when 'debit' then 'Card'
  when 'credit' then 'Card'
  when 'e-wallet' then 'E-Wallet'
  when 'ewallet' then 'E-Wallet'
  else payment_method
end
where payment_method is not null;

update public.payment_transactions
set payment_method = case lower(payment_method)
  when 'cash' then 'Cash'
  when 'qris' then 'QRIS'
  when 'scan' then 'QRIS'
  when 'card' then 'Card'
  when 'debit' then 'Card'
  when 'credit' then 'Card'
  when 'e-wallet' then 'E-Wallet'
  when 'ewallet' then 'E-Wallet'
  else payment_method
end
where payment_method is not null;

alter table public.orders
drop constraint if exists orders_payment_method_check;

alter table public.orders
add constraint orders_payment_method_check
check (
  payment_method is null
  or payment_method in ('Cash', 'QRIS', 'Card', 'E-Wallet')
);

alter table public.payment_transactions
drop constraint if exists payment_transactions_payment_method_check;

alter table public.payment_transactions
add constraint payment_transactions_payment_method_check
check (
  payment_method is null
  or payment_method in ('Cash', 'QRIS', 'Card', 'E-Wallet')
);

notify pgrst, 'reload schema';
