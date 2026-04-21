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
 * Build wallet-auth headers with a v2 signature bound to the HTTP method
 * and URL path. Binding prevents a replay of a valid signature against a
 * different endpoint within the 5-minute auth window.
 *
 * When `binding.pathname` is not provided we fall back to the legacy v1
 * message format. The server still accepts v1 for a deprecation window.
 */
export async function createWalletAuthHeaders(
  address: string,
  extension: WalletExtension,
  binding: AuthBinding = {},
): Promise<Record<string, string>> {
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

  const timestamp = Date.now();
  const method = (binding.method ?? "GET").toUpperCase();

  // v2 bound format when we have the target pathname, else legacy v1.
  const message = binding.pathname
    ? `tyvera-auth-v2:${timestamp}:${method}:${binding.pathname}`
    : `tyvera-auth:${timestamp}`;

  const { signature } = await signer.signRaw({
    address,
    data: message,
    type: "bytes",
  });

  if (!signature) {
    throw new Error("Failed to create wallet signature");
  }

  return {
    "X-Wallet-Address": address,
    "X-Wallet-Message": message,
    "X-Wallet-Signature": signature,
  };
}
