/**
 * lib/fetch-with-timeout.ts
 *
 * Thin wrapper around fetch() that applies a timeout via AbortController.
 * Falls through to the caller's catch block on timeout, same as a network error.
 */

const DEFAULT_TIMEOUT_MS = 10_000; // 10 seconds

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchInit } = init ?? {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Merge any existing signal (rare) with our timeout signal
  if (fetchInit.signal) {
    fetchInit.signal.addEventListener("abort", () => controller.abort());
  }

  return fetch(input, { ...fetchInit, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}
