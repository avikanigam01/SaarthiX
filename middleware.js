// middleware.js
//
// Place this file in the ROOT of your Vercel project.
//
// IMPORTANT:
// This middleware contains your private Rakshak secret.
// Never publish this file or expose the secret to the browser.

export const config = {
  matcher: "/:path*",
};

const RAKSHAK_URL = "https://www.rakshakfirewall.com";
const SITE_ID = "5964a61a-c029-4e7c-8dac-1ad35607bc33";
const INGEST_SECRET = "ec744b40f6554466a351eefe059a76eb11ae734ecd874ff6bcffacee7f75fbed";

export default async function middleware(req) {
  const url = new URL(req.url);

  // -------------------------------------------------------
  // Get visitor IP from Vercel
  // -------------------------------------------------------

  const forwardedFor = req.headers.get("x-forwarded-for") || "";

  const visitorIp = forwardedFor
    .split(",")[0]
    .trim();

  // If Vercel does not provide an IP,
  // allow the request instead of breaking the website.
  if (!visitorIp) {
    return;
  }

  // -------------------------------------------------------
  // Get visitor location information from Vercel
  // -------------------------------------------------------

  const visitorCountry =
    req.headers.get("x-vercel-ip-country") || "";

  const visitorCity =
    req.headers.get("x-vercel-ip-city") || "";

  // -------------------------------------------------------
  // Rakshak Agent checks whether this visitor is blocked
  // -------------------------------------------------------

  let check = {
    blocked: false,
  };

  try {
    const response = await fetch(
      `${RAKSHAK_URL}/api/check-ip?site_id=${SITE_ID}&ip=${encodeURIComponent(visitorIp)}&country=${encodeURIComponent(visitorCountry)}`,
      {
        headers: {
          "x-ingest-secret": INGEST_SECRET,
        },
        cache: "no-store",
      }
    );

    if (response.ok) {
      check = await response.json();
    }
  } catch (error) {
    // Fail open:
    // If Rakshak is temporarily unavailable,
    // do not take the customer's website offline.
    check = {
      blocked: false,
    };
  }

  // -------------------------------------------------------
  // ACTUAL BLOCKING
  // -------------------------------------------------------

  if (check.blocked === true) {
    // Escape the custom message before placing it
    // inside the HTML response.
    const escapeHtml = (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const customMessage = check.message
      ? escapeHtml(String(check.message).slice(0, 300))
      : "";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Access Restricted</title>

  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
    }

    body {
      min-height: 100vh;

      display: flex;
      align-items: center;
      justify-content: center;

      padding: 24px;

      background: #0b0f14;
      color: #ffffff;

      font-family:
        Inter,
        Arial,
        Helvetica,
        sans-serif;
    }

    .card {
      width: 100%;
      max-width: 650px;

      padding: 48px 32px;

      text-align: center;

      background: #111820;

      border: 1px solid #293541;
      border-radius: 20px;

      box-shadow:
        0 25px 80px rgba(0, 0, 0, 0.45);
    }

    .icon {
      width: 72px;
      height: 72px;

      margin: 0 auto 24px;

      display: flex;
      align-items: center;
      justify-content: center;

      border-radius: 50%;

      background: #1b2530;

      font-size: 32px;
    }

    h1 {
      margin: 0;

      font-size: 30px;
      font-weight: 700;

      color: #ffffff;
    }

    .description {
      margin: 14px auto 0;

      max-width: 500px;

      color: #9da9b6;

      font-size: 15px;
      line-height: 1.7;
    }

    .custom-message {
      margin: 32px auto 0;

      padding: 28px 24px;

      border-radius: 16px;

      background: linear-gradient(
        135deg,
        #1b2530,
        #151d26
      );

      border: 1px solid #354352;

      color: #ffffff;

      font-size: 24px;
      font-weight: 700;

      line-height: 1.5;

      word-break: break-word;

      box-shadow:
        0 12px 35px rgba(0, 0, 0, 0.25);
    }

    .default-message {
      margin: 32px auto 0;

      padding: 20px;

      border-radius: 14px;

      background: #151d26;

      border: 1px solid #293541;

      color: #c7d0da;

      font-size: 16px;
      line-height: 1.7;
    }

    .error-code {
      margin-top: 28px;

      color: #7f8b98;

      font-size: 12px;
      letter-spacing: 0.5px;
    }

    .brand {
      margin-top: 18px;

      color: #ffffff;

      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>

<body>

  <main class="card">

    <div class="icon">
      🔒
    </div>

    <h1>
      Access Restricted
    </h1>

    <p class="description">
      Your request has been blocked by the
      website security system.
    </p>

    ${customMessage
      ? `
        <div class="custom-message">
          ${customMessage}
        </div>
      `
      : `
        <div class="default-message">
          This request has been blocked by
          the website security system.
          If you believe this was a mistake,
          please contact the website administrator.
        </div>
      `
    }

    <div class="error-code">
      HTTP 403 · Access Forbidden
    </div>

    <div class="brand">
      Protected by Rakshak Firewall
    </div>

  </main>

</body>
</html>
`;

    return new Response(html, {
      status: 403,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  // -------------------------------------------------------
  // Visitor / attack logging
  // -------------------------------------------------------

  fetch(`${RAKSHAK_URL}/api/ingest`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      "x-ingest-secret":
        INGEST_SECRET,

      "x-visitor-ip":
        visitorIp,

      "x-visitor-country":
        visitorCountry,

      "x-visitor-city":
        visitorCity,
    },

    body: JSON.stringify({
      site_id: SITE_ID,

      url:
        url.pathname +
        url.search,

      method:
        req.method,

      user_agent:
        req.headers.get("user-agent") || "",
    }),
  }).catch(() => {});

  // Allow normal visitors
  return;
}
