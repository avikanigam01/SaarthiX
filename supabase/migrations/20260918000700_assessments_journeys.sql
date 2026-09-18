-- =====================================================================
-- SaarthiX — Phase 2 | Migration 007
-- assessments (§17), patient_journeys (§26)
--
-- An assessment is patient-authored intake data; urgency_level,
-- recommended_care_level, recommended_department, and
-- decision_support_output are written ONLY by the AI Edge Function
-- (via the service role), never directly by the patient's client.
-- Submitting an assessment automatically opens (or advances) the
-- patient's journey — journey stage is never set by hand from the
-- frontend.
-- =====================================================================

-- ---------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------
create table if not exists public.assessments (
  id                        uuid primary key default gen_random_uuid(),
  patient_id                uuid not null references public.profiles(id) on delete cascade,
  assessment_type           text not null,
  symptom_summary           text,
  responses                 jsonb not null default '{}'::jsonb,
  urgency_level             public.urgency_level,
  recommended_care_level    text,
  recommended_department    text,
  decision_support_output   jsonb,
  disclaimer_acknowledged   boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint assessments_type_not_blank check (length(btrim(assessment_type)) > 0),
  constraint assessments_disclaimer_required check (disclaimer_acknowledged is true)
);

comment on table public.assessments is
  'Patient intake + AI decision-support output. Sensitive: patient sees only their own; urgency/care-level/department/decision_support_output are written only by the Edge Function via service role.';

create index if not exists assessments_patient_id_idx  on public.assessments (patient_id);
create index if not exists assessments_created_at_idx  on public.assessments (created_at);
create index if not exists assessments_urgency_idx     on public.assessments (urgency_level);

drop trigger if exists assessments_set_updated_at on public.assessments;
create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

