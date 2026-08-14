begin;

create temp table qa_rls_context (
  user_a uuid not null,
  user_b uuid not null,
  vehicle_a uuid not null,
  vehicle_b uuid not null,
  record_a uuid not null,
  object_a text not null
);

do $$
declare
  ids uuid[];
  va uuid := 'a0000000-0000-4000-8000-000000000001';
  vb uuid := 'b0000000-0000-4000-8000-000000000002';
  ra uuid := 'c0000000-0000-4000-8000-000000000003';
  object_a text;
begin
  if (select count(*) from auth.users) < 2 then
    insert into auth.users (
      id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous
    ) values
      (
        'd0000000-0000-4000-8000-000000000001',
        'authenticated',
        'authenticated',
        'rls-a@qa.invalid',
        now(),
        now(),
        false,
        false
      ),
      (
        'e0000000-0000-4000-8000-000000000002',
        'authenticated',
        'authenticated',
        'rls-b@qa.invalid',
        now(),
        now(),
        false,
        false
      )
    on conflict (id) do nothing;
  end if;

  select array_agg(id order by created_at) into ids
  from (select id, created_at from auth.users order by created_at limit 2) users;
  if coalesce(array_length(ids, 1), 0) < 2 then
    raise exception 'RLS negative test requires two existing auth users';
  end if;
  if (select count(*) from public.profiles where id = any(ids)) <> 2 then
    raise exception 'auth user profile trigger did not create both profiles';
  end if;

  insert into public.vehicles (
    id, owner_id, brand, model, year, current_km, fuel_type, body_type
  ) values
    (va, ids[1], 'QA', 'RLS A', 2020, 1000, 'gasoline', 'sedan_hatchback'),
    (vb, ids[2], 'QA', 'RLS B', 2020, 1000, 'gasoline', 'sedan_hatchback');

  insert into public.vehicle_records (
    id, vehicle_id, owner_id, record_type, category, amount, record_date
  ) values (
    ra, va, ids[1], 'expense', 'QA RLS', 1, '2026-07-15'
  );

  object_a := ids[1]::text || '/' || va::text || '/00000000-0000-4000-8000-000000000099.pdf';
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values (
    'vehicle-attachments',
    object_a,
    ids[1]::text,
    '{"size": 100, "mimetype": "application/pdf"}'::jsonb
  );

  insert into qa_rls_context values (ids[1], ids[2], va, vb, ra, object_a);
end
$$;

grant select on qa_rls_context to authenticated;
do $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    (select user_a::text from qa_rls_context),
    true
  );
  perform set_config(
    'request.jwt.claims',
    (
      select json_build_object('sub', user_a, 'role', 'authenticated')::text
      from qa_rls_context
    ),
    true
  );
end
$$;
set local role authenticated;

do $$
declare
  affected integer;
begin
  if exists (
    select 1 from public.profiles
    where id = (select user_b from qa_rls_context)
  ) then
    raise exception 'user A could read user B profile';
  end if;

  if exists (
    select 1 from public.vehicles
    where id = (select vehicle_b from qa_rls_context)
  ) then
    raise exception 'user A could read user B vehicle';
  end if;

  update public.vehicles
  set brand = 'UNAUTHORIZED'
  where id = (select vehicle_b from qa_rls_context);
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'user A could update user B vehicle';
  end if;

  delete from public.vehicles
  where id = (select vehicle_b from qa_rls_context);
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'user A could delete user B vehicle';
  end if;

  begin
    insert into public.vehicle_records (
      vehicle_id, owner_id, record_type, category, amount, record_date
    ) values (
      (select vehicle_b from qa_rls_context),
      (select user_a from qa_rls_context),
      'expense',
      'SPOOF',
      1,
      '2026-07-15'
    );
    raise exception 'cross-owner vehicle insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.vehicle_records
    set vehicle_id = (select vehicle_b from qa_rls_context)
    where id = (select record_a from qa_rls_context);
    raise exception 'cross-owner vehicle reassignment unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'vehicle-attachments',
      (select user_b::text from qa_rls_context) || '/escape.png',
      (select user_a::text from qa_rls_context)
    );
    raise exception 'attachment owner-folder escape unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'vehicle-attachments',
      (select user_a::text from qa_rls_context) || '/' ||
        (select vehicle_a::text from qa_rls_context) || '/direct.pdf',
      (select user_a::text from qa_rls_context),
      '{"size": 100, "mimetype": "application/pdf"}'::jsonb
    );
    raise exception 'direct attachment upload without reservation unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.reserve_attachment_upload(
      (select user_a from qa_rls_context),
      (select vehicle_a from qa_rls_context),
      100,
      'application/pdf',
      pg_catalog.gen_random_uuid()
    );
    raise exception 'authenticated user could call service-only reservation function';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform 1 from public.attachment_upload_reservations;
    raise exception 'authenticated user could read upload reservations';
  exception
    when insufficient_privilege then null;
  end;

  if not exists (
    select 1 from storage.objects
    where name = (select object_a from qa_rls_context)
  ) then
    raise exception 'user A could not read own attachment metadata';
  end if;
end
$$;

reset role;

do $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    (select user_b::text from qa_rls_context),
    true
  );
  perform set_config(
    'request.jwt.claims',
    (
      select json_build_object('sub', user_b, 'role', 'authenticated')::text
      from qa_rls_context
    ),
    true
  );
end
$$;
set local role authenticated;

do $$
declare
  affected integer;
begin
  if exists (
    select 1 from storage.objects
    where name = (select object_a from qa_rls_context)
  ) then
    raise exception 'user B could read user A attachment metadata';
  end if;

  begin
    delete from storage.objects
    where name = (select object_a from qa_rls_context);
    get diagnostics affected = row_count;
  exception
    when insufficient_privilege then affected := 0;
    when raise_exception then affected := 0;
  end;
  if affected <> 0 then
    raise exception 'user B could delete user A attachment metadata';
  end if;
end
$$;

reset role;
rollback;
