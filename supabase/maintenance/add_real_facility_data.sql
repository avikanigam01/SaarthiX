-- =====================================================================
-- SaarthiX — REAL facility catalog for the 7 Kanpur facilities in
-- supabase/seed/kanpur_facilities.sql
--
-- Sources (publicly listed information, collected 24 Oct 2026):
--   Regency (Tower-1, Tower-2, Renal Sciences): regencyhealthcare.in
--       (specialities, locations and doctor-profile pages)
--   Panacea: NABH scope of accreditation, certificate SHCO-2018-0191
--       (valid 16 Jan 2025 - 19 Dec 2028), portal.nabh.co
--   LLR Hospital: GSVM Medical College OPD page (gsvmmedicalcollege.com)
--       + Wikipedia "Lala Lajpat Rai Hospital"
--   KPM Hospital: PM-JAY empanelment listing (publicservicesmap.in)
--   UHM Hospital: Wikipedia "Ursula Horsman Memorial Hospital" (+ TOI 2016)
--
-- IMPORTANT
--   * Only departments / services / tests that a source lists are added.
--     Nothing is invented. Doctor slots and medicine stock are NOT added:
--     they change daily and must be entered by the hospital's own staff in
--     /hospital/doctors and /hospital/medicines.
--   * Rows are marked 'available' only because the source lists them.
--     last_verified_at stays NULL, so the app shows "Never confirmed".
--     Please phone each hospital once and have staff confirm.
--   * Safe to re-run: existing rows are left untouched.
--   * Run AFTER supabase/maintenance/remove_demo_data.sql.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1) Departments  (names follow the list used by the assess function so
--    that "suggested department" matches: General Medicine, Pediatrics,
--    Obstetrics & Gynaecology, Orthopaedics, Cardiology, Dermatology, ENT,
--    Ophthalmology, Dental, Psychiatry, General Surgery,
--    Radiology & Diagnostics, Emergency)
-- ---------------------------------------------------------------------
create temp table _dept (facility text, name text, descr text) on commit drop;
insert into _dept values
-- Regency Hospital (Tower-1) — regencyhealthcare.in specialities pages
('Regency Hospital (Tower-1)','Cardiology','Listed on Regency Healthcare website'),
('Regency Hospital (Tower-1)','Cardiac Surgery','Listed on Regency Healthcare website'),
('Regency Hospital (Tower-1)','Neurology','Listed on Regency Healthcare website; in-house MRI and CT mentioned'),
('Regency Hospital (Tower-1)','Nephrology','Listed on Regency Healthcare website'),
('Regency Hospital (Tower-1)','Urology','Listed on Regency Healthcare website'),
('Regency Hospital (Tower-1)','Orthopaedics','Listed on Regency Healthcare website'),
('Regency Hospital (Tower-1)','Obstetrics & Gynaecology','Listed on Regency Healthcare website'),
('Regency Hospital (Tower-1)','Psychiatry','Listed on Regency Healthcare website'),
('Regency Hospital (Tower-1)','Dermatology','Listed on Regency Healthcare website'),
('Regency Hospital (Tower-1)','Oncology','Listed on Regency Healthcare website (cancer care)'),
('Regency Hospital (Tower-1)','Cosmetic & Plastic Surgery','Listed on Regency Healthcare website'),
('Regency Hospital (Tower-1)','Anaesthesia & Critical Care','Listed on Regency Healthcare website; operation theatres run round the clock'),
('Regency Hospital (Tower-1)','Radiology & Diagnostics','Listed on Regency Healthcare website'),
-- Regency Cancer and Gastro Care Centre (Tower-2)
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Oncology','Cancer care; radiation oncology listed on Tower-2 page'),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Gastroenterology','Listed on Tower-2 page'),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Surgical Gastroenterology','Listed on Tower-2 page'),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Pediatric Gastroenterology','Listed on Tower-2 page'),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Nuclear Medicine','Listed on Tower-2 page'),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Radiology & Diagnostics','Listed on Tower-2 page'),
-- Regency Renal Sciences Hospital
('Regency Renal Sciences Hospital','Nephrology','Dedicated renal centre since 2012'),
('Regency Renal Sciences Hospital','Urology','Listed on Renal Sciences page'),
('Regency Renal Sciences Hospital','Radiology & Diagnostics','Listed on Renal Sciences page'),
('Regency Renal Sciences Hospital','Anaesthesia & Critical Care','Critical care listed on Renal Sciences page'),
-- The Panacea Multi Super Specialty Hospital — NABH scope of accreditation
('The Panacea Multi Super Specialty Hospital','Anaesthesia & Critical Care','NABH scope: Anaesthesiology including Critical Care'),
('The Panacea Multi Super Specialty Hospital','General Medicine','NABH scope'),
('The Panacea Multi Super Specialty Hospital','General Surgery','NABH scope: including laparoscopic surgery'),
('The Panacea Multi Super Specialty Hospital','Neurology','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Neurosurgery','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Orthopaedics','NABH scope: Orthopaedic Surgery'),
('The Panacea Multi Super Specialty Hospital','Plastic & Reconstructive Surgery','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Respiratory Medicine','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Surgical Gastroenterology','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Urology','NABH scope'),
-- LLR Hospital (Hallet) — GSVM official OPD page + Wikipedia
('LLR Hospital (Hallet)','General Medicine','OPD in LLR OPD building'),
('LLR Hospital (Hallet)','General Surgery','OPD in LLR OPD building'),
('LLR Hospital (Hallet)','Orthopaedics','OPD in LLR OPD building'),
('LLR Hospital (Hallet)','ENT','OPD in LLR OPD building'),
('LLR Hospital (Hallet)','Ophthalmology','OPD in LLR OPD building'),
('LLR Hospital (Hallet)','Pediatrics','OPD in LLR OPD building'),
('LLR Hospital (Hallet)','Dermatology','Skin and VD OPD'),
('LLR Hospital (Hallet)','Dental','Dentistry OPD'),
('LLR Hospital (Hallet)','Anaesthesia Pain Clinic','OPD in LLR OPD building'),
('LLR Hospital (Hallet)','Radiology & Diagnostics','Radio-diagnosis department'),
('LLR Hospital (Hallet)','Emergency','Casualty / emergency medicine department'),
-- KPM Hospital — PM-JAY listing
('KPM Hospital','General Medicine','PM-JAY listing'),
('KPM Hospital','General Surgery','PM-JAY listing'),
('KPM Hospital','Pediatrics','PM-JAY listing'),
('KPM Hospital','Obstetrics & Gynaecology','PM-JAY listing'),
('KPM Hospital','Orthopaedics','PM-JAY listing'),
-- UHM Government Hospital — Wikipedia: 24-hour emergency service
('UHM Government Hospital Kanpur','Emergency','24-hour emergency service');

