-- V191 - Atomic Import + reliable retry
-- Chạy SAU SQL V189 và V190.

create extension if not exists pgcrypto;

create or replace function public.commit_import_receipt_v191(
  p_reference_id uuid,
  p_warehouse_id uuid,
  p_movements jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing jsonb;
  v_payload_hash text;
  v_result jsonb;
  v_movements jsonb;
  v_inventory jsonb;
  v_operation_revision bigint;
  v_item record;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 6 then
    raise exception 'Invalid idempotency key';
  end if;

  v_payload_hash :=
    encode(
      digest(
        coalesce(p_reference_id::text,'') ||
        coalesce(p_warehouse_id::text,'') ||
        coalesce(p_movements::text,''),
        'sha256'
      ),
      'hex'
    );

  perform pg_advisory_xact_lock(
    hashtextextended(p_idempotency_key,0)
  );

  select result
  into v_existing
  from public.app_operation_log
  where idempotency_key=p_idempotency_key;

  if v_existing is not null
     and coalesce(v_existing->>'payload_hash','')=v_payload_hash
  then
    return v_existing - 'payload_hash';
  end if;

  -- Lock every affected inventory row in deterministic order.
  perform 1
  from public.inventory i
  where i.warehouse_id=p_warehouse_id
    and i.ingredient_id in (
      select distinct (x->>'ingredient_id')::uuid
      from jsonb_array_elements(coalesce(p_movements,'[]'::jsonb)) x
    )
  order by i.ingredient_id
  for update;

  -- If this reference already exists, remove its previous inventory effect first.
  for v_item in
    select ingredient_id,sum(quantity) as qty
    from public.stock_transactions
    where reference_id=p_reference_id
      and transaction_type='IMPORT'
    group by ingredient_id
    order by ingredient_id
  loop
    insert into public.inventory(
      warehouse_id,ingredient_id,quantity,updated_at
    )
    values(
      p_warehouse_id,
      v_item.ingredient_id,
      -coalesce(v_item.qty,0),
      now()
    )
    on conflict (warehouse_id,ingredient_id)
    do update set
      quantity=public.inventory.quantity + excluded.quantity,
      updated_at=now();
  end loop;

  delete from public.stock_transactions
  where reference_id=p_reference_id
    and transaction_type='IMPORT';

  insert into public.stock_transactions(
    warehouse_id,
    ingredient_id,
    transaction_type,
    quantity,
    note,
    reference_id,
    unit_cost,
    total_cost,
    supplier_id
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
    case
      when nullif(x->>'supplier_id','') is null then null
      else (x->>'supplier_id')::uuid
    end
  from jsonb_array_elements(
    coalesce(p_movements,'[]'::jsonb)
  ) x;

  -- Apply the complete new import effect atomically.
  for v_item in
    select
      (x->>'ingredient_id')::uuid as ingredient_id,
      sum(coalesce((x->>'quantity')::numeric,0)) as qty
    from jsonb_array_elements(
      coalesce(p_movements,'[]'::jsonb)
    ) x
    group by (x->>'ingredient_id')::uuid
    order by ingredient_id
  loop
    insert into public.inventory(
      warehouse_id,ingredient_id,quantity,updated_at
    )
    values(
      p_warehouse_id,
      v_item.ingredient_id,
      coalesce(v_item.qty,0),
      now()
    )
    on conflict (warehouse_id,ingredient_id)
    do update set
      quantity=public.inventory.quantity + excluded.quantity,
      updated_at=now();
  end loop;

  -- Update ingredient cost using latest movement unit_cost when available.
  for v_item in
    select
      (x->>'ingredient_id')::uuid as ingredient_id,
      max(coalesce((x->>'unit_cost')::numeric,0)) as unit_cost
    from jsonb_array_elements(
      coalesce(p_movements,'[]'::jsonb)
    ) x
    group by (x->>'ingredient_id')::uuid
  loop
    if v_item.unit_cost >= 0 then
      update public.ingredients
      set
        cost=v_item.unit_cost,
        updated_at=now()
      where id=v_item.ingredient_id;
    end if;
  end loop;

  select coalesce(
    jsonb_agg(to_jsonb(st) order by st.created_at,st.id),
    '[]'::jsonb
  )
  into v_movements
  from public.stock_transactions st
  where st.reference_id=p_reference_id
    and st.transaction_type='IMPORT';

  select coalesce(
    jsonb_agg(to_jsonb(i) order by i.ingredient_id),
    '[]'::jsonb
  )
  into v_inventory
  from public.inventory i
  where i.warehouse_id=p_warehouse_id
    and i.ingredient_id in (
      select distinct (x->>'ingredient_id')::uuid
      from jsonb_array_elements(coalesce(p_movements,'[]'::jsonb)) x
    );

  insert into public.app_operation_log(
    idempotency_key,
    operation_type,
    reference_id,
    result
  )
  values(
    p_idempotency_key,
    'IMPORT',
    p_reference_id,
    '{}'::jsonb
  )
  on conflict (idempotency_key)
  do update set
    operation_type=excluded.operation_type,
    reference_id=excluded.reference_id
  returning operation_revision
  into v_operation_revision;

  v_result :=
    jsonb_build_object(
      'stock_transactions',v_movements,
      'inventory',v_inventory,
      'operation_revision',v_operation_revision,
      'payload_hash',v_payload_hash
    );

  update public.app_operation_log
  set result=v_result
  where idempotency_key=p_idempotency_key;

  return v_result - 'payload_hash';
end;
$$;

grant execute on function public.commit_import_receipt_v191(uuid,uuid,jsonb,text)
to anon, authenticated;
