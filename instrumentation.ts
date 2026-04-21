/**
 * instrumentation.ts
 *
 * Next.js instrumentation hook — runs once when the server starts.
 * Used for startup validation and initialization.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the Node.js server (not in edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/env-check");
    validateEnv();
  }
}
