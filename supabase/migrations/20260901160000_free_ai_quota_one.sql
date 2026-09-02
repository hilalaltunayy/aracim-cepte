-- Physical Android QA: Free receives one successfully committed AI answer per UTC month.
-- Premium remains at the previously finalized 50 answers. The existing reservation lifecycle,
-- advisory lock and ownership checks continue to be the server-authoritative enforcement path.

create or replace function private.max_ai_usage_for_user(p_user_id uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select case private.effective_plan_for_user(p_user_id)
    when 'premium' then 50
    else 1
  end;
$$;

revoke all on function private.max_ai_usage_for_user(uuid)
from public, anon, authenticated, service_role;

comment on function private.max_ai_usage_for_user(uuid) is
  'Server-authoritative monthly successful AI answer quota: Free 1, Premium 50.';
