-- ============================================================
-- LAT YEN V270 - CLOUD TRANSACTION CORE
-- Run after V264-V267.
--
-- Replaces legacy transaction RPCs with authenticated, organization-aware
-- implementations. Existing signatures are preserved for app compatibility.
-- No business data is deleted.
-- ============================================================

begin;

create extension if not exists pgcrypto with schema extensions;

-- Helper: current authenticated organization, strict admin.
create or replace function public.v270_org_id()
returns uuid
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_latyen_admin_v265() then
    raise exception 'Admin account required';
  end if;

  v_org:=public.current_organization_id();

  if v_org is null then
    raise exception 'Organization not initialized';
  end if;

  return v_org;
end;
$$;

grant execute on function public.v270_org_id() to authenticated;

-- ------------------------------------------------------------
-- SALE
-- ------------------------------------------------------------
create or replace function public.commit_sale_receipt_v190(
  p_sale jsonb,
  p_sale_items jsonb,
  p_stock_movements jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_org uuid:=public.v270_org_id();
  v_sale uuid:=(p_sale->>'id')::uuid;
  v_wh uuid:=(p_sale->>'warehouse_id')::uuid;
  v_item record;
  v_old numeric;
  v_new numeric;
  v_sale_json jsonb;
  v_items jsonb;
  v_moves jsonb;
  v_inv jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('v270:sale:'||v_sale::text,0));

  if not exists(
    select 1 from public.warehouses
    where id=v_wh and organization_id=v_org
  ) then
    raise exception 'Warehouse does not belong to current organization';
  end if;

  create temporary table if not exists _v270_old_sale(
    ingredient_id uuid primary key,
    qty numeric not null
  ) on commit drop;
  truncate _v270_old_sale;

  insert into _v270_old_sale
  select ingredient_id,sum(quantity)
  from public.stock_transactions
  where organization_id=v_org
    and reference_id=v_sale
    and transaction_type='SALE'
  group by ingredient_id;

  insert into public.sales(
    id,warehouse_id,total_amount,source,sold_at,note,organization_id,updated_at
  )
  values(
    v_sale,v_wh,
    coalesce((p_sale->>'total_amount')::numeric,0),
    coalesce(p_sale->>'source','manual'),
    coalesce((p_sale->>'sold_at')::timestamptz,now()),
    coalesce(p_sale->>'note',''),
    v_org,now()
  )
  on conflict(id) do update set
    warehouse_id=excluded.warehouse_id,
    total_amount=excluded.total_amount,
    source=excluded.source,
    sold_at=excluded.sold_at,
    note=excluded.note,
    organization_id=v_org,
    updated_at=now();

  delete from public.sale_items
  where sale_id=v_sale and organization_id=v_org;

  insert into public.sale_items(
    sale_id,product_id,quantity,unit_price,organization_id,updated_at
  )
  select
    v_sale,
    (x->>'product_id')::uuid,
    coalesce((x->>'quantity')::numeric,0),
    coalesce((x->>'unit_price')::numeric,0),
    v_org,
    now()
  from jsonb_array_elements(coalesce(p_sale_items,'[]'::jsonb)) x;

  delete from public.stock_transactions
  where reference_id=v_sale
    and transaction_type='SALE'
    and organization_id=v_org;

  insert into public.stock_transactions(
    warehouse_id,ingredient_id,transaction_type,quantity,note,reference_id,
    organization_id,updated_at
  )
  select
    v_wh,
    (x->>'ingredient_id')::uuid,
    'SALE',
    coalesce((x->>'quantity')::numeric,0),
    coalesce(x->>'note',''),
    v_sale,
    v_org,
    now()
  from jsonb_array_elements(coalesce(p_stock_movements,'[]'::jsonb)) x;

  create temporary table if not exists _v270_new_sale(
    ingredient_id uuid primary key,
    qty numeric not null
  ) on commit drop;
  truncate _v270_new_sale;

  insert into _v270_new_sale
  select
    (x->>'ingredient_id')::uuid,
    sum(coalesce((x->>'quantity')::numeric,0))
  from jsonb_array_elements(coalesce(p_stock_movements,'[]'::jsonb)) x
  group by (x->>'ingredient_id')::uuid;

  for v_item in
    select ingredient_id from (
      select ingredient_id from _v270_old_sale
      union
      select ingredient_id from _v270_new_sale
    ) u order by ingredient_id
  loop
    select coalesce(qty,0) into v_old
    from _v270_old_sale where ingredient_id=v_item.ingredient_id;
    v_old:=coalesce(v_old,0);

    select coalesce(qty,0) into v_new
    from _v270_new_sale where ingredient_id=v_item.ingredient_id;
    v_new:=coalesce(v_new,0);

    insert into public.inventory(
      warehouse_id,ingredient_id,quantity,organization_id,updated_at
    )
    values(v_wh,v_item.ingredient_id,v_new-v_old,v_org,now())
    on conflict(warehouse_id,ingredient_id) do update set
      quantity=public.inventory.quantity+excluded.quantity,
      organization_id=v_org,
      updated_at=now();
  end loop;

  select to_jsonb(s) into v_sale_json
  from public.sales s
  where s.id=v_sale and s.organization_id=v_org;

  select coalesce(jsonb_agg(to_jsonb(si) order by si.created_at,si.id),'[]'::jsonb)
  into v_items
  from public.sale_items si
  where si.sale_id=v_sale and si.organization_id=v_org;

  select coalesce(jsonb_agg(to_jsonb(st) order by st.created_at,st.id),'[]'::jsonb)
  into v_moves
  from public.stock_transactions st
  where st.reference_id=v_sale
    and st.transaction_type='SALE'
    and st.organization_id=v_org;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.ingredient_id),'[]'::jsonb)
  into v_inv
  from public.inventory i
  where i.organization_id=v_org
    and i.warehouse_id=v_wh
    and i.ingredient_id in (
      select ingredient_id from _v270_new_sale
      union
      select ingredient_id from _v270_old_sale
    );

  return jsonb_build_object(
    'sale',v_sale_json,
    'sale_items',v_items,
    'stock_transactions',v_moves,
    'inventory',v_inv,
    'operation_revision',0
  );
