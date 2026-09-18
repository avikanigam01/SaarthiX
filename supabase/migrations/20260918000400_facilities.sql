-- =====================================================================
-- SaarthiX — Phase 2 | Migration 004
-- facilities (§6)
-- =====================================================================

create table if not exists public.facilities (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  facility_type         text not null,
  registration_number   text,
  address               text not null,
  district              text not null,
  state                 text not null,
  postal_code           text,
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  phone                 text,
  email                 text,
  operating_hours       jsonb,
  is_verified           boolean not null default false,
  is_active             boolean not null default true,
  verified_by           uuid references public.profiles(id) on delete set null,
  verified_at           timestamptz,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint facilities_name_not_blank
    check (length(btrim(name)) > 0),

  constraint facilities_latitude_range
    check (latitude is null or latitude between -90 and 90),

  constraint facilities_longitude_range
    check (longitude is null or longitude between -180 and 180),

  constraint facilities_verification_consistency
    check (
      (is_verified and verified_by is not null and verified_at is not null)
      or (not is_verified)
    )
);

comment on table public.facilities is
  'Healthcare facilities. is_verified is set only through public.verify_facility(), never by direct client update.';

create index if not exists facilities_district_idx        on public.facilities (district);
create index if not exists facilities_state_idx            on public.facilities (state);
create index if not exists facilities_facility_type_idx    on public.facilities (facility_type);
create index if not exists facilities_verified_active_idx  on public.facilities (is_verified, is_active);

drop trigger if exists facilities_set_updated_at on public.facilities;
create trigger facilities_set_updated_at
  before update on public.facilities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Only a platform admin may change verification / active status.
-- Everything else on the row can be edited by authorized facility staff
-- (enforced via facility_staff + RLS in this migration).
-- ---------------------------------------------------------------------
create or replace function public.protect_facility_admin_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    new.is_verified := old.is_verified;
    new.is_active   := old.is_active;
    new.verified_by := old.verified_by;
    new.verified_at := old.verified_at;
  end if;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists facilities_protect_admin_columns on public.facilities;
create trigger facilities_protect_admin_columns
  before update on public.facilities
  for each row execute function public.protect_facility_admin_columns();

-- ---------------------------------------------------------------------
-- Verification workflow entry point (§38, §35).
-- Wrapping it in a function makes the audit trail explicit and keeps
-- verified_by/verified_at internally consistent.
-- ---------------------------------------------------------------------
create or replace function public.verify_facility(_facility_id uuid, _verified boolean)
returns public.facilities
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.facilities;
begin
  if not public.is_platform_admin() then
    raise exception 'You are not authorized to verify facilities.'
      using errcode = '42501';
  end if;

  update public.facilities
  set
    is_verified = _verified,
    verified_by = case when _verified then auth.uid() else null end,
    verified_at = case when _verified then now() else null end
  where id = _facility_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Facility not found.' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke all on function public.verify_facility(uuid, boolean) from public, anon;
grant execute on function public.verify_facility(uuid, boolean) to authenticated;

-- =====================================================================
-- facility_staff (§7)
-- Created here, before facilities' own RLS policies, because those
-- policies need to check staff association.
-- =====================================================================
create table if not exists public.facility_staff (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  designation  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint facility_staff_unique unique (facility_id, user_id)
);

comment on table public.facility_staff is
  'Associates a hospital_staff/hospital_admin user with the facility they are authorized to manage.';

create index if not exists facility_staff_user_id_idx     on public.facility_staff (user_id);
create index if not exists facility_staff_facility_id_idx on public.facility_staff (facility_id);

drop trigger if exists facility_staff_set_updated_at on public.facility_staff;
create trigger facility_staff_set_updated_at
  before update on public.facility_staff
  for each row execute function public.set_updated_at();

-- Helper: is the current (or given) user active staff at this facility?
create or replace function public.is_facility_staff(_facility_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.facility_staff fs
    where fs.facility_id = _facility_id
      and fs.user_id = _user_id
      and fs.is_active
  );
$$;

revoke all on function public.is_facility_staff(uuid, uuid) from public, anon;
grant execute on function public.is_facility_staff(uuid, uuid) to authenticated;

-- Only a platform admin may add/remove/deactivate staff (prevents a
-- hospital_staff member from granting themselves or others access,
-- and prevents Hospital A staff from touching Hospital B — §30).
create or replace function public.guard_facility_staff_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  if not public.is_platform_admin() then
    raise exception 'You are not authorized to manage facility staff.'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists facility_staff_guard_change on public.facility_staff;
create trigger facility_staff_guard_change
  before insert or update or delete on public.facility_staff
  for each row execute function public.guard_facility_staff_change();

alter table public.facility_staff enable row level security;
alter table public.facility_staff force row level security;

drop policy if exists facility_staff_select_own on public.facility_staff;
create policy facility_staff_select_own
  on public.facility_staff for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists facility_staff_select_colleagues on public.facility_staff;
create policy facility_staff_select_colleagues
  on public.facility_staff for select
  to authenticated
  using (public.is_facility_staff(facility_id));

drop policy if exists facility_staff_select_admin on public.facility_staff;
create policy facility_staff_select_admin
  on public.facility_staff for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists facility_staff_write_admin on public.facility_staff;
create policy facility_staff_write_admin
  on public.facility_staff for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =====================================================================
-- facilities RLS (now that facility_staff exists)
-- =====================================================================
alter table public.facilities enable row level security;
alter table public.facilities force row level security;

-- ---------------------------------------------------------------------
-- facilities policies
-- Public discovery is intentionally limited to verified + active rows
-- (§6, §45: patient-facing search must never surface unverified data).
-- ---------------------------------------------------------------------
drop policy if exists facilities_select_public on public.facilities;
create policy facilities_select_public
  on public.facilities for select
  to authenticated, anon
  using (is_verified and is_active);

drop policy if exists facilities_select_staff on public.facilities;
create policy facilities_select_staff
  on public.facilities for select
  to authenticated
  using (
    exists (
      select 1 from public.facility_staff fs
      where fs.facility_id = facilities.id
        and fs.user_id = auth.uid()
        and fs.is_active
    )
  );

drop policy if exists facilities_select_admin on public.facilities;
create policy facilities_select_admin
  on public.facilities for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists facilities_insert_admin on public.facilities;
create policy facilities_insert_admin
  on public.facilities for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists facilities_update_staff_or_admin on public.facilities;
create policy facilities_update_staff_or_admin
  on public.facilities for update
  to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.facility_staff fs
      where fs.facility_id = facilities.id
        and fs.user_id = auth.uid()
        and fs.is_active
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.facility_staff fs
      where fs.facility_id = facilities.id
        and fs.user_id = auth.uid()
        and fs.is_active
    )
  );

-- No DELETE policy: facilities are suspended (is_active = false) via
-- verify_facility()'s sibling admin workflow, never hard-deleted.
