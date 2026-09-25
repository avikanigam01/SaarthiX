import { supabase } from "@/lib/supabase";
import { devLog, ServiceError } from "@/lib/errors";
import type { Assessment, AssessmentResponses } from "@/types/database";
import { unwrap, unwrapList } from "./_shared";

export type AssessmentInput = {
  patientId: string;
  needType: string;
  summary: string;
  responses: AssessmentResponses;
};

/** Saves the intake only. Urgency / care level / department are written by the Edge Function, never the client. */
export async function createAssessment(input: AssessmentInput): Promise<Assessment> {
  const res = await supabase
    .from("assessments")
    .insert({
      patient_id: input.patientId,
      assessment_type: input.needType,
      symptom_summary: input.summary || null,
      responses: input.responses,
      disclaimer_acknowledged: true,
    })
    .select("*")
    .single();
  return unwrap<Assessment>(res, "We couldn't save your assessment. Please try again.");
}

/** Asks the secure `assess` Edge Function for decision support on a saved assessment. */
export async function runAssessment(assessmentId: string): Promise<Assessment> {
  const { data, error } = await supabase.functions.invoke("assess", { body: { assessment_id: assessmentId } });
  if (error) {
    devLog("assessment.run", error);
    let code = "";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") code = ((await ctx.json()) as { error?: string }).error ?? "";
    } catch {
      /* ignore */
    }
    if (code === "ai_not_configured" || code === "ai_unavailable") {
      throw new ServiceError("Decision support is temporarily unavailable. Your answers are saved — you can try again in a moment. If you feel unwell, please seek care directly.", code);
    }
    throw new ServiceError("We couldn't complete the assessment right now. Please try again.", code);
  }
  const assessment = (data as { assessment?: Assessment } | null)?.assessment;
  if (!assessment) throw new ServiceError("We couldn't complete the assessment right now. Please try again.");
  return assessment;
}

export async function getAssessment(id: string): Promise<Assessment | null> {
  const res = await supabase.from("assessments").select("*").eq("id", id).maybeSingle();
  return unwrap<Assessment | null>(res, "Unable to load this assessment.");
}

export async function listMyAssessments(userId: string): Promise<Assessment[]> {
  const res = await supabase.from("assessments").select("*").eq("patient_id", userId).order("created_at", { ascending: false }).limit(20);
  return unwrapList<Assessment>(res, "Unable to load your assessments.");
}
