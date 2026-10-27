# RATH ESP32 HTTPS smoke test

This sketch tests the network/API connection only. It does not yet capture microphone audio or play speaker audio.

1. Install Arduino IDE and the ESP32 board package.
2. Open `rath_esp32.ino` and select the exact ESP32 board/COM port.
3. Set Wi-Fi credentials, the Supabase Edge Function base URL, the Supabase publishable key (safe for client-side use), and the same long random token configured as `RATH_DEVICE_TOKEN` in Supabase secrets.
4. Configure a trusted root CA certificate for your ESP32 HTTPS client. Do not use `setInsecure()`.
5. Upload and open Serial Monitor at 115200 baud. Press the button on GPIO 27 to send a test request.

The initial button is a network-test trigger, not the final record-audio TALK workflow. Verify the API with curl first. Never commit actual Wi-Fi credentials or device tokens.
