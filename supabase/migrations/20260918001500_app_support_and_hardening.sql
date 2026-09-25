-- =====================================================================
-- SaarthiX — Application support + hardening (Phase 2, part B)
--
-- Run AFTER 20260918001400_realtime_and_forecast.sql.
-- Everything here is additive / idempotent (create or replace, if not exists).
--
-- Contents
--   1. Deactivated accounts lose every role-based permission
--   2. FIX: adjust_inventory_stock() was blocked by its own guard trigger
--   3. Medicine master data hardening + facility-level inventory archive
--   4. Referral hardening (column guard, status_note, create_referral RPC)
--   5. Follow-up / visit column guards
--   6. Journey facility selection, availability confirmation, visit request
--   7. Minimum-necessary patient + staff-name lookups
--   8. Facility discovery (per-facility summary, medicine availability)
--   9. updated_by / created_by stamping
--  10. Extra notification events + follow-up reminders
--  11. Extra realtime tables
--  12. Admin safety guards (no self-deactivation, last super admin)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Deactivated accounts lose role-based permissions
-- ---------------------------------------------------------------------
create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.is_active
    where ur.user_id = _user_id
      and ur.role    = _role
  );
$$;

create or replace function public.has_any_role(_user_id uuid, _roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.is_active
    where ur.user_id = _user_id
      and ur.role    = any(_roles)
  );
$$;

create or replace function public.current_user_roles()
returns public.user_role[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(ur.role order by ur.role), '{}'::public.user_role[])
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id and p.is_active
  where ur.user_id = auth.uid();
$$;

create or replace function public.is_facility_staff(_facility_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.facility_staff fs
    join public.profiles p on p.id = fs.user_id and p.is_active
    where fs.facility_id = _facility_id
      and fs.user_id = _user_id
      and fs.is_active
  );
$$;

-- ---------------------------------------------------------------------
-- 3 (schema part first). Facility-level inventory archive flag
-- ---------------------------------------------------------------------
alter table public.medicine_inventory
  add column if not exists is_active boolean not null default true;

-- The status view was created with "mi.*" before is_active existed, so it has to be rebuilt.
drop view if exists public.medicine_inventory_with_status;
create view public.medicine_inventory_with_status
  with (security_invoker = true) as
select
  mi.*,
  public.inventory_stock_status(mi.current_stock, mi.minimum_stock) as stock_status
from public.medicine_inventory mi;
grant select on public.medicine_inventory_with_status to authenticated;

-- ---------------------------------------------------------------------
-- 2. FIX: inventory guard trigger blocked adjust_inventory_stock() itself.
--    The function now sets a transaction-local flag that the guard honours.
--    Direct client writes to current_stock are still rejected.
-- ---------------------------------------------------------------------
create or replace function public.block_direct_inventory_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(current_setting('saarthix.allow_stock_write', true), '') = 'on' then
    return new;
  end if;
  raise exception 'Inventory stock must be changed through public.adjust_inventory_stock(), not by direct write.'
    using errcode = '42501';
end;
$$;

create or replace function public.adjust_inventory_stock(
  _inventory_id     uuid,
  _transaction_type public.inventory_transaction_type,
  _quantity         numeric,
  _reason           text default null,
  _reference_id     uuid default null,
  _increase         boolean default true
)
returns public.inventory_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inventory   public.medicine_inventory;
  v_delta       numeric;
  v_new_stock   numeric;
  v_txn         public.inventory_transactions;
