"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  createWalletAuthHeaders,
  clearWalletAuthCache,
} from "@/lib/wallet-auth-client";

/**
 * Persisted connection keys. We store the last connected wallet so a page
 * refresh doesn't kick the user back to "disconnected". We deliberately
 * do NOT persist the "verified" state — callers must re-sign on reload to
 * prove ownership. Hydrating in "connected" state means the Verify banner
 * shows immediately and a single click gets the user going again.
 */
const STORAGE_KEY_ADDRESS = "tyvera.wallet.address";
const STORAGE_KEY_EXTENSION = "tyvera.wallet.extension";

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                                 */
/* ─────────────────────────────────────────────────────────────────── */

export type WalletState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "verifying"
  | "verified"
  | "pending_approval";

export type WalletExtension = "polkadotjs" | "subwallet" | "talisman";

export interface ApprovalRequest {
  id: string;
  type: "reallocation";
  fromSubnet: { netuid: number; name: string };
  toSubnet:   { netuid: number; name: string };
  amount: number;
  fee: number;
  description: string;
}

export interface ApprovalResult {
  approved: boolean;
  txHash?: string;
}

interface WalletCtx {
  walletState: WalletState;
  address: string | null;
  extension: WalletExtension | null;
  isModalOpen: boolean;
  approvalRequest: ApprovalRequest | null;
  lastApprovalResult: ApprovalResult | null;
  availableExtensions: WalletExtension[];
  connectionError: string | null;

  openModal: () => void;
  closeModal: () => void;

  connect: (ext: WalletExtension) => void;
  disconnect: () => void;
  verify: () => void;
  getAuthHeaders: (binding?: { method?: string; pathname?: string }) => Promise<Record<string, string>>;

