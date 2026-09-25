import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { AppLink, LinkButton } from "@/components/data/app-link";
import { InlineError, PageHeader, Panel } from "@/components/data/layout";
import { StatusPill } from "@/components/data/status-pill";
import { CheckField, SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { SafetyNotice } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { useZodForm } from "@/hooks/use-zod-form";
import { useCurrentUser } from "@/lib/auth-context";
import { devLog, toUserMessage } from "@/lib/errors";
import { createAssessment, runAssessment } from "@/services/assessment";
import type { Assessment } from "@/types/database";
import { useQueryClient } from "@tanstack/react-query";

const NEEDS = [
  { value: "symptoms", label: "I have symptoms or a health concern" },
  { value: "specialist", label: "I need to see a specialist" },
  { value: "diagnostic", label: "I need a test or scan" },
  { value: "medicine", label: "I need a medicine" },
  { value: "followup", label: "I need follow-up care" },
  { value: "other", label: "Something else" },
];

const DURATIONS = [
  { value: "less-than-a-day", label: "Less than a day" },
  { value: "1-3 days", label: "1–3 days" },
  { value: "4-7 days", label: "4–7 days" },
  { value: "1-4 weeks", label: "1–4 weeks" },
  { value: "over-a-month", label: "More than a month" },
];

const SEVERITIES = [
  { value: "mild", label: "Mild — I can carry on normally" },
  { value: "moderate", label: "Moderate — it's affecting my day" },
  { value: "severe", label: "Severe — it's very hard to cope" },
];

const WARNING_SIGNS = [
  { value: "chest_pain", label: "Chest pain or pressure" },
  { value: "breathing_difficulty", label: "Severe difficulty breathing" },
  { value: "heavy_bleeding", label: "Heavy bleeding that won't stop" },
  { value: "unconscious", label: "Fainting or loss of consciousness" },
  { value: "stroke_signs", label: "Sudden weakness, confusion or trouble speaking" },
  { value: "severe_injury", label: "Serious injury or accident" },
];

const schema = z.object({
  needType: z.string().min(1, "Choose what you need help with."),
  summary: z.string().trim().min(3, "Please describe what you need in a few words.").max(1000, "Please keep this under 1000 characters."),
  duration: z.string().min(1, "Tell us how long this has been going on."),
  severity: z.string().min(1, "Tell us how severe it feels."),
  district: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  acknowledged: z.boolean().refine((v) => v === true, "Please confirm you understand before continuing."),
});

export default function PatientAssessmentPage() {
  const { userId, profile } = useCurrentUser();
  const queryClient = useQueryClient();
  const [signs, setSigns] = useState<string[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [result, setResult] = useState<Assessment | null>(null);

  const form = useZodForm(schema, {
    needType: "", summary: "", duration: "", severity: "",
    district: profile?.district ?? "", state: profile?.state ?? "",
    acknowledged: false,
  });

  const run = useMutation({
    mutationFn: (id: string) => runAssessment(id),
    onSuccess: (assessment) => {
      setResult(assessment);
      void queryClient.invalidateQueries({ queryKey: ["journey-active", userId] });
    },
    onError: (e) => devLog("assessment.run", e),
  });

  const submit = useMutation({
    mutationFn: async () => {
      const parsed = form.validate();
      if (!parsed) throw new Error("validation");
      const saved = await createAssessment({
        patientId: userId,
        needType: parsed.needType,
        summary: parsed.summary,
        responses: {
          summary: parsed.summary,
          duration: parsed.duration,
          severity: parsed.severity,
          warning_signs: signs,
          ...(parsed.district ? { district: parsed.district } : {}),
          ...(parsed.state ? { state: parsed.state } : {}),
        },
      });
      setSavedId(saved.id);
      return saved;
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["journey-active", userId] });
      run.mutate(saved.id);
    },
    onError: (e) => { if ((e as Error).message !== "validation") devLog("assessment.save", e); },
  });

  const reset = () => { setResult(null); setSavedId(null); setSigns([]); form.reset(); submit.reset(); run.reset(); };

  if (result) return <ResultView assessment={result} onStartOver={reset} />;

  const busy = submit.isPending || run.isPending;
  const submitError = submit.isError && (submit.error as Error).message !== "validation" ? toUserMessage(submit.error, "We couldn't save your assessment. Please try again.") : null;
  const runError = run.isError ? toUserMessage(run.error, "We couldn't complete the assessment right now.") : null;

  return (
    <>
      <PageHeader eyebrow="Care assessment" title="Tell us what you need" description="A few questions help us suggest the right level of care. This is decision support — not a diagnosis." />
      <div className="mb-6"><SafetyNotice emergency /></div>

      {savedId && runError ? (
        <Panel title="Your answers are saved">
          <InlineError message={runError} />
          <div className="mt-4 flex gap-2">
            <Button onClick={() => run.mutate(savedId)} disabled={run.isPending}><RotateCcw aria-hidden="true" /> Try again</Button>
            <Button variant="outline" onClick={reset}>Start over</Button>
          </div>
        </Panel>
      ) : (
        <form
          noValidate
          onSubmit={(e) => { e.preventDefault(); if (!busy) submit.mutate(); }}
          className="grid gap-6"
        >
          <Panel title="1. Your need">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="What do you need help with?" required placeholder="Select…" options={NEEDS} {...form.bind("needType")} />
              <SelectField label="How long has this been going on?" required placeholder="Select…" options={DURATIONS} {...form.bind("duration")} />
              <TextAreaField className="sm:col-span-2" label="Describe it in your own words" required rows={4} maxLength={1000} hint="Don't include your name or ID number. Just what you're experiencing or need." {...form.bind("summary")} />
              <SelectField label="How severe does it feel?" required placeholder="Select…" options={SEVERITIES} {...form.bind("severity")} />
            </div>
          </Panel>

          <Panel title="2. Warning signs" description="Tick any that apply right now. If any do, seek emergency care immediately.">
            <div className="grid gap-3 sm:grid-cols-2">
              {WARNING_SIGNS.map((s) => (
                <CheckField key={s.value} label={s.label} checked={signs.includes(s.value)} onChange={(c) => setSigns((cur) => c ? [...cur, s.value] : cur.filter((v) => v !== s.value))} />
              ))}
            </div>
            {signs.length > 0 ? (
              <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p><strong>This may be an emergency.</strong> Please go to the nearest emergency department or call your local emergency number now. Don't wait for the result of this assessment.</p>
              </div>
            ) : null}
          </Panel>

          <Panel title="3. Your area (optional)" description="Helps us suggest facilities near you.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="District" autoComplete="address-level2" {...form.bind("district")} />
              <TextField label="State" autoComplete="address-level1" {...form.bind("state")} />
            </div>
          </Panel>

          <CheckField
            label="I understand this is decision support, not a diagnosis"
            description="SaarthiX does not replace a qualified healthcare professional."
            checked={form.values.acknowledged === true}
            onChange={(c) => form.set("acknowledged", c)}
          />
          {form.errors.acknowledged ? <p role="alert" className="-mt-4 text-xs font-medium text-danger">{form.errors.acknowledged}</p> : null}
          {submitError ? <InlineError message={submitError} /> : null}
          <div>
            <Button type="submit" size="lg" disabled={busy}>{submit.isPending ? "Saving…" : run.isPending ? "Preparing your result…" : "Get my result"}</Button>
          </div>
        </form>
      )}
    </>
  );
}

