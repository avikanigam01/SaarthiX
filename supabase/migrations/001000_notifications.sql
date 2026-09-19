-- =====================================================================
-- SaarthiX — Phase 2 | Migration 010
-- notifications (§24) + automatic notification events (§25)
-- =====================================================================

create table if not exists public.notifications (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  type                 text not null,
  title                text not null,
  message              text not null,
  related_entity_type  text,
  related_entity_id    uuid,
  is_read              boolean not null default false,
  created_at           timestamptz not null default now(),

  constraint notifications_title_not_blank   check (length(btrim(title)) > 0),
  constraint notifications_message_not_blank check (length(btrim(message)) > 0)
);

comment on table public.notifications is
  'Real events only — rows are created exclusively by trigger functions below, never inserted directly by any client (§25: "Do not generate fake notifications").';

create index if not exists notifications_user_id_idx          on public.notifications (user_id);
create index if not exists notifications_is_read_idx          on public.notifications (is_read);
create index if not exists notifications_created_at_idx       on public.notifications (created_at);
create index if not exists notifications_user_unread_idx      on public.notifications (user_id, is_read);

alter table public.notifications enable row level security;
alter table public.notifications force row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- The only client-writable action: marking your own notification read.
-- Every other column is immutable once created.
create or replace function public.protect_notification_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.user_id             := old.user_id;
  new.type                := old.type;
  new.title               := old.title;
  new.message             := old.message;
  new.related_entity_type := old.related_entity_type;
  new.related_entity_id   := old.related_entity_id;
  new.created_at          := old.created_at;
  return new;
end;
$$;

drop trigger if exists notifications_protect_columns on public.notifications;
create trigger notifications_protect_columns
  before update on public.notifications
  for each row execute function public.protect_notification_columns();

drop policy if exists notifications_update_own_read_status on public.notifications;
create policy notifications_update_own_read_status
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No INSERT/DELETE policy for any client role: rows are created only
-- by SECURITY DEFINER trigger functions below.

-- ---------------------------------------------------------------------
-- Shared helper: create a notification bypassing RLS. Only ever called
-- from other SECURITY DEFINER trigger functions in this file.
-- ---------------------------------------------------------------------
create or replace function public.create_notification(
  _user_id             uuid,
  _type                text,
  _title               text,
  _message             text,
  _related_entity_type text default null,
  _related_entity_id   uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if _user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, type, title, message, related_entity_type, related_entity_id)
  values (_user_id, _type, _title, _message, _related_entity_type, _related_entity_id);
end;
$$;

revoke all on function public.create_notification(uuid, text, text, text, text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Event: referral status changed -> notify the patient (§25)
-- ---------------------------------------------------------------------
create or replace function public.notify_on_referral_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility_name text;
  v_title text;
  v_message text;
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;
  if tg_op = 'INSERT' then
    return new;
  end if;

  select name into v_facility_name from public.facilities where id = new.destination_facility_id;

  v_title := case new.status
    when 'accepted'  then 'Referral accepted'
    when 'rejected'  then 'Referral not accepted'
    when 'scheduled' then 'Referral scheduled'
    when 'completed' then 'Referral completed'
    when 'cancelled' then 'Referral cancelled'
    else null
  end;

  if v_title is null then
    return new;
  end if;

  v_message := case new.status
    when 'accepted'  then concat(coalesce(v_facility_name, 'The facility'), ' has accepted your referral.')
    when 'rejected'  then concat(coalesce(v_facility_name, 'The facility'), ' could not accept your referral.')
    when 'scheduled' then concat('Your referral to ', coalesce(v_facility_name, 'the facility'), ' has been scheduled.')
    when 'completed' then 'Your referral has been marked completed.'
    when 'cancelled' then 'Your referral has been cancelled.'
    else ''
  end;

  perform public.create_notification(
    new.patient_id, 'referral_status_changed', v_title, v_message, 'referral', new.id
  );

  return new;
end;
$$;

drop trigger if exists referrals_notify_status_change on public.referrals;
create trigger referrals_notify_status_change
  after insert or update on public.referrals
  for each row execute function public.notify_on_referral_status_change();

-- ---------------------------------------------------------------------
-- Event: follow-up scheduled or status changed -> notify the patient
-- ---------------------------------------------------------------------
create or replace function public.notify_on_followup_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_message text;
begin
  if tg_op = 'INSERT' then
    perform public.create_notification(
      new.patient_id,
      'followup_scheduled',
      'Follow-up scheduled',
      concat('A follow-up has been scheduled for ', to_char(new.scheduled_date, 'DD Mon YYYY, HH24:MI'), '.'),
      'followup', new.id
    );
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  v_title := case new.status
    when 'completed'    then 'Follow-up completed'
    when 'missed'       then 'Follow-up missed'
    when 'rescheduled'  then 'Follow-up rescheduled'
    when 'cancelled'    then 'Follow-up cancelled'
    else null
  end;

  if v_title is null then
    return new;
  end if;

  v_message := case new.status
    when 'completed'   then 'Your follow-up has been marked completed.'
    when 'missed'      then 'Your scheduled follow-up was marked as missed.'
    when 'rescheduled' then concat('Your follow-up has been rescheduled to ', to_char(new.scheduled_date, 'DD Mon YYYY, HH24:MI'), '.')
    when 'cancelled'   then 'Your follow-up has been cancelled.'
    else ''
  end;

  perform public.create_notification(new.patient_id, 'followup_status_changed', v_title, v_message, 'followup', new.id);

  return new;
end;
$$;

drop trigger if exists followups_notify_change on public.followups;
create trigger followups_notify_change
  after insert or update on public.followups
  for each row execute function public.notify_on_followup_change();

-- ---------------------------------------------------------------------
-- Event: journey completed -> notify the patient (§25)
-- ---------------------------------------------------------------------
create or replace function public.notify_on_journey_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    perform public.create_notification(
      new.patient_id,
      'journey_completed',
      'Healthcare journey completed',
      'Your care journey has been marked as complete. Thank you for using SaarthiX.',
      'patient_journey', new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists patient_journeys_notify_completed on public.patient_journeys;
create trigger patient_journeys_notify_completed
  after update on public.patient_journeys
  for each row execute function public.notify_on_journey_completed();

-- ---------------------------------------------------------------------
-- Event: facility service/diagnostic availability changes -> notify
-- staff at the SAME facility only (internal ops awareness), not
-- patients in bulk (§38: realtime should not be used unnecessarily
-- for sensitive information; this is a lightweight internal signal).
-- Kept intentionally minimal: no fan-out beyond the acting facility.
-- ---------------------------------------------------------------------
create or replace function public.notify_facility_admins_on_service_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin record;
begin
  if new.status = old.status then
    return new;
  end if;

  for v_admin in
    select fs.user_id
    from public.facility_staff fs
    where fs.facility_id = new.facility_id and fs.is_active
  loop
    perform public.create_notification(
      v_admin.user_id,
      'service_availability_changed',
      'Service availability updated',
      concat(new.name, ' is now marked as ', new.status::text, '.'),
      tg_table_name, new.id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists facility_services_notify_change on public.facility_services;
create trigger facility_services_notify_change
  after update on public.facility_services
  for each row execute function public.notify_facility_admins_on_service_change();

drop trigger if exists diagnostic_services_notify_change on public.diagnostic_services;
create trigger diagnostic_services_notify_change
  after update on public.diagnostic_services
  for each row execute function public.notify_facility_admins_on_service_change();
