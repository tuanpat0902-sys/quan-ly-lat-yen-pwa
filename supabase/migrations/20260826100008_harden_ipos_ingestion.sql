create table if not exists public.ly_ipos_sync_state (
  org_id uuid not null references public.ly_organizations(id) on delete cascade,
  store_uid text not null,
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  last_sale_updated_at bigint,
  last_tran_id text,
  updated_at timestamptz not null default now(),
  primary key (org_id, store_uid)
);

alter table public.ly_ipos_sync_state enable row level security;

drop policy if exists ly_ipos_sync_state_admin on public.ly_ipos_sync_state;
create policy ly_ipos_sync_state_admin on public.ly_ipos_sync_state
for all to authenticated
using (ly_private.ly_is_admin() and org_id = ly_private.ly_current_org())
with check (ly_private.ly_is_admin() and org_id = ly_private.ly_current_org());

create or replace function public.ly_ipos_upsert_product(
  p_org_id uuid,
  p_warehouse_id uuid,
  p_item jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_item_id text := nullif(trim(p_item->>'item_id'),'');
  v_name text := nullif(trim(p_item->>'item_name'),'');
  v_price numeric := coalesce(nullif(p_item->>'price','')::numeric, nullif(p_item->>'price_org','')::numeric, 0);
begin
  if p_org_id is null or p_warehouse_id is null then
    raise exception 'org_id and warehouse_id are required';
  end if;
  if v_item_id is null or v_name is null then
    raise exception 'iPOS item_id and item_name are required';
  end if;
  if not exists (select 1 from public.ly_warehouses w where w.id=p_warehouse_id and w.org_id=p_org_id and w.active) then
    raise exception 'Warehouse does not belong to organization or is inactive';
  end if;

  select p.id into v_id
  from public.ly_products p
  where p.org_id=p_org_id and p.ipos_item_id=v_item_id
  limit 1;

  if v_id is null then
    insert into public.ly_products(
      org_id, warehouse_id, name, sku, unit, selling_price, active,
      ipos_item_id, ipos_item_type_id, ipos_item_type_name,
      ipos_item_class_id, ipos_item_class_name, ipos_last_synced_at
    ) values (
      p_org_id, p_warehouse_id, v_name, v_item_id, 'ly', v_price, true,
      v_item_id, nullif(p_item->>'item_type_id',''), nullif(p_item->>'item_type_name',''),
      nullif(p_item->>'item_class_id',''), nullif(p_item->>'item_class_name',''), now()
    ) returning id into v_id;
  else
    update public.ly_products set
      warehouse_id=p_warehouse_id,
      name=v_name,
      sku=coalesce(sku,v_item_id),
      selling_price=v_price,
      active=not coalesce((p_item->>'deleted')::boolean,false),
      ipos_item_type_id=nullif(p_item->>'item_type_id',''),
      ipos_item_type_name=nullif(p_item->>'item_type_name',''),
      ipos_item_class_id=nullif(p_item->>'item_class_id',''),
      ipos_item_class_name=nullif(p_item->>'item_class_name',''),
      ipos_last_synced_at=now()
    where id=v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.ly_ipos_upsert_product(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.ly_ipos_upsert_product(uuid,uuid,jsonb) to service_role;

create or replace function public.ly_ipos_upsert_sale(
  p_org_id uuid,
  p_warehouse_id uuid,
  p_sale jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale_id uuid;
  v_tran_id text := nullif(trim(p_sale->>'tran_id'),'');
  v_tran_no text := nullif(trim(p_sale->>'tran_no'),'');
  v_store_uid text := nullif(trim(p_sale->>'store_uid'),'');
  v_detail jsonb;
  v_product_id uuid;
  v_detail_id text;
  v_item_count int := 0;
  v_unconfigured_recipe_count int := 0;
  v_sold_at timestamptz;
begin
  if p_org_id is null or p_warehouse_id is null then
    raise exception 'org_id and warehouse_id are required';
  end if;
  if v_tran_id is null or v_tran_no is null then
    raise exception 'iPOS tran_id and tran_no are required';
  end if;
  if not exists (select 1 from public.ly_warehouses w where w.id=p_warehouse_id and w.org_id=p_org_id and w.active) then
    raise exception 'Warehouse does not belong to organization or is inactive';
  end if;

  v_sold_at := case
    when nullif(p_sale->>'tran_date','') is not null then to_timestamp((p_sale->>'tran_date')::numeric / 1000.0)
    else now()
  end;

  select s.id into v_sale_id
  from public.ly_sales s
  where s.org_id=p_org_id and s.ipos_tran_id=v_tran_id
  limit 1;

  if v_sale_id is null then
    insert into public.ly_sales(
      org_id, warehouse_id, receipt_no, sold_at, source, note,
      subtotal, discount_type, discount_value, receipt_discount,
      item_discount_total, discount, total_amount,
      ipos_tran_id, ipos_store_uid, ipos_sale_updated_at,
      ipos_payment_methods, ipos_last_synced_at
    ) values (
      p_org_id, p_warehouse_id, v_tran_no, v_sold_at, 'iPOS', coalesce(p_sale->>'sale_note',''),
      coalesce((p_sale->>'amount_origin')::numeric,0), 'amount',
      coalesce((p_sale->>'discount_extra_amount')::numeric,0),
      coalesce((p_sale->>'discount_extra_amount')::numeric,0),
      coalesce((p_sale->>'amount_discount_detail')::numeric,0),
      coalesce((p_sale->>'discount_extra_amount')::numeric,0)+coalesce((p_sale->>'amount_discount_detail')::numeric,0),
      coalesce((p_sale->>'total_amount')::numeric,0),
      v_tran_id, v_store_uid, nullif(p_sale->>'sale_updated_at','')::bigint,
      coalesce(p_sale->'sale_payment_method','[]'::jsonb), now()
    ) returning id into v_sale_id;
  else
    update public.ly_sales set
      warehouse_id=p_warehouse_id,
      receipt_no=v_tran_no,
      sold_at=v_sold_at,
      source='iPOS',
      note=coalesce(p_sale->>'sale_note',''),
      subtotal=coalesce((p_sale->>'amount_origin')::numeric,0),
      discount_type='amount',
      discount_value=coalesce((p_sale->>'discount_extra_amount')::numeric,0),
      receipt_discount=coalesce((p_sale->>'discount_extra_amount')::numeric,0),
      item_discount_total=coalesce((p_sale->>'amount_discount_detail')::numeric,0),
      discount=coalesce((p_sale->>'discount_extra_amount')::numeric,0)+coalesce((p_sale->>'amount_discount_detail')::numeric,0),
      total_amount=coalesce((p_sale->>'total_amount')::numeric,0),
      ipos_store_uid=v_store_uid,
      ipos_sale_updated_at=nullif(p_sale->>'sale_updated_at','')::bigint,
      ipos_payment_methods=coalesce(p_sale->'sale_payment_method','[]'::jsonb),
      ipos_last_synced_at=now()
    where id=v_sale_id;

    delete from public.ly_sale_items where org_id=p_org_id and sale_id=v_sale_id;
  end if;

  for v_detail in select value from jsonb_array_elements(coalesce(p_sale->'sale_detail','[]'::jsonb))
  loop
    v_detail_id := coalesce(nullif(v_detail->>'id_sale_detail',''), nullif(v_detail->>'id',''));
    v_product_id := public.ly_ipos_upsert_product(p_org_id,p_warehouse_id,v_detail);

    insert into public.ly_sale_items(
      org_id, sale_id, product_id, quantity, unit_price,
      line_subtotal, item_discount_type, item_discount_value,
      item_discount, line_total,
      ipos_sale_detail_id, ipos_item_id, ipos_toppings
    ) values (
      p_org_id, v_sale_id, v_product_id,
      coalesce((v_detail->>'quantity')::numeric,0),
      coalesce((v_detail->>'price')::numeric,0),
      coalesce((v_detail->>'price_org')::numeric,0) * coalesce((v_detail->>'quantity')::numeric,0),
      'amount', coalesce((v_detail->>'discount_amount')::numeric,0),
      coalesce((v_detail->>'discount_amount')::numeric,0),
      coalesce((v_detail->>'amount')::numeric,0),
      v_detail_id, nullif(v_detail->>'item_id',''), coalesce(v_detail->'toppings','[]'::jsonb)
    );

    v_item_count := v_item_count + 1;
    if not exists (select 1 from public.ly_recipe_items r where r.org_id=p_org_id and r.product_id=v_product_id) then
      v_unconfigured_recipe_count := v_unconfigured_recipe_count + 1;
    end if;
  end loop;

  insert into public.ly_ipos_sync_state(org_id,store_uid,last_success_at,last_attempt_at,last_error,last_sale_updated_at,last_tran_id,updated_at)
  values(p_org_id,coalesce(v_store_uid,'unknown'),now(),now(),null,nullif(p_sale->>'sale_updated_at','')::bigint,v_tran_id,now())
  on conflict(org_id,store_uid) do update set
    last_success_at=excluded.last_success_at,
    last_attempt_at=excluded.last_attempt_at,
    last_error=null,
    last_sale_updated_at=excluded.last_sale_updated_at,
    last_tran_id=excluded.last_tran_id,
    updated_at=now();

  return jsonb_build_object(
    'sale_id',v_sale_id,
    'ipos_tran_id',v_tran_id,
    'items',v_item_count,
    'items_without_recipe',v_unconfigured_recipe_count,
    'inventory_changed',false
  );
end;
$$;

revoke all on function public.ly_ipos_upsert_sale(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.ly_ipos_upsert_sale(uuid,uuid,jsonb) to service_role;

comment on function public.ly_ipos_upsert_sale(uuid,uuid,jsonb) is
'iPOS ingestion RPC. Idempotently stores sale/products/items but intentionally does not change inventory. Inventory deduction is enabled only after recipes are reviewed.';
