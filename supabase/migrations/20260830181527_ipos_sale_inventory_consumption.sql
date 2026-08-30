begin;

-- iPOS can replay an edited receipt. Rebuild this receipt's SALE movements so
-- inventory is always correct and is never deducted twice.
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
  select s.id, s.warehouse_id, s.receipt_no into v_sale
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
  insert into public.ly_stock_transactions(org_id,warehouse_id,ingredient_id,transaction_type,source_id,quantity,note)
  select p_org_id,v_sale.warehouse_id,n.ingredient_id,'SALE',p_sale_id,-n.quantity,
    format('iPOS %s — trừ theo công thức',v_sale.receipt_no)
  from needed n;
  get diagnostics v_movement_lines=row_count;
  return jsonb_build_object('sale_id',p_sale_id,'movement_lines',v_movement_lines,'inventory_changed',v_movement_lines>0);
end;
$$;

create or replace function public.ly_ipos_reconcile_sale_inventory(p_org_id uuid)
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
  for v_sale in select s.id from public.ly_sales s where s.org_id=p_org_id and s.source='iPOS' order by s.sold_at,s.id loop
    v_result:=public.ly_ipos_apply_sale_inventory(p_org_id,v_sale.id);
    v_sales:=v_sales+1;
    v_lines:=v_lines+coalesce((v_result->>'movement_lines')::int,0);
  end loop;
  return jsonb_build_object('sales_reconciled',v_sales,'movement_lines',v_lines);
end;
$$;

revoke all on function public.ly_ipos_apply_sale_inventory(uuid,uuid) from public,anon,authenticated;
revoke all on function public.ly_ipos_reconcile_sale_inventory(uuid) from public,anon,authenticated;
grant execute on function public.ly_ipos_apply_sale_inventory(uuid,uuid) to postgres,service_role;
grant execute on function public.ly_ipos_reconcile_sale_inventory(uuid) to postgres,service_role;

commit;
