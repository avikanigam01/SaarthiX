-- =====================================================================
-- SaarthiX — fix: submitting a new assessment while an older journey is
-- already past the assessment step raised
--   "Journey stage cannot move backward ..."  (errcode 55000)
-- and the whole INSERT was rolled back ("This action is not allowed in
-- the current state").
--
-- New behaviour:
--   * active journey still at need_submitted / assessment_completed
--       -> reuse it (as before)
--   * active journey already further along (facility chosen, visit,
--     referral, ...) -> this is a NEW care need: close the old journey as
--     'cancelled' and open a fresh one.
-- Existing visits / referrals / follow-ups keep their own records.
-- =====================================================================
create or replace function public.handle_assessment_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_journey_id uuid;
  v_stage      public.journey_stage;
begin
  select id, current_stage into v_journey_id, v_stage
  from public.patient_journeys
  where patient_id = new.patient_id and status = 'active'
  order by created_at desc
  limit 1;

  if v_journey_id is not null
     and v_stage not in ('need_submitted', 'assessment_completed') then
    update public.patient_journeys set status = 'cancelled' where id = v_journey_id;
    v_journey_id := null;
  end if;

  if v_journey_id is null then
    insert into public.patient_journeys (patient_id, assessment_id, current_stage)
    values (new.patient_id, new.id, 'need_submitted')
    returning id into v_journey_id;
  else
    update public.patient_journeys set assessment_id = new.id where id = v_journey_id;
  end if;

  perform public.advance_journey_stage(v_journey_id, 'assessment_completed');
  return new;
end;
$$;
