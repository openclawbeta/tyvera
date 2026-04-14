/**
 * scripts/test-wallet-auth.mjs
 *
 * Focused tests for the wallet auth signature-verification path.
 * Runs with plain Node (no jest/vitest dependency) to keep CI footprint small.
 *
 *   node scripts/test-wallet-auth.mjs
 *
 * We import the pure `verifyAuthPayload` via tsx so we exercise the real
 * code path the server uses. If tsx isn't available, we fall back to
 * calling @polkadot/util-crypto directly — which still validates that the
 * client's signRaw format is verifiable.
 */

import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady, signatureVerify, decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex, stringToU8a } from "@polkadot/util";

// Load the pure verifier from TS source. We use tsx if present; otherwise we
// rebuild an equivalent using the same primitives.
let verifyAuthPayload;
try {
  const mod = await import("tsx/esm/api").catch(() => null);
  if (mod) {
    await import("tsx/esm");
    const loaded = await import("../lib/api/wallet-auth.ts");
    verifyAuthPayload = loaded.verifyAuthPayload;
  }
} catch {
  // fall through
}

const AUTH_WINDOW_MS = 5 * 60 * 1000;

if (!verifyAuthPayload) {
  // Inline mirror of lib/api/wallet-auth.ts → verifyAuthPayload.
  verifyAuthPayload = function verifyAuthPayload(payload, now = Date.now(), windowMs = AUTH_WINDOW_MS) {
    const { address, signature, message } = payload;
    if (!address && !signature && !message) return { ok: false, reason: "missing" };
    if (!address) return { ok: false, reason: "missing_address" };
    if (!signature || !message) return { ok: false, reason: "missing_signature_or_message" };
    const match = message.match(/^tyvera-auth:(\d+)$/);
    if (!match) return { ok: false, reason: "bad_message_format" };
    const timestamp = parseInt(match[1], 10);
    if (Math.abs(now - timestamp) > windowMs) return { ok: false, reason: "expired" };
    try { decodeAddress(address); } catch { return { ok: false, reason: "bad_address" }; }
    let isValid = false;
    try { isValid = signatureVerify(message, signature, address).isValid; }
    catch { return { ok: false, reason: "bad_signature" }; }
    if (!isValid) return { ok: false, reason: "bad_signature" };
    return { ok: true, address };
  };
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

await cryptoWaitReady();
const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
const alice = keyring.addFromUri("//Alice");
const bob = keyring.addFromUri("//Bob");

const now = 1_700_000_000_000;

function sign(pair, message) {
  return u8aToHex(pair.sign(stringToU8a(message)));
}

// ── Positive path ───────────────────────────────────────────────────────────
test("valid signature from correct address is accepted", () => {
  const message = `tyvera-auth:${now}`;
  const signature = sign(alice, message);
  const res = verifyAuthPayload({ address: alice.address, signature, message }, now);
  if (!res.ok) throw new Error(`expected ok, got reason=${res.reason}`);
  if (res.address !== alice.address) throw new Error("address mismatch");
});

// ── Negative paths ──────────────────────────────────────────────────────────
test("signature from a different wallet is rejected", () => {
  const message = `tyvera-auth:${now}`;
  const signature = sign(bob, message); // bob signs but alice claims
  const res = verifyAuthPayload({ address: alice.address, signature, message }, now);
  if (res.ok) throw new Error("expected rejection for cross-wallet signature");
  if (res.reason !== "bad_signature") throw new Error(`expected bad_signature, got ${res.reason}`);
});

test("tampered signature is rejected", () => {
  const message = `tyvera-auth:${now}`;
  const signature = sign(alice, message);
  // Flip the last char of the hex signature.
  const last = signature.at(-1);
  const flipped = signature.slice(0, -1) + (last === "0" ? "1" : "0");
  const res = verifyAuthPayload({ address: alice.address, signature: flipped, message }, now);
  if (res.ok) throw new Error("expected rejection for tampered signature");
  if (res.reason !== "bad_signature") throw new Error(`expected bad_signature, got ${res.reason}`);
});

test("malformed hex signature is rejected (not thrown)", () => {
  const message = `tyvera-auth:${now}`;
  const res = verifyAuthPayload({ address: alice.address, signature: "not-hex", message }, now);
  if (res.ok) throw new Error("expected rejection for malformed signature");
  if (res.reason !== "bad_signature") throw new Error(`expected bad_signature, got ${res.reason}`);
});

test("stale timestamp (outside 5-min window) is rejected", () => {
  const stale = now - (AUTH_WINDOW_MS + 1000);
  const message = `tyvera-auth:${stale}`;
  const signature = sign(alice, message);
  const res = verifyAuthPayload({ address: alice.address, signature, message }, now);
  if (res.ok) throw new Error("expected rejection for stale timestamp");
  if (res.reason !== "expired") throw new Error(`expected expired, got ${res.reason}`);
});

test("future-dated timestamp outside window is rejected", () => {
  const future = now + (AUTH_WINDOW_MS + 1000);
  const message = `tyvera-auth:${future}`;
  const signature = sign(alice, message);
  const res = verifyAuthPayload({ address: alice.address, signature, message }, now);
  if (res.ok) throw new Error("expected rejection for future timestamp");
  if (res.reason !== "expired") throw new Error(`expected expired, got ${res.reason}`);
});

test("message with wrong prefix is rejected", () => {
  const message = `something-else:${now}`;
  const signature = sign(alice, message);
  const res = verifyAuthPayload({ address: alice.address, signature, message }, now);
  if (res.ok) throw new Error("expected rejection for bad message format");
  if (res.reason !== "bad_message_format") throw new Error(`expected bad_message_format, got ${res.reason}`);
});

test("malformed address is rejected", () => {
  const message = `tyvera-auth:${now}`;
  const signature = sign(alice, message);
  const res = verifyAuthPayload({ address: "not-an-ss58-address", signature, message }, now);
  if (res.ok) throw new Error("expected rejection for bad address");
  if (res.reason !== "bad_address") throw new Error(`expected bad_address, got ${res.reason}`);
});

test("no headers at all → reason=missing", () => {
  const res = verifyAuthPayload({ address: null, signature: null, message: null }, now);
  if (res.ok) throw new Error("expected rejection when no headers");
  if (res.reason !== "missing") throw new Error(`expected missing, got ${res.reason}`);
});

test("address-only (no signature/message) → missing_signature_or_message", () => {
  const res = verifyAuthPayload({ address: alice.address, signature: null, message: null }, now);
  if (res.ok) throw new Error("expected rejection");
  if (res.reason !== "missing_signature_or_message") throw new Error(`got ${res.reason}`);
});

test("signature+message without address → missing_address", () => {
  const message = `tyvera-auth:${now}`;
  const signature = sign(alice, message);
  const res = verifyAuthPayload({ address: null, signature, message }, now);
  if (res.ok) throw new Error("expected rejection");
  if (res.reason !== "missing_address") throw new Error(`got ${res.reason}`);
});

// ── Run ─────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

console.log("");
console.log(`${passed}/${tests.length} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
