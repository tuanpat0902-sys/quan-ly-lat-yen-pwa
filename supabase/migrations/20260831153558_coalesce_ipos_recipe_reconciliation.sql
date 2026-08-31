begin;

create or replace function public.ly_ipos_reconcile_product_inventory(
  p_org_id uuid,
  p_product_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale record;
  v_result jsonb;
  v_sales int := 0;
  v_lines int := 0;
begin
  if p_org_id is null or p_product_id is null then
    raise exception 'org_id and product_id are required';
  end if;

  for v_sale in
    select distinct s.id
    from public.ly_sale_items si
    join public.ly_sales s on s.id=si.sale_id and s.org_id=si.org_id
    where si.org_id=p_org_id
      and si.product_id=p_product_id
      and s.source='iPOS'
    order by s.id
  loop
    v_result := public.ly_ipos_apply_sale_inventory(p_org_id,v_sale.id);
    v_sales := v_sales+1;
    v_lines := v_lines+coalesce((v_result->>'movement_lines')::int,0);
  end loop;

  return jsonb_build_object(
    'product_id',p_product_id,
    'sales_reconciled',v_sales,
    'movement_lines',v_lines
  );
end;
$$;

create or replace function public.ly_reconcile_ipos_inventory_on_recipe_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := coalesce(new.org_id,old.org_id);
  v_product_id uuid := coalesce(new.product_id,old.product_id);
begin
  -- ly_save_product replaces the full recipe one row at a time.  It performs
  -- one consolidated reconciliation after the replacement is complete.
  if coalesce(current_setting('ly.skip_ipos_recipe_reconcile',true),'')='on' then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;

  perform public.ly_ipos_reconcile_product_inventory(v_org_id,v_product_id);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function ly_private.ly_save_product_impl(
  p_product jsonb,
  p_recipe_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid:=public.ly_current_org();
  v_id uuid:=coalesce(nullif(p_product->>'id','')::uuid,gen_random_uuid());
  x jsonb;
begin
  if not public.ly_is_admin() or v_org is null then raise exception 'Unauthorized'; end if;

  -- Serialize concurrent saves for the same product and suppress the row-level
  -- recipe trigger while the complete recipe is being replaced.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_org::text||':'||v_id::text,0)
  );

  insert into public.ly_products(
    id,org_id,warehouse_id,name,sku,unit,selling_price,active
  ) values(
    v_id,v_org,(p_product->>'warehouse_id')::uuid,
    trim(p_product->>'name'),
    nullif(p_product->>'sku',''),
    coalesce(p_product->>'unit','ly'),
    coalesce((p_product->>'selling_price')::numeric,0),
    coalesce((p_product->>'active')::boolean,true)
  )
  on conflict(id) do update set
    warehouse_id=excluded.warehouse_id,name=excluded.name,sku=excluded.sku,unit=excluded.unit,
    selling_price=excluded.selling_price,active=excluded.active,org_id=v_org;

  perform pg_catalog.set_config('ly.skip_ipos_recipe_reconcile','on',true);
  delete from public.ly_recipe_items where product_id=v_id and org_id=v_org;

  for x in select * from jsonb_array_elements(coalesce(p_recipe_items,'[]'::jsonb))
  loop
    insert into public.ly_recipe_items(org_id,product_id,ingredient_id,quantity)
    values(v_org,v_id,(x->>'ingredient_id')::uuid,(x->>'quantity')::numeric);
  end loop;
  perform pg_catalog.set_config('ly.skip_ipos_recipe_reconcile','off',true);

  perform public.ly_ipos_reconcile_product_inventory(v_org,v_id);
  return v_id;
end;
$$;

revoke all on function public.ly_ipos_reconcile_product_inventory(uuid,uuid) from public,anon,authenticated;
grant execute on function public.ly_ipos_reconcile_product_inventory(uuid,uuid) to postgres,service_role;

commit;
