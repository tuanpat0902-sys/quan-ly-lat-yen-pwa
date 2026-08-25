alter table public.ly_ingredients
  add column if not exists purchase_unit text,
  add column if not exists conversion_ratio numeric;

alter table public.ly_ingredients
  drop constraint if exists ly_ingredients_conversion_ratio_ck;

alter table public.ly_ingredients
  add constraint ly_ingredients_conversion_ratio_ck
  check (conversion_ratio is null or conversion_ratio > 0);

-- Unit conversion belongs to the ingredient master record and is shared by all warehouses.
-- The save RPC reuses the ingredient by organization/name, keeps one global conversion,
-- and rejects attempts to create the same ingredient with a conflicting conversion.
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
  v_id uuid;
  v_name text := nullif(trim(p_ingredient->>'name'), '');
  v_warehouse_text text := nullif(trim(p_ingredient->>'warehouse_id'), '');
  v_warehouse_id uuid;
  v_purchase_unit text := nullif(trim(p_ingredient->>'purchase_unit'), '');
  v_conversion_ratio numeric := nullif(p_ingredient->>'conversion_ratio', '')::numeric;
  v_reused_existing boolean := false;
  v_existing_purchase_unit text;
  v_existing_conversion_ratio numeric;
  x jsonb;
begin
  if not public.ly_is_admin() or v_org is null then raise exception 'Unauthorized'; end if;
  if v_name is null then raise exception 'Ingredient name is required'; end if;
  if v_conversion_ratio is not null and v_conversion_ratio <= 0 then raise exception 'Conversion ratio must be greater than 0'; end if;
  if v_warehouse_text is null and v_input_id is null then raise exception 'Warehouse is required for a new ingredient'; end if;

  if v_warehouse_text is not null then
    begin v_warehouse_id := v_warehouse_text::uuid;
    exception when invalid_text_representation then raise exception 'Invalid warehouse'; end;
    if not exists (
      select 1 from public.ly_warehouses w
      where w.id = v_warehouse_id and w.org_id = v_org and coalesce(w.active, true)
    ) then raise exception 'Warehouse is unavailable'; end if;
  end if;

  if v_input_id is not null then
    v_id := v_input_id::uuid;
  else
    select i.id, i.purchase_unit, i.conversion_ratio
      into v_id, v_existing_purchase_unit, v_existing_conversion_ratio
    from public.ly_ingredients i
    where i.org_id = v_org and lower(i.name) = lower(v_name)
    order by i.id limit 1;
    if v_id is not null then v_reused_existing := true; else v_id := gen_random_uuid(); end if;
  end if;

  if v_reused_existing then
    if v_existing_purchase_unit is not null and v_purchase_unit is not null
       and lower(v_existing_purchase_unit) <> lower(v_purchase_unit) then
      raise exception 'Ingredient already has purchase unit %', v_existing_purchase_unit;
    end if;
    if v_existing_conversion_ratio is not null and v_conversion_ratio is not null
       and abs(v_existing_conversion_ratio - v_conversion_ratio) > 0.000001 then
      raise exception 'Ingredient already has conversion ratio %', v_existing_conversion_ratio;
    end if;
    update public.ly_ingredients
       set purchase_unit = coalesce(purchase_unit, v_purchase_unit),
           conversion_ratio = coalesce(conversion_ratio, v_conversion_ratio),
           updated_at = now()
     where id = v_id and org_id = v_org;
  else
    insert into public.ly_ingredients(
      id, org_id, code, name, unit, ingredient_type,
      batch_output_qty, cost, minimum_stock, active,
      purchase_unit, conversion_ratio
    ) values (
      v_id, v_org, nullif(p_ingredient->>'code', ''), v_name,
      coalesce(p_ingredient->>'unit', ''), coalesce(p_ingredient->>'ingredient_type', 'purchased'),
      greatest(coalesce((p_ingredient->>'batch_output_qty')::numeric, 1), 0.000001),
      coalesce((p_ingredient->>'cost')::numeric, 0), coalesce((p_ingredient->>'minimum_stock')::numeric, 0),
      coalesce((p_ingredient->>'active')::boolean, true), v_purchase_unit, v_conversion_ratio
    )
    on conflict (id) do update set
      code = excluded.code, name = excluded.name, unit = excluded.unit,
      ingredient_type = excluded.ingredient_type, batch_output_qty = excluded.batch_output_qty,
      cost = excluded.cost, minimum_stock = excluded.minimum_stock, active = excluded.active,
      purchase_unit = coalesce(excluded.purchase_unit, public.ly_ingredients.purchase_unit),
      conversion_ratio = coalesce(excluded.conversion_ratio, public.ly_ingredients.conversion_ratio),
      org_id = v_org, updated_at = now();

    delete from public.ly_prepared_items where prepared_ingredient_id = v_id and org_id = v_org;
    if coalesce(p_ingredient->>'ingredient_type', 'purchased') = 'prepared' then
      for x in select * from jsonb_array_elements(coalesce(p_prepared_items, '[]'::jsonb)) loop
        insert into public.ly_prepared_items(org_id, prepared_ingredient_id, source_ingredient_id, quantity)
        values(v_org, v_id, (x->>'source_ingredient_id')::uuid, (x->>'quantity')::numeric);
      end loop;
    end if;
  end if;

  if v_warehouse_id is not null then
    insert into public.ly_inventory(org_id, warehouse_id, ingredient_id, quantity)
    values(v_org, v_warehouse_id, v_id, 0)
    on conflict (org_id, warehouse_id, ingredient_id) do nothing;
  end if;
  return v_id;
end;
$function$;
