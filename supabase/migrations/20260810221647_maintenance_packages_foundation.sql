-- TASK-017: backward-compatible maintenance operations and user-owned templates.
-- Existing vehicle_records maintenance rows remain the event source of truth. Legacy rows may
-- intentionally have zero maintenance_items.

create schema if not exists private;

alter table public.vehicle_records
  add column source text not null default 'manual'
    check (source in ('manual', 'receipt_ocr', 'service', 'obd', 'connected_vehicle', 'import'));

alter table public.vehicle_records
  add constraint vehicle_records_id_vehicle_owner_unique unique (id, vehicle_id, owner_id);

create table public.maintenance_items (
  id uuid primary key default gen_random_uuid(),
  maintenance_record_id uuid not null,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (char_length(btrim(item_type)) between 1 and 80),
  cost numeric(12,2) check (cost is null or cost >= 0),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (maintenance_record_id, item_type),
  constraint maintenance_items_parent_fkey
    foreign key (maintenance_record_id, vehicle_id, owner_id)
    references public.vehicle_records(id, vehicle_id, owner_id)
    on delete cascade
);

create table public.maintenance_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  item_definitions text[] not null check (
    cardinality(item_definitions) between 1 and 32
    and array_position(item_definitions, null) is null
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index maintenance_items_vehicle_record_idx
  on public.maintenance_items(vehicle_id, maintenance_record_id);
create index maintenance_items_owner_idx on public.maintenance_items(owner_id);
create index maintenance_templates_owner_updated_idx
  on public.maintenance_templates(owner_id, updated_at desc);

create trigger maintenance_items_updated_at before update on public.maintenance_items
  for each row execute function public.set_updated_at();
create trigger maintenance_templates_updated_at before update on public.maintenance_templates
  for each row execute function public.set_updated_at();

alter table public.maintenance_items enable row level security;
alter table public.maintenance_templates enable row level security;

create policy maintenance_items_select_own on public.maintenance_items for select to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.vehicle_records r
    where r.id = maintenance_record_id
      and r.vehicle_id = vehicle_id
      and r.owner_id = (select auth.uid())
      and r.record_type = 'maintenance'
  )
);

create policy maintenance_items_insert_own on public.maintenance_items for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.vehicle_records r
    where r.id = maintenance_record_id
      and r.vehicle_id = vehicle_id
      and r.owner_id = (select auth.uid())
      and r.record_type = 'maintenance'
  )
);

create policy maintenance_items_update_own on public.maintenance_items for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.vehicle_records r
    where r.id = maintenance_record_id
      and r.vehicle_id = vehicle_id
      and r.owner_id = (select auth.uid())
      and r.record_type = 'maintenance'
  )
);

create policy maintenance_items_delete_own on public.maintenance_items for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy maintenance_templates_select_own on public.maintenance_templates
for select to authenticated using ((select auth.uid()) = owner_id);
create policy maintenance_templates_insert_own on public.maintenance_templates
for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy maintenance_templates_update_own on public.maintenance_templates
for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy maintenance_templates_delete_own on public.maintenance_templates
for delete to authenticated using ((select auth.uid()) = owner_id);

grant select on public.maintenance_items to authenticated;
grant select, insert, update, delete on public.maintenance_templates to authenticated;
revoke all on public.maintenance_items, public.maintenance_templates from public, anon;

create or replace function private.clear_maintenance_items_for_non_maintenance_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.record_type = 'maintenance' and new.record_type <> 'maintenance' then
    delete from public.maintenance_items where maintenance_record_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.clear_maintenance_items_for_non_maintenance_record()
from public, anon, authenticated;

create trigger clear_items_when_record_type_changes
  after update of record_type on public.vehicle_records
  for each row execute function private.clear_maintenance_items_for_non_maintenance_record();

