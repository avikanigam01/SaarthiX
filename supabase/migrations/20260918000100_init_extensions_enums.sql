-- =====================================================================
-- SaarthiX — Phase 2 | Migration 001
-- Extensions + shared ENUM types
-- No seed data. No demo records.
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum (
    'patient',
    'hospital_staff',
    'hospital_admin',
    'referral_coordinator',
    'government_admin',
    'super_admin'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Availability (departments, facility_services, diagnostic_services,
-- doctor_availability)
-- ---------------------------------------------------------------------
do $$ begin
  create type public.availability_status as enum (
    'available',
    'limited',
    'unavailable'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Doctors
-- ---------------------------------------------------------------------
do $$ begin
  create type public.doctor_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Assessments
-- ---------------------------------------------------------------------
do $$ begin
  create type public.urgency_level as enum ('routine', 'moderate', 'urgent');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Referrals
-- ---------------------------------------------------------------------
do $$ begin
  create type public.referral_status as enum (
    'pending',
    'accepted',
    'rejected',
    'scheduled',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Visits
-- ---------------------------------------------------------------------
do $$ begin
  create type public.visit_status as enum (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Follow-ups
-- ---------------------------------------------------------------------
do $$ begin
  create type public.followup_status as enum (
    'scheduled',
    'completed',
    'missed',
    'rescheduled',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Inventory movement
-- ---------------------------------------------------------------------
do $$ begin
  create type public.inventory_transaction_type as enum (
    'stock_in',
    'stock_out',
    'adjustment',
    'expiry',
    'return'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Derived inventory status (returned by functions/views, not stored)
-- ---------------------------------------------------------------------
do $$ begin
  create type public.stock_status as enum (
    'in_stock',
    'low_stock',
    'out_of_stock'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Patient journey
-- ---------------------------------------------------------------------
do $$ begin
  create type public.journey_stage as enum (
    'need_submitted',
    'assessment_completed',
    'facility_identified',
    'availability_confirmed',
    'visit',
    'referral',
    'followup',
    'completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.journey_status as enum ('active', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Shared updated_at trigger function (§47)
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Reusable BEFORE UPDATE trigger: keeps updated_at accurate regardless of client input.';
