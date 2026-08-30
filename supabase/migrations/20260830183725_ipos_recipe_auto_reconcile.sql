begin;

-- When a recipe is added or amended, immediately revisit every iPOS receipt
-- containing that product.  The inventory helper rebuilds each receipt's SALE
-- movements atomically, so a repeated recipe save cannot double deduct stock.
create or replace function public.ly_reconcile_ipos_inventory_on_recipe_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := coalesce(new.org_id, old.org_id);
  v_product_id uuid := coalesce(new.product_id, old.product_id);
  v_sale record;
begin
  for v_sale in
    select distinct s.id
    from public.ly_sale_items si
    join public.ly_sales s
      on s.id=si.sale_id
     and s.org_id=si.org_id
    where si.org_id=v_org_id
      and si.product_id=v_product_id
      and s.source='iPOS'
  loop
    perform public.ly_ipos_apply_sale_inventory(v_org_id,v_sale.id);
  end loop;

  if tg_op='DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.ly_reconcile_ipos_inventory_on_recipe_change() from public,anon,authenticated;

drop trigger if exists ly_recipe_items_reconcile_ipos_inventory on public.ly_recipe_items;
create trigger ly_recipe_items_reconcile_ipos_inventory
after insert or update or delete on public.ly_recipe_items
for each row execute function public.ly_reconcile_ipos_inventory_on_recipe_change();

commit;