begin
  if auth.uid() is null then
    raise exception 'You are not authorized to update inventory.' using errcode = '42501';
  end if;

  if _quantity is null or _quantity <= 0 then
    raise exception 'Quantity must be greater than zero.' using errcode = '22003';
  end if;

  select * into v_inventory
  from public.medicine_inventory
  where id = _inventory_id
  for update;

  if v_inventory.id is null then
    raise exception 'Inventory record not found.' using errcode = 'P0002';
  end if;

  if not (public.is_facility_staff(v_inventory.facility_id) or public.is_platform_admin()) then
    raise exception 'You are not authorized to update this facility''s inventory.'
      using errcode = '42501';
  end if;

  v_delta := case
    when _transaction_type in ('stock_in', 'return') then _quantity
    when _transaction_type in ('stock_out', 'expiry') then -_quantity
    when _transaction_type = 'adjustment' then
      case when _increase then _quantity else -_quantity end
    else null
  end;

  if _transaction_type = 'adjustment' and (_reason is null or btrim(_reason) = '') then
    raise exception 'A reason is required for stock adjustments.' using errcode = '22004';
  end if;

  v_new_stock := v_inventory.current_stock + v_delta;

  if v_new_stock < 0 then
    raise exception 'Stock cannot go negative (current: %, requested change: %).',
      v_inventory.current_stock, v_delta
      using errcode = '23514';
  end if;

  if v_inventory.maximum_stock is not null and v_new_stock > v_inventory.maximum_stock then
    raise exception 'Stock would exceed the configured maximum (%).', v_inventory.maximum_stock
      using errcode = '23514';
  end if;

  -- transaction-local flag: lets ONLY this function pass the guard trigger
  perform set_config('saarthix.allow_stock_write', 'on', true);

  update public.medicine_inventory
  set current_stock = v_new_stock,
      last_updated_by = auth.uid()
  where id = _inventory_id;

  perform set_config('saarthix.allow_stock_write', 'off', true);

  insert into public.inventory_transactions (
    facility_id, medicine_id, inventory_id, transaction_type,
    quantity, previous_stock, new_stock, reason, reference_id, created_by
  ) values (
    v_inventory.facility_id, v_inventory.medicine_id, v_inventory.id, _transaction_type,
    _quantity, v_inventory.current_stock, v_new_stock, _reason, _reference_id, auth.uid()
  )
  returning * into v_txn;

  return v_txn;
end;
$$;

revoke all on function public.adjust_inventory_stock(
  uuid, public.inventory_transaction_type, numeric, text, uuid, boolean
) from public, anon;
grant execute on function public.adjust_inventory_stock(
  uuid, public.inventory_transaction_type, numeric, text, uuid, boolean
) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Medicine master data: facility staff may ADD, only admins may
--    modify/delete (a change to master data would affect every facility).
-- ---------------------------------------------------------------------
drop policy if exists medicines_write_staff_admin on public.medicines;
drop policy if exists medicines_insert_staff_admin on public.medicines;
drop policy if exists medicines_update_admin on public.medicines;
drop policy if exists medicines_delete_admin on public.medicines;

create policy medicines_insert_staff_admin
  on public.medicines for insert
  to authenticated
  with check (
    public.is_platform_admin()
    or exists (select 1 from public.facility_staff fs where fs.user_id = auth.uid() and fs.is_active)
  );

create policy medicines_update_admin
  on public.medicines for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy medicines_delete_admin
  on public.medicines for delete
  to authenticated
  using (public.is_platform_admin());

create or replace function public.stamp_created_by()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;

drop trigger if exists medicines_stamp_created_by on public.medicines;
create trigger medicines_stamp_created_by
  before insert on public.medicines
  for each row execute function public.stamp_created_by();

-- ---------------------------------------------------------------------
-- 4. Referrals
-- ---------------------------------------------------------------------
alter table public.referrals
  add column if not exists status_note text;

alter table public.referrals
  drop constraint if exists referrals_status_note_len;
alter table public.referrals
  add constraint referrals_status_note_len
  check (status_note is null or length(status_note) <= 500);

-- history now records the destination's note ("destination response")
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
    case
      when tg_op = 'INSERT' then null
      when new.status_note is distinct from old.status_note then nullif(btrim(coalesce(new.status_note, '')), '')
      else null
    end
  );

  select id into v_journey_id
  from public.patient_journeys
  where patient_id = new.patient_id and status = 'active'
  order by created_at desc
  limit 1;

  if v_journey_id is not null and new.status in ('accepted', 'scheduled') then
    begin
      perform public.advance_journey_stage(v_journey_id, 'referral');
    exception when others then
      null; -- a journey that is already past this stage must not block a referral update
    end;
  end if;

  return new;
end;
$$;

