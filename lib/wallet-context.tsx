"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
/* Polkadot libs access `window` at import time — lazy-import to avoid SSR crash */
const getPolkadotDapp = () => import("@polkadot/extension-dapp");
const getPolkadotCrypto = () => import("@polkadot/util-crypto");
const getPolkadotUtil = () => import("@polkadot/util");

/* ─────────────────────────────────────────────────────────────────── */
/* Window type extension                                                */
/* ─────────────────────────────────────────────────────────────────── */

declare global {
  interface Window {
    injectedWeb3?: Record<string, unknown>;
  }
}

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
  availableExtensions: Record<WalletExtension, boolean>;
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
/* Constants                                                             */
/* ─────────────────────────────────────────────────────────────────── */

/** Maps our WalletExtension IDs to window.injectedWeb3 keys */
const EXTENSION_KEYS: Record<WalletExtension, string> = {
  polkadotjs: "polkadot-js",
  subwallet: "subwallet-js",
  talisman: "talisman",
};

/** Human-readable names for error messages */
const EXTENSION_NAMES: Record<WalletExtension, string> = {
  polkadotjs: "Polkadot.js",
  subwallet: "SubWallet",
  talisman: "Talisman",
};

const APP_NAME = "Tyvera";

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
  const [availableExtensions, setAvailableExtensions] = useState<Record<WalletExtension, boolean>>({
    polkadotjs: false,
    subwallet: false,
    talisman: false,
  });
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const prevStateRef = useRef<WalletState>("disconnected");

  /* ── Extension detection ── */
  // Show all extensions as available — detection via window.injectedWeb3
  // is unreliable (newer extensions may not inject until web3Enable is called).
  // Connection errors are handled gracefully at connect time instead.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setAvailableExtensions({ polkadotjs: true, subwallet: true, talisman: true });
  }, []);

  const openModal  = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  /* ── Real connect: web3Enable → web3Accounts → select first account ── */
  const connect = useCallback((ext: WalletExtension) => {
    setConnectionError(null);
    setExtension(ext);
    setWalletState("connecting");

    (async () => {
      try {
        const { web3Enable, web3Accounts } = await getPolkadotDapp();
        const injected = await web3Enable(APP_NAME);

        if (injected.length === 0) {
          setConnectionError(`No wallet extensions found. Install ${EXTENSION_NAMES[ext]} to continue.`);
          setWalletState("disconnected");
          return;
        }

        const accounts = await web3Accounts();

        if (accounts.length === 0) {
          setConnectionError("No accounts found. Create an account in your extension first.");
          setWalletState("disconnected");
          return;
        }

        // Auto-select first account (account selection UI can come later)
        setAddress(accounts[0].address);
        setWalletState("connected");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Connection failed.";
        setConnectionError(message);
        setWalletState("disconnected");
      }
    })();
  }, [availableExtensions]);

  const disconnect = useCallback(() => {
    setWalletState("disconnected");
    setAddress(null);
    setExtension(null);
    setApprovalRequest(null);
    setConnectionError(null);
    setIsModalOpen(false);
  }, []);

  /* ── Real verify: sign challenge → signatureVerify ── */
  const verify = useCallback(() => {
    if (!address) {
      setConnectionError("No address to verify.");
      return;
    }

    setWalletState("verifying");
    setConnectionError(null);

    (async () => {
      try {
        const challenge = `tyvera-verify-${address}-${Date.now()}`;
        const { web3FromAddress } = await getPolkadotDapp();
        const { signatureVerify } = await getPolkadotCrypto();
        const { u8aToHex, stringToU8a } = await getPolkadotUtil();
        const injector = await web3FromAddress(address);

        if (!injector.signer?.signRaw) {
          setConnectionError("Wallet does not support message signing.");
          setWalletState("connected");
          return;
        }

        const { signature } = await injector.signer.signRaw({
          address,
          data: u8aToHex(stringToU8a(challenge)),
          type: "bytes",
        });

        const result = signatureVerify(challenge, signature, address);

        if (result.isValid) {
          setWalletState("verified");
        } else {
          setConnectionError("Signature verification failed.");
          setWalletState("connected");
        }
      } catch (err: unknown) {
        // User rejected signing popup or other error
        const message = err instanceof Error ? err.message : "Verification cancelled.";
        setConnectionError(message);
        setWalletState("connected");
      }
    })();
  }, [address]);

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
