-- =====================================================================
-- SaarthiX — Phase 2 | Migration 011
-- audit_logs (§27) + generic audit trigger applied to sensitive tables
-- =====================================================================

create table if not exists public.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references public.profiles(id) on delete set null,
  action         text not null,
  entity_type    text not null,
  entity_id      uuid,
  old_data       jsonb,
  new_data       jsonb,
  created_at     timestamptz not null default now(),

  constraint audit_logs_action_not_blank      check (length(btrim(action)) > 0),
  constraint audit_logs_entity_type_not_blank check (length(btrim(entity_type)) > 0)
);

comment on table public.audit_logs is
  'Append-only. Written only by public.write_audit_log(), called from triggers. No UPDATE/DELETE policy exists for any role.';

create index if not exists audit_logs_actor_user_id_idx  on public.audit_logs (actor_user_id);
create index if not exists audit_logs_entity_type_idx    on public.audit_logs (entity_type);
create index if not exists audit_logs_entity_id_idx      on public.audit_logs (entity_id);
create index if not exists audit_logs_created_at_idx     on public.audit_logs (created_at);

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin
  on public.audit_logs for select
  to authenticated
  using (public.is_platform_admin());

-- No INSERT/UPDATE/DELETE policy for any client role: audit rows are
-- written only by the SECURITY DEFINER function below.

-- ---------------------------------------------------------------------
-- Generic entry point used by trigger functions on sensitive tables.
-- Never exposed to authenticated/anon directly.
-- ---------------------------------------------------------------------
create or replace function public.write_audit_log(
  _action      text,
  _entity_type text,
  _entity_id   uuid,
  _old_data    jsonb,
  _new_data    jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (auth.uid(), _action, _entity_type, _entity_id, _old_data, _new_data);
end;
$$;

revoke all on function public.write_audit_log(text, text, uuid, jsonb, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Generic row-level trigger: logs INSERT/UPDATE/DELETE on whichever
-- table it is attached to. Sensitive/large columns are deliberately
-- NOT excluded here at the table level — attach only to tables where
-- old/new_data is safe to retain (administrative + operational tables,
-- not raw patient-authored free text like assessments.symptom_summary).
-- ---------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity_id uuid;
begin
  v_entity_id := case
    when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id')::uuid
    else (to_jsonb(new) ->> 'id')::uuid
  end;

  perform public.write_audit_log(
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

-- Attach to the administrative / operational tables where a change
-- history has clear compliance value (§27, §38 tables list). Deliberately
-- excluded: assessments (free-text health data), notifications
-- (already immutable + own history), audit_logs itself.
drop trigger if exists facilities_audit on public.facilities;
create trigger facilities_audit
  after insert or update or delete on public.facilities
  for each row execute function public.audit_row_change();

drop trigger if exists facility_staff_audit on public.facility_staff;
create trigger facility_staff_audit
  after insert or update or delete on public.facility_staff
  for each row execute function public.audit_row_change();

drop trigger if exists user_roles_audit on public.user_roles;
create trigger user_roles_audit
  after insert or update or delete on public.user_roles
  for each row execute function public.audit_row_change();

drop trigger if exists departments_audit on public.departments;
create trigger departments_audit
  after insert or update or delete on public.departments
  for each row execute function public.audit_row_change();

drop trigger if exists facility_services_audit on public.facility_services;
create trigger facility_services_audit
  after insert or update or delete on public.facility_services
  for each row execute function public.audit_row_change();

drop trigger if exists diagnostic_services_audit on public.diagnostic_services;
create trigger diagnostic_services_audit
  after insert or update or delete on public.diagnostic_services
  for each row execute function public.audit_row_change();

drop trigger if exists doctors_audit on public.doctors;
create trigger doctors_audit
  after insert or update or delete on public.doctors
  for each row execute function public.audit_row_change();

drop trigger if exists medicine_inventory_audit on public.medicine_inventory;
create trigger medicine_inventory_audit
  after insert or update or delete on public.medicine_inventory
  for each row execute function public.audit_row_change();

drop trigger if exists referrals_audit on public.referrals;
create trigger referrals_audit
  after insert or update or delete on public.referrals
  for each row execute function public.audit_row_change();

drop trigger if exists visits_audit on public.visits;
create trigger visits_audit
  after insert or update or delete on public.visits
  for each row execute function public.audit_row_change();
