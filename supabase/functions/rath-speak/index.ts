// RATH Gemini text-to-speech endpoint.
// Uses GEMINI_API_KEY if set, otherwise the existing AI_API_KEY from assess.
// Default TTS model is configurable via RATH_TTS_MODEL. Audio is returned as WAV.
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
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(supplied)), crypto.subtle.digest("SHA-256", enc.encode(expected))]);
  return constantTimeEqual(new Uint8Array(a), new Uint8Array(b));
}
function corsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map(v => v.trim()).filter(Boolean);
  const origin = req.headers.get("origin") ?? "";
  return { "Access-Control-Allow-Origin": allowed.length === 0 ? "*" : (allowed.includes(origin) ? origin : allowed[0]),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
}
function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function pcmToWav(pcm: Uint8Array, sampleRate = 24000, channels = 1, bitsPerSample = 16): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  write(0, "RIFF"); view.setUint32(4, 36 + pcm.length, true); write(8, "WAVE"); write(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * channels * bitsPerSample / 8, true);
  view.setUint16(32, channels * bitsPerSample / 8, true); view.setUint16(34, bitsPerSample, true);
  write(36, "data"); view.setUint32(40, pcm.length, true);
  const wav = new Uint8Array(44 + pcm.length); wav.set(new Uint8Array(header), 0); wav.set(pcm, 44); return wav;
}
const MAX_TEXT_LENGTH = 1_000;
Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, cors);
  if (!(await authenticateRath(req))) return jsonResponse({ error: "unauthorized_device" }, 401, cors);
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return jsonResponse({ error: "text_required" }, 400, cors);
  if (text.length > MAX_TEXT_LENGTH) return jsonResponse({ error: "text_too_long" }, 413, cors);

  const provider = (Deno.env.get("AI_PROVIDER") ?? "").toLowerCase();
  const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("AI_API_KEY") || "";
  if (provider !== "gemini" || !apiKey) return jsonResponse({ error: "gemini_tts_not_configured" }, 503, cors);
  const model = Deno.env.get("RATH_TTS_MODEL") || "gemini-2.5-flash-preview-tts";
  const voice = Deno.env.get("RATH_TTS_VOICE") || "Kore";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `Speak this response clearly and naturally, without adding or omitting words: ${text}` }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      }),
    });
    if (!response.ok) {
      console.error("RATH Gemini TTS failed", { status: response.status, model });
      return jsonResponse({ error: response.status === 429 ? "gemini_rate_limited" : "speech_generation_failed" }, response.status === 429 ? 429 : 502, cors);
    }
    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find((part: any) => part?.inlineData?.data && String(part?.inlineData?.mimeType ?? "").toLowerCase().includes("audio"));
    if (!audioPart) {
      console.error("RATH Gemini TTS returned no audio data", { model });
      return jsonResponse({ error: "no_audio_returned" }, 502, cors);
    }
    // Gemini TTS commonly returns raw 24 kHz, 16-bit mono PCM (audio/L16).
    // Wrap raw PCM in WAV for a predictable HTTP audio response.
    const raw = base64ToBytes(audioPart.inlineData.data);
    const mime = String(audioPart.inlineData.mimeType ?? "").toLowerCase();
    const wav = mime.includes("wav") ? raw : pcmToWav(raw);
    return new Response(wav, { status: 200, headers: { ...cors, "Content-Type": "audio/wav", "Content-Length": String(wav.byteLength), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("RATH Gemini TTS error", error instanceof Error ? error.message : "unknown_error");
    return jsonResponse({ error: "speech_generation_failed" }, 502, cors);
  } finally { clearTimeout(timer); }
});
