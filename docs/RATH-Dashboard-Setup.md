# RATH — manual Supabase Dashboard setup

## Files and locations
- `supabase/functions/rath-assistant/index.ts` — text/audio in, JSON reply out
- `supabase/functions/rath-speak/index.ts` — text in, WAV audio out
- `hardware/rath-esp32/rath_esp32.ino` — ESP32 firmware (currently an HTTPS smoke test only)

Both Edge Functions are self-contained, so they can be pasted into Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor. A GitHub commit does **not** deploy them. After editing in the Dashboard, press **Deploy** (Save alone does not update the live function).

## Secrets (Dashboard → Edge Functions → Secrets)
RATH uses Gemini, the same configuration as the `assess` function.

| Secret | Required | Notes |
|---|---|---|
| `RATH_DEVICE_TOKEN` | yes | Random secret, at least 32 characters. Never commit it or paste it in chat. |
| `AI_PROVIDER` | yes | Must be `gemini` |
| `AI_API_KEY` | yes | Gemini API key |
| `AI_MODEL` | yes | A working Gemini model (supports `thinkingBudget: 0`, e.g. a 2.5 Flash model) |
| `RATH_TTS_MODEL` | optional | Gemini TTS model; the function has a default |
| `RATH_TTS_VOICE` | optional | Gemini voice name; the function has a default |
| `ALLOWED_ORIGINS` | optional | Comma-separated browser origins for CORS. Not needed by the ESP32. |

Generate a token in PowerShell:
```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge Functions by Supabase automatically.

Do not put any secret in GitHub or ESP32 source that is committed publicly. The ESP32 sends the Supabase anon/publishable key in the `apikey` header and the RATH device token in `Authorization: Bearer ...`. The anon key is public by design; the device token is secret. For a public repo, inject the token and Wi-Fi password when flashing and remove them before committing.

## Gateway setting
For both functions, turn **Verify JWT** OFF. The device token is not a JWT, so the gateway would reject it. Both functions check `RATH_DEVICE_TOKEN` themselves; never remove that in-function check.

## Behaviour
- `rath-assistant` accepts a JSON body `{"text": "..."}` or multipart form field `audio` (WAV, MP3, OGG, FLAC, AAC, AIFF, WebM; up to 8 MB). Audio is transcribed with Gemini.
- Emergency phrases (English and Hindi) are answered by fixed rules, without calling AI.
- Hospital/clinic questions search `public.facilities` (active and verified rows only) using the server-side service-role key. Never expose that key to a device.
- Other questions go to Gemini with a prompt that forbids diagnosis, prescriptions, bookings and markdown. Replies are cleaned for speech.
- `rath-speak` returns WAV bytes, not JSON.
- The current ESP32 sketch does not yet record microphone audio or play the WAV response.

## Test with PowerShell
```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$BASE  = "https://<project-ref>.supabase.co/functions/v1"
$KEY   = "<anon key>"
$TOKEN = "<RATH_DEVICE_TOKEN>"
$H = @{ apikey = $KEY; Authorization = "Bearer $TOKEN" }

function Call-Rath($path, $obj, $hdr = $H) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Compress))
  try {
    $r = Invoke-WebRequest -Uri "$BASE/$path" -Method POST -Headers $hdr `
         -ContentType "application/json; charset=utf-8" -Body $bytes -UseBasicParsing
    "STATUS: $($r.StatusCode)"; $r.Content
  } catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "no response" }
    "STATUS: $code"
    if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
  }
}
```

| Test | Command | Expected |
|---|---|---|
| Wrong token | `Call-Rath "rath-assistant" @{ text = "hello" } @{ apikey = $KEY; Authorization = "Bearer wrongtoken" }` | 401 |
| General | `Call-Rath "rath-assistant" @{ text = "What can RATH help me with?" }` | 200, `intent: general`, complete plain-text sentence |
| Hospital | `Call-Rath "rath-assistant" @{ text = "find a hospital in Kanpur" }` | 200, `intent: facility_search`, facilities list |
| Emergency | `Call-Rath "rath-assistant" @{ text = "mujhe seene mein dard hai" }` | 200, `intent: emergency_safety` |
| Audio | `curl.exe -s -i -X POST "$BASE/rath-assistant" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" -F "audio=@test.wav;type=audio/wav"` | 200, `audio_received: true` |
| TTS | see below | 200 and a playable WAV |

TTS test (do not use `-i`, it would put headers inside the WAV):
```powershell
'{"text":"Namaste, main RATH hu"}' | Set-Content -Encoding utf8 tts.json
curl.exe -s -D tts-headers.txt -X POST "$BASE/rath-speak" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data-binary "@tts.json" -o out.wav
Get-Content tts-headers.txt | Select-Object -First 1
(New-Object Media.SoundPlayer "$PWD\out.wav").PlaySync()
```

## Error codes
| Response | Meaning |
|---|---|
| 401 `unauthorized_device` | Wrong or too-short token, or secret not set |
| 401/403 `Invalid JWT` | Verify JWT is still ON |
| 413 / 415 | Request or audio too large / unsupported type |
| 429 `gemini_rate_limited` | Gemini free-tier limit |
| 503 `ai_not_configured` / `rath_requires_gemini_provider` | `AI_PROVIDER`, `AI_API_KEY` or `AI_MODEL` missing |
| 502 `gemini_request_failed` / `gemini_empty_response` | Wrong model name, bad key, or Gemini error (one automatic retry is built in) |
| 500 `rath_request_failed` | Check Dashboard → Edge Functions → Logs for `RATH assistant failed { code }` |

## Before public or clinical use
Add per-device token rotation, rate limiting, monitoring, and privacy/consent controls. Review the facility directory regularly; every row the assistant can speak must be a real, verified facility.
