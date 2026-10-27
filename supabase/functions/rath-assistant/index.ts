// RATH voice/text gateway for SaarthiX.
// Uses the same Gemini configuration as the existing assess function:
// AI_PROVIDER=gemini, AI_API_KEY=<Gemini key>, AI_MODEL=<working Gemini model>.
// This endpoint only searches the verified public facility directory; it does not
// read patient records, create referrals, diagnose, or prescribe treatment.
import { createClient } from "npm:@supabase/supabase-js@2";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
async function authenticateRath(req: Request): Promise<boolean> {
  const expected = Deno.env.get("RATH_DEVICE_TOKEN") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  const supplied = match?.[1]?.trim() ?? "";
  if (expected.length < 32 || supplied.length < 32) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(supplied)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  return constantTimeEqual(new Uint8Array(a), new Uint8Array(b));
}
function corsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map(v => v.trim()).filter(Boolean);
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowed.length === 0 ? "*" : (allowed.includes(origin) ? origin : allowed[0]),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const MAX_TEXT_LENGTH = 1_000;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const EMERGENCY_TERMS = [
  "chest pain", "severe chest pain", "difficulty breathing", "cannot breathe", "not breathing",
  "unconscious", "severe bleeding", "stroke symptoms", "seene mein dard", "saans nahi",
  "saans lene mein dikkat", "behosh", "bahut khoon", "छाती में दर्द", "सीने में दर्द",
  "सांस लेने में दिक्कत", "बेहोश", "बहुत खून",
];
type Facility = { name: string; address: string; district: string; state: string; phone: string | null; facility_type: string };
function normalizeText(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function isEmergencyLanguage(text: string): boolean {
  const lower = text.toLocaleLowerCase();
  return EMERGENCY_TERMS.some(term => lower.includes(term));
}
function wantsHospital(text: string): boolean {
  return /hospital|clinic|health cent(re|er)|facility|doctor|aspataal|अस्पताल|हॉस्पिटल|डॉक्टर|स्वास्थ्य केंद्र|अस्पताल/i.test(text);
}
function extractDistrict(text: string): string | null {
  const explicit = /district\s*:\s*([a-z][a-z .'-]{1,50})/i.exec(text)?.[1]?.trim();
  if (explicit) return explicit.slice(0, 60);
  if (/\bkanpur\b|कानपुर/i.test(text)) return "Kanpur";
  return null;
}
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}
async function callGemini(parts: Array<Record<string, unknown>>, systemPrompt: string, maxOutputTokens = 700): Promise<string> {
  const provider = (Deno.env.get("AI_PROVIDER") ?? "").toLowerCase();
  const apiKey = Deno.env.get("AI_API_KEY") ?? "";
  const model = Deno.env.get("AI_MODEL") ?? "";
  if (provider !== "gemini") throw new Error("rath_requires_gemini_provider");
  if (!apiKey || !model) throw new Error("ai_not_configured");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens, thinkingConfig: { thinkingBudget: 0 } },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("RATH Gemini request failed", { status: response.status });
      throw new Error(response.status === 429 ? "gemini_rate_limited" : "gemini_request_failed");
    }
    const data = await response.json();
    const output = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(output) ? output.map((p: { text?: string }) => p.text ?? "").join("").trim() : "";
    if (!text) throw new Error("gemini_empty_response");
    return text;
  } finally { clearTimeout(timer); }
}
async function transcribeWithGemini(file: File): Promise<string> {
  if (file.size <= 0 || file.size > MAX_AUDIO_BYTES) throw new Error("audio_size_invalid");
  const mime = (file.type || "audio/wav").toLowerCase();
  const allowed = ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/aiff", "audio/aac", "audio/ogg", "audio/flac", "audio/webm"];
  if (!allowed.includes(mime)) throw new Error("unsupported_audio_type");
  const base64 = toBase64(new Uint8Array(await file.arrayBuffer()));
  return await callGemini([
    { text: "Transcribe the attached audio verbatim in the language spoken. Return only the transcript, without commentary. Preserve Hindi/English words as spoken." },
    { inlineData: { mimeType: mime === "audio/x-wav" ? "audio/wav" : mime, data: base64 } },
  ], "You are a speech transcription component. Return only the spoken words. Do not infer missing words or answer the speaker's question.", 500);
}
async function findFacilities(text: string): Promise<Facility[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("supabase_server_config_missing");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let query = supabase.from("facilities").select("name,address,district,state,phone,facility_type")
    .eq("is_active", true).eq("is_verified", true).order("name", { ascending: true }).limit(5);
  const district = extractDistrict(text);
  if (district) query = query.ilike("district", `%${district}%`);
  const { data, error } = await query;
  if (error) { console.error("RATH facility query failed", { code: error.code }); throw new Error("facility_lookup_failed"); }
  return (data ?? []) as Facility[];
}
function facilityReply(facilities: Facility[]): string {
  if (!facilities.length) return "I could not find a verified active facility matching that location in the SaarthiX directory. Please check the location or contact a local health worker.";
  const summary = facilities.slice(0, 3).map((f, i) => `${i + 1}. ${f.name}, ${f.address}, ${f.district}, ${f.state}${f.phone ? `, phone ${f.phone}` : ""}`).join(". ");
  return `Here are verified active facilities listed in SaarthiX: ${summary}. Please confirm availability directly with the facility before travelling.`;
}
Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, cors);
  if (!(await authenticateRath(req))) return jsonResponse({ error: "unauthorized_device" }, 401, cors);
  const requestId = crypto.randomUUID();
  try {
    const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
    const length = Number(req.headers.get("content-length") ?? "0");
    if (length > MAX_AUDIO_BYTES + 64 * 1024) return jsonResponse({ error: "request_too_large" }, 413, cors);
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
      text = await transcribeWithGemini(file);
    } else return jsonResponse({ error: "content_type_must_be_json_or_multipart_form_data" }, 415, cors);
    if (!text) return jsonResponse({ error: "text_or_audio_required" }, 400, cors);
    if (text.length > MAX_TEXT_LENGTH) return jsonResponse({ error: "text_too_long" }, 413, cors);

    // Emergency routing remains deterministic and does not wait for AI.
    if (isEmergencyLanguage(text)) {
      return jsonResponse({ ok: true, request_id: requestId, transcript: text, intent: "emergency_safety",
        reply_text: "This may be an emergency. Contact local emergency services or go to the nearest emergency department now. RATH cannot diagnose or replace a qualified healthcare professional.",
        audio_received: audioReceived, tts_endpoint: "/functions/v1/rath-speak",
        disclaimer: "Decision support and care coordination only; not a diagnosis or treatment recommendation." }, 200, cors);
    }
    if (wantsHospital(text)) {
      const facilities = await findFacilities(text);
      return jsonResponse({ ok: true, request_id: requestId, transcript: text, intent: "facility_search",
        reply_text: facilityReply(facilities), facilities,
        audio_received: audioReceived, tts_endpoint: "/functions/v1/rath-speak",
        disclaimer: "Directory information only. Confirm facility availability directly." }, 200, cors);
    }
    const reply = await callGemini([{ text }],
      "You are RATH, the voice assistant for SaarthiX Healthcare. Reply briefly and clearly in the user's language, including Hindi when the user speaks Hindi. Help with general healthcare navigation and SaarthiX use. Do not diagnose, prescribe medicine, recommend doses, or claim a hospital/referral is confirmed unless the system has verified that status. For symptoms suggesting emergency, tell the user to contact local emergency services or go to an emergency department. Keep the reply under 100 words.", 400);
    return jsonResponse({ ok: true, request_id: requestId, transcript: text, intent: "general", reply_text: reply,
      audio_received: audioReceived, tts_endpoint: "/functions/v1/rath-speak",
      disclaimer: "Decision support and care coordination only; not a diagnosis or treatment recommendation." }, 200, cors);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "audio_size_invalid" || message === "request_too_large" ? 413
      : message === "unsupported_audio_type" ? 415
      : message === "rath_requires_gemini_provider" || message === "ai_not_configured" ? 503
      : message === "gemini_rate_limited" ? 429
      : message === "gemini_request_failed" || message === "gemini_empty_response" ? 502 : 500;
    console.error("RATH assistant failed", { requestId, code: message });
    return jsonResponse({ error: status === 500 ? "rath_request_failed" : message, request_id: requestId }, status, cors);
  }
});
