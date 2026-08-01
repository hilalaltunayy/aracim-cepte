create or replace function public.clear_vehicle_documents_consistent(p_vehicle_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_path record;
  v_count integer;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = v_owner_id
  ) then raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN'; end if;

  for v_path in
    select distinct d.attachment_path as object_path
    from public.vehicle_documents d
    where d.owner_id = v_owner_id and d.vehicle_id = p_vehicle_id
      and d.attachment_path is not null
  loop
    perform private.queue_attachment_cleanup(v_owner_id, v_path.object_path);
  end loop;

  delete from public.vehicle_documents
  where owner_id = v_owner_id and vehicle_id = p_vehicle_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.clear_vehicle_documents_consistent(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.clear_vehicle_documents_consistent(uuid) to authenticated;

create or replace function public.delete_vehicle_consistent(p_vehicle_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_path record;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = v_owner_id
    for update
  ) then return false; end if;

  for v_path in
    select d.attachment_path as object_path
    from public.vehicle_documents d
    where d.owner_id = v_owner_id and d.vehicle_id = p_vehicle_id
      and d.attachment_path is not null
    union
    select e.attachment_path
    from public.expertise_reports e
    where e.owner_id = v_owner_id and e.vehicle_id = p_vehicle_id
      and e.attachment_path is not null
    union
    select r.object_path
    from public.attachment_upload_reservations r
    where r.owner_id = v_owner_id and r.vehicle_id = p_vehicle_id
      and exists (
        select 1 from storage.objects o
        where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path
      )
  loop
    perform private.queue_attachment_cleanup(v_owner_id, v_path.object_path);
  end loop;

  delete from public.vehicles
  where id = p_vehicle_id and owner_id = v_owner_id;
  return found;
end;
$$;

revoke all on function public.delete_vehicle_consistent(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.delete_vehicle_consistent(uuid) to authenticated;

comment on function public.clear_vehicle_documents_consistent(uuid)
is 'DB-first document bulk delete that persists owner-scoped Storage cleanup work transactionally.';
comment on function public.delete_vehicle_consistent(uuid)
is 'DB-first vehicle cascade delete that persists attachment cleanup work before metadata removal.';
