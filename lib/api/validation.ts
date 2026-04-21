/* ─────────────────────────────────────────────────────────────────── */
/* Lightweight request-body validation                                 */
/*                                                                     */
/* Keeps the API surface type-safe without adding a runtime dep.       */
/* Each validator returns { ok: true, value } or { ok: false, error }. */
/* Caller shapes errors into NextResponse.json as it sees fit.         */
/* ─────────────────────────────────────────────────────────────────── */

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Tag helper — pass through any thrown parse error as a Result. */
export function safeParse<T>(fn: () => T): ValidationResult<T> {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid request body",
    };
  }
}

/* ── Primitives ───────────────────────────────────────────────────── */

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function requireString(obj: Record<string, unknown>, key: string, opts: { min?: number; max?: number; pattern?: RegExp } = {}): string {
  const v = obj[key];
  if (typeof v !== "string") throw new Error(`'${key}' must be a string`);
  if (opts.min !== undefined && v.length < opts.min) throw new Error(`'${key}' must be at least ${opts.min} chars`);
  if (opts.max !== undefined && v.length > opts.max) throw new Error(`'${key}' must be at most ${opts.max} chars`);
  if (opts.pattern && !opts.pattern.test(v)) throw new Error(`'${key}' has invalid format`);
  return v;
}

function optionalString(obj: Record<string, unknown>, key: string, opts: { max?: number } = {}): string | undefined {
  const v = obj[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") throw new Error(`'${key}' must be a string when provided`);
  if (opts.max !== undefined && v.length > opts.max) throw new Error(`'${key}' must be at most ${opts.max} chars`);
  return v;
}

function requireNumber(obj: Record<string, unknown>, key: string, opts: { min?: number; max?: number; int?: boolean } = {}): number {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`'${key}' must be a finite number`);
  if (opts.int && !Number.isInteger(v)) throw new Error(`'${key}' must be an integer`);
  if (opts.min !== undefined && v < opts.min) throw new Error(`'${key}' must be >= ${opts.min}`);
  if (opts.max !== undefined && v > opts.max) throw new Error(`'${key}' must be <= ${opts.max}`);
  return v;
}

function optionalNumber(obj: Record<string, unknown>, key: string, opts: { min?: number; max?: number; int?: boolean } = {}): number | undefined {
  const v = obj[key];
  if (v === undefined || v === null) return undefined;
  return requireNumber(obj, key, opts);
}

function requireBoolean(obj: Record<string, unknown>, key: string): boolean {
  const v = obj[key];
  if (typeof v !== "boolean") throw new Error(`'${key}' must be a boolean`);
  return v;
}

function enumOf<T extends string>(obj: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const v = obj[key];
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) {
    throw new Error(`'${key}' must be one of: ${allowed.join(", ")}`);
  }
  return v as T;
}

/* ── SS58 address pattern (Substrate) ─────────────────────────────── */
// Bittensor uses SS58 addresses: base58-encoded, 47-48 chars, starting
// with a capital letter or digit. Relaxed-but-tight enough to block junk.
const SS58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{46,50}$/;

export function parseSs58(value: unknown, label = "address"): string {
  if (typeof value !== "string") throw new Error(`'${label}' must be a string`);
  if (!SS58_PATTERN.test(value)) throw new Error(`'${label}' is not a valid SS58 address`);
  return value;
}

/* ── Shared schemas ───────────────────────────────────────────────── */

export interface SubscribeBody {
  address: string;
  plan: string;
  billing: "monthly" | "annual";
}

export function parseSubscribeBody(body: unknown, validPlans: readonly string[] = []): ValidationResult<SubscribeBody> {
  return safeParse(() => {
    if (!isObject(body)) throw new Error("request body must be an object");
    const plan = requireString(body, "plan", { min: 1, max: 40, pattern: /^[A-Za-z0-9_-]+$/ });
    if (validPlans.length > 0 && !validPlans.includes(plan)) {
      throw new Error(`'plan' must be one of: ${validPlans.join(", ")}`);
    }
    return {
      address: parseSs58(body.address),
      plan,
      billing: enumOf(body, "billing", ["monthly", "annual"] as const),
    };
  });
}

export interface AdminGrantBody {
  walletAddress: string;
  planId: string;
  reason?: string;
  durationDays?: number;
}

