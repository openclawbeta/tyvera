/* ─────────────────────────────────────────────────────────────────── */
/* Log hygiene helpers — redact sensitive values before console output */
/*                                                                     */
/* Wallet addresses, signatures, API keys, payment memos and similar   */
/* values should never appear in full inside server logs. These helpers */
/* shrink them to a recognizable prefix/suffix while dropping the       */
/* middle, and scrub common fields out of error payloads.               */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Shorten a string so the first and last few characters remain but the
 * bulk is replaced with an ellipsis. Short inputs are passed through so
 * callers don't have to special-case them.
 */
export function shortId(value: string | null | undefined, head = 6, tail = 4): string {
  if (!value) return "∅";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/**
 * Shorten an SS58 wallet address for log output. Keeps enough of the
 * prefix/suffix to correlate log lines but not enough to reconstruct
 * the address.
 */
export function shortAddr(address: string | null | undefined): string {
  return shortId(address, 6, 4);
}

/**
 * Shorten an arbitrary opaque token (signatures, API keys, memos).
 */
export function shortToken(token: string | null | undefined): string {
  return shortId(token, 4, 2);
}

/**
 * Given an unknown error, return a plain message string that's safe to
 * log. Strips anything that looks like an authorization header.
 */
export function safeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Strip "Bearer <token>" patterns that sometimes leak through
  return raw.replace(/Bearer\s+[A-Za-z0-9._\-]{6,}/gi, "Bearer <redacted>");
}
