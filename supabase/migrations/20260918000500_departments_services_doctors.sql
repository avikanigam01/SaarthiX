-- =====================================================================
-- SaarthiX — Phase 2 | Migration 005
-- departments (§8), facility_services (§9), doctors (§10),
-- doctor_availability (§11), diagnostic_services (§12)
--
-- Shared authorization shape:
--   SELECT  -> verified+active facility (public) OR facility staff OR admin
--   WRITE   -> facility staff of that facility OR admin
-- =====================================================================

-- ---------------------------------------------------------------------
-- departments
-- ---------------------------------------------------------------------
create table if not exists public.departments (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  name         text not null,
  description  text,
  status       public.availability_status not null default 'available',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint departments_name_not_blank check (length(btrim(name)) > 0),
  constraint departments_unique_per_facility unique (facility_id, name)
);

create index if not exists departments_facility_id_idx on public.departments (facility_id);
create index if not exists departments_status_idx      on public.departments (status);

drop trigger if exists departments_set_updated_at on public.departments;
create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

alter table public.departments enable row level security;
alter table public.departments force row level security;

drop policy if exists departments_select_public on public.departments;
create policy departments_select_public
  on public.departments for select
  to authenticated, anon
  using (
    is_active
    and exists (
      select 1 from public.facilities f
      where f.id = departments.facility_id
        and f.is_verified and f.is_active
    )
  );

drop policy if exists departments_select_staff_admin on public.departments;
create policy departments_select_staff_admin
  on public.departments for select
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin());