end;
$$;

-- ------------------------------------------------------------
-- IMPORT
-- ------------------------------------------------------------
create or replace function public.commit_import_receipt_v191(
  p_reference_id uuid,
  p_warehouse_id uuid,
  p_movements jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_org uuid:=public.v270_org_id();
  v_item record;
  v_moves jsonb;
  v_inv jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('v270:import:'||p_reference_id::text,0));

  -- Reverse previous version.
  for v_item in
    select ingredient_id,sum(quantity) qty
    from public.stock_transactions
    where organization_id=v_org
      and reference_id=p_reference_id
      and transaction_type='IMPORT'
    group by ingredient_id
  loop
    insert into public.inventory(
      warehouse_id,ingredient_id,quantity,organization_id,updated_at
    )
    values(p_warehouse_id,v_item.ingredient_id,-coalesce(v_item.qty,0),v_org,now())
    on conflict(warehouse_id,ingredient_id) do update set
      quantity=public.inventory.quantity+excluded.quantity,
      organization_id=v_org,
      updated_at=now();
  end loop;

  delete from public.stock_transactions
  where organization_id=v_org
    and reference_id=p_reference_id
    and transaction_type='IMPORT';

  insert into public.stock_transactions(
    warehouse_id,ingredient_id,transaction_type,quantity,note,reference_id,
    unit_cost,total_cost,supplier_id,organization_id,updated_at
  )
  select
    p_warehouse_id,
    (x->>'ingredient_id')::uuid,
    'IMPORT',
    coalesce((x->>'quantity')::numeric,0),
    coalesce(x->>'note',''),
    p_reference_id,
    coalesce((x->>'unit_cost')::numeric,0),
    coalesce((x->>'total_cost')::numeric,0),
    case when nullif(x->>'supplier_id','') is null then null
         else (x->>'supplier_id')::uuid end,
    v_org,
    now()
  from jsonb_array_elements(coalesce(p_movements,'[]'::jsonb)) x;

  for v_item in
    select (x->>'ingredient_id')::uuid ingredient_id,
           sum(coalesce((x->>'quantity')::numeric,0)) qty
    from jsonb_array_elements(coalesce(p_movements,'[]'::jsonb)) x
    group by (x->>'ingredient_id')::uuid
  loop
    insert into public.inventory(
      warehouse_id,ingredient_id,quantity,organization_id,updated_at
    )
    values(p_warehouse_id,v_item.ingredient_id,v_item.qty,v_org,now())
    on conflict(warehouse_id,ingredient_id) do update set
      quantity=public.inventory.quantity+excluded.quantity,
      organization_id=v_org,
      updated_at=now();
  end loop;

  select coalesce(jsonb_agg(to_jsonb(st) order by st.created_at,st.id),'[]'::jsonb)
  into v_moves
  from public.stock_transactions st
  where st.organization_id=v_org
    and st.reference_id=p_reference_id
    and st.transaction_type='IMPORT';

  select coalesce(jsonb_agg(to_jsonb(i) order by i.ingredient_id),'[]'::jsonb)
  into v_inv
  from public.inventory i
  where i.organization_id=v_org
    and i.warehouse_id=p_warehouse_id
    and i.ingredient_id in (
      select distinct (x->>'ingredient_id')::uuid
      from jsonb_array_elements(coalesce(p_movements,'[]'::jsonb)) x
    );

  return jsonb_build_object(
    'stock_transactions',v_moves,
    'inventory',v_inv,
    'operation_revision',0
  );
