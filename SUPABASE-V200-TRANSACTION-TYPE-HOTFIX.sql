-- ============================================================
-- V200 HOTFIX - stock_transactions transaction_type constraint
-- Run once in Supabase SQL Editor.
-- Keeps the constraint; does NOT disable validation for new rows.
-- ============================================================

begin;

-- Normalize common legacy values already stored in Cloud.
update public.stock_transactions
set transaction_type = case upper(trim(transaction_type))
  when 'IN' then 'IMPORT'
  when 'INPUT' then 'IMPORT'
  when 'PURCHASE' then 'IMPORT'
  when 'PURCHASE_IN' then 'IMPORT'
  when 'RECEIPT' then 'IMPORT'
  when 'NHAP' then 'IMPORT'

  when 'OUT' then 'EXPORT'
  when 'OUTPUT' then 'EXPORT'
  when 'ISSUE' then 'EXPORT'
  when 'STOCK_OUT' then 'EXPORT'
  when 'XUAT' then 'EXPORT'

  when 'SALES' then 'SALE'
  when 'SELL' then 'SALE'
  when 'SOLD' then 'SALE'
  when 'BAN' then 'SALE'

  when 'ADJUST' then 'ADJUSTMENT'
  when 'STOCKTAKE' then 'ADJUSTMENT'
  when 'STOCK_TAKE' then 'ADJUSTMENT'
  when 'INVENTORY_ADJUSTMENT' then 'ADJUSTMENT'
  when 'INVENTORY_COUNT' then 'ADJUSTMENT'
  when 'KIEM_KE' then 'ADJUSTMENT'
  when 'KIEMKE' then 'ADJUSTMENT'
  else upper(trim(transaction_type))
end
where transaction_type is not null;

alter table public.stock_transactions
  drop constraint if exists stock_transactions_transaction_type_check;

-- NOT VALID preserves any truly unknown legacy rows already stored,
-- but PostgreSQL still enforces the rule for every NEW/UPDATED row.
alter table public.stock_transactions
  add constraint stock_transactions_transaction_type_check
  check (transaction_type in ('IMPORT','EXPORT','SALE','ADJUSTMENT'))
  not valid;

commit;

-- Diagnostic: should normally return zero rows after V200 migration.
select transaction_type, count(*) as row_count
from public.stock_transactions
where transaction_type not in ('IMPORT','EXPORT','SALE','ADJUSTMENT')
   or transaction_type is null
group by transaction_type
order by row_count desc;
