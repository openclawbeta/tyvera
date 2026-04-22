import type { WalletExtension } from "@/lib/wallet-context";

const EXTENSION_NAMES: Record<WalletExtension, string> = {
  polkadotjs: "polkadot-js",
  subwallet: "subwallet-js",
  talisman: "talisman",
};

export interface AuthBinding {
  /** HTTP method (GET, POST, etc.). Defaults to "GET". */
  method?: string;
  /**
   * URL pathname, e.g. "/api/alerts". If omitted we sign a path-agnostic
   * message (legacy behaviour) — kept as an escape hatch for callers that
   * don't know their target path yet, but should be avoided.
   */
  pathname?: string;
}

/**
 * Signature cache: we reuse a signature across requests to the same
 * (method, pathname) within a 4-minute window. The server accepts any
 * signature whose timestamp is within a 5-minute window, so a 4-minute
 * client cache gives us a 1-minute safety margin.
 *
 * Without this cache, every single request to an authenticated endpoint
 * would pop the wallet's signature prompt — on Next.js client-side
 * navigation and React re-renders, that easily means 3–5 popups per
 * page load.
 */
const SIGNATURE_TTL_MS = 4 * 60_000;

interface CachedEntry {
  headers: Record<string, string>;
  expiresAt: number;
}

const signatureCache = new Map<string, CachedEntry>();

function cacheKey(
  address: string,
  method: string,
  pathname: string | undefined,
): string {
  return `${address}|${method}|${pathname ?? "*"}`;
}

/** Clear all cached signatures — call on wallet disconnect. */
export function clearWalletAuthCache(): void {
  signatureCache.clear();
}

/**
 * Build wallet-auth headers with a v2 signature bound to the HTTP method
 * and URL path. Binding prevents a replay of a valid signature against a
 * different endpoint within the 5-minute auth window.
 *
 * Signatures are cached per (address, method, pathname) for 4 minutes so
 * we don't prompt the wallet on every fetch.
 *
 * When `binding.pathname` is not provided we fall back to the legacy v1
 * message format. The server still accepts v1 for a deprecation window.
 */
export async function createWalletAuthHeaders(
  address: string,
  extension: WalletExtension,
  binding: AuthBinding = {},
): Promise<Record<string, string>> {
  const method = (binding.method ?? "GET").toUpperCase();
  const pathname = binding.pathname;

  const key = cacheKey(address, method, pathname);
  const now = Date.now();

  // Return cached signature if still fresh.
  const cached = signatureCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.headers;
  }

  const extensionName = EXTENSION_NAMES[extension];
  const injected = (window as any).injectedWeb3?.[extensionName];

  if (!injected) {
    throw new Error("Wallet extension unavailable");
  }

  const enabledExtension = await injected.enable("Tyvera");
  const signer = enabledExtension?.signer;

  if (!signer?.signRaw) {
    throw new Error("Wallet extension does not support message signing");
  }

  const timestamp = now;

  // v2 bound format when we have the target pathname, else legacy v1.
  const message = pathname
    ? `tyvera-auth-v2:${timestamp}:${method}:${pathname}`
    : `tyvera-auth:${timestamp}`;

  const { signature } = await signer.signRaw({
    address,
    data: message,
    type: "bytes",
  });

  if (!signature) {
    throw new Error("Failed to create wallet signature");
  }

  const headers: Record<string, string> = {
    "X-Wallet-Address": address,
    "X-Wallet-Message": message,
    "X-Wallet-Signature": signature,
  };

  signatureCache.set(key, {
    headers,
    expiresAt: now + SIGNATURE_TTL_MS,
  });

  return headers;
}
