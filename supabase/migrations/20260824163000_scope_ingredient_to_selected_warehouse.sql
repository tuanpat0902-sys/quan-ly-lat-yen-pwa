-- Keep the ingredient catalog organization-scoped while making warehouse
-- visibility explicit through one ly_inventory membership row.
create or replace function public.ly_save_ingredient(
  p_ingredient jsonb,
  p_prepared_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_org uuid := public.ly_current_org();
  v_input_id text := nullif(p_ingredient->>'id', '');
  v_id uuid := coalesce(v_input_id::uuid, gen_random_uuid());
  v_warehouse_text text := nullif(trim(p_ingredient->>'warehouse_id'), '');
  v_warehouse_id uuid;
  x jsonb;
begin
  if not public.ly_is_admin() or v_org is null then
    raise exception 'Unauthorized';
  end if;

  if v_warehouse_text is null and v_input_id is null then
    raise exception 'Warehouse is required for a new ingredient';
  end if;

  if v_warehouse_text is not null then
    begin
      v_warehouse_id := v_warehouse_text::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid warehouse';
    end;

    if not exists (
      select 1
      from public.ly_warehouses w
      where w.id = v_warehouse_id
        and w.org_id = v_org
        and coalesce(w.active, true)
    ) then
      raise exception 'Warehouse is unavailable';
    end if;
  end if;

  insert into public.ly_ingredients(
    id, org_id, code, name, unit, ingredient_type,
    batch_output_qty, cost, minimum_stock, active
  ) values (
    v_id, v_org,
    nullif(p_ingredient->>'code', ''),
    trim(p_ingredient->>'name'),
    coalesce(p_ingredient->>'unit', ''),
    coalesce(p_ingredient->>'ingredient_type', 'purchased'),
    greatest(coalesce((p_ingredient->>'batch_output_qty')::numeric, 1), 0.000001),
    coalesce((p_ingredient->>'cost')::numeric, 0),
    coalesce((p_ingredient->>'minimum_stock')::numeric, 0),
    coalesce((p_ingredient->>'active')::boolean, true)
  )
  on conflict (id) do update set
    code = excluded.code,
    name = excluded.name,
    unit = excluded.unit,
    ingredient_type = excluded.ingredient_type,
    batch_output_qty = excluded.batch_output_qty,
    cost = excluded.cost,
    minimum_stock = excluded.minimum_stock,
    active = excluded.active,
    org_id = v_org;

  delete from public.ly_prepared_items
  where prepared_ingredient_id = v_id
    and org_id = v_org;

  if coalesce(p_ingredient->>'ingredient_type', 'purchased') = 'prepared' then
    for x in
      select *
      from jsonb_array_elements(coalesce(p_prepared_items, '[]'::jsonb))
    loop
      insert into public.ly_prepared_items(
        org_id, prepared_ingredient_id, source_ingredient_id, quantity
      ) values (
        v_org,
        v_id,
        (x->>'source_ingredient_id')::uuid,
        (x->>'quantity')::numeric
      );
    end loop;
  end if;

  if v_warehouse_id is not null then
    insert into public.ly_inventory(
      org_id, warehouse_id, ingredient_id, quantity
    ) values (
      v_org, v_warehouse_id, v_id, 0
    )
    on conflict (org_id, warehouse_id, ingredient_id) do nothing;
  end if;

  return v_id;
end;
$function$;
