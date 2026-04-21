/**
 * scripts/test-webhook-signing.mjs
 *
 * End-to-end test of the webhook delivery path:
 *   1. Spin up a captive HTTP server that receives the webhook.
 *   2. Simulate the exact payload + headers fireWebhooks emits.
 *   3. Verify the server-side HMAC check passes for valid signatures and
 *      rejects tampered payloads / stale timestamps.
 *
 *   node scripts/test-webhook-signing.mjs
 *
 * Runs without DB/chain — the delivery & verification logic is pure code.
 */

import http from "http";
import crypto from "crypto";

const SECRET = "test-secret-" + crypto.randomBytes(8).toString("hex");
const REPLAY_WINDOW_SEC = 5 * 60; // 5 minutes

let passed = 0;
let failed = 0;

function t(name, cond, detail = "") {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ": " + detail : ""}`);
    failed++;
  }
}

/** Mirrors lib/db/webhooks.ts fireWebhooks signer. */
function signDelivery(secret, timestampEpoch, payload) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestampEpoch}.${payload}`)
    .digest("hex");
}

/** Server-side verification a real receiver would implement. */
function verifyDelivery({ secret, receivedSignature, receivedTimestamp, body, now }) {
  if (!receivedSignature || !receivedTimestamp) return { ok: false, reason: "missing_headers" };
  const age = now - Number(receivedTimestamp);
  if (!Number.isFinite(age) || age < -30 || age > REPLAY_WINDOW_SEC) {
    return { ok: false, reason: "stale_or_future" };
  }
  const expected = signDelivery(secret, receivedTimestamp, body);
  try {
    const a = Buffer.from(receivedSignature, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return { ok: false, reason: "bad_signature" };
    return crypto.timingSafeEqual(a, b)
      ? { ok: true }
      : { ok: false, reason: "bad_signature" };
  } catch {
    return { ok: false, reason: "malformed_signature" };
  }
}

console.log("\n── Webhook HMAC signing & verification ──────────────────────────\n");

// 1. Round-trip (good path)
{
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ event: "subscription.created", data: { plan: "ANALYST" } });
  const sig = signDelivery(SECRET, now, payload);
  const result = verifyDelivery({
    secret: SECRET,
    receivedSignature: sig,
    receivedTimestamp: String(now),
    body: payload,
    now,
  });
  t("valid signature + fresh timestamp → accepted", result.ok);
}

// 2. Tampered body
{
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ event: "subscription.created", data: { plan: "ANALYST" } });
  const sig = signDelivery(SECRET, now, payload);
  const tampered = payload.replace("ANALYST", "INSTITUTIONAL"); // attacker bumps tier
  const result = verifyDelivery({
    secret: SECRET,
    receivedSignature: sig,
    receivedTimestamp: String(now),
    body: tampered,
    now,
  });
  t("tampered body → rejected (bad_signature)", !result.ok && result.reason === "bad_signature");
}

// 3. Replayed timestamp (far in the past)
{
  const now = Math.floor(Date.now() / 1000);
  const staleTs = now - REPLAY_WINDOW_SEC - 60;
  const payload = JSON.stringify({ event: "test" });
  const sig = signDelivery(SECRET, staleTs, payload);
  const result = verifyDelivery({
    secret: SECRET,
    receivedSignature: sig,
    receivedTimestamp: String(staleTs),
    body: payload,
    now,
  });
  t("stale timestamp → rejected (stale_or_future)", !result.ok && result.reason === "stale_or_future");
}

// 4. Wrong secret
{
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ event: "test" });
  const sig = signDelivery("other-secret", now, payload);
  const result = verifyDelivery({
    secret: SECRET,
    receivedSignature: sig,
    receivedTimestamp: String(now),
    body: payload,
    now,
  });
  t("wrong secret → rejected (bad_signature)", !result.ok && result.reason === "bad_signature");
}

// 5. Missing headers
{
  const now = Math.floor(Date.now() / 1000);
  const result = verifyDelivery({
    secret: SECRET,
    receivedSignature: null,
    receivedTimestamp: null,
    body: "{}",
    now,
  });
  t("missing headers → rejected (missing_headers)", !result.ok && result.reason === "missing_headers");
}

// ── 6. Full round trip through a real HTTP server ───────────────────────────
await new Promise((resolve, reject) => {
  const captured = { hits: [], acceptedHits: 0 };

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const sig = req.headers["x-tyvera-signature"];
      const ts = req.headers["x-tyvera-timestamp"];
      const event = req.headers["x-tyvera-event"];
      const now = Math.floor(Date.now() / 1000);
      const v = verifyDelivery({
        secret: SECRET,
        receivedSignature: sig,
        receivedTimestamp: ts,
        body,
        now,
      });
      captured.hits.push({ event, ok: v.ok, reason: v.reason });
      if (v.ok) captured.acceptedHits++;
      res.statusCode = v.ok ? 200 : 401;
      res.end(v.ok ? "ok" : v.reason);
    });
  });

  server.listen(0, async () => {
    try {
      const { port } = server.address();
      const url = `http://127.0.0.1:${port}/hook`;

      // Emit 3 webhooks, mirroring fireWebhooks exactly.
      const events = [
        { event: "subscription.created", data: { plan: "ANALYST" } },
        { event: "subscription.renewed", data: { plan: "ANALYST" } },
        { event: "payment.confirmed",    data: { txHash: "0xabc" } },
      ];

      for (const e of events) {
        const ts = new Date().toISOString();
        const tsEpoch = String(Math.floor(Date.parse(ts) / 1000));
        const payload = JSON.stringify({ event: e.event, timestamp: ts, data: e.data });
        const sig = signDelivery(SECRET, tsEpoch, payload);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tyvera-Signature": sig,
            "X-Tyvera-Timestamp": tsEpoch,
            "X-Tyvera-Event": e.event,
          },
          body: payload,
        });
        if (!res.ok) {
          console.log(`    (hook ${e.event} rejected by receiver: ${res.status})`);
        }
      }

      t("receiver got all 3 hits", captured.hits.length === 3);
      t("all 3 hits accepted", captured.acceptedHits === 3);
      t(
        "each hit signed for correct event",
        captured.hits.every((h, i) => h.event === events[i].event),
      );

      server.close(() => resolve());
    } catch (err) {
      server.close(() => reject(err));
    }
  });
});

console.log(`\n── ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
