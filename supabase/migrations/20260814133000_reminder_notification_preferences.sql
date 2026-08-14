-- TASK-033: Free reminders are fixed at 09:00 for new scheduling choices.
-- Existing custom times survive a downgrade and may be retained during a later Free edit.
create or replace function public.enforce_reminder_due_time_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- Migrations, fixtures and trusted administrative maintenance have no client JWT.
  if v_actor is null or new.due_date is null then
    return new;
  end if;

  if new.owner_id is distinct from v_actor then
    raise exception 'REMINDER_OWNER_MISMATCH' using errcode = '42501';
  end if;

  if private.effective_plan_for_user(v_actor) = 'premium'
    or new.due_time is null
    or new.due_time = '09:00'::time
    or (tg_op = 'UPDATE' and new.due_time is not distinct from old.due_time) then
    return new;
  end if;

  raise exception 'CUSTOM_REMINDER_TIME_PREMIUM_REQUIRED' using errcode = 'P0001';
end;
$$;

drop trigger if exists reminders_enforce_due_time_entitlement on public.reminders;
create trigger reminders_enforce_due_time_entitlement
  before insert or update of owner_id, due_date, due_time on public.reminders
  for each row execute function public.enforce_reminder_due_time_entitlement();

revoke all on function public.enforce_reminder_due_time_entitlement() from public, anon, authenticated;

comment on function public.enforce_reminder_due_time_entitlement() is
  'Allows Premium custom reminder times, Free 09:00, and retention of existing custom times after downgrade.';
