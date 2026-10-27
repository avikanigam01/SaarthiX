// RATH voice/text gateway for SaarthiX.
// This endpoint is a voice interface and public verified-facility directory helper.
// It does not diagnose, prescribe, access patient records, or create referrals.
import { createClient } from "npm:@supabase/supabase-js@2";
// Dashboard-friendly RATH helper functions: kept in this file so it can be deployed
// from Supabase Dashboard without a cross-function ../_shared import.
function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length; const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
async function authenticateRath(req: Request): Promise<boolean> {
  const expected = Deno.env.get("RATH_DEVICE_TOKEN") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  const supplied = match?.[1]?.trim() ?? "";
  if (expected.length < 32 || supplied.length < 32) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(supplied)), crypto.subtle.digest("SHA-256", encoder.encode(expected))]);
  return constantTimeEqual(new Uint8Array(a), new Uint8Array(b));
}
function corsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map(v => v.trim()).filter(Boolean);
  const origin = req.headers.get("origin") ?? "";
  return { "Access-Control-Allow-Origin": allowed.length === 0 ? "*" : (allowed.includes(origin) ? origin : allowed[0]), "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}

const MAX_TEXT_LENGTH = 1_000;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const EMERGENCY_TERMS = [
  "chest pain", "severe chest pain", "difficulty breathing", "cannot breathe",
  "not breathing", "unconscious", "severe bleeding", "stroke symptoms",
  "seene mein dard", "saans nahi", "saans lene mein dikkat", "behosh", "bahut khoon",
];

type Facility = {
  name: string;
  address: string;
  district: string;
  state: string;
  phone: string | null;
  facility_type: string;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function transcribeAudio(file: File): Promise<string> {
  const key = Deno.env.get("RATH_OPENAI_API_KEY");
  if (!key) throw new Error("audio_transcription_not_configured");
  if (file.size <= 0 || file.size > MAX_AUDIO_BYTES) throw new Error("audio_size_invalid");

  const form = new FormData();
  form.append("file", file, file.name || "rath-audio.wav");
  form.append("model", Deno.env.get("RATH_STT_MODEL") || "gpt-4o-mini-transcribe");
  form.append("response_format", "json");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("RATH STT provider returned status", response.status);
      throw new Error("transcription_failed");
    }
    const data = await response.json();
    const transcript = normalizeText(data?.text);
    if (!transcript) throw new Error("empty_transcript");
    return transcript;
  } finally {
    clearTimeout(timer);
  }
}

function isEmergencyLanguage(text: string): boolean {
  const lower = text.toLocaleLowerCase();
  return EMERGENCY_TERMS.some((term) => lower.includes(term));
}

function wantsHospital(text: string): boolean {
  return /hospital|clinic|health cent(re|er)|facility|doctor|aspataal|अस्पताल|हॉस्पिटल|डॉक्टर|स्वास्थ्य केंद्र/i.test(text);
}

function extractDistrict(text: string): string | null {
  // Start with the project's primary demo area; accept a small explicit `district:` hint too.
  const explicit = /district\s*:\s*([a-z][a-z .'-]{1,50})/i.exec(text)?.[1]?.trim();
  if (explicit) return explicit.slice(0, 60);
  if (/\bkanpur\b|कानपुर/i.test(text)) return "Kanpur";
  return null;
}

async function findFacilities(text: string): Promise<Facility[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("supabase_server_config_missing");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let query = supabase
    .from("facilities")
    .select("name,address,district,state,phone,facility_type")
    .eq("is_active", true)
    .eq("is_verified", true)
    .order("name", { ascending: true })
    .limit(5);
  const district = extractDistrict(text);
  if (district) query = query.ilike("district", `%${district}%`);

  const { data, error } = await query;
  if (error) {
    console.error("RATH facility directory query failed", error.code);
    throw new Error("facility_lookup_failed");
  }
  return (data ?? []) as Facility[];
}

function buildReply(text: string, facilities: Facility[] | null): { reply: string; intent: string } {
  if (isEmergencyLanguage(text)) {
    return {
      intent: "emergency_safety",
      reply: "This may be an emergency. Contact local emergency services or go to the nearest emergency department now. RATH cannot diagnose or replace a qualified healthcare professional.",
    };
  }

  if (facilities !== null) {
    if (facilities.length === 0) {
      return {
        intent: "facility_search",
        reply: "I could not find a verified active facility matching that location in the SaarthiX directory. Please check the location or contact a local health worker.",
      };
    }
    const summary = facilities.slice(0, 3).map((facility, index) => {
      const phone = facility.phone ? `, phone ${facility.phone}` : "";
      return `${index + 1}. ${facility.name}, ${facility.address}, ${facility.district}, ${facility.state}${phone}`;
    }).join(". ");
    return {
      intent: "facility_search",
      reply: `Here are verified active facilities listed in SaarthiX: ${summary}. Please confirm availability directly with the facility before travelling.`,
    };
  }

  return {
    intent: "general",
    reply: "Hello, I am RATH, the SaarthiX voice assistant. I can help search the verified healthcare facility directory. You can ask for hospitals in a district. I do not diagnose or prescribe treatment.",
  };
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, cors);
  if (!(await authenticateRath(req))) return jsonResponse({ error: "unauthorized_device" }, 401, cors);

  const requestId = crypto.randomUUID();
  try {
    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > MAX_AUDIO_BYTES + 64 * 1024) {
      return jsonResponse({ error: "request_too_large" }, 413, cors);
    }
    let text = "";
    let audioReceived = false;

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null) as Record<string, unknown> | null;
      text = normalizeText(body?.text);
    } else if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("audio");
      if (!(file instanceof File)) return jsonResponse({ error: "audio_file_required" }, 400, cors);
      audioReceived = true;
      text = await transcribeAudio(file);
    } else {
      return jsonResponse({ error: "content_type_must_be_json_or_multipart_form_data" }, 415, cors);
    }

    if (!text) return jsonResponse({ error: "text_or_audio_required" }, 400, cors);
    if (text.length > MAX_TEXT_LENGTH) return jsonResponse({ error: "text_too_long" }, 413, cors);

    const facilities = wantsHospital(text) && !isEmergencyLanguage(text)
      ? await findFacilities(text)
      : null;
    const result = buildReply(text, facilities);

    return jsonResponse({
      ok: true,
      request_id: requestId,
      transcript: text,
      intent: result.intent,
      reply_text: result.reply,
      facilities: facilities ?? undefined,
      audio_received: audioReceived,
      tts_endpoint: "/functions/v1/rath-speak",
      disclaimer: "Decision support and care coordination only; not a diagnosis or treatment recommendation.",
    }, 200, cors);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "audio_size_invalid" ? 413
      : message === "audio_transcription_not_configured" ? 503
      : message === "transcription_failed" ? 502
      : 500;
    console.error("RATH assistant request failed", { requestId, code: message });
    return jsonResponse({ error: status === 500 ? "rath_request_failed" : message, request_id: requestId }, status, cors);
  }
});
