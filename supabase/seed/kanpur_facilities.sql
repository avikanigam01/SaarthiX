-- Publicly listed healthcare facilities in Kanpur Nagar.
-- Only fields supported by the cited public source are populated.
-- These records are intentionally NOT marked verified; admin must verify registration/contact directly.
-- This seed creates facility directory entries only; it does not create patients, doctors, schedules,
-- medicine inventory, diagnostic availability, or imply a partnership.
begin;

insert into public.facilities
  (name, facility_type, address, district, state, postal_code, phone, email,
   source_url, source_checked_at, source_notes, is_verified, is_active)
select v.name, v.facility_type, v.address, 'Kanpur Nagar', 'Uttar Pradesh', v.postal_code,
       v.phone, v.email, v.source_url, now(), v.source_notes, false, true
from (values
  ('KPM Hospital', 'government_hospital', 'Birhana Road, Naughara, Kanpur, Uttar Pradesh', null::text, null::text, null::text,
   'https://kanpurnagar.nic.in/public-utility-category/hospitals/', 'Name and address listed by Kanpur Nagar district administration.'),
  ('LLR Hospital (Hallet)', 'government_medical_college_hospital', 'Darshan Purwa, Sarvodaya Nagar, Kanpur, Uttar Pradesh 208002', '208002', null::text, null::text,
   'https://kanpurnagar.nic.in/public-utility-category/hospitals/', 'Name and address listed by Kanpur Nagar district administration.'),
  ('Regency Hospital (Tower-1)', 'private_multispecialty_hospital', 'A-2, Sarvodaya Nagar, Kanpur, Uttar Pradesh 208005', '208005', '92 2805 2805', 'info@regencyhealthcare.in',
   'https://regencyhealthcare.in/contact-us/', 'Address and contact details listed on the hospital official website.'),
  ('Regency Hospital Cancer and Gastro Care Centre (Tower-2)', 'private_specialty_hospital', 'A-4, Sarvodaya Nagar, Kanpur, Uttar Pradesh', null, '92 2805 2805', 'info@regencyhealthcare.in',
   'https://regencyhealthcare.in/contact-us/', 'Facility name, address and contact listed on the hospital official website.'),
  ('Regency Renal Sciences Hospital', 'private_specialty_hospital', '113/104A, Swaroop Nagar, Kanpur, Uttar Pradesh', null, '92 2805 2805', 'info@regencyhealthcare.in',
   'https://regencyhealthcare.in/contact-us/', 'Facility name, address and contact listed on the hospital official website.'),
  ('The Panacea Multi Super Specialty Hospital', 'private_specialty_hospital', '117/473 L Block, Kakadeo, Kanpur Nagar, Uttar Pradesh 208005', '208005', '0512 250 1355', 'panaceakanpur@gmail.com',
   'https://kanpurnagar.nic.in/public-utility-category/hospitals/', 'Name, address, phone and email listed by Kanpur Nagar district administration.'),
  ('UHM Government Hospital Kanpur', 'government_hospital', '39/24, Meston Road, Parade, Kanpur, Uttar Pradesh 208001', '208001', null, null,
   'https://kanpurnagar.nic.in/public-utility/uhm-govt-hospital-kanpur/', 'Name and address listed by Kanpur Nagar district administration.')
) as v(name, facility_type, address, postal_code, phone, email, source_url, source_notes)
where not exists (
  select 1 from public.facilities f
  where lower(trim(f.name)) = lower(trim(v.name))
    and lower(trim(f.district)) = 'kanpur nagar'
    and lower(trim(f.state)) = 'uttar pradesh'
);
commit;