-- Column guard: patients may only cancel; nobody may re-assign the patient;
-- routing fields are frozen once a referral leaves 'pending'.
create or replace function public.guard_referral_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_privileged boolean;
begin
  if v_actor is null then
    return new;
  end if;

  new.patient_id := old.patient_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;

  v_privileged :=
    public.is_facility_staff(old.destination_facility_id, v_actor)
    or (old.source_facility_id is not null and public.is_facility_staff(old.source_facility_id, v_actor))
    or public.is_referral_coordinator(v_actor)
    or public.is_platform_admin(v_actor);

  if not v_privileged then
    new.source_facility_id      := old.source_facility_id;
    new.destination_facility_id := old.destination_facility_id;
    new.department_id           := old.department_id;
    new.assessment_id           := old.assessment_id;
    new.reason                  := old.reason;
    new.scheduled_at            := old.scheduled_at;
    new.completed_at            := old.completed_at;
    new.accepted_by             := old.accepted_by;
    new.status_note             := old.status_note;
    return new;
  end if;

  if old.status <> 'pending' and (
       new.destination_facility_id is distinct from old.destination_facility_id
    or new.source_facility_id      is distinct from old.source_facility_id
    or new.department_id           is distinct from old.department_id
    or new.reason                  is distinct from old.reason
  ) then
    raise exception 'This referral can no longer be re-routed or edited.' using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists referrals_protect_columns on public.referrals;
create trigger referrals_protect_columns
  before update on public.referrals
  for each row execute function public.guard_referral_columns();

-- Direct inserts are replaced by create_referral() which verifies the
-- caller really has a care relationship with the patient.
drop policy if exists referrals_insert_staff_coordinator_admin on public.referrals;

create or replace function public.create_referral(
  _patient_id               uuid,
  _destination_facility_id  uuid,
  _reason                   text,
  _source_facility_id       uuid default null,
  _department_id            uuid default null
)
returns public.referrals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_allowed boolean := false;
  v_row public.referrals;
