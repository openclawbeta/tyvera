"use client";

/**
 * VerifyWalletBanner
 *
 * Surfaces when a wallet is connected but not verified, and the current
 * page needs a signed request (e.g. /api/portfolio). Renders nothing
 * when the wallet is disconnected or already verified.
 */

import { AlertCircle, Shield } from "lucide-react";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { useWallet } from "@/lib/wallet-context";

interface Props {
  /** Short sentence explaining why verification is needed on this page. */
  message?: string;
}

export function VerifyWalletBanner({
  message = "Sign a one-time message to confirm wallet ownership. No TAO is spent.",
}: Props) {
  const { walletState, verify } = useWallet();

  // Only show when connected-but-unverified. Disconnected users already
  // see their own "connect wallet" UI on these pages.
  if (walletState !== "connected" && walletState !== "verifying") {
    return null;
  }

  const isVerifying = walletState === "verifying";

  return (
    <FadeIn>
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{
          background: "rgba(251,191,36,0.04)",
          border: "1px solid rgba(251,191,36,0.18)",
        }}
      >
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
        <p className="flex-1 text-[12px] text-slate-400">
          <span className="font-semibold text-amber-300">
            Verify your wallet to load your portfolio.
          </span>{" "}
          {message}
        </p>
        <button
          onClick={verify}
          disabled={isVerifying}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-150 disabled:opacity-60"
          style={{
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.25)",
            color: "var(--aurora-warn)",
          }}
          onMouseEnter={(e) => {
            if (!isVerifying) {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(251,191,36,0.18)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(251,191,36,0.1)";
          }}
        >
          <Shield className="h-3 w-3" />
          {isVerifying ? "Signing…" : "Verify now"}
        </button>
      </div>
    </FadeIn>
  );
}
