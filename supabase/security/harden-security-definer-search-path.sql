-- Harden exposed SECURITY DEFINER RPCs by removing writable/user-controlled schemas
-- from search_path. Function bodies already schema-qualify application objects.
-- This preserves RPC names, signatures, SECURITY DEFINER behavior and grants.

begin;

alter function public.ly_bootstrap() set search_path to '';
alter function public.ly_delete_receipt(text, uuid) set search_path to '';
alter function public.ly_disable_menu_password(text) set search_path to '';
alter function public.ly_menu_password_status() set search_path to '';
alter function public.ly_save_export(jsonb, jsonb) set search_path to '';
alter function public.ly_save_import(jsonb, jsonb) set search_path to '';
alter function public.ly_save_ingredient(jsonb, jsonb) set search_path to '';
alter function public.ly_save_product(jsonb, jsonb) set search_path to '';
alter function public.ly_save_sale(jsonb, jsonb, jsonb) set search_path to '';
alter function public.ly_save_stocktake(jsonb, jsonb) set search_path to '';
alter function public.ly_set_menu_password(text, text) set search_path to '';
alter function public.ly_verify_menu_password(text) set search_path to '';

commit;