begin
  if v_actor is null then
    raise exception 'You are not authorized to create referrals.' using errcode = '42501';
  end if;

  if _reason is null or btrim(_reason) = '' or length(_reason) > 1000 then
    raise exception 'A referral reason (up to 1000 characters) is required.' using errcode = '22004';
  end if;

  if not exists (
    select 1 from public.facilities f
    where f.id = _destination_facility_id and f.is_verified and f.is_active
  ) then
    raise exception 'The destination facility is not available for referrals.' using errcode = '23514';
  end if;

  if _source_facility_id is not null then
    -- facility staff: patient must have a visit at the source facility
    v_allowed := public.is_facility_staff(_source_facility_id, v_actor)
      and exists (
        select 1 from public.visits v
        where v.patient_id = _patient_id and v.facility_id = _source_facility_id
      );
  end if;

  if not v_allowed then
    -- coordinators / admins: patient must already be part of a referral or visit workflow (admins: any)
    v_allowed := public.is_platform_admin(v_actor)
      or (
        public.is_referral_coordinator(v_actor)
        and exists (select 1 from public.referrals r where r.patient_id = _patient_id)
      );
  end if;

  if not v_allowed then
    raise exception 'You are not authorized to refer this patient.' using errcode = '42501';
  end if;

  insert into public.referrals (
    patient_id, source_facility_id, destination_facility_id, department_id, reason, status
  ) values (
    _patient_id, _source_facility_id, _destination_facility_id, _department_id, btrim(_reason), 'pending'
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_referral(uuid, uuid, text, uuid, uuid) from public, anon;
grant execute on function public.create_referral(uuid, uuid, text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Follow-up and visit column guards
-- ---------------------------------------------------------------------
create or replace function public.guard_followup_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_privileged boolean;
begin
  if v_actor is null then
    return new;
  end if;

  new.patient_id := old.patient_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.visit_id   := old.visit_id;

  v_privileged :=
    (old.visit_id is not null and public.is_facility_staff(public.facility_of_visit(old.visit_id), v_actor))
    or public.is_platform_admin(v_actor);

  if not v_privileged then
    new.scheduled_date := old.scheduled_date;
    new.followup_type  := old.followup_type;
    new.instructions   := old.instructions;
    new.referral_id    := old.referral_id;
  end if;

  return new;
end;
$$;

drop trigger if exists followups_protect_columns on public.followups;
create trigger followups_protect_columns
  before update on public.followups
  for each row execute function public.guard_followup_columns();

create or replace function public.guard_visit_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.patient_id := old.patient_id;
  new.facility_id := old.facility_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists visits_protect_columns on public.visits;
create trigger visits_protect_columns
  before update on public.visits
  for each row execute function public.guard_visit_columns();

-- ---------------------------------------------------------------------
-- 6. Journey: facility selection, availability confirmation, visit request
-- ---------------------------------------------------------------------
alter table public.patient_journeys
  add column if not exists selected_facility_id   uuid references public.facilities(id) on delete set null,
  add column if not exists selected_department_id uuid references public.departments(id) on delete set null,
  add column if not exists availability_confirmed_at timestamptz;

create index if not exists patient_journeys_patient_id_idx on public.patient_journeys (patient_id, status);

create or replace function public.select_journey_facility(
  _journey_id     uuid,
  _facility_id    uuid,
  _department_id  uuid default null
)
returns public.patient_journeys
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_journey public.patient_journeys;
begin
  select * into v_journey from public.patient_journeys where id = _journey_id for update;

  if v_journey.id is null or v_journey.patient_id is distinct from auth.uid() then
    raise exception 'Journey not found.' using errcode = 'P0002';
  end if;
  if v_journey.status <> 'active' then
    raise exception 'This journey is no longer active.' using errcode = '55000';
  end if;
  if v_journey.current_stage not in ('need_submitted', 'assessment_completed', 'facility_identified') then
    raise exception 'The facility can no longer be changed for this journey.' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.facilities f where f.id = _facility_id and f.is_verified and f.is_active
  ) then
    raise exception 'This facility is not available.' using errcode = '23514';
  end if;
  if _department_id is not null and not exists (
    select 1 from public.departments d
    where d.id = _department_id and d.facility_id = _facility_id and d.is_active
  ) then
    raise exception 'This department is not available at the selected facility.' using errcode = '23514';
  end if;

  update public.patient_journeys
  set selected_facility_id = _facility_id,
      selected_department_id = _department_id,
      availability_confirmed_at = null
  where id = _journey_id
  returning * into v_journey;

  if v_journey.current_stage in ('need_submitted', 'assessment_completed') then
    v_journey := public.advance_journey_stage(_journey_id, 'facility_identified');
  end if;

  return v_journey;
end;
$$;

create or replace function public.confirm_journey_availability(_journey_id uuid)
returns public.patient_journeys
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_journey public.patient_journeys;
  v_ok boolean;
begin
  select * into v_journey from public.patient_journeys where id = _journey_id for update;

  if v_journey.id is null or v_journey.patient_id is distinct from auth.uid() then
    raise exception 'Journey not found.' using errcode = 'P0002';
  end if;
  if v_journey.status <> 'active' then
    raise exception 'This journey is no longer active.' using errcode = '55000';
  end if;
  if v_journey.selected_facility_id is null then
    raise exception 'Select a facility first.' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.facilities f
    where f.id = v_journey.selected_facility_id and f.is_verified and f.is_active
  ) then
    raise exception 'The selected facility is no longer available.' using errcode = '23514';
  end if;

  if v_journey.selected_department_id is not null then
    select exists (
      select 1 from public.departments d
      where d.id = v_journey.selected_department_id
        and d.is_active and d.status <> 'unavailable'
    ) into v_ok;
  else
    select (
      exists (select 1 from public.departments d where d.facility_id = v_journey.selected_facility_id and d.is_active and d.status <> 'unavailable')
      or exists (select 1 from public.facility_services s where s.facility_id = v_journey.selected_facility_id and s.is_active and s.status <> 'unavailable')
      or exists (select 1 from public.diagnostic_services s where s.facility_id = v_journey.selected_facility_id and s.is_active and s.status <> 'unavailable')
    ) into v_ok;
  end if;

  if not coalesce(v_ok, false) then
    raise exception 'The selected facility currently reports no available service for this need.' using errcode = '23514';
  end if;

  update public.patient_journeys
  set availability_confirmed_at = now()
  where id = _journey_id
  returning * into v_journey;

  if v_journey.current_stage in ('need_submitted', 'assessment_completed', 'facility_identified') then
    v_journey := public.advance_journey_stage(_journey_id, 'availability_confirmed');
  end if;

  return v_journey;
end;
$$;

create or replace function public.request_visit(_journey_id uuid, _preferred_at timestamptz)
returns public.visits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_journey public.patient_journeys;
  v_visit public.visits;
  v_staff record;
  v_facility_name text;
