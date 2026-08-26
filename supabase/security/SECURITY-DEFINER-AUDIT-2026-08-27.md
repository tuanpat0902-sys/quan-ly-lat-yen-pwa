# SECURITY DEFINER audit — 2026-08-27

Production project: `isfotiyxufvsmlkqsgez`

## Current findings

- No audited public SECURITY DEFINER RPC is executable by `anon`.
- The RPCs flagged by Supabase Security Advisor are executable by `authenticated` because the app uses them as its authenticated Data API contract.
- Warehouse security RPCs already use `search_path = ''`.
- iPOS ingestion RPCs are restricted to `service_role`/`postgres` and are not part of the authenticated warning set.
- Legacy authenticated RPCs used `search_path = public, auth` or, for menu password RPCs, `public, auth, ly_private, extensions, pg_temp`.

## Safe hardening in this change

Set `search_path = ''` for the legacy authenticated SECURITY DEFINER RPCs whose application objects are already schema-qualified. This follows Supabase guidance for SECURITY DEFINER functions and does not change RPC names, signatures, grants, or authorization checks.

## Intentionally deferred

Do not revoke `authenticated` EXECUTE or switch these RPCs to SECURITY INVOKER without an app-level compatibility migration. Many of these functions intentionally bypass RLS after validating admin/org context, and removing that behavior directly can break writes.

A later phase can move privileged implementations to `ly_private` and keep thin public RPC wrappers if we want to remove the advisor warnings while preserving the REST contract.
