create index if not exists body_conditions_owner_idx
  on public.body_part_conditions(owner_id);
create index if not exists expertise_owner_idx
  on public.expertise_reports(owner_id);
create index if not exists notes_owner_idx
  on public.vehicle_notes(owner_id);
create index if not exists documents_owner_idx
  on public.vehicle_documents(owner_id);
