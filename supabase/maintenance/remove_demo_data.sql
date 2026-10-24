-- =====================================================================
-- SaarthiX — remove ALL simulated demo catalog data.
-- Run manually in the Supabase SQL Editor (NOT a migration).
--
-- Removes: the "SaarthiX Demo Hospital (DEMO ONLY)" facility and everything
-- attached to it (departments, doctors, availability, services, diagnostics,
-- inventory), plus every medicine whose name starts with "DEMO —".
--
-- If any patient visit/referral points at the demo facility this will fail
-- on purpose (ON DELETE RESTRICT). Then deactivate instead:
--   update public.facilities set is_active = false
--   where name = 'SaarthiX Demo Hospital (DEMO ONLY)';
-- =====================================================================
begin;

delete from public.facilities
where name = 'SaarthiX Demo Hospital (DEMO ONLY)';

delete from public.medicines where name like 'DEMO — %';

-- Safety net: anything else still carrying the prefix on a real facility.
delete from public.doctors             where full_name like 'DEMO — %';
delete from public.facility_services   where name like 'DEMO — %';
delete from public.diagnostic_services where name like 'DEMO — %';
delete from public.departments         where name like 'DEMO — %';

commit;

-- Check (all should return 0):
-- select count(*) from public.departments         where name      like 'DEMO%';
-- select count(*) from public.doctors             where full_name like 'DEMO%';
-- select count(*) from public.facility_services   where name      like 'DEMO%';
-- select count(*) from public.diagnostic_services where name      like 'DEMO%';
-- select count(*) from public.medicines           where name      like 'DEMO%';
