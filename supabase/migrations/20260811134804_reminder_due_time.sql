-- TASK-020: exact local reminder time. Legacy rows stay null and retain the 09:00 app fallback.

alter table public.reminders
  add column due_time time without time zone;

comment on column public.reminders.due_time is
  'Optional local wall-clock reminder time; null legacy values resolve to 09:00 in the client.';
