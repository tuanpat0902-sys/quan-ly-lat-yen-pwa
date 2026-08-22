-- ============================================================
-- V197 HOTFIX - PGCRYPTO + ATOMIC RPC
-- Run once in Supabase SQL Editor.
-- Safe to run after V192 All-in-One.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- Ensure all current RPCs can resolve extensions.digest().
alter function public.commit_app_sync_state(text,bigint,jsonb)
  set search_path = public, extensions;

alter function public.commit_sale_receipt_v190(jsonb,jsonb,jsonb,text)
  set search_path = public, extensions;

alter function public.commit_import_receipt_v191(uuid,uuid,jsonb,text)
  set search_path = public, extensions;

alter function public.commit_export_receipt_v192(uuid,uuid,uuid,jsonb,text)
  set search_path = public, extensions;

alter function public.delete_export_receipt_v192(uuid,uuid)
  set search_path = public, extensions;

alter function public.commit_stocktake_receipt_v192(uuid,uuid,uuid,jsonb,text)
  set search_path = public, extensions;

alter function public.delete_stocktake_receipt_v192(uuid,uuid)
  set search_path = public, extensions;

-- Verify pgcrypto function can be resolved.
select extensions.digest('lat-yen-v197','sha256') is not null
  as pgcrypto_digest_ok;

-- Show installed RPCs and effective search_path.
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.proconfig as function_config
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'commit_app_sync_state',
    'commit_sale_receipt_v190',
    'commit_import_receipt_v191',
    'commit_export_receipt_v192',
    'delete_export_receipt_v192',
    'commit_stocktake_receipt_v192',
    'delete_stocktake_receipt_v192'
  )
order by p.proname;
