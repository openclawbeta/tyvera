import { cn, riskBg } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types/subnets";

interface RiskBadgeProps {
  risk: RiskLevel;
  size?: "sm" | "md";
}

const RISK_LABELS: Record<RiskLevel, string> = {
  LOW:         "Low Risk",
  MODERATE:    "Moderate",
  HIGH:        "High Risk",
  SPECULATIVE: "Speculative",
};

export function RiskBadge({ risk, size = "sm" }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border font-semibold",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        riskBg(risk),
      )}
    >
      {RISK_LABELS[risk]}
    </span>
  );
}
