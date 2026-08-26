-- Move privileged core write RPC implementations out of exposed public schema.
-- Preserve existing public RPC names/signatures using SECURITY INVOKER wrappers.

begin;

alter function public.ly_delete_receipt(text, uuid) rename to ly_delete_receipt_impl;
alter function public.ly_delete_receipt_impl(text, uuid) set schema ly_private;

alter function public.ly_save_export(jsonb, jsonb) rename to ly_save_export_impl;
alter function public.ly_save_export_impl(jsonb, jsonb) set schema ly_private;

alter function public.ly_save_import(jsonb, jsonb) rename to ly_save_import_impl;
alter function public.ly_save_import_impl(jsonb, jsonb) set schema ly_private;

alter function public.ly_save_ingredient(jsonb, jsonb) rename to ly_save_ingredient_impl;
alter function public.ly_save_ingredient_impl(jsonb, jsonb) set schema ly_private;

alter function public.ly_save_product(jsonb, jsonb) rename to ly_save_product_impl;
alter function public.ly_save_product_impl(jsonb, jsonb) set schema ly_private;

alter function public.ly_save_sale(jsonb, jsonb, jsonb) rename to ly_save_sale_impl;
alter function public.ly_save_sale_impl(jsonb, jsonb, jsonb) set schema ly_private;

alter function public.ly_save_stocktake(jsonb, jsonb) rename to ly_save_stocktake_impl;
alter function public.ly_save_stocktake_impl(jsonb, jsonb) set schema ly_private;

revoke all on function ly_private.ly_delete_receipt_impl(text, uuid) from public, anon;
revoke all on function ly_private.ly_save_export_impl(jsonb, jsonb) from public, anon;
revoke all on function ly_private.ly_save_import_impl(jsonb, jsonb) from public, anon;
revoke all on function ly_private.ly_save_ingredient_impl(jsonb, jsonb) from public, anon;
revoke all on function ly_private.ly_save_product_impl(jsonb, jsonb) from public, anon;
revoke all on function ly_private.ly_save_sale_impl(jsonb, jsonb, jsonb) from public, anon;
revoke all on function ly_private.ly_save_stocktake_impl(jsonb, jsonb) from public, anon;

grant execute on function ly_private.ly_delete_receipt_impl(text, uuid) to authenticated, service_role;
grant execute on function ly_private.ly_save_export_impl(jsonb, jsonb) to authenticated, service_role;
grant execute on function ly_private.ly_save_import_impl(jsonb, jsonb) to authenticated, service_role;
grant execute on function ly_private.ly_save_ingredient_impl(jsonb, jsonb) to authenticated, service_role;
grant execute on function ly_private.ly_save_product_impl(jsonb, jsonb) to authenticated, service_role;
grant execute on function ly_private.ly_save_sale_impl(jsonb, jsonb, jsonb) to authenticated, service_role;
grant execute on function ly_private.ly_save_stocktake_impl(jsonb, jsonb) to authenticated, service_role;

create or replace function public.ly_delete_receipt(p_type text, p_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select ly_private.ly_delete_receipt_impl(p_type, p_id); $$;

create or replace function public.ly_save_export(p_header jsonb, p_items jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select ly_private.ly_save_export_impl(p_header, p_items); $$;

create or replace function public.ly_save_import(p_header jsonb, p_items jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select ly_private.ly_save_import_impl(p_header, p_items); $$;

create or replace function public.ly_save_ingredient(
  p_ingredient jsonb,
  p_prepared_items jsonb default '[]'::jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select ly_private.ly_save_ingredient_impl(p_ingredient, p_prepared_items); $$;

create or replace function public.ly_save_product(
  p_product jsonb,
  p_recipe_items jsonb default '[]'::jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select ly_private.ly_save_product_impl(p_product, p_recipe_items); $$;

create or replace function public.ly_save_sale(p_header jsonb, p_sale_items jsonb, p_stock_lines jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select ly_private.ly_save_sale_impl(p_header, p_sale_items, p_stock_lines); $$;

create or replace function public.ly_save_stocktake(p_header jsonb, p_items jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select ly_private.ly_save_stocktake_impl(p_header, p_items); $$;

revoke all on function public.ly_delete_receipt(text, uuid) from public, anon;
revoke all on function public.ly_save_export(jsonb, jsonb) from public, anon;
revoke all on function public.ly_save_import(jsonb, jsonb) from public, anon;
revoke all on function public.ly_save_ingredient(jsonb, jsonb) from public, anon;
revoke all on function public.ly_save_product(jsonb, jsonb) from public, anon;
revoke all on function public.ly_save_sale(jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.ly_save_stocktake(jsonb, jsonb) from public, anon;

grant execute on function public.ly_delete_receipt(text, uuid) to authenticated, service_role;
grant execute on function public.ly_save_export(jsonb, jsonb) to authenticated, service_role;
grant execute on function public.ly_save_import(jsonb, jsonb) to authenticated, service_role;
grant execute on function public.ly_save_ingredient(jsonb, jsonb) to authenticated, service_role;
grant execute on function public.ly_save_product(jsonb, jsonb) to authenticated, service_role;
grant execute on function public.ly_save_sale(jsonb, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.ly_save_stocktake(jsonb, jsonb) to authenticated, service_role;

commit;
