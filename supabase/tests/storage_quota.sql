begin;

insert into auth.users (
  id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous
) values (
  'f0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'storage-quota@qa.invalid',
  now(),
  now(),
  false,
  false
) on conflict (id) do nothing;

insert into public.vehicles (
  id, owner_id, brand, model, year, current_km, fuel_type, body_type
) values (
  'f0000000-0000-4000-8000-000000000002',
  'f0000000-0000-4000-8000-000000000001',
  'QA',
  'Storage quota',
  2026,
  1,
  'gasoline',
  'sedan_hatchback'
) on conflict (id) do nothing;

do $$
declare
  bucket_public boolean;
  bucket_limit bigint;
  bucket_mimes text[];
begin
  select public, file_size_limit, allowed_mime_types
  into bucket_public, bucket_limit, bucket_mimes
  from storage.buckets
  where id = 'vehicle-attachments';

  if bucket_public is distinct from false then
    raise exception 'vehicle-attachments bucket must be private';
  end if;
  if bucket_limit <> 5242880 then
    raise exception 'vehicle-attachments bucket must use the 5 MB limit';
  end if;
  if bucket_mimes <> array['application/pdf', 'image/jpeg', 'image/png'] then
    raise exception 'vehicle-attachments MIME allow-list is incorrect';
  end if;
end
$$;

set local role service_role;

do $$
declare
  v_owner_id constant uuid := 'f0000000-0000-4000-8000-000000000001';
  v_vehicle_id constant uuid := 'f0000000-0000-4000-8000-000000000002';
  reserved record;
begin
  begin
    perform public.reserve_attachment_upload(v_owner_id, v_vehicle_id, 5242881, 'application/pdf');
    raise exception 'file larger than 5 MB unexpectedly reserved';
  exception when raise_exception then
    if sqlerrm not like '%ATTACHMENT_FILE_TOO_LARGE%' then raise; end if;
  end;

  begin
    perform public.reserve_attachment_upload(v_owner_id, v_vehicle_id, 100, 'image/webp');
    raise exception 'WebP unexpectedly reserved';
  exception when raise_exception then
    if sqlerrm not like '%ATTACHMENT_TYPE_NOT_ALLOWED%' then raise; end if;
  end;

  for index in 1..10 loop
    select * into reserved
    from public.reserve_attachment_upload(v_owner_id, v_vehicle_id, 100, 'application/pdf');
    if reserved.object_path !~ (
      '^' || v_owner_id::text || '/' || v_vehicle_id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]pdf$'
    ) then
      raise exception 'reserved path is not owner/vehicle scoped with a random object id';
    end if;
  end loop;

  begin
    perform public.reserve_attachment_upload(v_owner_id, v_vehicle_id, 100, 'application/pdf');
    raise exception '11th attachment unexpectedly reserved';
  exception when raise_exception then
    if sqlerrm not like '%ATTACHMENT_COUNT_QUOTA_EXCEEDED%' then raise; end if;
  end;

  delete from public.attachment_upload_reservations where owner_id = v_owner_id;

  for index in 1..5 loop
    perform public.reserve_attachment_upload(v_owner_id, v_vehicle_id, 5242880, 'image/jpeg');
  end loop;

  begin
    perform public.reserve_attachment_upload(v_owner_id, v_vehicle_id, 1, 'image/png');
    raise exception 'attachment beyond 25 MB total unexpectedly reserved';
  exception when raise_exception then
    if sqlerrm not like '%ATTACHMENT_BYTES_QUOTA_EXCEEDED%' then raise; end if;
  end;
end
$$;

reset role;
rollback;
