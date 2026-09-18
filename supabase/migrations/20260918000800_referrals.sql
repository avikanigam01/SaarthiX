-- =====================================================================
-- SaarthiX — Phase 2 | Migration 008
-- referrals (§20), referral_status_history (§21)
-- Enforced state machine (§36) + journey stage integration (§26)
-- =====================================================================

create table if not exists public.referrals (
  id                        uuid primary key default gen_random_uuid(),
  patient_id                uuid not null references public.profiles(id) on delete cascade,
  source_facility_id        uuid references public.facilities(id) on delete set null,
  destination_facility_id   uuid not null references public.facilities(id) on delete restrict,
  department_id             uuid references public.departments(id) on delete set null,
  assessment_id             uuid references public.assessments(id) on delete set null,
  reason                    text not null,
  status                    public.referral_status not null default 'pending',
  created_by                uuid references public.profiles(id) on delete set null,
  accepted_by               uuid references public.profiles(id) on delete set null,
  scheduled_at              timestamptz,
  completed_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint referrals_reason_not_blank check (length(btrim(reason)) > 0),
  constraint referrals_source_ne_destination
    check (source_facility_id is null or source_facility_id <> destination_facility_id),
  constraint referrals_department_facility_match
    check (true) -- enforced by trigger below (needs a subquery, not expressible as a CHECK)
);

comment on table public.referrals is
  'status transitions are enforced by public.guard_referral_transition() per the state machine in spec §36. Never update status directly without going through an authorized action.';

create index if not exists referrals_patient_id_idx      on public.referrals (patient_id);
create index if not exists referrals_source_facility_idx on public.referrals (source_facility_id);
create index if not exists referrals_dest_facility_idx   on public.referrals (destination_facility_id);
create index if not exists referrals_status_idx          on public.referrals (status);

drop trigger if exists referrals_set_updated_at on public.referrals;
create trigger referrals_set_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

-- department_id, if set, must belong to destination_facility_id.
create or replace function public.check_referral_department_facility()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_dept_facility uuid;
begin
  if new.department_id is null then
    return new;
  end if;
  select facility_id into v_dept_facility from public.departments where id = new.department_id;
  if v_dept_facility is distinct from new.destination_facility_id then
    raise exception 'Department does not belong to the destination facility.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists referrals_check_department_facility on public.referrals;
create trigger referrals_check_department_facility
  before insert or update on public.referrals
  for each row execute function public.check_referral_department_facility();

-- ---------------------------------------------------------------------
-- referral_status_history (§21 — append-only audit trail)
-- ---------------------------------------------------------------------
create table if not exists public.referral_status_history (
  id           uuid primary key default gen_random_uuid(),
  referral_id  uuid not null references public.referrals(id) on delete cascade,
  old_status   text,
  new_status   text not null,
  changed_by   uuid references public.profiles(id) on delete set null,
  reason       text,
  created_at   timestamptz not null default now()
);

create index if not exists referral_status_history_referral_id_idx
  on public.referral_status_history (referral_id);

-- ---------------------------------------------------------------------
-- State machine (§36)
--   pending    -> accepted | rejected | cancelled
--   accepted   -> scheduled | cancelled
--   scheduled  -> completed | cancelled
--   rejected, completed, cancelled are terminal.
-- Only a destination-facility staff member (or platform admin) may
-- accept/reject/schedule/complete. Only the referring patient, the
-- source facility's staff, or an admin may cancel while still pending.
-- ---------------------------------------------------------------------
create or replace function public.guard_referral_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor         uuid := auth.uid();
  v_is_dest_staff boolean;
  v_is_src_staff  boolean;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'A new referral must start as pending.' using errcode = '55000';
    end if;
    new.created_by := coalesce(v_actor, new.created_by);
    return new;
  end if;

  -- UPDATE path: only status-machine changes are governed here; other
  -- column edits (e.g. reason) are left to RLS.
  if new.status = old.status then
    return new;
  end if;

  v_is_dest_staff := v_actor is not null and public.is_facility_staff(old.destination_facility_id, v_actor);
  v_is_src_staff  := v_actor is not null and old.source_facility_id is not null
                      and public.is_facility_staff(old.source_facility_id, v_actor);

  if old.status = 'pending' and new.status = 'accepted' then
    if not (v_is_dest_staff or public.is_platform_admin(v_actor) or public.is_referral_coordinator(v_actor)) then
      raise exception 'Only destination facility staff, a coordinator, or an admin can accept a referral.'
        using errcode = '42501';
    end if;
    new.accepted_by := v_actor;

  elsif old.status = 'pending' and new.status = 'rejected' then
    if not (v_is_dest_staff or public.is_platform_admin(v_actor) or public.is_referral_coordinator(v_actor)) then
      raise exception 'Only destination facility staff, a coordinator, or an admin can reject a referral.'
        using errcode = '42501';
    end if;

  elsif old.status = 'pending' and new.status = 'cancelled' then
    if not (old.patient_id = v_actor or v_is_src_staff or v_is_dest_staff
            or public.is_platform_admin(v_actor) or public.is_referral_coordinator(v_actor)) then
      raise exception 'You are not authorized to cancel this referral.' using errcode = '42501';
    end if;

  elsif old.status = 'accepted' and new.status = 'scheduled' then
    if not (v_is_dest_staff or public.is_platform_admin(v_actor) or public.is_referral_coordinator(v_actor)) then
      raise exception 'Only destination facility staff, a coordinator, or an admin can schedule a referral.'
        using errcode = '42501';
    end if;
    if new.scheduled_at is null then
      raise exception 'scheduled_at is required to move a referral to scheduled.' using errcode = '22004';
    end if;

  elsif old.status = 'accepted' and new.status = 'cancelled' then
    if not (v_is_dest_staff or public.is_platform_admin(v_actor) or public.is_referral_coordinator(v_actor)) then
      raise exception 'You are not authorized to cancel this referral.' using errcode = '42501';
    end if;

  elsif old.status = 'scheduled' and new.status = 'completed' then
    if not (v_is_dest_staff or public.is_platform_admin(v_actor)) then
      raise exception 'Only destination facility staff or an admin can complete a referral.'
        using errcode = '42501';
    end if;
    new.completed_at := now();

  elsif old.status = 'scheduled' and new.status = 'cancelled' then
    if not (v_is_dest_staff or public.is_platform_admin(v_actor) or public.is_referral_coordinator(v_actor)) then
      raise exception 'You are not authorized to cancel this referral.' using errcode = '42501';
    end if;

  else
    raise exception 'Invalid referral status transition: % -> %.', old.status, new.status
      using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists referrals_guard_transition on public.referrals;