  requestApproval: (req: ApprovalRequest) => void;
  resolveApproval: (result: ApprovalResult) => void;
  cancelApproval: () => void;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Extension name mapping                                                */
/* ─────────────────────────────────────────────────────────────────── */

const EXTENSION_NAMES: Record<WalletExtension, string> = {
  polkadotjs: "polkadot-js",
  subwallet: "subwallet-js",
  talisman: "talisman",
};

/* ─────────────────────────────────────────────────────────────────── */
/* Context                                                              */
/* ─────────────────────────────────────────────────────────────────── */

const WalletContext = createContext<WalletCtx | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletState, setWalletState] = useState<WalletState>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [extension, setExtension] = useState<WalletExtension | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [lastApprovalResult, setLastApprovalResult] = useState<ApprovalResult | null>(null);
  const [availableExtensions, setAvailableExtensions] = useState<WalletExtension[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const prevStateRef = useRef<WalletState>("disconnected");

  // Detect available wallet extensions on mount
  // Polkadot extensions inject into window.injectedWeb3 asynchronously,
  // so we check after a brief delay to ensure they've loaded.
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const detect = () => {
      const detected: WalletExtension[] = [];
      const injected = (window as any).injectedWeb3;

      if (injected?.["polkadot-js"]) detected.push("polkadotjs");
      if (injected?.["subwallet-js"]) detected.push("subwallet");
      if (injected?.talisman)         detected.push("talisman");

      setAvailableExtensions(detected);
    };

    // Check immediately, then again after extensions have injected
    detect();
    const timer = setTimeout(detect, 500);
    return () => clearTimeout(timer);
  }, []);

  // Hydrate the last connected wallet from localStorage. We land in the
  // "connected" state (NOT "verified") so the user must re-sign a fresh
  // proof-of-ownership message. This preserves security while avoiding
  // the full reconnect flow on every page reload.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedAddress = window.localStorage.getItem(STORAGE_KEY_ADDRESS);
      const savedExt = window.localStorage.getItem(
        STORAGE_KEY_EXTENSION,
      ) as WalletExtension | null;
      if (savedAddress && savedExt) {
        setAddress(savedAddress);
        setExtension(savedExt);
        setWalletState("connected");
      }
    } catch {
      // localStorage can throw in private/incognito modes — ignore.
    }
  }, []);

  const openModal  = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const connect = useCallback(async (ext: WalletExtension) => {
    setExtension(ext);
    setWalletState("connecting");
    setConnectionError(null);

    try {
      // Attempt real extension connection via @polkadot/extension-dapp
      const extensionName = EXTENSION_NAMES[ext];
      const injected = (window as any).injectedWeb3?.[extensionName];

      if (!injected) {
        throw new Error(
          `${ext} extension not found. Please install it and refresh the page.`
        );
      }

      // Enable the extension — this prompts the user in their extension popup
      const enabledExtension = await injected.enable("Tyvera");

      // Get accounts from the extension
      const accounts = await enabledExtension.accounts.get();

      if (!accounts || accounts.length === 0) {
        throw new Error(
          "No accounts found. Please create or import an account in your wallet extension."
        );
      }

      // Use the first account's SS58 address
      const walletAddress = accounts[0].address;

      if (!walletAddress || typeof walletAddress !== "string") {
        throw new Error("Invalid account address returned from extension.");
      }

      setAddress(walletAddress);
      setWalletState("connected");
      setIsModalOpen(false);

      // Persist for page-refresh survival.
      try {
        window.localStorage.setItem(STORAGE_KEY_ADDRESS, walletAddress);
        window.localStorage.setItem(STORAGE_KEY_EXTENSION, ext);
      } catch {
        // Non-fatal — localStorage may be unavailable (incognito, etc.)
      }
    } catch (err: any) {
      console.error("[wallet] Connection failed:", err);
      const message =
        err?.message || "Failed to connect wallet. Please try again.";
      setConnectionError(message);
      setWalletState("disconnected");
      setExtension(null);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWalletState("disconnected");
    setAddress(null);
    setExtension(null);
    setApprovalRequest(null);
    setIsModalOpen(false);
    setConnectionError(null);
    // Drop any cached signatures for the now-disconnected wallet.
    clearWalletAuthCache();
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY_ADDRESS);
        window.localStorage.removeItem(STORAGE_KEY_EXTENSION);
      }
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const verify = useCallback(async () => {
    if (!address || !extension) return;

    setWalletState("verifying");

    try {
      const extensionName = EXTENSION_NAMES[extension];
      const injected = (window as any).injectedWeb3?.[extensionName];

      if (!injected) {
        throw new Error("Extension no longer available.");
      }

      const enabledExtension = await injected.enable("Tyvera");
      const signer = enabledExtension.signer;

      if (!signer?.signRaw) {
        // The wallet doesn't expose signRaw (e.g. some mobile SubWallet
        // / WalletConnect flows). We can NOT mark the session verified
        // because downstream API calls require a signed message. Stay
        // connected and surface a clear error so the user understands
        // why portfolio/chat won't load.
        setWalletState("connected");
        setConnectionError(
          "This wallet doesn't support message signing. Try a desktop extension (Polkadot.js, Talisman, or SubWallet) to access your portfolio.",
        );
        return;
      }

      // Sign a timestamped message for ownership verification
      const timestamp = Date.now();
      const message = `tyvera-auth:${timestamp}`;

      const { signature } = await signer.signRaw({
        address,
        data: message,
        type: "bytes",
      });

      if (signature) {
        setWalletState("verified");
      } else {
        throw new Error("Signature was empty.");
      }
    } catch (err: any) {
      console.error("[wallet] Verification failed:", err);
      // Fall back to connected state (not verified) rather than disconnecting
      setWalletState("connected");
      setConnectionError(err?.message || "Verification failed. You can still browse with limited features.");
    }
  }, [address, extension]);

  const getAuthHeaders = useCallback(
    async (binding?: { method?: string; pathname?: string }) => {
      if (!address || !extension) {
        throw new Error("Wallet must be connected to authenticate requests.");
      }

      return createWalletAuthHeaders(address, extension, binding);
    },
    [address, extension],
  );

  const requestApproval = useCallback((req: ApprovalRequest) => {
    prevStateRef.current = walletState;
    setLastApprovalResult(null);
    setApprovalRequest(req);
    setWalletState("pending_approval");
  }, [walletState]);

  const resolveApproval = useCallback((result: ApprovalResult) => {
    setLastApprovalResult(result);
    setApprovalRequest(null);
    setWalletState("verified");
  }, []);

  const cancelApproval = useCallback(() => {
    setApprovalRequest(null);
    setWalletState(prevStateRef.current === "pending_approval" ? "verified" : prevStateRef.current);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        walletState,
        address,
        extension,
        isModalOpen,
        approvalRequest,
        lastApprovalResult,
        availableExtensions,
        connectionError,
        openModal,
        closeModal,
        connect,
        disconnect,
        verify,
        getAuthHeaders,
        requestApproval,
        resolveApproval,
        cancelApproval,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletCtx {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
