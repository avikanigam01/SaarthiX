-- =====================================================================
-- SaarthiX — add REAL, facility-confirmed catalog data.
-- Run manually in the Supabase SQL Editor after remove_demo_data.sql.
--
-- Fill ONLY what the hospital has actually confirmed (phone call, official
-- site, or its own staff). Delete any row you cannot confirm — patients rely
-- on this to decide where to travel. Prefer the hospital-staff screens
-- (/hospital/departments, /hospital/doctors, /hospital/services,
-- /hospital/diagnostics, /hospital/medicines) once a staff user is linked to the
-- facility in public.facility_staff; this script is for first-time bulk load.
-- =====================================================================
begin;

-- 1) Departments  (edit the facility name and the list)
insert into public.departments (facility_id, name, status, is_active)
select f.id, d.name, d.status::public.availability_status, true
from public.facilities f
cross join (values
  ('<CONFIRMED DEPARTMENT NAME>', 'available')   -- available | limited | unavailable
  -- , ('<ANOTHER DEPARTMENT>', 'available')
) as d(name, status)
where f.name = 'LLR Hospital (Hallet)'            -- <- facility to load
on conflict (facility_id, name) do update
  set status = excluded.status, is_active = true;

-- 2) Facility services
insert into public.facility_services (facility_id, name, status, is_active)
select f.id, s.name, s.status::public.availability_status, true
from public.facilities f
cross join (values
  ('<CONFIRMED SERVICE NAME>', 'available')
) as s(name, status)
where f.name = 'LLR Hospital (Hallet)';

-- 3) Diagnostic services
insert into public.diagnostic_services (facility_id, name, status, is_active)
select f.id, s.name, s.status::public.availability_status, true
from public.facilities f
cross join (values
  ('<CONFIRMED TEST NAME>', 'available')
) as s(name, status)
where f.name = 'LLR Hospital (Hallet)';

commit;
-- Doctors, slots and medicine stock change daily: enter them through the hospital
-- staff screens so they carry "last updated" timestamps and an audit trail.
