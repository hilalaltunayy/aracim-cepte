-- TASK-028: trusted future billing/support plan state. Missing state means Free.
create schema if not exists private;

create table public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null default 'free' check (plan_id in ('free', 'premium')),
  source text not null default 'migration' check (source in ('billing', 'support', 'migration')),
  valid_until timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint user_entitlements_valid_until_requires_premium check (valid_until is null or plan_id = 'premium')
);

create index user_entitlements_active_premium_idx
  on public.user_entitlements (valid_until) where plan_id = 'premium';
create trigger user_entitlements_updated_at before update on public.user_entitlements
  for each row execute function public.set_updated_at();

alter table public.user_entitlements enable row level security;
revoke all on table public.user_entitlements from public, anon, authenticated;
grant select on table public.user_entitlements to authenticated;
grant select, insert, update, delete on table public.user_entitlements to service_role;
create policy user_entitlements_select_own on public.user_entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

-- Future quota-sensitive server operations use this private helper, never client plan state.
create or replace function private.effective_plan_for_user(p_user_id uuid)
returns text language sql stable security invoker set search_path = '' as $$
  select coalesce((
    select case when e.plan_id = 'premium'
      and (e.valid_until is null or e.valid_until > pg_catalog.now()) then 'premium' else 'free' end
    from public.user_entitlements e where e.user_id = p_user_id
  ), 'free');
$$;
revoke all on function private.effective_plan_for_user(uuid)
  from public, anon, authenticated, service_role;
comment on table public.user_entitlements is
  'Trusted future billing/support plan source. Clients can only read their own row; absence is Free.';
comment on function private.effective_plan_for_user(uuid) is
  'Private server-side plan resolver for future quota-sensitive operations.';