drop policy if exists departments_write_staff_admin on public.departments;
create policy departments_write_staff_admin
  on public.departments for all
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin())
  with check (public.is_facility_staff(facility_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------
-- facility_services
-- ---------------------------------------------------------------------
create table if not exists public.facility_services (
  id                 uuid primary key default gen_random_uuid(),
  facility_id        uuid not null references public.facilities(id) on delete cascade,
  name               text not null,
  description        text,
  status             public.availability_status not null default 'available',
  last_verified_at   timestamptz,
  last_verified_by   uuid references public.profiles(id) on delete set null,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint facility_services_name_not_blank check (length(btrim(name)) > 0)
);

create index if not exists facility_services_facility_id_idx on public.facility_services (facility_id);
create index if not exists facility_services_status_idx      on public.facility_services (status);

drop trigger if exists facility_services_set_updated_at on public.facility_services;
create trigger facility_services_set_updated_at
  before update on public.facility_services
  for each row execute function public.set_updated_at();

-- Stamp last_verified_at/by automatically whenever status changes,
-- so staff can never leave a stale timestamp on a fresh status (§15).
create or replace function public.stamp_service_verification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.last_verified_at := now();
    new.last_verified_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists facility_services_stamp_verification on public.facility_services;
create trigger facility_services_stamp_verification
  before insert or update on public.facility_services
  for each row execute function public.stamp_service_verification();

alter table public.facility_services enable row level security;
alter table public.facility_services force row level security;

drop policy if exists facility_services_select_public on public.facility_services;
create policy facility_services_select_public
  on public.facility_services for select
  to authenticated, anon
  using (
    is_active
    and exists (
      select 1 from public.facilities f
      where f.id = facility_services.facility_id
        and f.is_verified and f.is_active
    )
  );

drop policy if exists facility_services_select_staff_admin on public.facility_services;
create policy facility_services_select_staff_admin
  on public.facility_services for select
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin());

drop policy if exists facility_services_write_staff_admin on public.facility_services;
create policy facility_services_write_staff_admin
  on public.facility_services for all
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin())
  with check (public.is_facility_staff(facility_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------
-- doctors
-- ---------------------------------------------------------------------
create table if not exists public.doctors (
  id                   uuid primary key default gen_random_uuid(),
  facility_id          uuid not null references public.facilities(id) on delete cascade,
  department_id        uuid references public.departments(id) on delete set null,
  full_name            text not null,
  specialization       text,
  registration_number  text,
  qualification        text,
  phone                text,
  email                text,
  status               public.doctor_status not null default 'active',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint doctors_full_name_not_blank check (length(btrim(full_name)) > 0)
);

create index if not exists doctors_facility_id_idx   on public.doctors (facility_id);
create index if not exists doctors_department_id_idx on public.doctors (department_id);

-- A department, if set, must belong to the same facility as the doctor.
create or replace function public.check_doctor_department_facility()
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
  select facility_id into v_dept_facility
  from public.departments where id = new.department_id;
  if v_dept_facility is distinct from new.facility_id then
    raise exception 'Department does not belong to the doctor''s facility.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists doctors_check_department_facility on public.doctors;
create trigger doctors_check_department_facility
  before insert or update on public.doctors
  for each row execute function public.check_doctor_department_facility();

drop trigger if exists doctors_set_updated_at on public.doctors;
create trigger doctors_set_updated_at
  before update on public.doctors
  for each row execute function public.set_updated_at();

alter table public.doctors enable row level security;
alter table public.doctors force row level security;

drop policy if exists doctors_select_public on public.doctors;
create policy doctors_select_public
  on public.doctors for select
  to authenticated, anon
  using (
    status = 'active'
    and exists (
      select 1 from public.facilities f
      where f.id = doctors.facility_id
        and f.is_verified and f.is_active
    )
  );

drop policy if exists doctors_select_staff_admin on public.doctors;
create policy doctors_select_staff_admin
  on public.doctors for select
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin());

drop policy if exists doctors_write_staff_admin on public.doctors;
create policy doctors_write_staff_admin
  on public.doctors for all
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin())
  with check (public.is_facility_staff(facility_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------
-- doctor_availability
-- ---------------------------------------------------------------------
create table if not exists public.doctor_availability (
  id                 uuid primary key default gen_random_uuid(),
  doctor_id          uuid not null references public.doctors(id) on delete cascade,
  availability_date  date not null,
  start_time         time not null,
  end_time           time not null,
  status             public.availability_status not null default 'available',
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint doctor_availability_time_order check (end_time > start_time),
  constraint doctor_availability_unique_slot unique (doctor_id, availability_date, start_time, end_time)
);

create index if not exists doctor_availability_doctor_id_idx on public.doctor_availability (doctor_id);
create index if not exists doctor_availability_date_idx      on public.doctor_availability (availability_date);

drop trigger if exists doctor_availability_set_updated_at on public.doctor_availability;
create trigger doctor_availability_set_updated_at
  before update on public.doctor_availability
  for each row execute function public.set_updated_at();

-- Helper: which facility does this availability row belong to, via its doctor.
create or replace function public.facility_of_doctor(_doctor_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select facility_id from public.doctors where id = _doctor_id;
$$;

alter table public.doctor_availability enable row level security;
alter table public.doctor_availability force row level security;

drop policy if exists doctor_availability_select_public on public.doctor_availability;
create policy doctor_availability_select_public
  on public.doctor_availability for select
  to authenticated, anon
  using (
    exists (
      select 1 from public.doctors d
      join public.facilities f on f.id = d.facility_id
      where d.id = doctor_availability.doctor_id
        and d.status = 'active'
        and f.is_verified and f.is_active
    )
  );

drop policy if exists doctor_availability_select_staff_admin on public.doctor_availability;
create policy doctor_availability_select_staff_admin
  on public.doctor_availability for select
  to authenticated
  using (
    public.is_facility_staff(public.facility_of_doctor(doctor_id))
    or public.is_platform_admin()
  );

drop policy if exists doctor_availability_write_staff_admin on public.doctor_availability;
create policy doctor_availability_write_staff_admin
  on public.doctor_availability for all
  to authenticated
  using (
    public.is_facility_staff(public.facility_of_doctor(doctor_id))
    or public.is_platform_admin()
  )
  with check (
    public.is_facility_staff(public.facility_of_doctor(doctor_id))
    or public.is_platform_admin()
  );

-- ---------------------------------------------------------------------
-- diagnostic_services
-- ---------------------------------------------------------------------
create table if not exists public.diagnostic_services (
  id                uuid primary key default gen_random_uuid(),
  facility_id       uuid not null references public.facilities(id) on delete cascade,
  name              text not null,
  description       text,
  status            public.availability_status not null default 'available',
  last_verified_at  timestamptz,
  last_verified_by  uuid references public.profiles(id) on delete set null,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint diagnostic_services_name_not_blank check (length(btrim(name)) > 0)
);

create index if not exists diagnostic_services_facility_id_idx on public.diagnostic_services (facility_id);
create index if not exists diagnostic_services_status_idx      on public.diagnostic_services (status);

drop trigger if exists diagnostic_services_set_updated_at on public.diagnostic_services;
create trigger diagnostic_services_set_updated_at
  before update on public.diagnostic_services
  for each row execute function public.set_updated_at();

drop trigger if exists diagnostic_services_stamp_verification on public.diagnostic_services;
create trigger diagnostic_services_stamp_verification
  before insert or update on public.diagnostic_services
  for each row execute function public.stamp_service_verification();

alter table public.diagnostic_services enable row level security;
alter table public.diagnostic_services force row level security;

drop policy if exists diagnostic_services_select_public on public.diagnostic_services;
create policy diagnostic_services_select_public
  on public.diagnostic_services for select
  to authenticated, anon
  using (
    is_active
    and exists (
      select 1 from public.facilities f
      where f.id = diagnostic_services.facility_id
        and f.is_verified and f.is_active
    )
  );

drop policy if exists diagnostic_services_select_staff_admin on public.diagnostic_services;
create policy diagnostic_services_select_staff_admin
  on public.diagnostic_services for select
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin());

drop policy if exists diagnostic_services_write_staff_admin on public.diagnostic_services;
create policy diagnostic_services_write_staff_admin
  on public.diagnostic_services for all
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin())
  with check (public.is_facility_staff(facility_id) or public.is_platform_admin());
