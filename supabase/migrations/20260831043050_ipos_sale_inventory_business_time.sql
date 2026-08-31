begin;

-- A receipt can arrive before its recipe exists.  Keep the sale item visible
-- immediately, but only consume stock when recipe lines exist.  When a recipe
-- is later added, the existing reconciliation trigger rebuilds the SALE
-- movements below at the original iPOS business time instead of sync time.
create or replace function public.ly_ipos_apply_sale_inventory(p_org_id uuid, p_sale_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale record;
  v_old record;
  v_movement_lines int := 0;
begin
  select s.id, s.warehouse_id, s.receipt_no, s.sold_at into v_sale
  from public.ly_sales s
  where s.id=p_sale_id and s.org_id=p_org_id and s.source='iPOS';
  if v_sale.id is null then
    raise exception 'iPOS sale % was not found in organization %', p_sale_id, p_org_id;
  end if;

  for v_old in
    select t.warehouse_id,t.ingredient_id,t.quantity
    from public.ly_stock_transactions t
    where t.org_id=p_org_id and t.source_id=p_sale_id and t.transaction_type='SALE'
  loop
    update public.ly_inventory i
    set quantity=i.quantity-v_old.quantity,updated_at=now()
    where i.org_id=p_org_id and i.warehouse_id=v_old.warehouse_id and i.ingredient_id=v_old.ingredient_id;
  end loop;
  delete from public.ly_stock_transactions t
  where t.org_id=p_org_id and t.source_id=p_sale_id and t.transaction_type='SALE';

  with recursive requirements as (
    select r.ingredient_id,si.quantity*r.quantity as quantity,array[r.ingredient_id]::uuid[] as path
    from public.ly_sale_items si
    join public.ly_recipe_items r on r.org_id=p_org_id and r.product_id=si.product_id
    where si.org_id=p_org_id and si.sale_id=p_sale_id and si.quantity<>0
    union all
    select pi.source_ingredient_id,req.quantity*pi.quantity/nullif(ing.batch_output_qty,0),req.path||pi.source_ingredient_id
    from requirements req
    join public.ly_ingredients ing on ing.id=req.ingredient_id and ing.org_id=p_org_id and ing.ingredient_type='prepared'
    join public.ly_prepared_items pi on pi.org_id=p_org_id and pi.prepared_ingredient_id=req.ingredient_id
    where ing.batch_output_qty>0 and not pi.source_ingredient_id=any(req.path)
  ), needed as (
    select req.ingredient_id,sum(req.quantity) as quantity
    from requirements req
    join public.ly_ingredients ing on ing.id=req.ingredient_id and ing.org_id=p_org_id
    where ing.ingredient_type<>'prepared'
    group by req.ingredient_id
    having sum(req.quantity)<>0
  ), applied as (
    insert into public.ly_inventory(org_id,warehouse_id,ingredient_id,quantity,updated_at)
    select p_org_id,v_sale.warehouse_id,n.ingredient_id,-n.quantity,now() from needed n
    on conflict (org_id,warehouse_id,ingredient_id) do update
    set quantity=public.ly_inventory.quantity+excluded.quantity,updated_at=now()
    returning ingredient_id
  )
  insert into public.ly_stock_transactions(
    org_id,warehouse_id,ingredient_id,transaction_type,source_id,quantity,note,created_at
  )
  select p_org_id,v_sale.warehouse_id,n.ingredient_id,'SALE',p_sale_id,-n.quantity,
    format('iPOS %s — trừ theo công thức',v_sale.receipt_no),coalesce(v_sale.sold_at,now())
  from needed n;
  get diagnostics v_movement_lines=row_count;

  -- Activity history is captured by a table trigger.  Its default clock is
  -- now(), so align the visible audit record with the iPOS receipt as well.
  update public.ly_activity_events e
  set created_at=coalesce(v_sale.sold_at,e.created_at)
  from public.ly_stock_transactions t
  where t.org_id=p_org_id
    and t.source_id=p_sale_id
    and t.transaction_type='SALE'
    and e.entity_table='ly_stock_transactions'
    and e.entity_id=t.id
    and e.created_at is distinct from coalesce(v_sale.sold_at,e.created_at);

  return jsonb_build_object(
    'sale_id',p_sale_id,
    'movement_lines',v_movement_lines,
    'inventory_changed',v_movement_lines>0,
    'business_time',v_sale.sold_at
  );
end;
$$;

-- Correct already-created iPOS usage history without changing quantities.
update public.ly_stock_transactions t
set created_at=s.sold_at
from public.ly_sales s
where t.source_id=s.id
  and t.org_id=s.org_id
  and t.transaction_type='SALE'
  and s.source='iPOS'
  and s.sold_at is not null
  and t.created_at is distinct from s.sold_at;

update public.ly_activity_events e
set created_at=t.created_at
from public.ly_stock_transactions t
where e.entity_table='ly_stock_transactions'
  and e.entity_id=t.id
  and t.transaction_type='SALE'
  and e.created_at is distinct from t.created_at;

revoke all on function public.ly_ipos_apply_sale_inventory(uuid,uuid) from public,anon,authenticated;
grant execute on function public.ly_ipos_apply_sale_inventory(uuid,uuid) to postgres,service_role;

commit;
