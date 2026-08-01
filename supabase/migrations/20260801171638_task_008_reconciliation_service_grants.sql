-- The reconciliation Edge Function only needs to discover attachment references.
-- Mutations remain behind narrowly granted SECURITY DEFINER RPCs.
grant select (owner_id, attachment_path) on public.vehicle_documents to service_role;
grant select (owner_id, attachment_path) on public.expertise_reports to service_role;
