-- TASK-021: normalized multi-condition values for an existing body-part parent row.
-- Legacy body_part_conditions.condition remains intact and is the read fallback when no child
-- values exist. condition_set_initialized keeps an explicit empty set distinct from a legacy
-- singleton "unknown" value without discarding the existing panel note.

alter table public.body_part_conditions
  add column condition_set_initialized boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'body_part_conditions_identity_owner_key'
      and conrelid = 'public.body_part_conditions'::regclass
  ) then
    alter table public.body_part_conditions
      add constraint body_part_conditions_identity_owner_key
      unique (id, vehicle_id, owner_id);
  end if;
end
$$;

create table public.body_part_condition_values (
  id uuid primary key default gen_random_uuid(),
  body_part_condition_id uuid not null,
  vehicle_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  condition public.body_condition not null,
  created_at timestamptz not null default now(),
  constraint body_part_condition_values_parent_fkey
    foreign key (body_part_condition_id, vehicle_id, owner_id)
    references public.body_part_conditions(id, vehicle_id, owner_id)
    on delete cascade,
  constraint body_part_condition_values_unique
    unique (body_part_condition_id, condition)
);

create index body_part_condition_values_vehicle_idx
  on public.body_part_condition_values(vehicle_id, body_part_condition_id);
create index body_part_condition_values_owner_idx
  on public.body_part_condition_values(owner_id);

alter table public.body_part_condition_values enable row level security;

create policy body_condition_values_select_own
on public.body_part_condition_values
for select
to authenticated
using (
  (select auth.uid()) = body_part_condition_values.owner_id
  and exists (
    select 1
    from public.body_part_conditions parent
    join public.vehicles vehicle on vehicle.id = parent.vehicle_id
    where parent.id = body_part_condition_values.body_part_condition_id
      and parent.vehicle_id = body_part_condition_values.vehicle_id
      and parent.owner_id = body_part_condition_values.owner_id
      and vehicle.owner_id = (select auth.uid())
  )
);

revoke all on table public.body_part_condition_values from public, anon, authenticated;
grant select on table public.body_part_condition_values to authenticated;
grant all on table public.body_part_condition_values to service_role;

create or replace function public.clear_body_condition_values_on_legacy_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.body_part_condition_values
  where body_part_condition_id = new.id;
  update public.body_part_conditions
  set condition_set_initialized = false
  where id = new.id;
  return new;
end;
$$;

create trigger body_part_conditions_legacy_write_clears_values
after update of condition on public.body_part_conditions
for each row execute function public.clear_body_condition_values_on_legacy_write();

revoke all on function public.clear_body_condition_values_on_legacy_write() from public, anon, authenticated;

create or replace function public.save_body_part_conditions_atomic(
  p_vehicle_id uuid,
  p_schema_type public.body_type,
  p_part_key text,
  p_conditions public.body_condition[],
  p_note text
)
returns public.body_part_conditions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_vehicle_body_type public.body_type;
  v_expected_schema public.body_type;
  v_conditions public.body_condition[];
  v_primary_count integer;
  v_parent public.body_part_conditions%rowtype;
  v_representative public.body_condition;
begin
  if v_owner_id is null then
    raise exception 'BODY_CONDITION_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select vehicle.body_type
  into v_vehicle_body_type
  from public.vehicles vehicle
  where vehicle.id = p_vehicle_id
    and vehicle.owner_id = v_owner_id
  for update;

  if not found then
    raise exception 'BODY_CONDITION_VEHICLE_FORBIDDEN' using errcode = '42501';
  end if;

  v_expected_schema := case
    when v_vehicle_body_type in (
      'sedan_hatchback', 'sedan', 'hatchback', 'station_wagon', 'coupe', 'cabrio',
      'roadster', 'sports_car'
    ) then 'sedan_hatchback'::public.body_type
    when v_vehicle_body_type in ('suv_crossover', 'crossover', 'suv')
      then 'suv_crossover'::public.body_type
    else 'pickup_light_commercial'::public.body_type
  end;

  if p_schema_type is distinct from v_expected_schema then
    raise exception 'BODY_CONDITION_SCHEMA_INVALID' using errcode = '22023';
  end if;
  if p_part_key is null or char_length(trim(p_part_key)) not between 1 and 60 then
    raise exception 'BODY_CONDITION_PART_INVALID' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'BODY_CONDITION_NOTE_TOO_LONG' using errcode = '22023';
  end if;

  select coalesce(
    array_agg(value order by array_position(
      array[
        'original', 'painted', 'locally_painted', 'replaced', 'damaged', 'unknown'
      ]::public.body_condition[],
      value
    )),
    '{}'::public.body_condition[]
  )
  into v_conditions
  from (
    select distinct unnest(coalesce(p_conditions, '{}'::public.body_condition[])) as value
  ) normalized;

  if 'unknown'::public.body_condition = any(v_conditions)
    and cardinality(v_conditions) <> 1 then
    raise exception 'BODY_CONDITION_UNKNOWN_EXCLUSIVE' using errcode = '22023';
  end if;

  select count(*)
  into v_primary_count
  from unnest(v_conditions) value
  where value in (
    'original'::public.body_condition,
    'painted'::public.body_condition,
    'locally_painted'::public.body_condition,
    'replaced'::public.body_condition
  );

  if v_primary_count > 1 then
    raise exception 'BODY_CONDITION_PRIMARY_CONFLICT' using errcode = '22023';
  end if;

  v_representative := (case
    when cardinality(v_conditions) = 0 then 'unknown'
    when 'unknown'::public.body_condition = any(v_conditions) then 'unknown'
    when 'damaged'::public.body_condition = any(v_conditions) then 'damaged'
    when 'replaced'::public.body_condition = any(v_conditions) then 'replaced'
    when 'locally_painted'::public.body_condition = any(v_conditions) then 'locally_painted'
    when 'painted'::public.body_condition = any(v_conditions) then 'painted'
    else 'original'
  end)::public.body_condition;

  insert into public.body_part_conditions (
    vehicle_id, owner_id, schema_type, part_key, condition, condition_set_initialized, note
  ) values (
    p_vehicle_id,
    v_owner_id,
    p_schema_type,
    trim(p_part_key),
    v_representative,
    true,
    nullif(trim(p_note), '')
  )
  on conflict (vehicle_id, schema_type, part_key)
  do update set
    owner_id = excluded.owner_id,
    condition = excluded.condition,
    condition_set_initialized = true,
    note = excluded.note
  returning * into v_parent;

  delete from public.body_part_condition_values
  where body_part_condition_id = v_parent.id;

  insert into public.body_part_condition_values (
    body_part_condition_id, vehicle_id, owner_id, condition
  )
  select v_parent.id, v_parent.vehicle_id, v_parent.owner_id, value
  from unnest(v_conditions) value;

  update public.body_part_conditions
  set condition_set_initialized = true
  where id = v_parent.id
  returning * into v_parent;

  return v_parent;
end;
$$;

revoke all on function public.save_body_part_conditions_atomic(
  uuid, public.body_type, text, public.body_condition[], text
) from public, anon;
grant execute on function public.save_body_part_conditions_atomic(
  uuid, public.body_type, text, public.body_condition[], text
) to authenticated, service_role;
