-- Enable RLS on the private menu security table.
-- Direct table privileges are intentionally not granted to anon/authenticated.
-- Existing SECURITY DEFINER RPCs remain the supported access path.

begin;

alter table ly_private.ly_menu_security enable row level security;

revoke all on table ly_private.ly_menu_security from public, anon, authenticated;

comment on table ly_private.ly_menu_security is
'Private menu-password storage. Direct client access is denied; access is mediated by reviewed SECURITY DEFINER RPCs.';

commit;
