# RATH — manual Supabase Dashboard setup

## Files and locations
- GitHub: `supabase/functions/rath-assistant/index.ts`
- GitHub: `supabase/functions/rath-speak/index.ts`
- Hardware firmware: `hardware/rath-esp32/rath_esp32.ino`

The two Edge Function files are self-contained for Supabase Dashboard's function editor; they do not import a shared helper file. GitHub commits do not deploy Edge Functions by themselves unless a CI/CD workflow is configured. Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor is the manual route.

## Secrets in Supabase Dashboard → Edge Functions → Secrets
- `RATH_DEVICE_TOKEN`: generate a random secret of at least 32 characters and keep it private.
- `RATH_OPENAI_API_KEY`: provider API key; only needed for audio STT/TTS.
- `RATH_STT_MODEL` (optional): `gpt-4o-mini-transcribe`
- `RATH_TTS_MODEL` (optional): `gpt-4o-mini-tts`
- `RATH_TTS_VOICE` (optional): `alloy`

Do not put any of these secrets in GitHub or ESP32 source. The ESP32 needs the Supabase publishable key in the `apikey` header and its RATH device token in `Authorization`. The publishable key is designed for client use; the device token is secret. Do not commit the device token or Wi-Fi password publicly. For a public repo, inject them when flashing firmware and remove them from source before committing.

## Important limitations
- `rath-assistant` supports JSON text requests and multipart form field `audio` (audio transcription requires `RATH_OPENAI_API_KEY`).
- `rath-speak` returns WAV bytes, not JSON. The current ESP32 sketch is only an HTTPS smoke test and does not yet record microphone audio or play the WAV response.
- The assistant's facility query assumes `public.facilities` has `name,address,district,state,phone,facility_type,is_active,is_verified`; this matches the supplied project migration.
- The function uses the Supabase service-role key only on the server to read the verified facility directory. Never expose it to the device. For both functions, turn off the gateway JWT verification toggle only because the function validates the separate `RATH_DEVICE_TOKEN` itself; never remove the in-function check.
- Before public/clinical use, add per-device token rotation, rate limiting, monitoring, and privacy/consent controls.
