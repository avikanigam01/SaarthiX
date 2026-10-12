-- SaarthiX demo hospital catalog seed
-- PURPOSE: populate hospital workflow screens for demonstrations and QA.
-- IMPORTANT: every doctor, schedule, service status and stock quantity below is fictional demo data.
-- No patient profiles, health records, real doctor credentials, or real appointments are created.
-- The demo facility is intentionally NOT verified and must never be presented as a real provider.
-- Run only after all migrations have been applied, using Supabase SQL Editor.
begin;

-- 1) A clearly labeled, isolated demo facility. Do not attach fictional catalog data to real hospitals.
insert into public.facilities
  (name, facility_type, address, district, state, postal_code, phone, email,
   is_verified, is_active, source_notes)
select
  'SaarthiX Demo Hospital (DEMO ONLY)',
  'demo_hospital',
  'Demo campus — fictional address, not a real healthcare facility',
  'Kanpur Nagar', 'Uttar Pradesh', null, null, null,
  false, true,
  'Fictional demo facility created to demonstrate SaarthiX workflows. Not a real hospital; all linked catalog data is simulated.'
where not exists (
  select 1 from public.facilities
  where name = 'SaarthiX Demo Hospital (DEMO ONLY)'
    and district = 'Kanpur Nagar'
    and state = 'Uttar Pradesh'
);

-- 2) Departments
with f as (
  select id from public.facilities
  where name = 'SaarthiX Demo Hospital (DEMO ONLY)'
    and district = 'Kanpur Nagar' and state = 'Uttar Pradesh'
  order by created_at limit 1
), dept(name, description, status) as (
  values
  ('Emergency & Trauma','DEMO ONLY — simulated emergency and triage department','available'::public.availability_status),
  ('General Medicine','DEMO ONLY — simulated outpatient and inpatient medicine','available'::public.availability_status),
  ('Cardiology','DEMO ONLY — simulated heart-care department','limited'::public.availability_status),
  ('Orthopaedics','DEMO ONLY — simulated bone and joint care','available'::public.availability_status),
  ('Paediatrics','DEMO ONLY — simulated child healthcare','available'::public.availability_status),
  ('Obstetrics & Gynaecology','DEMO ONLY — simulated maternal healthcare','available'::public.availability_status),
  ('General Surgery','DEMO ONLY — simulated surgical department','limited'::public.availability_status),
  ('Neurology','DEMO ONLY — simulated nervous-system care','limited'::public.availability_status),
  ('Pulmonology','DEMO ONLY — simulated respiratory care','available'::public.availability_status),
  ('Dermatology','DEMO ONLY — simulated skin care','available'::public.availability_status),
  ('Ophthalmology','DEMO ONLY — simulated eye care','unavailable'::public.availability_status),
  ('Diagnostics & Imaging','DEMO ONLY — simulated diagnostics department','available'::public.availability_status)
)
insert into public.departments (facility_id, name, description, status, is_active)
select f.id, d.name, d.description, d.status, true
from f cross join dept d
where not exists (
  select 1 from public.departments x where x.facility_id = f.id and x.name = d.name
);

-- 3) Doctors. These are intentionally named demo clinicians, not real people.
with f as (
  select id from public.facilities where name = 'SaarthiX Demo Hospital (DEMO ONLY)'
    and district = 'Kanpur Nagar' and state = 'Uttar Pradesh' order by created_at limit 1
), people(full_name, department_name, specialization, qualification) as (
  values
  ('DEMO — Dr. Aarav Sharma','Emergency & Trauma','Emergency Medicine','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Meera Verma','Emergency & Trauma','Trauma Care','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Kabir Singh','General Medicine','Internal Medicine','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Ananya Gupta','General Medicine','General Physician','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Rohan Mishra','Cardiology','Cardiology','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Isha Kapoor','Cardiology','Cardiac Medicine','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Vivaan Patel','Orthopaedics','Orthopaedics','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Saanvi Joshi','Paediatrics','Paediatrics','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Aditya Yadav','Obstetrics & Gynaecology','Obstetrics','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Myra Khan','Obstetrics & Gynaecology','Gynaecology','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Arjun Das','General Surgery','General Surgery','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Kiara Rao','Neurology','Neurology','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Reyansh Jain','Pulmonology','Respiratory Medicine','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Aadhya Tiwari','Dermatology','Dermatology','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Dhruv Sinha','Ophthalmology','Ophthalmology','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Pari Malhotra','Diagnostics & Imaging','Radiology','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Atharv Saxena','General Medicine','Diabetes Care','DEMO ONLY — fictional profile'),
  ('DEMO — Dr. Siya Chawla','Orthopaedics','Sports Injury','DEMO ONLY — fictional profile')
)
insert into public.doctors (facility_id, department_id, full_name, specialization, qualification, status)
select f.id, d.id, p.full_name, p.specialization, p.qualification, 'active'::public.doctor_status
from f cross join people p
join public.departments d on d.facility_id = f.id and d.name = p.department_name
where not exists (
  select 1 from public.doctors x where x.facility_id = f.id and x.full_name = p.full_name
);