create or replace function public.save_maintenance_record_atomic(
  p_request_id uuid,
  p_vehicle_id uuid,
  p_record_id uuid,
  p_category text,
  p_amount numeric,
  p_record_date date,
  p_kilometer integer,
  p_description text,
  p_item_types text[]
)
returns public.vehicle_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_request_hash text;
  v_previous_request public.record_mutation_requests%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_existing public.vehicle_records%rowtype;
  v_saved public.vehicle_records%rowtype;
  v_record_id uuid := coalesce(p_record_id, pg_catalog.gen_random_uuid());
  v_item_count integer;
  v_distinct_item_count integer;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_request_id is null or p_vehicle_id is null then
    raise exception 'RECORD_REQUEST_REQUIRED';
  end if;
  if pg_catalog.length(pg_catalog.btrim(coalesce(p_category, ''))) = 0
    or p_amount is null or p_amount <= 0 or p_record_date is null
    or p_kilometer is not null and p_kilometer < 0 then
    raise exception 'RECORD_VALIDATION_FAILED';
  end if;

  p_item_types := coalesce(p_item_types, array[]::text[]);
  select count(*), count(distinct pg_catalog.btrim(item))
  into v_item_count, v_distinct_item_count
  from unnest(p_item_types) item;
  if v_item_count > 32
    or v_item_count <> v_distinct_item_count
    or exists (
      select 1 from unnest(p_item_types) item
      where pg_catalog.length(pg_catalog.btrim(coalesce(item, ''))) = 0
        or pg_catalog.length(pg_catalog.btrim(item)) > 80
    ) then
    raise exception 'MAINTENANCE_ITEMS_INVALID';
  end if;

  v_request_hash := pg_catalog.md5(pg_catalog.concat_ws('|',
    p_vehicle_id::text,
    coalesce(p_record_id::text, ''),
    'maintenance',
    pg_catalog.btrim(p_category),
    p_amount::text,
    p_record_date::text,
    coalesce(p_kilometer::text, ''),
    coalesce(pg_catalog.btrim(p_description), ''),
    pg_catalog.array_to_json(p_item_types)::text
  ));

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner_id::text || ':' || p_request_id::text, 0)
  );

  select * into v_previous_request
  from public.record_mutation_requests r
  where r.owner_id = v_owner_id and r.request_id = p_request_id;

  if found then
    if v_previous_request.request_hash <> v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    select * into v_saved
    from public.vehicle_records r
    where r.id = v_previous_request.record_id and r.owner_id = v_owner_id;
    if not found then raise exception 'IDEMPOTENCY_RESULT_MISSING'; end if;
    return v_saved;
  end if;

  select * into v_vehicle
  from public.vehicles v
  where v.id = p_vehicle_id and v.owner_id = v_owner_id and v.archived_at is null
  for update;
  if not found then raise exception 'RECORD_VEHICLE_FORBIDDEN'; end if;

  if p_record_id is not null then
    select * into v_existing
    from public.vehicle_records r
    where r.id = p_record_id and r.owner_id = v_owner_id and r.vehicle_id = p_vehicle_id
    for update;
    if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  end if;

  if p_record_id is null then
    insert into public.vehicle_records (
      id, vehicle_id, owner_id, record_type, category, amount, record_date,
      kilometer, liters, description, source
    ) values (
      v_record_id, p_vehicle_id, v_owner_id, 'maintenance', pg_catalog.btrim(p_category),
      p_amount, p_record_date, p_kilometer, null,
      nullif(pg_catalog.btrim(p_description), ''), 'manual'
    ) returning * into v_saved;
  else
    update public.vehicle_records
    set record_type = 'maintenance',
        category = pg_catalog.btrim(p_category),
        amount = p_amount,
        record_date = p_record_date,
        kilometer = p_kilometer,
        liters = null,
        description = nullif(pg_catalog.btrim(p_description), ''),
        source = 'manual'
    where id = p_record_id and owner_id = v_owner_id
    returning * into v_saved;
  end if;

  delete from public.maintenance_items where maintenance_record_id = v_saved.id;
  insert into public.maintenance_items (
    maintenance_record_id, vehicle_id, owner_id, item_type
  )
  select v_saved.id, p_vehicle_id, v_owner_id, pg_catalog.btrim(item)
  from unnest(p_item_types) item;

  if p_kilometer is not null and p_kilometer > v_vehicle.current_km then
    update public.vehicles set current_km = p_kilometer
    where id = p_vehicle_id and owner_id = v_owner_id;
  end if;

  insert into public.record_mutation_requests (owner_id, request_id, record_id, request_hash)
  values (v_owner_id, p_request_id, v_saved.id, v_request_hash);

  return v_saved;
end;
$$;

revoke all on function public.save_maintenance_record_atomic(
  uuid, uuid, uuid, text, numeric, date, integer, text, text[]
) from public, anon, authenticated, service_role;
grant execute on function public.save_maintenance_record_atomic(
  uuid, uuid, uuid, text, numeric, date, integer, text, text[]
) to authenticated;

comment on function public.save_maintenance_record_atomic(
  uuid, uuid, uuid, text, numeric, date, integer, text, text[]
) is 'Owner-scoped idempotent maintenance event/item write with monotonic vehicle mileage.';
