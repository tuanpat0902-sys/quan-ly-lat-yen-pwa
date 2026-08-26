-- Production snapshot captured from Supabase project isfotiyxufvsmlkqsgez on 2026-08-27.
-- This file documents post-migration production state. It is NOT an auto-applied migration.
-- Secret VALUES are intentionally excluded; only Vault secret names are referenced.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

CREATE OR REPLACE FUNCTION public.ly_ipos_get_runtime_config()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'ipos_authorization', (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'ly_ipos_authorization' limit 1
    ),
    'ipos_access_token', (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'ly_ipos_access_token' limit 1
    ),
    'cron_secret', (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'ly_ipos_cron_secret' limit 1
    ),
    'company_uid', '2ffa7c09-be89-45d0-8239-8776866586a6',
    'brand_uid', '24c419f3-78b3-469c-81cc-03f26fc05e36',
    'city_uid', 'edda0d3e-8c41-47d8-b873-812201953802',
    'store_uid', 'd3d89baa-7e37-4660-85f1-6fba68e35d09',
    'store_name', 'LÁT YÊN COFFEE',
    'org_id', '336164cd-0588-47f6-a538-e731e91a00f2',
    'warehouse_id', '4062dfa0-eb1f-4399-9e39-dceb8ebfac27'
  );
$function$;

CREATE OR REPLACE FUNCTION public.ly_ipos_upsert_product(p_org_id uuid, p_warehouse_id uuid, p_item jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_item_id text := nullif(trim(p_item->>'item_id'),'');
  v_name text := nullif(trim(p_item->>'item_name'),'');
  v_unit text := coalesce(
    nullif(trim(p_item->>'unit_name'),''),
    nullif(trim(p_item->>'unit'),'')
  );
  v_price numeric := coalesce(
    nullif(p_item->>'price','')::numeric,
    nullif(p_item->>'price_org','')::numeric,
    nullif(p_item->>'ots_price','')::numeric,
    nullif(p_item->>'ta_price','')::numeric,
    0
  );
  v_deleted boolean := coalesce(nullif(p_item->>'deleted','')::boolean,false);
  v_active boolean := case
    when p_item ? 'active' then coalesce(nullif(p_item->>'active','')::boolean,false) and not v_deleted
    else not v_deleted
  end;
begin
  if p_org_id is null or p_warehouse_id is null then
    raise exception 'org_id and warehouse_id are required';
  end if;
  if v_item_id is null or v_name is null then
    raise exception 'iPOS item_id and item_name are required';
  end if;
  if not exists (
    select 1 from public.ly_warehouses w
    where w.id=p_warehouse_id and w.org_id=p_org_id and w.active
  ) then
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
      p_org_id, p_warehouse_id, v_name, v_item_id, coalesce(v_unit,'Món'), v_price, v_active,
      v_item_id, nullif(p_item->>'item_type_id',''), nullif(p_item->>'item_type_name',''),
      nullif(p_item->>'item_class_id',''), nullif(p_item->>'item_class_name',''), now()
    ) returning id into v_id;
  else
    update public.ly_products set
      warehouse_id=p_warehouse_id,
      name=v_name,
      sku=coalesce(sku,v_item_id),
      unit=coalesce(v_unit,unit),
      selling_price=v_price,
      active=v_active,
      ipos_item_type_id=nullif(p_item->>'item_type_id',''),
      ipos_item_type_name=nullif(p_item->>'item_type_name',''),
      ipos_item_class_id=nullif(p_item->>'item_class_id',''),
      ipos_item_class_name=nullif(p_item->>'item_class_name',''),
      ipos_last_synced_at=now()
    where id=v_id;
  end if;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.ly_ipos_upsert_products(p_org_id uuid, p_warehouse_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_item jsonb;
  v_count integer := 0;
  v_active integer := 0;
  v_inactive integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    perform public.ly_ipos_upsert_product(p_org_id,p_warehouse_id,v_item);
    v_count := v_count + 1;
    if coalesce(nullif(v_item->>'active','')::boolean,true)
       and not coalesce(nullif(v_item->>'deleted','')::boolean,false) then
      v_active := v_active + 1;
    else
      v_inactive := v_inactive + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'products',v_count,
    'active',v_active,
    'inactive',v_inactive,
    'inventory_changed',false
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.ly_ipos_upsert_sale(p_org_id uuid, p_warehouse_id uuid, p_sale jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

revoke all on function public.ly_ipos_get_runtime_config() from public, anon, authenticated;
revoke all on function public.ly_ipos_upsert_product(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.ly_ipos_upsert_products(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.ly_ipos_upsert_sale(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.ly_ipos_get_runtime_config() to service_role;
grant execute on function public.ly_ipos_upsert_product(uuid,uuid,jsonb) to service_role;
grant execute on function public.ly_ipos_upsert_products(uuid,uuid,jsonb) to service_role;
grant execute on function public.ly_ipos_upsert_sale(uuid,uuid,jsonb) to service_role;

-- Current production Cron. Requires these Vault secret names to exist:
-- ly_supabase_project_url, ly_supabase_anon_key, ly_ipos_cron_secret,
-- ly_ipos_authorization, ly_ipos_access_token.
select cron.unschedule(jobid)
from cron.job
where jobname = 'ly_ipos_sync_every_minute';

select cron.schedule(
  'ly_ipos_sync_every_minute',
  '* * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='ly_supabase_project_url') || '/functions/v1/ly-ipos-sync',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='ly_supabase_anon_key'),
        'x-ly-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='ly_ipos_cron_secret')
      ),
      body := jsonb_build_object('trigger','cron'),
      timeout_milliseconds := 30000
    );
  $cron$
);
