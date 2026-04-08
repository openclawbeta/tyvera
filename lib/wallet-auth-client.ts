import type { WalletExtension } from "@/lib/wallet-context";

const EXTENSION_NAMES: Record<WalletExtension, string> = {
  polkadotjs: "polkadot-js",
  subwallet: "subwallet-js",
  talisman: "talisman",
};

export async function createWalletAuthHeaders(address: string, extension: WalletExtension): Promise<Record<string, string>> {
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

  const message = `tyvera-auth:${Date.now()}`;
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
