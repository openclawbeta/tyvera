import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PremiumBadge({ size = "md", className }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-2 py-1 gap-1",
    md: "text-xs px-2.5 py-1.5 gap-1.5",
    lg: "text-sm px-3 py-2 gap-2",
  };
  const iconSizes = { sm: "w-2.5 h-2.5", md: "w-3 h-3", lg: "w-4 h-4" };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg font-semibold",
        "bg-gradient-to-r from-amber-400/15 to-orange-400/15",
        "border border-amber-400/25 text-amber-300",
        sizeClasses[size],
        className,
      )}
    >
      <Zap className={cn(iconSizes[size], "text-amber-400 fill-amber-400")} />
      <span>Premium</span>
    </div>
  );
}
