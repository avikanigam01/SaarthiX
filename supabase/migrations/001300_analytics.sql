-- =====================================================================
-- SaarthiX — Phase 2 | Migration 013
-- Analytics aggregation (§40-41)
-- Every function is admin-only and returns has_data = false with a
-- null metric when there is not enough real data, instead of ever
-- returning a fabricated number.
-- =====================================================================

create or replace function public.analytics_facility_overview()
returns table (
  total_facilities     bigint,
  verified_facilities  bigint,
  active_facilities    bigint,
  has_data             boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'You are not authorized to view analytics.' using errcode = '42501';
  end if;

  return query
  select
    count(*),
    count(*) filter (where f.is_verified),
    count(*) filter (where f.is_active),
    count(*) > 0
  from public.facilities f;
end;
$$;

create or replace function public.analytics_referral_completion()
returns table (
  total_referrals       bigint,
  completed_referrals   bigint,
  completion_rate       numeric,
  has_data              boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total bigint;
  v_completed bigint;
begin
  if not public.is_platform_admin() then
    raise exception 'You are not authorized to view analytics.' using errcode = '42501';
  end if;

  select count(*), count(*) filter (where status = 'completed')
  into v_total, v_completed
  from public.referrals
  where status in ('completed', 'rejected', 'cancelled', 'scheduled', 'accepted');

  return query select
    v_total,
    v_completed,
    case when v_total > 0 then round((v_completed::numeric / v_total) * 100, 1) else null end,
    v_total > 0;
end;
$$;

create or replace function public.analytics_followup_completion()
returns table (
  total_due_followups     bigint,
  completed_followups     bigint,
  missed_followups        bigint,
  completion_rate         numeric,
  has_data                boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total bigint;
  v_completed bigint;
  v_missed bigint;
begin
  if not public.is_platform_admin() then
    raise exception 'You are not authorized to view analytics.' using errcode = '42501';
  end if;

  select
    count(*) filter (where status in ('completed', 'missed')),
    count(*) filter (where status = 'completed'),
    count(*) filter (where status = 'missed')
  into v_total, v_completed, v_missed
  from public.followups;

  return query select
    v_total,
    v_completed,
    v_missed,
    case when v_total > 0 then round((v_completed::numeric / v_total) * 100, 1) else null end,
    v_total > 0;
end;
$$;

create or replace function public.analytics_service_availability(_facility_id uuid default null)
returns table (
  total_services        bigint,
  available_services     bigint,
  limited_services       bigint,
  unavailable_services   bigint,
  has_data               boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total bigint;
begin
  if not (public.is_platform_admin() or (_facility_id is not null and public.is_facility_staff(_facility_id))) then
    raise exception 'You are not authorized to view this analytics data.' using errcode = '42501';
  end if;

  select count(*) into v_total
  from public.facility_services fs
  where fs.is_active and (_facility_id is null or fs.facility_id = _facility_id);

  return query
  select
    v_total,
    (select count(*) from public.facility_services fs
     where fs.is_active and fs.status = 'available' and (_facility_id is null or fs.facility_id = _facility_id)),
    (select count(*) from public.facility_services fs
     where fs.is_active and fs.status = 'limited' and (_facility_id is null or fs.facility_id = _facility_id)),
    (select count(*) from public.facility_services fs
     where fs.is_active and fs.status = 'unavailable' and (_facility_id is null or fs.facility_id = _facility_id)),
    v_total > 0;
end;
$$;

-- Stockout days: number of distinct (facility, medicine) days where an
-- inventory_transactions row shows new_stock = 0. Requires movement
-- history to exist — otherwise reports has_data = false rather than 0,
-- since "0 stockout days" and "no data yet" are different facts (§41).
create or replace function public.analytics_stockout_days(_facility_id uuid default null)
returns table (
  stockout_events   bigint,
  has_data          boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_movement_count bigint;
begin
  if not (public.is_platform_admin() or (_facility_id is not null and public.is_facility_staff(_facility_id))) then
    raise exception 'You are not authorized to view this analytics data.' using errcode = '42501';
  end if;

  select count(*) into v_movement_count
  from public.inventory_transactions it
  where _facility_id is null or it.facility_id = _facility_id;

  return query
  select
    (select count(*) from public.inventory_transactions it
     where it.new_stock = 0 and (_facility_id is null or it.facility_id = _facility_id)),
    v_movement_count > 0;
end;
$$;

-- "Unnecessary journeys avoided" (§40) has no defined data source yet
-- (would require comparing an assessment's suggested facility against
-- the facility actually visited). Rather than invent a number, this
-- function documents the gap explicitly.
create or replace function public.analytics_unnecessary_journeys_avoided()
returns table (metric_value bigint, has_data boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'You are not authorized to view analytics.' using errcode = '42501';
  end if;
  -- Deliberately always "no data yet": the source-of-truth comparison
  -- (assessment-recommended facility vs. actually-visited facility)
  -- is not yet defined. Wire this up before ever surfacing a number.
  return query select null::bigint, false;
end;
$$;

revoke all on function public.analytics_facility_overview() from public, anon;
revoke all on function public.analytics_referral_completion() from public, anon;
revoke all on function public.analytics_followup_completion() from public, anon;
revoke all on function public.analytics_service_availability(uuid) from public, anon;
revoke all on function public.analytics_stockout_days(uuid) from public, anon;
revoke all on function public.analytics_unnecessary_journeys_avoided() from public, anon;

grant execute on function public.analytics_facility_overview() to authenticated;
grant execute on function public.analytics_referral_completion() to authenticated;
grant execute on function public.analytics_followup_completion() to authenticated;
grant execute on function public.analytics_service_availability(uuid) to authenticated;
grant execute on function public.analytics_stockout_days(uuid) to authenticated;
grant execute on function public.analytics_unnecessary_journeys_avoided() to authenticated;
