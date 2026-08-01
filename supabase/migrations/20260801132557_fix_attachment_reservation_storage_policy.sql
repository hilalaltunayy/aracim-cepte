create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_valid_attachment_reservation(
  p_object_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null or p_object_path is null then
    return false;
  end if;

  return exists (
    select 1
    from public.attachment_upload_reservations r
    where r.owner_id = v_owner_id
      and r.object_path = p_object_path
      and r.expires_at > pg_catalog.clock_timestamp()
  );
end;
$$;

revoke all on function private.is_valid_attachment_reservation(text)
from public, anon, authenticated;
grant execute on function private.is_valid_attachment_reservation(text)
to authenticated;

drop policy if exists attachments_insert_reserved on storage.objects;

create policy attachments_insert_reserved
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vehicle-attachments'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select private.is_valid_attachment_reservation(name))
);

revoke execute on function public.is_valid_attachment_reservation(text, jsonb)
from public, anon, authenticated, service_role;
drop function public.is_valid_attachment_reservation(text, jsonb);

comment on schema private is
  'Non-exposed helper schema for security-sensitive RLS predicates.';

comment on function private.is_valid_attachment_reservation(text) is
  'RLS-only reservation lookup. The schema is not exposed through the Data API.';
