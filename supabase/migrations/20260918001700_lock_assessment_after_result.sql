-- =====================================================================
-- SaarthiX — lock intake fields once a decision exists
-- After the Edge Function has stored a decision (urgency_level is set),
-- a patient must not be able to rewrite the intake (responses / summary)
-- the decision was based on. Service-role writes (auth.uid() is null)
-- are unaffected.
-- =====================================================================
create or replace function public.protect_assessment_ai_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.patient_id := old.patient_id;
  new.created_at := old.created_at;

  if auth.uid() is not null then
    new.urgency_level           := old.urgency_level;
    new.recommended_care_level  := old.recommended_care_level;
    new.recommended_department  := old.recommended_department;
    new.decision_support_output := old.decision_support_output;

    if old.urgency_level is not null then
      new.assessment_type := old.assessment_type;
      new.symptom_summary := old.symptom_summary;
      new.responses       := old.responses;
    end if;
  end if;

  return new;
end;
$$;