begin
  select * into v_journey from public.patient_journeys where id = _journey_id;

  if v_journey.id is null or v_journey.patient_id is distinct from auth.uid() then
    raise exception 'Journey not found.' using errcode = 'P0002';
  end if;
  if v_journey.status <> 'active' then
    raise exception 'This journey is no longer active.' using errcode = '55000';
  end if;
  if v_journey.selected_facility_id is null or v_journey.availability_confirmed_at is null then
    raise exception 'Confirm availability before requesting a visit.' using errcode = '55000';
  end if;
  if _preferred_at is null or _preferred_at < now() - interval '1 hour' or _preferred_at > now() + interval '90 days' then
    raise exception 'Choose a visit date within the next 90 days.' using errcode = '22007';
  end if;
  if exists (
    select 1 from public.visits v
    where v.patient_id = v_journey.patient_id
      and v.facility_id = v_journey.selected_facility_id
      and v.status in ('scheduled', 'in_progress')
  ) then
    raise exception 'You already have an open visit at this facility.' using errcode = '23505';
  end if;

  insert into public.visits (patient_id, facility_id, department_id, visit_date, status)
  values (v_journey.patient_id, v_journey.selected_facility_id, v_journey.selected_department_id, _preferred_at, 'scheduled')
  returning * into v_visit;

  select name into v_facility_name from public.facilities where id = v_visit.facility_id;

  for v_staff in
    select fs.user_id from public.facility_staff fs
    where fs.facility_id = v_visit.facility_id and fs.is_active
  loop
    perform public.create_notification(
      v_staff.user_id, 'visit_requested', 'New visit request',
      concat('A patient has requested a visit on ', to_char(_preferred_at, 'DD Mon YYYY, HH24:MI'), '.'),
      'visit', v_visit.id
    );
  end loop;

  return v_visit;
end;
$$;

create or replace function public.cancel_journey(_journey_id uuid)
returns public.patient_journeys
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_journey public.patient_journeys;
begin
  update public.patient_journeys
  set status = 'cancelled'
  where id = _journey_id
    and patient_id = auth.uid()
    and status = 'active'
  returning * into v_journey;

  if v_journey.id is null then
    raise exception 'Journey not found or already closed.' using errcode = 'P0002';
  end if;
  return v_journey;
end;
$$;

