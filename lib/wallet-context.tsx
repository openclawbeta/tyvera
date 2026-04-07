"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

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
  availableExtensions: WalletExtension[];
  connectionError: string | null;

  openModal: () => void;
  closeModal: () => void;

  connect: (ext: WalletExtension) => void;
  disconnect: () => void;
  verify: () => void;

  requestApproval: (req: ApprovalRequest) => void;
  resolveApproval: (result: ApprovalResult) => void;
  cancelApproval: () => void;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Mock data                                                             */
/* ─────────────────────────────────────────────────────────────────── */

const MOCK_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

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
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const detected: WalletExtension[] = [];

      if ((window as any).injectedWeb3?.["polkadot-js"]) {
        detected.push("polkadotjs");
      }
      if ((window as any).injectedWeb3?.["subwallet-js"]) {
        detected.push("subwallet");
      }
      if ((window as any).injectedWeb3?.talisman) {
        detected.push("talisman");
      }

      setAvailableExtensions(detected);

      if (detected.length > 0) {
        console.log(`Real wallet extension(s) detected: ${detected.join(", ")}`);
      }
    }
  }, []);

  const openModal  = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const connect = useCallback((ext: WalletExtension) => {
    setExtension(ext);
    setWalletState("connecting");
    setConnectionError(null);

    // Check if real extension is available
    if (availableExtensions.includes(ext)) {
      console.log(`Real extension detected: ${ext}`);
      // For now, use mock flow as fallback until real integration is complete
      setTimeout(() => {
        setAddress(MOCK_ADDRESS);
        setWalletState("connected");
      }, 1800);
    } else {
      // Simulate async wallet detection (1.8 s) for unavailable extensions
      setTimeout(() => {
        setAddress(MOCK_ADDRESS);
        setWalletState("connected");
      }, 1800);
    }
  }, [availableExtensions]);

  const disconnect = useCallback(() => {
    setWalletState("disconnected");
    setAddress(null);
    setExtension(null);
    setApprovalRequest(null);
    setIsModalOpen(false);
    setConnectionError(null);
  }, []);

  const verify = useCallback(() => {
    setWalletState("verifying");

    // Simulate sign-message round-trip (1.2 s)
    setTimeout(() => {
      setWalletState("verified");
    }, 1200);
  }, []);

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
