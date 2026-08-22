-- ============================================================
-- LAT YEN V266 - CLOUD RECIPE OWNERSHIP FIX
-- Run after V264/V265.
--
-- Root cause fixed:
-- Product -> Warehouse ownership was localStorage-only.
-- V266 makes products.warehouse_id authoritative in Cloud.
-- ============================================================

begin;

alter table public.products
  add column if not exists warehouse_id uuid
  references public.warehouses(id)
  on delete cascade;

create index if not exists products_org_warehouse_idx
  on public.products(organization_id,warehouse_id);

-- Existing test products may have no warehouse_id.
-- Because current data is disposable/testing, remove only orphan menu data
-- that cannot be assigned safely. New recipes will always carry warehouse_id.
delete from public.recipe_items ri
where exists (
  select 1
  from public.products p
  where p.id=ri.product_id
    and p.warehouse_id is null
);

delete from public.products
where warehouse_id is null;

-- Keep products under normal V265 admin RLS.
-- No new policy is necessary because products already has org-scoped RLS.

commit;