revoke all on function public.select_journey_facility(uuid, uuid, uuid) from public, anon;
revoke all on function public.confirm_journey_availability(uuid) from public, anon;
revoke all on function public.request_visit(uuid, timestamptz) from public, anon;
revoke all on function public.cancel_journey(uuid) from public, anon;
grant execute on function public.select_journey_facility(uuid, uuid, uuid) to authenticated;
grant execute on function public.confirm_journey_availability(uuid) to authenticated;
grant execute on function public.request_visit(uuid, timestamptz) to authenticated;
grant execute on function public.cancel_journey(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Minimum-necessary patient + staff-name lookups
-- ---------------------------------------------------------------------
-- Facility staff: patients with a visit / referral at THEIR facilities.
-- Coordinators : patients that appear in a referral.
-- Nobody else (patients are never searchable).
create or replace function public.authorized_patients(_facility_id uuid default null)
returns table (
  id        uuid,
  full_name text,
  phone     text,
  gender    text,
  district  text,
  state     text
)
language sql
stable
security definer
set search_path = ''
as $$
  with staff_fac as (
    select fs.facility_id
    from public.facility_staff fs
    join public.profiles sp on sp.id = fs.user_id and sp.is_active
    where fs.user_id = auth.uid()
      and fs.is_active
      and (_facility_id is null or fs.facility_id = _facility_id)
  ),
  ids as (
    select v.patient_id from public.visits v
    where v.facility_id in (select facility_id from staff_fac)
    union
    select r.patient_id from public.referrals r
    where r.destination_facility_id in (select facility_id from staff_fac)
       or r.source_facility_id in (select facility_id from staff_fac)
    union
    select r.patient_id from public.referrals r
    where _facility_id is null and public.is_referral_coordinator()
  )
  select p.id, p.full_name, p.phone, p.gender, p.district, p.state
  from public.profiles p
  where p.id in (select patient_id from ids)
  order by p.full_name;
$$;

create or replace function public.get_patient_brief(_patient_id uuid)
returns table (
  id        uuid,
  full_name text,
  phone     text,
  gender    text,
  district  text,
  state     text
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.authorized_patients(null) ap where ap.id = _patient_id;
$$;

-- Names of colleagues (same facility) — used for "updated by" labels.
create or replace function public.get_user_display_names(_ids uuid[])
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name
  from public.profiles p
  where p.id = any(_ids)
    and (
      p.id = auth.uid()
      or public.is_platform_admin()
      or exists (
        select 1
        from public.facility_staff mine
        join public.facility_staff theirs on theirs.facility_id = mine.facility_id
        where mine.user_id = auth.uid() and mine.is_active
          and theirs.user_id = p.id and theirs.is_active
      )
    );
$$;

revoke all on function public.authorized_patients(uuid) from public, anon;
revoke all on function public.get_patient_brief(uuid) from public, anon;
revoke all on function public.get_user_display_names(uuid[]) from public, anon;
grant execute on function public.authorized_patients(uuid) to authenticated;
grant execute on function public.get_patient_brief(uuid) to authenticated;
grant execute on function public.get_user_display_names(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Facility discovery
-- ---------------------------------------------------------------------
create or replace function public.like_escape(_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(_value, '\', '\\'), '%', '\%'), '_', '\_');
$$;

-- Boolean-only medicine check (patients cannot read inventory quantities).
create or replace function public.facility_has_medicine(_facility_id uuid, _term text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.medicine_inventory mi
    join public.medicines m on m.id = mi.medicine_id
    join public.facilities f on f.id = mi.facility_id
    where mi.facility_id = _facility_id
      and f.is_verified and f.is_active
      and mi.is_active and m.is_active
      and mi.current_stock > 0
      and (m.name ilike '%' || public.like_escape(_term) || '%'
           or m.generic_name ilike '%' || public.like_escape(_term) || '%')
  );
$$;

create or replace function public.search_facilities_summary(
  _district       text default null,
  _state          text default null,
  _facility_type  text default null,
  _department     text default null,
  _service        text default null,
  _diagnostic     text default null,
  _medicine       text default null,
  _latitude       numeric default null,
  _longitude      numeric default null,
  _limit          int default 20,
  _offset         int default 0
)
returns table (
  facility_id            uuid,
  name                   text,
  facility_type          text,
  address                text,
  district               text,
  state                  text,
  phone                  text,
  is_verified            boolean,
  distance_km            numeric,
  departments            jsonb,
  services               jsonb,
  diagnostics            jsonb,
  available_doctor_slots bigint,
  last_updated_at        timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select
      f.*,
      case
        when _latitude is not null and _longitude is not null
             and f.latitude is not null and f.longitude is not null
        then (
          6371 * acos(
            least(1, greatest(-1,
              cos(radians(_latitude)) * cos(radians(f.latitude))
              * cos(radians(f.longitude) - radians(_longitude))
              + sin(radians(_latitude)) * sin(radians(f.latitude))
            ))
          )
        )
        else null
      end as dist
    from public.facilities f
    where f.is_verified
      and f.is_active
      and (_district is null or f.district ilike public.like_escape(_district))
      and (_state is null or f.state ilike public.like_escape(_state))
      and (_facility_type is null or f.facility_type ilike public.like_escape(_facility_type))
  )
  select
    b.id,
    b.name,
    b.facility_type,
    b.address,
    b.district,
    b.state,
    b.phone,
    b.is_verified,
    round(b.dist::numeric, 1),
    coalesce((
      select jsonb_agg(jsonb_build_object('name', d.name, 'status', d.status) order by d.name)
      from public.departments d where d.facility_id = b.id and d.is_active
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('name', s.name, 'status', s.status) order by s.name)
      from public.facility_services s where s.facility_id = b.id and s.is_active
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('name', s.name, 'status', s.status) order by s.name)
      from public.diagnostic_services s where s.facility_id = b.id and s.is_active
    ), '[]'::jsonb),
    (
      select count(*)
      from public.doctor_availability da
      join public.doctors doc on doc.id = da.doctor_id
      where doc.facility_id = b.id
        and doc.status = 'active'
        and da.status <> 'unavailable'
        and da.availability_date between current_date and current_date + 7
    ),
    (
      select max(t) from (
        select max(d.updated_at) as t from public.departments d where d.facility_id = b.id
        union all
        select max(s.last_verified_at) from public.facility_services s where s.facility_id = b.id
        union all
        select max(s.last_verified_at) from public.diagnostic_services s where s.facility_id = b.id
        union all
        select max(da.updated_at)
        from public.doctor_availability da join public.doctors doc on doc.id = da.doctor_id
        where doc.facility_id = b.id
      ) x
    )
  from base b
  where
    (_department is null or exists (
      select 1 from public.departments d
      where d.facility_id = b.id and d.is_active and d.status <> 'unavailable'
        and d.name ilike '%' || public.like_escape(_department) || '%'))
    and (_service is null or exists (
      select 1 from public.facility_services s
      where s.facility_id = b.id and s.is_active and s.status <> 'unavailable'
        and s.name ilike '%' || public.like_escape(_service) || '%'))
    and (_diagnostic is null or exists (
      select 1 from public.diagnostic_services s
      where s.facility_id = b.id and s.is_active and s.status <> 'unavailable'
        and s.name ilike '%' || public.like_escape(_diagnostic) || '%'))
    and (_medicine is null or public.facility_has_medicine(b.id, _medicine))
  order by b.dist asc nulls last, b.name asc
  limit greatest(1, least(_limit, 50))
  offset greatest(0, _offset);
$$;

create or replace function public.facility_medicine_availability(_facility_id uuid)
returns table (
  medicine_id  uuid,
  name         text,
  generic_name text,
  strength     text,
  dosage_form  text,
  stock_status public.stock_status,
  updated_at   timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id, m.name, m.generic_name, m.strength, m.dosage_form,
    public.inventory_stock_status(mi.current_stock, mi.minimum_stock),
    mi.updated_at
  from public.medicine_inventory mi
  join public.medicines m on m.id = mi.medicine_id
  join public.facilities f on f.id = mi.facility_id
  where mi.facility_id = _facility_id
    and f.is_verified and f.is_active
    and mi.is_active and m.is_active
  order by m.name;
$$;

-- boolean-only helper, called from search_facilities_summary (security invoker) so authenticated needs EXECUTE
revoke all on function public.facility_has_medicine(uuid, text) from public, anon;
grant execute on function public.facility_has_medicine(uuid, text) to authenticated;
revoke all on function public.search_facilities_summary(
  text, text, text, text, text, text, text, numeric, numeric, int, int) from public, anon;
revoke all on function public.facility_medicine_availability(uuid) from public, anon;
grant execute on function public.search_facilities_summary(
  text, text, text, text, text, text, text, numeric, numeric, int, int) to authenticated;
grant execute on function public.facility_medicine_availability(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 9. updated_by / created_by stamping (spec §25: "updated by user")
-- ---------------------------------------------------------------------
alter table public.departments         add column if not exists updated_by uuid references public.profiles(id) on delete set null;
alter table public.doctors             add column if not exists updated_by uuid references public.profiles(id) on delete set null;
alter table public.doctor_availability add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create or replace function public.stamp_updated_by()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists departments_stamp_updated_by on public.departments;
create trigger departments_stamp_updated_by
  before insert or update on public.departments
  for each row execute function public.stamp_updated_by();

drop trigger if exists doctors_stamp_updated_by on public.doctors;
create trigger doctors_stamp_updated_by
  before insert or update on public.doctors
  for each row execute function public.stamp_updated_by();

drop trigger if exists doctor_availability_stamp_updated_by on public.doctor_availability;
create trigger doctor_availability_stamp_updated_by
  before insert or update on public.doctor_availability
  for each row execute function public.stamp_updated_by();

create or replace function public.stamp_availability_creator()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;

drop trigger if exists doctor_availability_stamp_creator on public.doctor_availability;
create trigger doctor_availability_stamp_creator
  before insert on public.doctor_availability
  for each row execute function public.stamp_availability_creator();

-- Verification stamp: also refreshed when staff press "confirm availability is current"
-- (a client write to last_verified_at is normalised to now() + the acting user).
create or replace function public.stamp_service_verification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.status is distinct from old.status
     or new.last_verified_at is distinct from old.last_verified_at then
    new.last_verified_at := now();
    new.last_verified_by := auth.uid();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 10. More real notification events + follow-up reminders
-- ---------------------------------------------------------------------
create or replace function public.notify_on_referral_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dest_name text;
  v_staff record;
begin
  select name into v_dest_name from public.facilities where id = new.destination_facility_id;

  perform public.create_notification(
    new.patient_id, 'referral_created', 'Referral created',
    concat('You have been referred to ', coalesce(v_dest_name, 'a facility'), '. We will keep you updated.'),
    'referral', new.id
  );

  for v_staff in
    select fs.user_id from public.facility_staff fs
    where fs.facility_id = new.destination_facility_id and fs.is_active
  loop
    perform public.create_notification(
      v_staff.user_id, 'referral_received', 'New referral received',
      'A new referral is waiting for your review.', 'referral', new.id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists referrals_notify_created on public.referrals;
create trigger referrals_notify_created
  after insert on public.referrals
  for each row execute function public.notify_on_referral_created();

create or replace function public.notify_on_visit_change()
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
  select name into v_facility_name from public.facilities where id = new.facility_id;

  if tg_op = 'INSERT' then
    -- visits requested by the patient themself do not notify the patient
    if new.created_by is not null and new.created_by <> new.patient_id then
      perform public.create_notification(
        new.patient_id, 'visit_scheduled', 'Visit scheduled',
        concat('A visit at ', coalesce(v_facility_name, 'the facility'), ' is scheduled for ',
               to_char(new.visit_date, 'DD Mon YYYY, HH24:MI'), '.'),
        'visit', new.id
      );
    end if;
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  v_title := case new.status
    when 'in_progress' then 'Visit started'
    when 'completed'   then 'Visit completed'
    when 'cancelled'   then 'Visit cancelled'
    else null
  end;
  if v_title is null then
    return new;
  end if;

  v_message := case new.status
    when 'in_progress' then concat('Your visit at ', coalesce(v_facility_name, 'the facility'), ' has started.')
    when 'completed'   then concat('Your visit at ', coalesce(v_facility_name, 'the facility'), ' is marked completed.')
    when 'cancelled'   then concat('Your visit at ', coalesce(v_facility_name, 'the facility'), ' was cancelled.')
    else ''
  end;

  perform public.create_notification(new.patient_id, 'visit_status_changed', v_title, v_message, 'visit', new.id);
  return new;
end;
$$;

drop trigger if exists visits_notify_change on public.visits;
create trigger visits_notify_change
  after insert or update on public.visits
  for each row execute function public.notify_on_visit_change();

-- Call periodically (see docs/SETUP.md — pg_cron or a scheduled Edge Function).
-- Creates ONE reminder per scheduled follow-up that is due within 24 hours.
create or replace function public.generate_followup_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select f.id, f.patient_id, f.scheduled_date
    from public.followups f
    where f.status = 'scheduled'
      and f.scheduled_date > now()
      and f.scheduled_date <= now() + interval '24 hours'
      and not exists (
        select 1 from public.notifications n
        where n.type = 'followup_reminder'
          and n.related_entity_type = 'followup'
          and n.related_entity_id = f.id
      )
  loop
    perform public.create_notification(
      v_row.patient_id, 'followup_reminder', 'Follow-up reminder',
      concat('You have a follow-up on ', to_char(v_row.scheduled_date, 'DD Mon YYYY, HH24:MI'), '.'),
      'followup', v_row.id
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.generate_followup_reminders() from public, anon, authenticated;
grant execute on function public.generate_followup_reminders() to service_role;

-- ---------------------------------------------------------------------
-- 11. Realtime (RLS still applies to every change event)
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.visits;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.patient_journeys;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 12. Admin safety guards
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_deactivation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or new.is_active is not distinct from old.is_active then
    return new;
  end if;

  if old.id = v_actor then
    raise exception 'You cannot change the active state of your own account.' using errcode = '42501';
  end if;

  if public.has_any_role(old.id, array['government_admin', 'super_admin']::public.user_role[])
     and not public.is_super_admin(v_actor) then
    raise exception 'Only a super administrator can change the state of an administrator account.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_deactivation on public.profiles;
create trigger profiles_guard_deactivation
  before update on public.profiles
  for each row execute function public.guard_profile_deactivation();

create or replace function public.protect_last_super_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'super_admin' and (
       tg_op = 'DELETE'
       or (tg_op = 'UPDATE' and new.role is distinct from old.role)
     ) then
    if (select count(*) from public.user_roles where role = 'super_admin') <= 1 then
      raise exception 'The last super administrator cannot be removed.' using errcode = '55000';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists user_roles_protect_last_super_admin on public.user_roles;
create trigger user_roles_protect_last_super_admin
  before update or delete on public.user_roles
  for each row execute function public.protect_last_super_admin();