-- A patient may create and edit their raw intake fields, but must never
-- write the AI-decided fields themselves (§18: "Do not allow AI to
-- write arbitrary database fields" implies the reverse guarantee too —
-- a patient must not write the AI's fields either).
create or replace function public.protect_assessment_ai_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.patient_id := old.patient_id;
  new.created_at := old.created_at;

  -- The service role (Edge Function) bypasses RLS/auth.uid() entirely,
  -- so auth.uid() is null in that context and this branch is skipped.
  if auth.uid() is not null then
    new.urgency_level           := old.urgency_level;
    new.recommended_care_level  := old.recommended_care_level;
    new.recommended_department  := old.recommended_department;
    new.decision_support_output := old.decision_support_output;
  end if;

  return new;
end;
$$;

drop trigger if exists assessments_protect_ai_columns on public.assessments;
create trigger assessments_protect_ai_columns
  before update on public.assessments
  for each row execute function public.protect_assessment_ai_columns();

alter table public.assessments enable row level security;
alter table public.assessments force row level security;

drop policy if exists assessments_select_own on public.assessments;
create policy assessments_select_own
  on public.assessments for select
  to authenticated
  using (patient_id = auth.uid());

drop policy if exists assessments_insert_own on public.assessments;
create policy assessments_insert_own
  on public.assessments for insert
  to authenticated
  with check (
    patient_id = auth.uid()
    and urgency_level is null
    and recommended_care_level is null
    and recommended_department is null
    and decision_support_output is null
  );

drop policy if exists assessments_update_own on public.assessments;
create policy assessments_update_own
  on public.assessments for update
  to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- Authorized clinical/coordinator access is scoped later (referral
-- migration) to only the assessment tied to a referral they handle —
-- never a patient's full assessment history.
drop policy if exists assessments_select_admin on public.assessments;
create policy assessments_select_admin
  on public.assessments for select
  to authenticated
  using (public.is_platform_admin());

-- No DELETE policy: assessment records are permanent clinical history.

-- ---------------------------------------------------------------------
-- patient_journeys (§26)
-- ---------------------------------------------------------------------
create table if not exists public.patient_journeys (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  current_stage public.journey_stage not null default 'need_submitted',
  status        public.journey_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.patient_journeys is
  'current_stage is advanced only by public.advance_journey_stage(), called from triggers on assessments/referrals/visits/followups — never set directly by any client.';

create index if not exists patient_journeys_patient_id_idx on public.patient_journeys (patient_id);
create index if not exists patient_journeys_status_idx     on public.patient_journeys (status);

drop trigger if exists patient_journeys_set_updated_at on public.patient_journeys;
create trigger patient_journeys_set_updated_at
  before update on public.patient_journeys
  for each row execute function public.set_updated_at();

-- Central, ordered stage-advance function. Later migrations (referrals,
-- visits, followups) call this instead of writing current_stage
-- directly, so the journey can only move forward through real
-- workflow events (§26: "derived from real workflow events").
create or replace function public.advance_journey_stage(
  _journey_id uuid,
  _stage      public.journey_stage
)
returns public.patient_journeys
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row   public.patient_journeys;
  v_order constant public.journey_stage[] := array[
    'need_submitted', 'assessment_completed', 'facility_identified',
    'availability_confirmed', 'visit', 'referral', 'followup', 'completed'
  ]::public.journey_stage[];
  v_current_idx int;
  v_target_idx  int;
begin
  select * into v_row from public.patient_journeys where id = _journey_id for update;
  if v_row.id is null then
    raise exception 'Journey not found.' using errcode = 'P0002';
  end if;

  if v_row.status <> 'active' then
    raise exception 'Journey is not active.' using errcode = '55000';
  end if;

  select i into v_current_idx from unnest(v_order) with ordinality as t(s, i) where s = v_row.current_stage;
  select i into v_target_idx  from unnest(v_order) with ordinality as t(s, i) where s = _stage;

  if v_target_idx < v_current_idx then
    -- Referral/visit/followup loops can legitimately revisit an earlier
    -- stage (e.g. a new referral cycle); allow same-or-forward only
    -- within one cycle, but never regress past what already happened
    -- by more than one step back into 'referral'/'visit'/'followup'.
    if not (_stage in ('visit', 'referral', 'followup')) then
      raise exception 'Journey stage cannot move backward from % to %.', v_row.current_stage, _stage
        using errcode = '55000';
    end if;
  end if;

  update public.patient_journeys
  set current_stage = _stage,
      status = case when _stage = 'completed' then 'completed' else status end
  where id = _journey_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.advance_journey_stage(uuid, public.journey_stage) from public, anon, authenticated;

alter table public.patient_journeys enable row level security;
alter table public.patient_journeys force row level security;

drop policy if exists patient_journeys_select_own on public.patient_journeys;
create policy patient_journeys_select_own
  on public.patient_journeys for select
  to authenticated
  using (patient_id = auth.uid());

drop policy if exists patient_journeys_select_admin on public.patient_journeys;
create policy patient_journeys_select_admin
  on public.patient_journeys for select
  to authenticated
  using (public.is_platform_admin());

-- No INSERT/UPDATE/DELETE policy for anyone: journeys are created and
-- advanced only by trigger functions running as SECURITY DEFINER.

-- ---------------------------------------------------------------------
-- Assessment submission opens (or reuses) the patient's active journey
-- and advances it to 'assessment_completed'.
-- ---------------------------------------------------------------------
create or replace function public.handle_assessment_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_journey_id uuid;
begin
  select id into v_journey_id
  from public.patient_journeys
  where patient_id = new.patient_id and status = 'active'
  order by created_at desc
  limit 1;

  if v_journey_id is null then
    insert into public.patient_journeys (patient_id, assessment_id, current_stage)
    values (new.patient_id, new.id, 'need_submitted')
    returning id into v_journey_id;
  else
    update public.patient_journeys
    set assessment_id = new.id
    where id = v_journey_id;
  end if;

  perform public.advance_journey_stage(v_journey_id, 'assessment_completed');

  return new;
end;
$$;

drop trigger if exists assessments_open_journey on public.assessments;
create trigger assessments_open_journey
  after insert on public.assessments
  for each row execute function public.handle_assessment_insert();