function ResultView({ assessment, onStartOver }: { assessment: Assessment; onStartOver: () => void }) {
  const urgent = assessment.urgency_level === "urgent";
  const output = assessment.decision_support_output;
  return (
    <>
      <PageHeader eyebrow="Assessment result" title="Your next safe step" description="Generated by decision-support software from what you shared. It is not a medical diagnosis." />
      {urgent ? (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-5 text-danger">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm"><strong>Please seek care now.</strong> Go to the nearest emergency department or call your local emergency number. Do not wait for an appointment.</p>
        </div>
      ) : null}
      <Panel>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Urgency</p><div className="mt-2">{assessment.urgency_level ? <StatusPill status={assessment.urgency_level} /> : "—"}</div></div>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested level of care</p><p className="mt-2 text-sm font-medium">{assessment.recommended_care_level ?? "—"}</p></div>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested department</p><p className="mt-2 text-sm font-medium">{assessment.recommended_department ?? "—"}</p></div>
        </div>
        {output?.rationale ? <p className="mt-5 rounded-xl bg-muted/60 p-4 text-sm leading-relaxed text-foreground">{output.rationale}</p> : null}
        {output?.safety_flags && output.safety_flags.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-semibold">Seek urgent care if:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{output.safety_flags.map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <LinkButton to="/patient/facilities" variant="default">Find a facility</LinkButton>
          <AppLink to="/patient/journey" className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs font-medium hover:bg-accent">View my journey</AppLink>
          <Button size="sm" variant="ghost" onClick={onStartOver}><RotateCcw aria-hidden="true" /> Start over</Button>
        </div>
      </Panel>
      <div className="mt-6"><SafetyNotice emergency={urgent} /></div>
    </>
  );
}