insert into public.departments (facility_id, name, description, status, is_active)
select f.id, d.name, d.descr || '. Please confirm with the hospital.', 'available', true
from _dept d
join public.facilities f on f.name = d.facility
on conflict (facility_id, name) do nothing;

-- ---------------------------------------------------------------------
-- 2) Facility services
-- ---------------------------------------------------------------------
create temp table _svc (facility text, name text, descr text) on commit drop;
insert into _svc values
('Regency Hospital (Tower-1)','Emergency Care (24 hours)','Listed on Wikipedia and Regency Healthcare'),
('Regency Hospital (Tower-1)','Blood Bank (24x7)','Listed on Regency Healthcare specialities page'),
('Regency Hospital (Tower-1)','Critical Care / ICU','Listed on Regency Healthcare specialities page'),
('Regency Renal Sciences Hospital','Dialysis (round the clock)','Listed on Regency Healthcare website'),
('Regency Renal Sciences Hospital','Kidney Transplant','Listed on Regency Healthcare website'),
('Regency Renal Sciences Hospital','Laboratory Services','Listed on Renal Sciences page'),
('The Panacea Multi Super Specialty Hospital','Pharmacy (Dispensary)','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Blood Transfusion Services','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Physiotherapy','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Rehabilitation','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Occupational Therapy','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Dietetics','NABH scope'),
('LLR Hospital (Hallet)','Outpatient (OPD) 9 am - 2 pm, closed Sundays','GSVM OPD page; only casualty runs on gazetted holidays'),
('LLR Hospital (Hallet)','Emergency / Casualty','Wikipedia and GSVM'),
('LLR Hospital (Hallet)','Emergency ICU','Wikipedia'),
('LLR Hospital (Hallet)','Medicine ICU','Wikipedia'),
('LLR Hospital (Hallet)','Burn Unit','Wikipedia'),
('LLR Hospital (Hallet)','Physiotherapy','GSVM OPD page'),
('KPM Hospital','General Consultation / Outpatient','PM-JAY listing'),
('KPM Hospital','Emergency Services','PM-JAY listing'),
('KPM Hospital','Inpatient Services','PM-JAY listing'),
('KPM Hospital','Laboratory Services','PM-JAY listing'),
('KPM Hospital','Pharmacy Services','PM-JAY listing'),
('KPM Hospital','Vaccination Services','PM-JAY listing'),
('KPM Hospital','Maternal Care','PM-JAY listing'),
('KPM Hospital','Child Healthcare','PM-JAY listing'),
('KPM Hospital','Basic Surgical Services','PM-JAY listing'),
('UHM Government Hospital Kanpur','Emergency Service (24 hours)','Wikipedia'),
('UHM Government Hospital Kanpur','Intensive Care Unit','Wikipedia / TOI report (2016); confirm current beds'),
('UHM Government Hospital Kanpur','Dialysis Unit','TOI report (2016); confirm current status');

insert into public.facility_services (facility_id, name, description, status, is_active)
select f.id, s.name, s.descr || '. Please confirm with the hospital.', 'available', true
from _svc s
join public.facilities f on f.name = s.facility
where not exists (
  select 1 from public.facility_services x where x.facility_id = f.id and x.name = s.name
);

