-- Normalize bootstrap and authorization helpers to the reviewed security posture.
-- Behavior is unchanged: authenticated users call public.ly_bootstrap(), while
-- privileged implementation remains in ly_private.

begin;

alter function public.ly_bootstrap() security invoker;
alter function public.ly_bootstrap() set search_path = '';

alter function ly_private.ly_bootstrap_impl() security definer;
alter function ly_private.ly_bootstrap_impl() set search_path = '';

alter function ly_private.ly_is_admin() security definer;
alter function ly_private.ly_is_admin() set search_path = '';

alter function ly_private.ly_current_org() security definer;
alter function ly_private.ly_current_org() set search_path = '';

-- Locked legacy public helpers are not client APIs, but pin their search path too.
alter function public.ly_is_admin() set search_path = '';
alter function public.ly_current_org() set search_path = '';

revoke all on function public.ly_bootstrap() from public, anon;
grant execute on function public.ly_bootstrap() to authenticated, service_role;

revoke all on function ly_private.ly_bootstrap_impl() from public, anon;
grant execute on function ly_private.ly_bootstrap_impl() to authenticated, service_role;

revoke all on function ly_private.ly_is_admin() from public, anon;
grant execute on function ly_private.ly_is_admin() to authenticated, service_role;

revoke all on function ly_private.ly_current_org() from public, anon;
grant execute on function ly_private.ly_current_org() to authenticated, service_role;

revoke all on function public.ly_is_admin() from public, anon, authenticated;
revoke all on function public.ly_current_org() from public, anon, authenticated;

grant execute on function public.ly_is_admin() to service_role;
grant execute on function public.ly_current_org() to service_role;

commit;
