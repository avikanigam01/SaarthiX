/*
  RATH ESP32 HTTPS API smoke-test firmware.

  This first firmware verifies Wi-Fi + TLS + authenticated JSON request/response.
  It does NOT yet capture INMP441 audio or play MAX98357A audio. Those hardware
  drivers should be added after the HTTPS endpoint passes this test.

  Before upload, set WIFI_SSID, WIFI_PASSWORD, SUPABASE_FUNCTION_BASE and
  RATH_DEVICE_TOKEN. Do not commit a real device token to a public repository.
*/
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SUPABASE_FUNCTION_BASE = "https://YOUR_PROJECT_REF.supabase.co/functions/v1";
const char* SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
const char* RATH_DEVICE_TOKEN = "REPLACE_WITH_LONG_RANDOM_DEVICE_TOKEN";

// For production, install the current trusted CA certificate and use setCACert().
// Do not use client.setInsecure(): it disables server certificate verification.
// ESP32 core's certificate bundle support varies by version; this sketch refuses
// to make the request until a trusted root certificate is configured below.
static const char* ROOT_CA = R"EOF(
-----BEGIN CERTIFICATE-----
PASTE_THE_CURRENT_TRUSTED_ROOT_CA_CERTIFICATE_HERE
-----END CERTIFICATE-----
)EOF";

const int TALK_BUTTON_PIN = 27;
unsigned long lastPress = 0;

void setup() {
  Serial.begin(115200);
  pinMode(TALK_BUTTON_PIN, INPUT_PULLUP);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected. IP: ");
    Serial.println(WiFi.localIP());
    Serial.println("Press TALK button to send an HTTPS API smoke test.");
  } else {
    Serial.println("Wi-Fi connection failed. Check credentials.");
  }
}

void sendTestRequest() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Not connected to Wi-Fi.");
    return;
  }
  if (String(RATH_DEVICE_TOKEN).startsWith("REPLACE_") || String(SUPABASE_PUBLISHABLE_KEY).startsWith("YOUR_SUPABASE_") || String(SUPABASE_FUNCTION_BASE).indexOf("YOUR_PROJECT_REF") >= 0) {
    Serial.println("Set the API URL and device token before testing.");
    return;
  }
  if (String(ROOT_CA).indexOf("PASTE_THE_CURRENT") >= 0) {
    Serial.println("TLS CA certificate is not configured. Request stopped safely; do not disable TLS verification.");
    return;
  }

  WiFiClientSecure client;
  client.setCACert(ROOT_CA);
  HTTPClient https;
  String endpoint = String(SUPABASE_FUNCTION_BASE) + "/rath-assistant";
  if (!https.begin(client, endpoint)) {
    Serial.println("Could not initialize HTTPS client.");
    return;
  }
  https.setTimeout(15000);
  https.addHeader("Content-Type", "application/json");
  https.addHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
  https.addHeader("Authorization", String("Bearer ") + RATH_DEVICE_TOKEN);
  const char* body = "{\"text\":\"Hello RATH, find a hospital in Kanpur\"}";
  int status = https.POST((uint8_t*)body, strlen(body));
  Serial.printf("HTTP status: %d\n", status);
  if (status > 0) {
    Serial.println("API response:");
    Serial.println(https.getString());
  } else {
    Serial.printf("HTTPS request failed: %s\n", https.errorToString(status).c_str());
  }
  https.end();
}

void loop() {
  if (digitalRead(TALK_BUTTON_PIN) == LOW && millis() - lastPress > 1000) {
    lastPress = millis();
    sendTestRequest();
    while (digitalRead(TALK_BUTTON_PIN) == LOW) delay(10);
  }
  delay(10);
}
