-- TASK-031: UTC-month OCR usage. Raw text, filenames and document data are never stored here.
create table public.ocr_usage_reservations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  purpose text not null check (purpose in ('document', 'fuel_receipt', 'maintenance_receipt')),
  period_start date not null,
  status text not null check (status in ('reserved', 'committed', 'released')),
  expires_at timestamptz not null,
  recognized_at timestamptz null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  unique (user_id, operation_id)
);
create index ocr_usage_reservations_user_period_idx
  on public.ocr_usage_reservations(user_id, period_start, status);
alter table public.ocr_usage_reservations enable row level security;
revoke all on table public.ocr_usage_reservations from public, anon, authenticated;
grant select on public.ocr_usage_reservations to authenticated;
create policy ocr_usage_reservations_select_own on public.ocr_usage_reservations
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function private.max_ocr_usage_for_user(p_user_id uuid)
returns integer language sql stable security invoker set search_path = '' as $$
  select case private.effective_plan_for_user(p_user_id) when 'premium' then 30 else 3 end;
$$;
revoke all on function private.max_ocr_usage_for_user(uuid) from public, anon, authenticated, service_role;

create or replace function public.reserve_ocr_usage(p_operation_id uuid, p_purpose text)
returns table(operation_id uuid, used_count integer, monthly_quota integer, period_start date)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_period date := date_trunc('month', pg_catalog.now() at time zone 'utc')::date; v_used integer; v_reserved integer; v_quota integer; v_existing public.ocr_usage_reservations%rowtype;
begin
  if v_user is null or p_operation_id is null or p_purpose not in ('document','fuel_receipt','maintenance_receipt') then raise exception 'OCR_REQUEST_INVALID'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':ocr:' || v_period::text, 0));
  update public.ocr_usage_reservations set status = 'released', updated_at = pg_catalog.now()
    where user_id=v_user and status='reserved' and expires_at <= pg_catalog.now();
  select * into v_existing from public.ocr_usage_reservations r where r.user_id=v_user and r.operation_id=p_operation_id for update;
  if found then
    if v_existing.purpose <> p_purpose then raise exception 'OCR_OPERATION_CONFLICT'; end if;
    select count(*) into v_used from public.ocr_usage_reservations r where r.user_id=v_user and r.period_start=v_period and r.status='committed';
    return query select p_operation_id, v_used, private.max_ocr_usage_for_user(v_user), v_period; return;
  end if;
  v_quota := private.max_ocr_usage_for_user(v_user);
  select count(*) filter (where r.status='committed'), count(*) filter (where r.status='reserved' and r.expires_at > pg_catalog.now()) into v_used, v_reserved
    from public.ocr_usage_reservations r where r.user_id=v_user and r.period_start=v_period;
  if v_used + v_reserved >= v_quota then raise exception 'OCR_MONTHLY_QUOTA_EXCEEDED' using errcode='P0001'; end if;
  insert into public.ocr_usage_reservations(user_id,operation_id,purpose,period_start,status,expires_at)
    values(v_user,p_operation_id,p_purpose,v_period,'reserved',pg_catalog.now()+interval '10 minutes');
  return query select p_operation_id, v_used, v_quota, v_period;
end; $$;

create or replace function public.commit_ocr_usage(p_operation_id uuid)
returns table(used_count integer, monthly_quota integer, period_start date)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_row public.ocr_usage_reservations%rowtype; v_used integer;
begin
  if v_user is null or p_operation_id is null then raise exception 'OCR_REQUEST_INVALID'; end if;
  select * into v_row from public.ocr_usage_reservations r where r.user_id=v_user and r.operation_id=p_operation_id for update;
  if not found then raise exception 'OCR_RESERVATION_NOT_FOUND'; end if;
  if v_row.status='reserved' and v_row.expires_at > pg_catalog.now() then
    update public.ocr_usage_reservations set status='committed', recognized_at=pg_catalog.now(), updated_at=pg_catalog.now() where id=v_row.id;
  elsif v_row.status <> 'committed' then raise exception 'OCR_RESERVATION_EXPIRED'; end if;
  select count(*) into v_used from public.ocr_usage_reservations r where r.user_id=v_user and r.period_start=v_row.period_start and r.status='committed';
  return query select v_used, private.max_ocr_usage_for_user(v_user), v_row.period_start;
end; $$;

create or replace function public.release_ocr_usage(p_operation_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); begin
  if v_user is null or p_operation_id is null then return false; end if;
  update public.ocr_usage_reservations set status='released', updated_at=pg_catalog.now()
    where user_id=v_user and operation_id=p_operation_id and status='reserved';
  return found;
end; $$;

create or replace function public.get_my_ocr_usage()
returns table(used_count integer, monthly_quota integer, period_start date)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_period date := date_trunc('month', pg_catalog.now() at time zone 'utc')::date; v_used integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select count(*) into v_used from public.ocr_usage_reservations r where r.user_id=v_user and r.period_start=v_period and r.status='committed';
  return query select v_used, private.max_ocr_usage_for_user(v_user), v_period;
end; $$;

revoke all on function public.reserve_ocr_usage(uuid,text), public.commit_ocr_usage(uuid), public.release_ocr_usage(uuid), public.get_my_ocr_usage() from public, anon, authenticated, service_role;
grant execute on function public.reserve_ocr_usage(uuid,text), public.commit_ocr_usage(uuid), public.release_ocr_usage(uuid), public.get_my_ocr_usage() to authenticated;