-- 4) Simulated facility services
with f as (
  select id from public.facilities where name = 'SaarthiX Demo Hospital (DEMO ONLY)'
    and district = 'Kanpur Nagar' and state = 'Uttar Pradesh' order by created_at limit 1
), svc(name, description, status) as (
  values
  ('DEMO — 24/7 Emergency Desk','Simulated service; not a real emergency service','available'::public.availability_status),
  ('DEMO — Ambulance Coordination','Simulated availability only; do not use for emergencies','limited'::public.availability_status),
  ('DEMO — Outpatient Consultation','Simulated OPD workflow','available'::public.availability_status),
  ('DEMO — Inpatient Beds','Simulated bed availability; not live capacity','limited'::public.availability_status),
  ('DEMO — Teleconsultation','Simulated remote-care workflow','available'::public.availability_status),
  ('DEMO — Pharmacy Counter','Simulated pharmacy workflow','available'::public.availability_status),
  ('DEMO — Blood Bank Coordination','Simulated service; availability is not real','unavailable'::public.availability_status),
  ('DEMO — Wheelchair Assistance','Simulated support service','available'::public.availability_status),
  ('DEMO — Discharge Support','Simulated discharge workflow','available'::public.availability_status),
  ('DEMO — Follow-up Desk','Simulated follow-up coordination','available'::public.availability_status)
)
insert into public.facility_services (facility_id, name, description, status, is_active)
select f.id, s.name, s.description, s.status, true from f cross join svc s
where not exists (select 1 from public.facility_services x where x.facility_id = f.id and x.name = s.name);

-- 5) Diagnostics and imaging
with f as (
  select id from public.facilities where name = 'SaarthiX Demo Hospital (DEMO ONLY)'
    and district = 'Kanpur Nagar' and state = 'Uttar Pradesh' order by created_at limit 1
), diag(name, description, status) as (
  values
  ('DEMO — Complete Blood Count (CBC)','Simulated lab test availability','available'::public.availability_status),
  ('DEMO — Blood Glucose','Simulated lab test availability','available'::public.availability_status),
  ('DEMO — Lipid Profile','Simulated lab test availability','limited'::public.availability_status),
  ('DEMO — Liver Function Test','Simulated lab test availability','available'::public.availability_status),
  ('DEMO — Kidney Function Test','Simulated lab test availability','available'::public.availability_status),
  ('DEMO — Thyroid Profile','Simulated lab test availability','limited'::public.availability_status),
  ('DEMO — Urine Routine','Simulated lab test availability','available'::public.availability_status),
  ('DEMO — ECG','Simulated diagnostic availability','available'::public.availability_status),
  ('DEMO — X-Ray','Simulated imaging availability','available'::public.availability_status),
  ('DEMO — Ultrasound','Simulated imaging availability','limited'::public.availability_status),
  ('DEMO — CT Scan','Simulated imaging availability','unavailable'::public.availability_status),
  ('DEMO — MRI','Simulated imaging availability','limited'::public.availability_status)
)
insert into public.diagnostic_services (facility_id, name, description, status, is_active)
select f.id, d.name, d.description, d.status, true from f cross join diag d
where not exists (select 1 from public.diagnostic_services x where x.facility_id = f.id and x.name = d.name);

-- 6) Shared medicine master and demo inventory quantities.
-- Prefix makes simulated catalog rows unmistakable; stock figures are not real.
with meds(name, generic_name, strength, dosage_form, unit) as (
  values
  ('DEMO — Paracetamol','Paracetamol','500 mg','Tablet','tablet'),
  ('DEMO — ORS','Oral Rehydration Salts','Standard sachet','Powder sachet','sachet'),
  ('DEMO — Cetirizine','Cetirizine','10 mg','Tablet','tablet'),
  ('DEMO — Amoxicillin','Amoxicillin','500 mg','Capsule','capsule'),
  ('DEMO — Azithromycin','Azithromycin','500 mg','Tablet','tablet'),
  ('DEMO — Metformin','Metformin','500 mg','Tablet','tablet'),
  ('DEMO — Amlodipine','Amlodipine','5 mg','Tablet','tablet'),
  ('DEMO — Omeprazole','Omeprazole','20 mg','Capsule','capsule'),
  ('DEMO — Salbutamol Inhaler','Salbutamol','100 mcg/dose','Inhaler','inhaler'),
  ('DEMO — Normal Saline','Sodium Chloride','0.9% 500 ml','IV solution','bottle'),
  ('DEMO — Povidone-Iodine','Povidone-Iodine','5%','Solution','bottle'),
  ('DEMO — Ibuprofen','Ibuprofen','200 mg','Tablet','tablet'),
  ('DEMO — Iron Folic Acid','Iron + Folic Acid','Standard','Tablet','tablet'),
  ('DEMO — Vitamin B Complex','Vitamin B Complex','Standard','Tablet','tablet'),
  ('DEMO — Zinc','Zinc Sulphate','20 mg','Tablet','tablet'),
  ('DEMO — Ondansetron','Ondansetron','4 mg','Tablet','tablet'),
  ('DEMO — Dextrose IV','Dextrose','5% 500 ml','IV solution','bottle'),
  ('DEMO — Sterile Gauze','Medical dressing','10 cm x 10 cm','Dressing','pack'),
  ('DEMO — Surgical Gloves','Medical gloves','Standard','Disposable gloves','pair'),
  ('DEMO — Syringe','Medical syringe','5 ml','Disposable syringe','piece')
), inserted as (
  insert into public.medicines (name, generic_name, strength, dosage_form, unit, is_active)
  select m.name, m.generic_name, m.strength, m.dosage_form, m.unit, true
  from meds m where not exists (select 1 from public.medicines x where x.name = m.name)
  returning id, name
)
select count(*) from inserted;

