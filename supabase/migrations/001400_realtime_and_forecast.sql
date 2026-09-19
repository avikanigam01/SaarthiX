-- =====================================================================
-- SaarthiX — Phase 2 | Migration 014
-- Realtime (§38) + medicine_demand_forecasts structure only (§42)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Realtime: only the tables the spec explicitly calls out as needing
-- live UI updates. Notifications and assessments are excluded from
-- realtime broadcast of full row contents since they can carry
-- sensitive health text; the frontend should poll or use a narrower
-- notification-count channel for those instead.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.referrals;
alter publication supabase_realtime add table public.facility_services;
alter publication supabase_realtime add table public.diagnostic_services;
alter publication supabase_realtime add table public.followups;
alter publication supabase_realtime add table public.doctor_availability;

-- ---------------------------------------------------------------------
-- medicine_demand_forecasts (§42)
-- Structure only — no forecasting logic ships in Phase 2. Output is a
-- recommendation/risk signal; procurement stays human-controlled, so
-- there is no trigger or function here that acts on this table.
-- ---------------------------------------------------------------------
create table if not exists public.medicine_demand_forecasts (
  id                 uuid primary key default gen_random_uuid(),
  facility_id        uuid not null references public.facilities(id) on delete cascade,
  medicine_id        uuid not null references public.medicines(id) on delete cascade,
  forecast_date      date not null,
  forecast_horizon    text not null,
  predicted_demand   numeric,
  model_version      text,
  generated_at       timestamptz,
  created_at         timestamptz not null default now(),

  constraint medicine_demand_forecasts_predicted_nonneg
    check (predicted_demand is null or predicted_demand >= 0)
);

comment on table public.medicine_demand_forecasts is
  'Structure only for a future forecasting module (§42). No forecasting job populates this table yet; do not display its contents as an active feature until one does.';

create index if not exists medicine_demand_forecasts_facility_id_idx
  on public.medicine_demand_forecasts (facility_id);
create index if not exists medicine_demand_forecasts_medicine_id_idx
  on public.medicine_demand_forecasts (medicine_id);
create index if not exists medicine_demand_forecasts_forecast_date_idx
  on public.medicine_demand_forecasts (forecast_date);

alter table public.medicine_demand_forecasts enable row level security;
alter table public.medicine_demand_forecasts force row level security;

drop policy if exists medicine_demand_forecasts_select_staff_admin on public.medicine_demand_forecasts;
create policy medicine_demand_forecasts_select_staff_admin
  on public.medicine_demand_forecasts for select
  to authenticated
  using (public.is_facility_staff(facility_id) or public.is_platform_admin());

-- No INSERT/UPDATE/DELETE policy yet: nothing writes to this table
-- until a forecasting job is built and explicitly granted access.
