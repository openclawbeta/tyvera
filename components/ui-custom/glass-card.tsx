import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "cyan" | "violet" | "emerald" | "amber" | boolean;
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  as?: "div" | "section" | "article";
}

const GLOW_MAP = {
  cyan:    "0 0 0 1px rgba(34,211,238,0.2), 0 0 28px rgba(34,211,238,0.07)",
  violet:  "0 0 0 1px rgba(139,92,246,0.2), 0 0 28px rgba(139,92,246,0.07)",
  emerald: "0 0 0 1px rgba(52,211,153,0.2), 0 0 28px rgba(52,211,153,0.07)",
  amber:   "0 0 0 1px rgba(251,191,36,0.2), 0 0 28px rgba(251,191,36,0.07)",
};

export function GlassCard({
  children,
  className,
  hover = false,
  glow = false,
  padding = "md",
  as: Tag = "div",
}: GlassCardProps) {
  const padMap = { none: "", sm: "p-4", md: "p-5", lg: "p-6", xl: "p-8" };

  const glowShadow =
    typeof glow === "string"
      ? GLOW_MAP[glow]
      : glow
      ? "0 0 0 1px rgba(34,211,238,0.2), 0 0 28px rgba(34,211,238,0.07)"
      : "";

  return (
    <Tag
      className={cn(
        "glass",
        padMap[padding],
        hover && "cursor-pointer",
        className,
      )}
      style={glowShadow ? { boxShadow: glowShadow } : undefined}
    >
      {children}
    </Tag>
  );
}