with f as (
  select id from public.facilities where name = 'SaarthiX Demo Hospital (DEMO ONLY)'
    and district = 'Kanpur Nagar' and state = 'Uttar Pradesh' order by created_at limit 1
), stock(name, current_stock, minimum_stock, maximum_stock, unit) as (
  values
  ('DEMO — Paracetamol',850::numeric,100::numeric,1200::numeric,'tablet'),
  ('DEMO — ORS',90,20,150,'sachet'),
  ('DEMO — Cetirizine',70,20,100,'tablet'),
  ('DEMO — Amoxicillin',180,40,250,'capsule'),
  ('DEMO — Azithromycin',12,20,100,'tablet'),
  ('DEMO — Metformin',320,60,500,'tablet'),
  ('DEMO — Amlodipine',0,30,200,'tablet'),
  ('DEMO — Omeprazole',140,30,250,'capsule'),
  ('DEMO — Salbutamol Inhaler',18,10,40,'inhaler'),
  ('DEMO — Normal Saline',65,15,100,'bottle'),
  ('DEMO — Povidone-Iodine',25,10,50,'bottle'),
  ('DEMO — Ibuprofen',210,40,300,'tablet'),
  ('DEMO — Iron Folic Acid',95,25,200,'tablet'),
  ('DEMO — Vitamin B Complex',0,20,150,'tablet'),
  ('DEMO — Zinc',160,30,250,'tablet'),
  ('DEMO — Ondansetron',14,20,80,'tablet'),
  ('DEMO — Dextrose IV',42,10,80,'bottle'),
  ('DEMO — Sterile Gauze',8,15,50,'pack'),
  ('DEMO — Surgical Gloves',55,20,100,'pair'),
  ('DEMO — Syringe',110,30,200,'piece')
)
insert into public.medicine_inventory (facility_id, medicine_id, current_stock, minimum_stock, maximum_stock, unit)
select f.id, m.id, s.current_stock, s.minimum_stock, s.maximum_stock, s.unit
from f cross join stock s join public.medicines m on m.name = s.name
on conflict (facility_id, medicine_id) do update set
  current_stock = excluded.current_stock,
  minimum_stock = excluded.minimum_stock,
  maximum_stock = excluded.maximum_stock,
  unit = excluded.unit;

-- 7) Doctor availability for the next 14 days (fictional slots).
with demo_doctors as (
  select id, full_name from public.doctors
  where facility_id = (select id from public.facilities where name = 'SaarthiX Demo Hospital (DEMO ONLY)'
    and district = 'Kanpur Nagar' and state = 'Uttar Pradesh' order by created_at limit 1)
    and full_name like 'DEMO — Dr.%'
), days as (
  select current_date + n as availability_date from generate_series(0, 13) n
), slots(start_time, end_time, status, slot_num) as (
  values
  ('09:00'::time,'09:30'::time,'available'::public.availability_status,1),
  ('10:00'::time,'10:30'::time,'available'::public.availability_status,2),
  ('11:00'::time,'11:30'::time,'limited'::public.availability_status,3),
  ('14:00'::time,'14:30'::time,'available'::public.availability_status,4),
  ('16:00'::time,'16:30'::time,'unavailable'::public.availability_status,5)
)
insert into public.doctor_availability (doctor_id, availability_date, start_time, end_time, status)
select d.id, day.availability_date, s.start_time, s.end_time,
       case when s.status = 'unavailable' then 'unavailable'::public.availability_status else s.status end
from demo_doctors d
cross join days day
cross join lateral (select * from slots where ((abs(hashtext(d.full_name)) % 5) + slot_num + extract(doy from day.availability_date)::int) % 7 <> 0) s
where not exists (
  select 1 from public.doctor_availability a
  where a.doctor_id = d.id and a.availability_date = day.availability_date
    and a.start_time = s.start_time and a.end_time = s.end_time
);

commit;

-- Expected: 1 demo facility, 12 departments, 18 fictional demo doctors,
-- 10 facility services, 12 diagnostic services, 20 demo medicines/inventory rows,
-- and sample availability slots across 14 days.
-- This does not create patient accounts, health records, referrals or visits.