export function parseAdminGrantBody(body: unknown): ValidationResult<AdminGrantBody> {
  return safeParse(() => {
    if (!isObject(body)) throw new Error("request body must be an object");
    return {
      walletAddress: parseSs58(body.walletAddress, "walletAddress"),
      planId: requireString(body, "planId", { min: 1, max: 40, pattern: /^[a-z0-9_-]+$/i }),
      reason: optionalString(body, "reason", { max: 500 }),
      durationDays: optionalNumber(body, "durationDays", { min: 1, max: 3_650, int: true }),
    };
  });
}

export interface CreateKeyBody {
  address: string;
  label?: string;
}

export function parseCreateKeyBody(body: unknown): ValidationResult<CreateKeyBody> {
  return safeParse(() => {
    if (!isObject(body)) throw new Error("request body must be an object");
    return {
      address: parseSs58(body.address),
      label: optionalString(body, "label", { max: 60 }),
    };
  });
}

export interface AddWebhookBody {
  url: string;
  label?: string;
}

/**
 * Reject hosts that resolve into private/link-local/loopback/metadata ranges.
 * This is a best-effort literal-host check to stop SSRF via webhook URLs —
 * attackers pointing webhooks at 127.0.0.1, 169.254.169.254 (AWS/GCP
 * metadata), 10.0.0.0/8, 192.168/16, etc. A hostname (`foo.internal`) that
 * resolves to a private IP at send time is still blocked at runtime by the
 * delivery layer (see fireWebhooks).
 */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") ||
      h.endsWith(".internal") || h.endsWith(".lan") || h.endsWith(".corp") ||
      h.endsWith(".home") || h.endsWith(".arpa")) {
    return true;
  }
  // IPv4 literal
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0) return true;                     // 0.0.0.0/8
    if (a === 10) return true;                    // 10/8
    if (a === 127) return true;                   // loopback
    if (a === 169 && b === 254) return true;      // link-local + metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true;      // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224) return true;                    // multicast + reserved
  }
  // IPv6 literal (brackets already stripped by URL parser)
  if (h.includes(":")) {
    if (h === "::1" || h === "::") return true;   // loopback / unspecified
    if (h.startsWith("fc") || h.startsWith("fd")) return true; // ULA
    if (h.startsWith("fe80:")) return true;       // link-local
    if (h.startsWith("ff")) return true;          // multicast
    if (h.startsWith("::ffff:")) {
      // IPv4-mapped — recurse on the v4 portion
      const v4Part = h.slice("::ffff:".length);
      return isPrivateHost(v4Part);
    }
  }
  return false;
}

export function parseAddWebhookBody(body: unknown): ValidationResult<AddWebhookBody> {
  return safeParse(() => {
    if (!isObject(body)) throw new Error("request body must be an object");
    const url = requireString(body, "url", { min: 8, max: 2_000 });
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("'url' must be a valid URL");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("'url' must use http:// or https://");
    }
    if (parsed.username || parsed.password) {
      throw new Error("'url' must not contain credentials");
    }
    if (isPrivateHost(parsed.hostname)) {
      throw new Error("'url' must not target a private, loopback, or metadata address");
    }
    return {
      url,
      label: optionalString(body, "label", { max: 60 }),
    };
  });
}

export interface AddTeamMemberBody {
  memberAddress: string;
  label?: string;
}

export function parseAddTeamMemberBody(body: unknown): ValidationResult<AddTeamMemberBody> {
  return safeParse(() => {
    if (!isObject(body)) throw new Error("request body must be an object");
    return {
      memberAddress: parseSs58(body.memberAddress, "memberAddress"),
      label: optionalString(body, "label", { max: 60 }),
    };
  });
}

export interface UpsertAlertRuleBody {
  address: string;
  type: string;
  threshold: number;
  enabled: boolean;
}

export function parseUpsertAlertRuleBody(body: unknown): ValidationResult<UpsertAlertRuleBody> {
  return safeParse(() => {
    if (!isObject(body)) throw new Error("request body must be an object");
    return {
      address: parseSs58(body.address),
      type: requireString(body, "type", { min: 1, max: 60, pattern: /^[a-z0-9_]+$/ }),
      threshold: requireNumber(body, "threshold", { min: -1_000_000, max: 1_000_000 }),
      enabled: requireBoolean(body, "enabled"),
    };
  });
}

export interface ApplyPresetBody {
  address: string;
  presetId: string;
}

export function parseApplyPresetBody(body: unknown): ValidationResult<ApplyPresetBody> {
  return safeParse(() => {
    if (!isObject(body)) throw new Error("request body must be an object");
    return {
      address: parseSs58(body.address),
      presetId: requireString(body, "presetId", { min: 1, max: 60, pattern: /^[a-z0-9_-]+$/i }),
    };
  });
}
