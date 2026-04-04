interface MetricPillProps {
  value: number;
  suffix?: string;
  showSign?: boolean;
  size?: "xs" | "sm" | "md";
}

export function MetricPill({ value, suffix = "%", showSign = true, size = "sm" }: MetricPillProps) {
  const isPos = value > 0;
  const isNeg = value < 0;

  const pad  = size === "xs" ? "2px 6px" : size === "sm" ? "3px 8px" : "4px 10px";
  const font = size === "xs" ? 10 : size === "sm" ? 11 : 12;
  const arrow = isPos ? "▲" : isNeg ? "▼" : "–";

  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: pad,
    borderRadius: 6,
    fontSize: font,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.01em",
    ...(isPos
      ? { background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }
      : isNeg
      ? { background: "rgba(244,63,94,0.1)", color: "#f87171", border: "1px solid rgba(244,63,94,0.2)" }
      : { background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }),
  };

  return (
    <span style={style}>
      <span style={{ fontSize: font - 1, opacity: 0.85 }}>{arrow}</span>
      {showSign && isPos ? "+" : ""}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}
