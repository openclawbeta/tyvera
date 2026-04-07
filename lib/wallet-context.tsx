"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { web3Enable, web3Accounts, web3FromAddress } from "@polkadot/extension-dapp";
import { signatureVerify } from "@polkadot/util-crypto";
import { u8aToHex, stringToU8a } from "@polkadot/util";

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

  /* ── Extension detection on mount ── */
  useEffect(() => {
    function detect() {
      const injected = window.injectedWeb3 ?? {};
      setAvailableExtensions({
        polkadotjs: !!injected[EXTENSION_KEYS.polkadotjs],
        subwallet: !!injected[EXTENSION_KEYS.subwallet],
        talisman: !!injected[EXTENSION_KEYS.talisman],
      });
    }
    // Extensions inject async — check immediately and again after a short delay
    detect();
    const timer = setTimeout(detect, 500);
    return () => clearTimeout(timer);
  }, []);

  const openModal  = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  /* ── Real connect: web3Enable → web3Accounts → select first account ── */
  const connect = useCallback((ext: WalletExtension) => {
    // Check extension availability BEFORE changing state
    if (!availableExtensions[ext]) {
      setConnectionError(`Extension not found. Install ${EXTENSION_NAMES[ext]} to continue.`);
      return;
    }

    setConnectionError(null);
    setExtension(ext);
    setWalletState("connecting");

    (async () => {
      try {
        await web3Enable(APP_NAME);
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
