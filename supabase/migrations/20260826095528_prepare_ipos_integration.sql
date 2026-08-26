alter table public.ly_products
  add column if not exists ipos_item_id text,
  add column if not exists ipos_item_type_id text,
  add column if not exists ipos_item_type_name text,
  add column if not exists ipos_item_class_id text,
  add column if not exists ipos_item_class_name text,
  add column if not exists ipos_last_synced_at timestamptz;

create unique index if not exists ly_products_org_ipos_item_uidx
  on public.ly_products(org_id, ipos_item_id)
  where ipos_item_id is not null;

alter table public.ly_sales
  add column if not exists ipos_tran_id text,
  add column if not exists ipos_store_uid text,
  add column if not exists ipos_sale_updated_at bigint,
  add column if not exists ipos_payment_methods jsonb not null default '[]'::jsonb,
  add column if not exists ipos_last_synced_at timestamptz;

create unique index if not exists ly_sales_org_ipos_tran_uidx
  on public.ly_sales(org_id, ipos_tran_id)
  where ipos_tran_id is not null;

alter table public.ly_sale_items
  add column if not exists ipos_sale_detail_id text,
  add column if not exists ipos_item_id text,
  add column if not exists ipos_toppings jsonb not null default '[]'::jsonb;

create unique index if not exists ly_sale_items_org_ipos_detail_uidx
  on public.ly_sale_items(org_id, ipos_sale_detail_id)
  where ipos_sale_detail_id is not null;

create index if not exists ly_sale_items_org_ipos_item_idx
  on public.ly_sale_items(org_id, ipos_item_id)
  where ipos_item_id is not null;
