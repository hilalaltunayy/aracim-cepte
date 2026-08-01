-- Every child row must belong to the authenticated user and reference a vehicle
-- owned by that same user. Both the current row (USING) and proposed row
-- (WITH CHECK) are verified so vehicle_id cannot be reassigned across owners.

drop policy if exists records_select_own on public.vehicle_records;
drop policy if exists records_insert_own on public.vehicle_records;
drop policy if exists records_update_own on public.vehicle_records;
drop policy if exists records_delete_own on public.vehicle_records;

create policy records_select_own on public.vehicle_records for select to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy records_insert_own on public.vehicle_records for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy records_update_own on public.vehicle_records for update to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy records_delete_own on public.vehicle_records for delete to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);

drop policy if exists reminders_select_own on public.reminders;
drop policy if exists reminders_insert_own on public.reminders;
drop policy if exists reminders_update_own on public.reminders;
drop policy if exists reminders_delete_own on public.reminders;

create policy reminders_select_own on public.reminders for select to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy reminders_insert_own on public.reminders for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy reminders_update_own on public.reminders for update to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy reminders_delete_own on public.reminders for delete to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);

drop policy if exists body_select_own on public.body_part_conditions;
drop policy if exists body_insert_own on public.body_part_conditions;
drop policy if exists body_update_own on public.body_part_conditions;
drop policy if exists body_delete_own on public.body_part_conditions;

create policy body_select_own on public.body_part_conditions for select to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy body_insert_own on public.body_part_conditions for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy body_update_own on public.body_part_conditions for update to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy body_delete_own on public.body_part_conditions for delete to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);

drop policy if exists expertise_select_own on public.expertise_reports;
drop policy if exists expertise_insert_own on public.expertise_reports;
drop policy if exists expertise_update_own on public.expertise_reports;
drop policy if exists expertise_delete_own on public.expertise_reports;

create policy expertise_select_own on public.expertise_reports for select to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy expertise_insert_own on public.expertise_reports for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy expertise_update_own on public.expertise_reports for update to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy expertise_delete_own on public.expertise_reports for delete to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);

drop policy if exists notes_select_own on public.vehicle_notes;
drop policy if exists notes_insert_own on public.vehicle_notes;
drop policy if exists notes_update_own on public.vehicle_notes;
drop policy if exists notes_delete_own on public.vehicle_notes;

create policy notes_select_own on public.vehicle_notes for select to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy notes_insert_own on public.vehicle_notes for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy notes_update_own on public.vehicle_notes for update to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy notes_delete_own on public.vehicle_notes for delete to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);

drop policy if exists documents_select_own on public.vehicle_documents;
drop policy if exists documents_insert_own on public.vehicle_documents;
drop policy if exists documents_update_own on public.vehicle_documents;
drop policy if exists documents_delete_own on public.vehicle_documents;

create policy documents_select_own on public.vehicle_documents for select to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy documents_insert_own on public.vehicle_documents for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy documents_update_own on public.vehicle_documents for update to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy documents_delete_own on public.vehicle_documents for delete to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
