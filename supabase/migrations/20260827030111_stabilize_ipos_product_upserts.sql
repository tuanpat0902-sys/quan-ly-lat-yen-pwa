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
  v_is_catalog boolean := p_item ? 'ots_price'
    or p_item ? 'ta_price'
    or p_item ? 'active'
    or p_item ? 'item_type_id'
    or p_item ? 'item_class_id'
    or p_item ? 'unit_name';
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
      selling_price=case when v_is_catalog then v_price else selling_price end,
      active=case when p_item ? 'active' then v_active else active end,
      ipos_item_type_id=coalesce(nullif(p_item->>'item_type_id',''),ipos_item_type_id),
      ipos_item_type_name=coalesce(nullif(p_item->>'item_type_name',''),ipos_item_type_name),
      ipos_item_class_id=coalesce(nullif(p_item->>'item_class_id',''),ipos_item_class_id),
      ipos_item_class_name=coalesce(nullif(p_item->>'item_class_name',''),ipos_item_class_name),
      ipos_last_synced_at=now()
    where id=v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.ly_ipos_upsert_product(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.ly_ipos_upsert_product(uuid,uuid,jsonb) to service_role;

comment on function public.ly_ipos_upsert_product(uuid,uuid,jsonb) is
'iPOS product upsert. Sale-detail payloads do not overwrite catalog-only price/status/classification fields; recipe rows are never modified.';
