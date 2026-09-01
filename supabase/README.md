# Supabase production sync

This directory versions the Supabase production state for project `isfotiyxufvsmlkqsgez`.

## Edge Functions

- `functions/lat-yen-chat/index.ts` — production `lat-yen-chat` source. Current production requires JWT verification.
- `functions/ly-ipos-sync/index.ts` — production `ly-ipos-sync` source. Current production requires JWT verification and additionally validates `x-ly-cron-secret` against Vault-backed runtime config.

## iPOS migrations and snapshot

- `migrations/20260826095528_prepare_ipos_integration.sql` — exact migration statement recorded in Supabase migration history.
- `migrations/20260826100008_harden_ipos_ingestion.sql` — exact migration statement recorded in Supabase migration history.
- `snapshots/ipos-production-2026-08-27.sql` — current post-migration production RPC/Cron snapshot. This is documentation/recovery SQL and is intentionally not placed in `migrations/` because some production changes occurred after the two recorded migrations.

## Required secrets

Secret values are intentionally NOT stored in Git. The current iPOS runtime expects these Supabase Vault secret names:

- `ly_supabase_project_url`
- `ly_supabase_anon_key`
- `ly_ipos_cron_secret`
- `ly_ipos_authorization`
- `ly_ipos_access_token`

The `lat-yen-chat` Edge Function also expects Edge Function environment variables such as `OPENAI_API_KEY`; no secret values are committed here.

## Current Cron

Production job: `ly_ipos_sync_every_minute`

Schedule: `*/5 0-16,23 * * *` (mỗi 5 phút từ 06:00 đến 23:59 giờ Việt Nam; tạm dừng 00:00–06:00)

The job calls `/functions/v1/ly-ipos-sync` through `pg_net` and supplies the Cron secret from Vault.

## Security follow-up

At the time of this snapshot, `ly_private.ly_menu_security` has RLS disabled and Supabase flags this as critical. Do not enable RLS blindly without first confirming grants/policies because that can break menu-password behavior.

Supabase Security Advisor also flags several public `SECURITY DEFINER` RPCs callable by `authenticated`; these should be audited individually before changing privileges.
