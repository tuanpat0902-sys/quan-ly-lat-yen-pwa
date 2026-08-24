create or replace function public.ly_keepalive()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', true,
    'checked_at', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
$$;

revoke all on function public.ly_keepalive() from public;
grant execute on function public.ly_keepalive() to anon, authenticated;
comment on function public.ly_keepalive() is 'Read-only health query for scheduled Free Plan activity checks.';
