-- iPOS sale-detail identifiers are only stable within a sale, not globally
-- across an organization. Keep duplicate protection scoped to the parent sale.

begin;

drop index if exists public.ly_sale_items_org_ipos_detail_uidx;
create unique index ly_sale_items_sale_ipos_detail_uidx
  on public.ly_sale_items(org_id, sale_id, ipos_sale_detail_id)
  where ipos_sale_detail_id is not null;

commit;