-- ---------------------------------------------------------------------
-- 3) Diagnostic services
-- ---------------------------------------------------------------------
create temp table _diag (facility text, name text, descr text) on commit drop;
insert into _diag values
('The Panacea Multi Super Specialty Hospital','2D Echo','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Audiometry','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Bronchoscopy','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Color Doppler','NABH scope'),
('The Panacea Multi Super Specialty Hospital','CT Scan','NABH scope'),
('The Panacea Multi Super Specialty Hospital','ECG','NABH scope'),
('The Panacea Multi Super Specialty Hospital','EEG','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Holter Monitoring','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Pulmonary Function Test','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Spirometry','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Treadmill Test','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Ultrasound','NABH scope'),
('The Panacea Multi Super Specialty Hospital','X-Ray','NABH scope'),
('The Panacea Multi Super Specialty Hospital','Clinical Bio-Chemistry','NABH scope (laboratory)'),
('The Panacea Multi Super Specialty Hospital','Hematology','NABH scope (laboratory)'),
('Regency Hospital (Tower-1)','MRI','In-house MRI mentioned on Regency neurology page'),
('Regency Hospital (Tower-1)','CT Scan','High-resolution CT mentioned on Regency neurology page'),
('Regency Hospital (Tower-1)','Pathology / Laboratory','Diagnostics and pathology mentioned on Regency website'),
('LLR Hospital (Hallet)','Radio Diagnosis (imaging)','Wikipedia: radio-diagnosis department');

insert into public.diagnostic_services (facility_id, name, description, status, is_active)
select f.id, d.name, d.descr || '. Please confirm with the hospital.', 'available', true
from _diag d
join public.facilities f on f.name = d.facility
where not exists (
  select 1 from public.diagnostic_services x where x.facility_id = f.id and x.name = d.name
);

-- ---------------------------------------------------------------------
-- 4) Doctors — only people whose profile on the hospital's own pages names
--    this exact facility. No registration numbers, phone numbers or slots.
-- ---------------------------------------------------------------------
create temp table _doc (facility text, dept text, full_name text, specialization text, qualification text) on commit drop;
insert into _doc values
('Regency Renal Sciences Hospital','Nephrology','Dr. Nirbhai Kumar','Nephrology (Director & Sr. Consultant)','MBBS, MD (Medicine), DNB (Nephrology), MNAMS'),
('Regency Renal Sciences Hospital','Urology','Dr. Piyush Tripathi','Urology, Andrology, Kidney Transplant Surgery','MBBS (GSVM Medical College Kanpur), MS (VSS Medical College Sambalpur)'),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Surgical Gastroenterology','Dr. Abhimanyu Kapoor','Surgical Gastroenterology (Consultant)',null),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Gastroenterology','Dr. Ajmal Hasan','Gastroenterology (Consultant)',null),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Gastroenterology','Dr. Mayank Mehrotra','Gastroenterology (Consultant)',null),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Pediatric Gastroenterology','Dr. Jaya Agarwal','Pediatric Gastroenterology (Consultant)',null),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Radiology & Diagnostics','Dr. Himani Chandra','Radiology (Associate Consultant)',null),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Nuclear Medicine','Dr. Krishnaja','Nuclear Medicine (Consultant)',null),
('Regency Hospital Cancer and Gastro Care Centre (Tower-2)','Oncology','Dr. Narayan Pratap Singh','Radiation Oncology',null);

insert into public.doctors (facility_id, department_id, full_name, specialization, qualification, status)
select f.id, dp.id, d.full_name, d.specialization, d.qualification, 'active'::public.doctor_status
from _doc d
join public.facilities f on f.name = d.facility
left join public.departments dp on dp.facility_id = f.id and dp.name = d.dept
where not exists (
  select 1 from public.doctors x where x.facility_id = f.id and x.full_name = d.full_name
);

commit;

-- ---------------------------------------------------------------------
-- Check: every facility should now have rows.
-- ---------------------------------------------------------------------
select f.name,
  (select count(*) from public.departments         x where x.facility_id = f.id) as departments,
  (select count(*) from public.facility_services   x where x.facility_id = f.id) as services,
  (select count(*) from public.diagnostic_services x where x.facility_id = f.id) as diagnostics,
  (select count(*) from public.doctors             x where x.facility_id = f.id) as doctors
from public.facilities f
where f.district = 'Kanpur Nagar'
order by f.name;

-- Not added on purpose (names appear on Regency group specialty pages without a
-- clearly stated tower, so confirm the location with the hospital first):
--   Anaesthesia: Dr. Neemat Bano, Dr. Rajnish Bajwa, Dr. Ruby Srivastava, Dr. Shipra Agarwal
--   Obstetrics & Gynaecology: Dr. Arti Singh, Dr. Nidhi Singhvi, Dr. Roli Purwar