create trigger referrals_guard_transition
  before insert or update on public.referrals
  for each row execute function public.guard_referral_transition();

-- Record every status change and advance the patient's journey stage.
create or replace function public.handle_referral_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_journey_id uuid;
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;

  insert into public.referral_status_history (referral_id, old_status, new_status, changed_by, reason)
  values (
    new.id,
    case when tg_op = 'INSERT' then null else old.status::text end,
    new.status::text,
    auth.uid(),
    null
  );

  select id into v_journey_id
  from public.patient_journeys
  where patient_id = new.patient_id and status = 'active'
  order by created_at desc
  limit 1;

  if v_journey_id is not null and new.status in ('accepted', 'scheduled') then
    perform public.advance_journey_stage(v_journey_id, 'referral');
  end if;

  return new;
end;
$$;

drop trigger if exists referrals_handle_status_change on public.referrals;
create trigger referrals_handle_status_change
  after insert or update on public.referrals
  for each row execute function public.handle_referral_status_change();

alter table public.referrals enable row level security;
alter table public.referrals force row level security;

drop policy if exists referrals_select_patient on public.referrals;
create policy referrals_select_patient
  on public.referrals for select
  to authenticated
  using (patient_id = auth.uid());

drop policy if exists referrals_select_facility_staff on public.referrals;
create policy referrals_select_facility_staff
  on public.referrals for select
  to authenticated
  using (
    public.is_facility_staff(destination_facility_id)
    or (source_facility_id is not null and public.is_facility_staff(source_facility_id))
  );

drop policy if exists referrals_select_coordinator_admin on public.referrals;
create policy referrals_select_coordinator_admin
  on public.referrals for select
  to authenticated
  using (public.is_referral_coordinator() or public.is_platform_admin());

-- A patient cannot self-refer to any facility; only staff/coordinator/
-- admin may create a referral (§29: "Patient must NOT ... modify
-- referral destination"). Insert requires acting on behalf of a real
-- source facility they belong to, or coordinator/admin standing.
drop policy if exists referrals_insert_staff_coordinator_admin on public.referrals;
create policy referrals_insert_staff_coordinator_admin
  on public.referrals for insert
  to authenticated
  with check (
    (source_facility_id is not null and public.is_facility_staff(source_facility_id))
    or public.is_referral_coordinator()
    or public.is_platform_admin()
  );

drop policy if exists referrals_update_involved on public.referrals;
create policy referrals_update_involved
  on public.referrals for update
  to authenticated
  using (
    patient_id = auth.uid()
    or public.is_facility_staff(destination_facility_id)
    or (source_facility_id is not null and public.is_facility_staff(source_facility_id))
    or public.is_referral_coordinator()
    or public.is_platform_admin()
  )
  with check (
    -- Column-level protection: a patient can update a row (e.g. cancel)
    -- but the transition guard trigger still governs whether the
    -- specific status change is allowed to them.
    patient_id = auth.uid()
    or public.is_facility_staff(destination_facility_id)
    or (source_facility_id is not null and public.is_facility_staff(source_facility_id))
    or public.is_referral_coordinator()
    or public.is_platform_admin()
  );

-- No DELETE policy: referrals are cancelled, never deleted.

alter table public.referral_status_history enable row level security;
alter table public.referral_status_history force row level security;

drop policy if exists referral_status_history_select on public.referral_status_history;
create policy referral_status_history_select
  on public.referral_status_history for select
  to authenticated
  using (
    exists (
      select 1 from public.referrals r
      where r.id = referral_status_history.referral_id
        and (
          r.patient_id = auth.uid()
          or public.is_facility_staff(r.destination_facility_id)
          or (r.source_facility_id is not null and public.is_facility_staff(r.source_facility_id))
          or public.is_referral_coordinator()
          or public.is_platform_admin()
        )
    )
  );

-- No INSERT/UPDATE/DELETE policy: written only by the trigger above.

-- ---------------------------------------------------------------------
-- Scoped assessment visibility for coordinators/destination staff:
-- only the single assessment tied to a referral they are handling,
-- never the patient's full history (§17, §31).
-- ---------------------------------------------------------------------
drop policy if exists assessments_select_via_referral on public.assessments;
create policy assessments_select_via_referral
  on public.assessments for select
  to authenticated
  using (
    exists (
      select 1 from public.referrals r
      where r.assessment_id = assessments.id
        and (
          public.is_facility_staff(r.destination_facility_id)
          or (r.source_facility_id is not null and public.is_facility_staff(r.source_facility_id))
          or public.is_referral_coordinator()
        )
    )
  );
