create extension if not exists pgcrypto;

create type public.fuel_type as enum ('gasoline', 'diesel', 'lpg', 'electric', 'hybrid');
create type public.body_type as enum ('sedan_hatchback', 'suv_crossover', 'pickup_light_commercial');
create type public.record_type as enum ('fuel', 'maintenance', 'expense');
create type public.reminder_type as enum (
  'inspection', 'traffic_insurance', 'comprehensive_insurance', 'motor_vehicle_tax',
  'periodic_maintenance', 'tire_change', 'custom'
);
create type public.body_condition as enum (
  'original', 'painted', 'locally_painted', 'replaced', 'damaged', 'unknown'
);
create type public.document_type as enum (
  'registration', 'traffic_insurance', 'comprehensive_insurance', 'inspection',
  'tax', 'service_document', 'expertise_report', 'invoice', 'custom'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(trim(display_name)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  brand text not null check (char_length(trim(brand)) between 1 and 80),
  model text not null check (char_length(trim(model)) between 1 and 80),
  year integer check (year is null or year between 1886 and 2200),
  plate text check (plate is null or char_length(trim(plate)) between 2 and 16),
  current_km integer not null default 0 check (current_km >= 0),
  fuel_type public.fuel_type not null,
  body_type public.body_type not null,
  color text check (color is null or char_length(trim(color)) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.vehicle_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  record_type public.record_type not null,
  category text not null check (char_length(trim(category)) between 1 and 80),
  amount numeric(12,2) not null check (amount > 0),
  record_date date not null,
  kilometer integer check (kilometer is null or kilometer >= 0),
  liters numeric(10,3) check (liters is null or liters > 0),
  description text check (description is null or char_length(description) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fuel_requires_liters check (record_type <> 'fuel' or liters is not null)
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  reminder_type public.reminder_type not null,
  due_date date,
  due_kilometer integer check (due_kilometer is null or due_kilometer >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  notification_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminder_has_due_condition check (due_date is not null or due_kilometer is not null),
  constraint reminder_completion_consistent check (
    (completed and completed_at is not null) or (not completed and completed_at is null)
  )
);

create table public.body_part_conditions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  schema_type public.body_type not null,
  part_key text not null check (char_length(trim(part_key)) between 1 and 60),
  condition public.body_condition not null default 'unknown',
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, schema_type, part_key)
);

create table public.expertise_reports (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  report_date date,
  company_name text check (company_name is null or char_length(trim(company_name)) <= 120),
  overall_note text check (overall_note is null or char_length(overall_note) <= 2000),
  report_number text check (report_number is null or char_length(trim(report_number)) <= 80),
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_notes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  content text not null check (char_length(trim(content)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_type public.document_type not null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  document_number text check (document_number is null or char_length(trim(document_number)) <= 80),
  issue_date date,
  expiry_date date,
  note text check (note is null or char_length(note) <= 2000),
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_dates_valid check (issue_date is null or expiry_date is null or expiry_date >= issue_date)
);

create index vehicles_owner_active_idx on public.vehicles(owner_id, archived_at, created_at desc);
create index vehicle_records_vehicle_date_idx on public.vehicle_records(vehicle_id, record_date desc);
create index vehicle_records_owner_idx on public.vehicle_records(owner_id);
create index reminders_vehicle_status_idx on public.reminders(vehicle_id, completed, due_date);
create index reminders_owner_idx on public.reminders(owner_id);
create index body_conditions_vehicle_idx on public.body_part_conditions(vehicle_id);
create index expertise_vehicle_date_idx on public.expertise_reports(vehicle_id, report_date desc);
create index notes_vehicle_updated_idx on public.vehicle_notes(vehicle_id, updated_at desc);
create index documents_vehicle_expiry_idx on public.vehicle_documents(vehicle_id, expiry_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''));
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger records_updated_at before update on public.vehicle_records
  for each row execute function public.set_updated_at();
create trigger reminders_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();
create trigger body_conditions_updated_at before update on public.body_part_conditions
  for each row execute function public.set_updated_at();
create trigger expertise_updated_at before update on public.expertise_reports
  for each row execute function public.set_updated_at();
create trigger notes_updated_at before update on public.vehicle_notes
  for each row execute function public.set_updated_at();
create trigger documents_updated_at before update on public.vehicle_documents
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_records enable row level security;
alter table public.reminders enable row level security;
alter table public.body_part_conditions enable row level security;
alter table public.expertise_reports enable row level security;
alter table public.vehicle_notes enable row level security;
alter table public.vehicle_documents enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy vehicles_select_own on public.vehicles for select to authenticated
using ((select auth.uid()) = owner_id);
create policy vehicles_insert_own on public.vehicles for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy vehicles_update_own on public.vehicles for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy vehicles_delete_own on public.vehicles for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy records_select_own on public.vehicle_records for select to authenticated
using ((select auth.uid()) = owner_id and exists (
  select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())
));
create policy records_insert_own on public.vehicle_records for insert to authenticated
with check ((select auth.uid()) = owner_id and exists (
  select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())
));
create policy records_update_own on public.vehicle_records for update to authenticated
using ((select auth.uid()) = owner_id) with check (
  (select auth.uid()) = owner_id and exists (
    select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);
create policy records_delete_own on public.vehicle_records for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy reminders_select_own on public.reminders for select to authenticated
using ((select auth.uid()) = owner_id);
create policy reminders_insert_own on public.reminders for insert to authenticated
with check ((select auth.uid()) = owner_id and exists (
  select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())
));
create policy reminders_update_own on public.reminders for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy reminders_delete_own on public.reminders for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy body_select_own on public.body_part_conditions for select to authenticated
using ((select auth.uid()) = owner_id);
create policy body_insert_own on public.body_part_conditions for insert to authenticated
with check ((select auth.uid()) = owner_id and exists (
  select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid())
));
create policy body_update_own on public.body_part_conditions for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy body_delete_own on public.body_part_conditions for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy expertise_select_own on public.expertise_reports for select to authenticated
using ((select auth.uid()) = owner_id);
create policy expertise_insert_own on public.expertise_reports for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy expertise_update_own on public.expertise_reports for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy expertise_delete_own on public.expertise_reports for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy notes_select_own on public.vehicle_notes for select to authenticated
using ((select auth.uid()) = owner_id);
create policy notes_insert_own on public.vehicle_notes for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy notes_update_own on public.vehicle_notes for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy notes_delete_own on public.vehicle_notes for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy documents_select_own on public.vehicle_documents for select to authenticated
using ((select auth.uid()) = owner_id);
create policy documents_insert_own on public.vehicle_documents for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy documents_update_own on public.vehicle_documents for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy documents_delete_own on public.vehicle_documents for delete to authenticated
using ((select auth.uid()) = owner_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
