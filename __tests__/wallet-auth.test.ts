/**
 * Unit tests for wallet authentication logic.
 *
 * Tests the pure verifyAuthPayload function which has no HTTP/Next.js
 * coupling — exercises message format, timestamp window, address
 * validation, and signature verification.
 */

import { describe, it, expect } from "vitest";
import { verifyAuthPayload, type AuthPayload } from "@/lib/api/wallet-auth";

const FIVE_MINUTES = 5 * 60 * 1000;
const NOW = 1700000000000; // fixed timestamp for deterministic tests

// A syntactically valid SS58 address (Polkadot format)
const VALID_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

describe("verifyAuthPayload", () => {
  // ── Missing headers ────────────────────────────────────────────

  it("returns 'missing' when no headers provided", () => {
    const result = verifyAuthPayload(
      { address: null, signature: null, message: null },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing");
  });

  it("returns 'missing' for undefined values", () => {
    const result = verifyAuthPayload(
      { address: undefined, signature: undefined, message: undefined },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing");
  });

  it("returns 'missing_address' when address is empty but others present", () => {
    const result = verifyAuthPayload(
      { address: null, signature: "0xabc", message: "tyvera-auth:123" },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_address");
  });

  it("returns 'missing_signature_or_message' when signature missing", () => {
    const result = verifyAuthPayload(
      { address: VALID_ADDRESS, signature: null, message: "tyvera-auth:123" },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_signature_or_message");
  });

  it("returns 'missing_signature_or_message' when message missing", () => {
    const result = verifyAuthPayload(
      { address: VALID_ADDRESS, signature: "0xabc", message: null },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_signature_or_message");
  });

  // ── Message format ─────────────────────────────────────────────

  it("rejects bad message format (no prefix)", () => {
    const result = verifyAuthPayload(
      { address: VALID_ADDRESS, signature: "0xabc", message: "bad-format:123" },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_message_format");
  });

  it("rejects bad message format (missing timestamp)", () => {
    const result = verifyAuthPayload(
      { address: VALID_ADDRESS, signature: "0xabc", message: "tyvera-auth:" },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_message_format");
  });

  it("rejects bad message format (non-numeric timestamp)", () => {
    const result = verifyAuthPayload(
      { address: VALID_ADDRESS, signature: "0xabc", message: "tyvera-auth:notanumber" },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_message_format");
  });

  // ── Timestamp expiry ───────────────────────────────────────────

  it("rejects expired timestamp (too old)", () => {
    const oldTs = NOW - FIVE_MINUTES - 1000;
    const result = verifyAuthPayload(
      { address: VALID_ADDRESS, signature: "0xabc", message: `tyvera-auth:${oldTs}` },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("rejects future timestamp beyond window", () => {
    const futureTs = NOW + FIVE_MINUTES + 1000;
    const result = verifyAuthPayload(
      { address: VALID_ADDRESS, signature: "0xabc", message: `tyvera-auth:${futureTs}` },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("accepts timestamp at exact boundary", () => {
    const boundaryTs = NOW - FIVE_MINUTES;
    const result = verifyAuthPayload(
      { address: VALID_ADDRESS, signature: "0xabc", message: `tyvera-auth:${boundaryTs}` },
      NOW,
    );
    // Should pass timestamp check but fail on signature
    expect(result.reason).not.toBe("expired");
  });

  // ── Address validation ─────────────────────────────────────────

  it("rejects invalid SS58 address", () => {
    const currentTs = NOW;
    const result = verifyAuthPayload(
      { address: "not-a-real-address", signature: "0xabc", message: `tyvera-auth:${currentTs}` },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_address");
  });

  // ── Signature verification ─────────────────────────────────────

  it("rejects malformed hex signature", () => {
    const currentTs = NOW;
    const result = verifyAuthPayload(
      { address: VALID_ADDRESS, signature: "not-hex", message: `tyvera-auth:${currentTs}` },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_signature");
  });

  it("rejects valid hex but wrong signature", () => {
    const currentTs = NOW;
    // Valid hex format but not a valid sr25519 signature for this message
    const fakeSig = "0x" + "ab".repeat(64);
    const result = verifyAuthPayload(
      { address: VALID_ADDRESS, signature: fakeSig, message: `tyvera-auth:${currentTs}` },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_signature");
  });

  // ── Custom window ──────────────────────────────────────────────

  it("respects custom window parameter", () => {
    const twoMinWindow = 2 * 60 * 1000;
    const ts = NOW - 3 * 60 * 1000; // 3 min ago — within default window, outside 2 min
    const result = verifyAuthPayload(
      { address: VALID_ADDRESS, signature: "0xabc", message: `tyvera-auth:${ts}` },
      NOW,
      twoMinWindow,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("expired");
  });
});
