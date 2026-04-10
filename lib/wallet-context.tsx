"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { createWalletAuthHeaders } from "@/lib/wallet-auth-client";

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
  // Context for managing wallet state and interactions
  console.log('Initializing Wallet Context');
  walletState: WalletState;
  address: string | null;
  extension: WalletExtension | null;
  isModalOpen: boolean;
  approvalRequest: ApprovalRequest | null;
  availableExtensions: WalletExtension[];
  connectionError: string | null;

  openModal: () => void;
  closeModal: () => void;

  connect: (ext: WalletExtension) => void;
  disconnect: () => void;
  verify: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;

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
  const [availableExtensions, setAvailableExtensions] = useState<WalletExtension[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const prevStateRef = useRef<WalletState>("disconnected");

  // Detect available wallet extensions on mount
  // Polkadot extensions inject into window.injectedWeb3 asynchronously,
  // so we check after a brief delay to ensure they've loaded.
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const detect = () => {
      try {
        const detected: WalletExtension[] = [];
        const injected = typeof window !== "undefined" ? (window as any).injectedWeb3 : undefined;

        if (injected && typeof injected === "object") {
          if (injected["polkadot-js"]) detected.push("polkadotjs");
          if (injected["subwallet-js"]) detected.push("subwallet");
          if (injected.talisman) detected.push("talisman");
        }

        setAvailableExtensions(detected);
      } catch (err) {
        console.warn("[wallet] Extension detection failed:", err);
        setAvailableExtensions([]);
      }
    };

    // Check immediately, then again after extensions have injected
    detect();
    const timer = setTimeout(detect, 500);
    return () => clearTimeout(timer);
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
      const injectedRoot = typeof window !== "undefined" ? (window as any).injectedWeb3 : undefined;
      const injected = injectedRoot && typeof injectedRoot === "object" ? injectedRoot[extensionName] : undefined;

      if (!injected || typeof injected.enable !== "function") {
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
  }, []);

  const verify = useCallback(async () => {
    if (!address || !extension) return;

    setWalletState("verifying");

    try {
      const extensionName = EXTENSION_NAMES[extension];
      const injectedRoot = typeof window !== "undefined" ? (window as any).injectedWeb3 : undefined;
      const injected = injectedRoot && typeof injectedRoot === "object" ? injectedRoot[extensionName] : undefined;

      if (!injected || typeof injected.enable !== "function") {
        throw new Error("Extension no longer available.");
      }

      const enabledExtension = await injected.enable("Tyvera");
      const signer = enabledExtension.signer;

      if (!signer?.signRaw) {
        // Extension doesn't support signRaw — accept connection as-is
        console.warn("[wallet] signRaw not supported, skipping verification");
        setWalletState("verified");
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

  const getAuthHeaders = useCallback(async () => {
    if (!address || !extension) {
      throw new Error("Wallet must be connected to authenticate requests.");
    }

    return createWalletAuthHeaders(address, extension);
  }, [address, extension]);

  const requestApproval = useCallback((req: ApprovalRequest) => {
    prevStateRef.current = walletState;
    setApprovalRequest(req);
    setWalletState("pending_approval");
  }, [walletState]);

  const resolveApproval = useCallback((_result: ApprovalResult) => {
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
