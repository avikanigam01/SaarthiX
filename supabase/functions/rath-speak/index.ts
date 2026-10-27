// Convert RATH response text into audio. The provider key stays server-side.
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

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, cors);
  if (!(await authenticateRath(req))) return jsonResponse({ error: "unauthorized_device" }, 401, cors);

  const apiKey = Deno.env.get("RATH_OPENAI_API_KEY");
  if (!apiKey) return jsonResponse({ error: "tts_not_configured" }, 503, cors);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return jsonResponse({ error: "text_required" }, 400, cors);
  if (text.length > MAX_TEXT_LENGTH) return jsonResponse({ error: "text_too_long" }, 413, cors);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("RATH_TTS_MODEL") || "gpt-4o-mini-tts",
        voice: Deno.env.get("RATH_TTS_VOICE") || "alloy",
        input: text,
        response_format: "wav",
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("RATH TTS provider returned status", response.status);
      return jsonResponse({ error: "speech_generation_failed" }, 502, cors);
    }
    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("RATH TTS request failed", error instanceof Error ? error.message : "unknown_error");
    return jsonResponse({ error: "speech_generation_failed" }, 502, cors);
  } finally {
    clearTimeout(timer);
  }
});
