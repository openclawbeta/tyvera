/**
 * lib/api/secret-compare.ts
 *
 * Constant-time shared-secret comparison for Authorization / admin /
 * cron headers. We SHA-256 both inputs before calling `timingSafeEqual`
 * so the two buffers fed to the comparator are always the same 32-byte
 * length — removing the length side-channel from early-exit length
 * checks elsewhere in the codebase.
 *
 * A SHA-256 collision on an attacker-chosen preimage is cryptographically
 * infeasible, so hash-equality implies string-equality in practice.
 */
import { createHash, timingSafeEqual } from "crypto";

/**
 * Returns true iff `provided` and `expected` are exactly equal.
 * Runs in time independent of the two strings' contents or lengths.
 * Returns false if either input is empty.
 */
export function safeSecretEqual(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;

  try {
    const providedDigest = createHash("sha256").update(provided, "utf-8").digest();
    const expectedDigest = createHash("sha256").update(expected, "utf-8").digest();
    return timingSafeEqual(providedDigest, expectedDigest);
  } catch {
    return false;
  }
}
