-- =====================================================================
-- SaarthiX — Phase 2 | Migration 012
-- Facility matching (§19) — the single query the patient-facing
-- facility search page should call. Only ever returns verified,
-- active facilities; never ranks using invented/static data.
-- =====================================================================

create or replace function public.search_facilities(
  _department  text default null,
  _service     text default null,
  _diagnostic  text default null,
  _district    text default null,
  _state       text default null,
  _facility_type text default null,
  _latitude    numeric default null,
  _longitude   numeric default null,
  _limit       int default 20,
  _offset      int default 0
)
returns table (
  facility_id         uuid,
  name                text,
  facility_type       text,
  district            text,
  state               text,
  address             text,
  is_verified         boolean,
  distance_km         numeric,
  matched_department  text,
  matched_service     text,
  matched_diagnostic  text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    f.id,
    f.name,
    f.facility_type,
    f.district,
    f.state,
    f.address,
    f.is_verified,
    case
      when _latitude is not null and _longitude is not null
           and f.latitude is not null and f.longitude is not null
      then round(
        (
          6371 * acos(
            least(1, greatest(-1,
              cos(radians(_latitude)) * cos(radians(f.latitude))
              * cos(radians(f.longitude) - radians(_longitude))
              + sin(radians(_latitude)) * sin(radians(f.latitude))
            ))
          )
        )::numeric, 1
      )
      else null
    end as distance_km,
    d.name as matched_department,
    fsvc.name as matched_service,
    diag.name as matched_diagnostic
  from public.facilities f
  left join public.departments d
    on d.facility_id = f.id
   and d.is_active
   and (_department is null or d.name ilike '%' || _department || '%')
  left join public.facility_services fsvc
    on fsvc.facility_id = f.id
   and fsvc.is_active
   and (_service is null or fsvc.name ilike '%' || _service || '%')
  left join public.diagnostic_services diag
    on diag.facility_id = f.id
   and diag.is_active
   and (_diagnostic is null or diag.name ilike '%' || _diagnostic || '%')
  where
    f.is_verified
    and f.is_active
    and (_district is null or f.district ilike _district)
    and (_state is null or f.state ilike _state)
    and (_facility_type is null or f.facility_type ilike _facility_type)
    and (_department is null or d.id is not null)
    and (_service is null or fsvc.id is not null)
    and (_diagnostic is null or diag.id is not null)
  order by
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
    end asc nulls last,
    f.name asc
  limit greatest(1, least(_limit, 100))
  offset greatest(0, _offset);
$$;

comment on function public.search_facilities is
  'Patient-facing facility search (§19). Always filters to is_verified AND is_active; never returns unverified or suspended facilities regardless of caller role.';

revoke all on function public.search_facilities(
  text, text, text, text, text, text, numeric, numeric, int, int
) from public;
grant execute on function public.search_facilities(
  text, text, text, text, text, text, numeric, numeric, int, int
) to authenticated, anon;

-- ---------------------------------------------------------------------
-- Doctor availability lookup for a facility/department, restricted to
-- active doctors at verified/active facilities (mirrors the RLS shape
-- so this function never leaks more than direct table access would).
-- ---------------------------------------------------------------------
create or replace function public.search_available_doctors(
  _facility_id   uuid,
  _department_id uuid default null,
  _from_date     date default current_date,
  _to_date       date default current_date + interval '14 days'
)
returns table (
  doctor_id       uuid,
  full_name       text,
  specialization  text,
  department_name text,
  availability_date date,
  start_time      time,
  end_time        time,
  status          public.availability_status
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    doc.id,
    doc.full_name,
    doc.specialization,
    d.name,
    da.availability_date,
    da.start_time,
    da.end_time,
    da.status
  from public.doctors doc
  join public.facilities f on f.id = doc.facility_id
  left join public.departments d on d.id = doc.department_id
  join public.doctor_availability da on da.doctor_id = doc.id
  where doc.facility_id = _facility_id
    and doc.status = 'active'
    and f.is_verified and f.is_active
    and (_department_id is null or doc.department_id = _department_id)
    and da.availability_date between _from_date and _to_date
  order by da.availability_date asc, da.start_time asc;
$$;

revoke all on function public.search_available_doctors(uuid, uuid, date, date) from public;
grant execute on function public.search_available_doctors(uuid, uuid, date, date) to authenticated, anon;
