begin;

do $$
declare
  v_missing integer;
  v_rls_enabled boolean;
begin
  select count(*) into v_missing
  from unnest(array[
    'sedan', 'hatchback', 'crossover', 'suv', 'station_wagon', 'coupe', 'cabrio',
    'roadster', 'pickup', 'mpv_minivan', 'van', 'sports_car', 'campervan', 'minibus'
  ]) as required(value)
  where not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'body_type' and e.enumlabel = required.value
  );
  if v_missing <> 0 then raise exception 'normalized body taxonomy is incomplete'; end if;

  select relrowsecurity into v_rls_enabled
  from pg_class where oid = 'public.vehicles'::regclass;
  if not v_rls_enabled then raise exception 'vehicles RLS is disabled'; end if;
end
$$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a8100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'vehicle-taxonomy-a@qa.invalid', now(), now(), false, false),
  ('b8100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'vehicle-taxonomy-b@qa.invalid', now(), now(), false, false)
on conflict (id) do nothing;

-- Legacy enum and free-text color remain readable without fabricated normalization.
insert into public.vehicles (
  id, owner_id, brand, model, current_km, fuel_type, body_type, color, color_id
) values (
  'a8200000-0000-4000-8000-000000000001',
  'a8100000-0000-4000-8000-000000000001',
  'QA', 'Legacy', 1000, 'gasoline', 'sedan_hatchback', 'İnci Moru', null
), (
  'b8200000-0000-4000-8000-000000000002',
  'b8100000-0000-4000-8000-000000000002',
  'QA', 'Foreign', 2000, 'diesel', 'suv', 'Beyaz', 'white'
);

set local role anon;
do $$
declare
  v_count integer;
begin
  begin
    select count(*) into v_count from public.vehicles
    where id in (
      'a8200000-0000-4000-8000-000000000001',
      'b8200000-0000-4000-8000-000000000002'
    );
    if v_count <> 0 then raise exception 'anonymous vehicle read leaked'; end if;
  exception when insufficient_privilege then
    null;
  end;
end
$$;
reset role;

select set_config('request.jwt.claim.sub', 'a8100000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a8100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  v_count integer;
  v_body public.body_type;
  v_color_id text;
  v_legacy_color text;
begin
  select body_type, color_id, color into v_body, v_color_id, v_legacy_color
  from public.vehicles where id = 'a8200000-0000-4000-8000-000000000001';
  if v_body <> 'sedan_hatchback' or v_color_id is not null or v_legacy_color <> 'İnci Moru' then
    raise exception 'legacy vehicle was not preserved';
  end if;

  update public.vehicles
  set body_type = 'roadster', color_id = 'red', color = 'Kırmızı'
  where id = 'a8200000-0000-4000-8000-000000000001';
  if not found then raise exception 'owner could not update normalized taxonomy'; end if;

  select body_type, color_id into v_body, v_color_id
  from public.vehicles where id = 'a8200000-0000-4000-8000-000000000001';
  if v_body <> 'roadster' or v_color_id <> 'red' then
    raise exception 'normalized taxonomy persistence failed';
  end if;

  select count(*) into v_count
  from public.vehicles where id = 'b8200000-0000-4000-8000-000000000002';
  if v_count <> 0 then raise exception 'cross-owner vehicle read leaked'; end if;

  update public.vehicles set color_id = 'black'
  where id = 'b8200000-0000-4000-8000-000000000002';
  if found then raise exception 'cross-owner vehicle update succeeded'; end if;

  begin
    update public.vehicles set color_id = 'purple'
    where id = 'a8200000-0000-4000-8000-000000000001';
    raise exception 'unsupported color bypassed constraint';
  exception when check_violation then
    null;
  end;
end
$$;

rollback;