end;
$$;

-- ------------------------------------------------------------
-- EXPORT
-- ------------------------------------------------------------
create or replace function public.commit_export_receipt_v192(
  p_reference_id uuid,
  p_old_reference_id uuid,
  p_warehouse_id uuid,
  p_movements jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_org uuid:=public.v270_org_id();
  v_old_ref uuid:=coalesce(p_old_reference_id,p_reference_id);
  v_item record;
  v_moves jsonb;
  v_inv jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('v270:export:'||p_reference_id::text,0));

  -- Export quantities are negative in the app. Reverse old effect by subtracting old qty.
  for v_item in
    select ingredient_id,sum(quantity) qty
    from public.stock_transactions
    where organization_id=v_org
      and reference_id=v_old_ref
      and transaction_type='EXPORT'
    group by ingredient_id
  loop
    insert into public.inventory(
      warehouse_id,ingredient_id,quantity,organization_id,updated_at
    )
    values(p_warehouse_id,v_item.ingredient_id,-coalesce(v_item.qty,0),v_org,now())
    on conflict(warehouse_id,ingredient_id) do update set
      quantity=public.inventory.quantity+excluded.quantity,
      organization_id=v_org,
      updated_at=now();
  end loop;

  delete from public.stock_transactions
  where organization_id=v_org
    and transaction_type='EXPORT'
    and reference_id in (v_old_ref,p_reference_id);

  insert into public.stock_transactions(
    warehouse_id,ingredient_id,transaction_type,quantity,note,reference_id,
    unit_cost,total_cost,organization_id,updated_at
  )
  select
    p_warehouse_id,
    (x->>'ingredient_id')::uuid,
    'EXPORT',
    coalesce((x->>'quantity')::numeric,0),
    coalesce(x->>'note',''),
    p_reference_id,
    coalesce((x->>'unit_cost')::numeric,0),
    coalesce((x->>'total_cost')::numeric,0),
    v_org,
    now()
  from jsonb_array_elements(coalesce(p_movements,'[]'::jsonb)) x;

  for v_item in
    select (x->>'ingredient_id')::uuid ingredient_id,
           sum(coalesce((x->>'quantity')::numeric,0)) qty
    from jsonb_array_elements(coalesce(p_movements,'[]'::jsonb)) x
    group by (x->>'ingredient_id')::uuid
  loop
    insert into public.inventory(
      warehouse_id,ingredient_id,quantity,organization_id,updated_at
    )
    values(p_warehouse_id,v_item.ingredient_id,v_item.qty,v_org,now())
    on conflict(warehouse_id,ingredient_id) do update set
      quantity=public.inventory.quantity+excluded.quantity,
      organization_id=v_org,
      updated_at=now();
  end loop;

  select coalesce(jsonb_agg(to_jsonb(st) order by st.created_at,st.id),'[]'::jsonb)
  into v_moves
  from public.stock_transactions st
  where st.organization_id=v_org
    and st.reference_id=p_reference_id
    and st.transaction_type='EXPORT';

  select coalesce(jsonb_agg(to_jsonb(i) order by i.ingredient_id),'[]'::jsonb)
  into v_inv
  from public.inventory i
  where i.organization_id=v_org
    and i.warehouse_id=p_warehouse_id
    and i.ingredient_id in (
      select distinct (x->>'ingredient_id')::uuid
      from jsonb_array_elements(coalesce(p_movements,'[]'::jsonb)) x
    );

  return jsonb_build_object(
    'stock_transactions',v_moves,
    'inventory',v_inv,
    'operation_revision',0
  );
end;
$$;

