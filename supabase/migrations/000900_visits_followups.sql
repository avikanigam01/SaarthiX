-- =====================================================================
-- SaarthiX — Phase 2 | Migration 009
-- visits (§22), followups (§23)
-- Both advance public.patient_journeys via public.advance_journey_stage().
-- =====================================================================

-- ---------------------------------------------------------------------
-- visits
-- ---------------------------------------------------------------------
create table if not exists public.visits (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.profiles(id) on delete cascade,
  facility_id    uuid not null references public.facilities(id) on delete restrict,
  referral_id    uuid references public.referrals(id) on delete set null,
  department_id  uuid references public.departments(id) on delete set null,
  visit_date     timestamptz not null default now(),
  status         public.visit_status not null default 'scheduled',
  created_by     uuid references public.profiles(id) on delete set null,
  completed_by   uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.visits is
  'A recorded/tracked hospital visit (§18 patient journey). status transitions are lightly guarded — see public.guard_visit_transition().';

create index if not exists visits_patient_id_idx   on public.visits (patient_id);
create index if not exists visits_facility_id_idx  on public.visits (facility_id);
create index if not exists visits_visit_date_idx   on public.visits (visit_date);
create index if not exists visits_referral_id_idx  on public.visits (referral_id);

drop trigger if exists visits_set_updated_at on public.visits;
create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

-- department_id, if set, must belong to facility_id.
create or replace function public.check_visit_department_facility()
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
  if v_dept_facility is distinct from new.facility_id then
    raise exception 'Department does not belong to the visit''s facility.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists visits_check_department_facility on public.visits;
create trigger visits_check_department_facility
  before insert or update on public.visits
  for each row execute function public.check_visit_department_facility();

-- status: scheduled -> in_progress -> completed, or -> cancelled from
-- scheduled/in_progress. completed_by/completed_at style tracking is
-- via completed_by column, stamped on transition to completed.
create or replace function public.guard_visit_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if new.status <> 'scheduled' then
      raise exception 'A new visit must start as scheduled.' using errcode = '55000';
    end if;
    new.created_by := coalesce(v_actor, new.created_by);
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  if not (public.is_facility_staff(old.facility_id) or public.is_platform_admin()) then
    raise exception 'Only facility staff or an admin can change a visit''s status.'
      using errcode = '42501';
  end if;

  if old.status = 'scheduled' and new.status in ('in_progress', 'cancelled') then
    -- allowed
  elsif old.status = 'in_progress' and new.status in ('completed', 'cancelled') then
    if new.status = 'completed' then
      new.completed_by := v_actor;
    end if;
  elsif old.status = 'scheduled' and new.status = 'completed' then
    new.completed_by := v_actor;
  else
    raise exception 'Invalid visit status transition: % -> %.', old.status, new.status
      using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists visits_guard_transition on public.visits;
create trigger visits_guard_transition
  before insert or update on public.visits
  for each row execute function public.guard_visit_transition();

-- Advance the patient's journey when a visit is created or completed.
create or replace function public.handle_visit_journey_advance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_journey_id uuid;
begin
  select id into v_journey_id
  from public.patient_journeys
  where patient_id = new.patient_id and status = 'active'
  order by created_at desc
  limit 1;

  if v_journey_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform public.advance_journey_stage(v_journey_id, 'visit');
  end if;

  return new;
end;
$$;

drop trigger if exists visits_advance_journey on public.visits;
create trigger visits_advance_journey
  after insert on public.visits
  for each row execute function public.handle_visit_journey_advance();

alter table public.visits enable row level security;
alter table public.visits force row level security;

drop policy if exists visits_select_patient on public.visits;
create policy visits_select_patient
  on public.visits for select
  to authenticated
  using (patient_id = auth.uid());

drop policy if exists visits_select_staff_admin on public.visits;
create policy visits_select_staff_admin
  on public.visits for select
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin());

drop policy if exists visits_insert_staff_admin on public.visits;
create policy visits_insert_staff_admin
  on public.visits for insert
  to authenticated
  with check (public.is_facility_staff(facility_id) or public.is_platform_admin());

drop policy if exists visits_update_staff_admin on public.visits;
create policy visits_update_staff_admin
  on public.visits for update
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin())
  with check (public.is_facility_staff(facility_id) or public.is_platform_admin());

-- No DELETE policy, no patient INSERT/UPDATE: a patient never records
-- their own visit — only authorized facility staff can (§18, §33).