-- ------------------------------------------------------------
-- STOCKTAKE
-- ------------------------------------------------------------
create or replace function public.commit_stocktake_receipt_v192(
  p_reference_id uuid,
  p_old_reference_id uuid,
  p_warehouse_id uuid,
  p_lines jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_org uuid:=public.v270_org_id();
  v_old_ref uuid:=coalesce(p_old_reference_id,p_reference_id);
  v_item record;
  v_current numeric;
  v_diff numeric;
  v_moves jsonb;
  v_inv jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('v270:stocktake:'||p_reference_id::text,0));

  -- Reverse previous adjustment first.
  for v_item in
    select ingredient_id,sum(quantity) qty
    from public.stock_transactions
    where organization_id=v_org
      and reference_id=v_old_ref
      and transaction_type='ADJUSTMENT'
    group by ingredient_id
  loop
    insert into public.inventory(
      warehouse_id,ingredient_id,quantity,organization_id,updated_at
    )
    values(p_warehouse_id,v_item.ingredient_id,-coalesce(v_item.qty,0),v_org,now())
    on conflict(warehouse_id,ingredient_id) do update set
      quantity=public.inventory.quantity+excluded.quantity,
      organization_id=v_org,
      updated_at=now();
  end loop;

  delete from public.stock_transactions
  where organization_id=v_org
    and transaction_type='ADJUSTMENT'
    and reference_id in (v_old_ref,p_reference_id);

  for v_item in
    select
      (x->>'ingredient_id')::uuid ingredient_id,
      coalesce((x->>'actual')::numeric,0) actual,
      coalesce(x->>'note','') note
    from jsonb_array_elements(coalesce(p_lines,'[]'::jsonb)) x
    order by (x->>'ingredient_id')::uuid
  loop
    insert into public.inventory(
      warehouse_id,ingredient_id,quantity,organization_id,updated_at
    )
    values(p_warehouse_id,v_item.ingredient_id,0,v_org,now())
    on conflict(warehouse_id,ingredient_id) do nothing;

    select quantity into v_current
    from public.inventory
    where warehouse_id=p_warehouse_id
      and ingredient_id=v_item.ingredient_id
      and organization_id=v_org
    for update;

    v_diff:=v_item.actual-coalesce(v_current,0);

    update public.inventory
    set quantity=v_item.actual,
        organization_id=v_org,
        updated_at=now()
    where warehouse_id=p_warehouse_id
      and ingredient_id=v_item.ingredient_id
      and organization_id=v_org;

    if abs(v_diff)>0.000001 then
      insert into public.stock_transactions(
        warehouse_id,ingredient_id,transaction_type,quantity,note,reference_id,
        organization_id,updated_at
      )
      values(
        p_warehouse_id,v_item.ingredient_id,'ADJUSTMENT',
        v_diff,v_item.note,p_reference_id,v_org,now()
      );
    end if;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(st) order by st.created_at,st.id),'[]'::jsonb)
  into v_moves
  from public.stock_transactions st
  where st.organization_id=v_org
    and st.reference_id=p_reference_id
    and st.transaction_type='ADJUSTMENT';

  select coalesce(jsonb_agg(to_jsonb(i) order by i.ingredient_id),'[]'::jsonb)
  into v_inv
  from public.inventory i
  where i.organization_id=v_org
    and i.warehouse_id=p_warehouse_id
    and i.ingredient_id in (
      select distinct (x->>'ingredient_id')::uuid
      from jsonb_array_elements(coalesce(p_lines,'[]'::jsonb)) x
    );

  return jsonb_build_object(
    'stock_transactions',v_moves,
    'inventory',v_inv,
    'operation_revision',0
  );
end;
$$;

grant execute on function public.commit_sale_receipt_v190(jsonb,jsonb,jsonb,text) to authenticated;
grant execute on function public.commit_import_receipt_v191(uuid,uuid,jsonb,text) to authenticated;
grant execute on function public.commit_export_receipt_v192(uuid,uuid,uuid,jsonb,text) to authenticated;
grant execute on function public.commit_stocktake_receipt_v192(uuid,uuid,uuid,jsonb,text) to authenticated;

revoke all on function public.commit_sale_receipt_v190(jsonb,jsonb,jsonb,text) from anon;
revoke all on function public.commit_import_receipt_v191(uuid,uuid,jsonb,text) from anon;
revoke all on function public.commit_export_receipt_v192(uuid,uuid,uuid,jsonb,text) from anon;
revoke all on function public.commit_stocktake_receipt_v192(uuid,uuid,uuid,jsonb,text) from anon;

commit;