-- ---------------------------------------------------------------------
-- followups (§23)
-- ---------------------------------------------------------------------
create table if not exists public.followups (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  visit_id        uuid references public.visits(id) on delete set null,
  referral_id     uuid references public.referrals(id) on delete set null,
  scheduled_date  timestamptz not null,
  followup_type   text,
  instructions    text,
  status          public.followup_status not null default 'scheduled',
  completed_at    timestamptz,
  completed_by    uuid references public.profiles(id) on delete set null,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists followups_patient_id_idx      on public.followups (patient_id);
create index if not exists followups_scheduled_date_idx  on public.followups (scheduled_date);
create index if not exists followups_status_idx          on public.followups (status);

drop trigger if exists followups_set_updated_at on public.followups;
create trigger followups_set_updated_at
  before update on public.followups
  for each row execute function public.set_updated_at();

-- Which facility "owns" a followup, via its visit (if any). A followup
-- with no visit is coordinator/admin-managed only.
create or replace function public.facility_of_visit(_visit_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select facility_id from public.visits where id = _visit_id;
$$;

-- status: scheduled -> completed | missed | rescheduled | cancelled.
-- 'rescheduled' loops back to 'scheduled' once a new scheduled_date is set.
create or replace function public.guard_followup_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor          uuid := auth.uid();
  v_owning_facility uuid;
  v_is_owner_staff boolean;
begin
  v_owning_facility := public.facility_of_visit(coalesce(new.visit_id, old.visit_id));
  v_is_owner_staff := v_actor is not null and v_owning_facility is not null
    and public.is_facility_staff(v_owning_facility, v_actor);

  if tg_op = 'INSERT' then
    if new.status <> 'scheduled' then
      raise exception 'A new follow-up must start as scheduled.' using errcode = '55000';
    end if;
    new.created_by := coalesce(v_actor, new.created_by);
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  if not (v_is_owner_staff or public.is_platform_admin(v_actor) or old.patient_id = v_actor) then
    raise exception 'You are not authorized to update this follow-up''s status.'
      using errcode = '42501';
  end if;

  -- A patient may only mark their own follow-up completed (§19 "Mark as
  -- completed only where backend permission allows it"); every other
  -- transition requires the owning facility's staff or an admin.
  if old.patient_id = v_actor and not v_is_owner_staff and not public.is_platform_admin(v_actor) then
    if new.status <> 'completed' then
      raise exception 'Patients may only mark a follow-up as completed.' using errcode = '42501';
    end if;
  end if;

  if old.status = 'scheduled' and new.status in ('completed', 'missed', 'rescheduled', 'cancelled') then
    if new.status = 'completed' then
      new.completed_at := now();
      new.completed_by := v_actor;
    end if;
  elsif old.status = 'rescheduled' and new.status = 'scheduled' then
    -- allowed: rescheduled follow-up gets a fresh scheduled_date
  else
    raise exception 'Invalid follow-up status transition: % -> %.', old.status, new.status
      using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists followups_guard_transition on public.followups;
create trigger followups_guard_transition
  before insert or update on public.followups
  for each row execute function public.guard_followup_transition();

create or replace function public.handle_followup_journey_advance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_journey_id uuid;
begin
  select id into v_journey_id
  from public.patient_journeys
  where patient_id = new.patient_id and status = 'active'
  order by created_at desc
  limit 1;

  if v_journey_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform public.advance_journey_stage(v_journey_id, 'followup');
  elsif new.status = 'completed' and old.status <> 'completed' then
    perform public.advance_journey_stage(v_journey_id, 'completed');
  end if;

  return new;
end;
$$;

drop trigger if exists followups_advance_journey on public.followups;
create trigger followups_advance_journey
  after insert or update on public.followups
  for each row execute function public.handle_followup_journey_advance();

alter table public.followups enable row level security;
alter table public.followups force row level security;

drop policy if exists followups_select_patient on public.followups;
create policy followups_select_patient
  on public.followups for select
  to authenticated
  using (patient_id = auth.uid());

drop policy if exists followups_select_staff_admin on public.followups;
create policy followups_select_staff_admin
  on public.followups for select
  to authenticated
  using (
    (visit_id is not null and public.is_facility_staff(public.facility_of_visit(visit_id)))
    or public.is_platform_admin()
  );

drop policy if exists followups_insert_staff_admin on public.followups;
create policy followups_insert_staff_admin
  on public.followups for insert
  to authenticated
  with check (
    (visit_id is not null and public.is_facility_staff(public.facility_of_visit(visit_id)))
    or public.is_platform_admin()
  );

drop policy if exists followups_update_involved on public.followups;
create policy followups_update_involved
  on public.followups for update
  to authenticated
  using (
    patient_id = auth.uid()
    or (visit_id is not null and public.is_facility_staff(public.facility_of_visit(visit_id)))
    or public.is_platform_admin()
  )
  with check (
    patient_id = auth.uid()
    or (visit_id is not null and public.is_facility_staff(public.facility_of_visit(visit_id)))
    or public.is_platform_admin()
  );

-- No DELETE policy: a follow-up is cancelled, never deleted.
