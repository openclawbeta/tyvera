"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, GitCompare } from "lucide-react";
import { cn, subnetGradient, scoreBg, riskBg } from "@/lib/utils";
import { MetricPill } from "@/components/ui-custom/metric-pill";
import type { SubnetCardModel as Subnet } from "@/lib/types/subnets";

interface SubnetCardProps {
  subnet: Subnet;
  selected?: boolean;
  onSelect?: () => void;    // kept for optional side-panel use
  onCompareToggle?: (subnet: Subnet) => void;
  compareActive?: boolean;
  index?: number;
  linkOnClick?: boolean;    // default true — navigate to detail page on click
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const H = 32;
  const W = 72;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 2) - 1,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = [
    `M${points[0].x},${H}`,
    ...points.map((p) => `L${p.x},${p.y}`),
    `L${points[points.length - 1].x},${H}`,
    "Z",
  ].join(" ");

  const gradId = `spark-${subnet_id(color)}`;

  return (
    <svg width={W} height={H} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2.5"
        fill={color}
        opacity={0.8}
      />
    </svg>
  );
}

// stable gradient id from color string
function subnet_id(color: string) {
  return color.replace("#", "").slice(0, 6);
}

export function SubnetCard({
  subnet,
  selected,
  onSelect,
  onCompareToggle,
  compareActive,
  index = 0,
  linkOnClick = true,
}: SubnetCardProps) {
  const router = useRouter();
  const isUp = subnet.yieldDelta7d >= 0;
  const sparkColor = isUp ? "#22d3ee" : "#f43f5e";

  function handleClick() {
    if (onSelect) onSelect();
    if (linkOnClick) router.push(`/subnets/${subnet.netuid}`);
  }

  const idleStyle = {
    background: "linear-gradient(145deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.014) 100%)",
    border: "1px solid rgba(255,255,255,0.068)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 16px rgba(0,0,0,0.22)",
  };

  const selectedStyle = {
    background: "rgba(34,211,238,0.045)",
    border: "1px solid rgba(34,211,238,0.32)",
    boxShadow: "0 0 0 1px rgba(34,211,238,0.12), 0 0 28px rgba(34,211,238,0.07), 0 1px 0 rgba(255,255,255,0.05) inset",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      onClick={handleClick}
      style={{
        borderRadius: "16px",
        padding: "16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "border-color 0.2s, box-shadow 0.2s",
        ...(selected ? selectedStyle : idleStyle),
      }}
    >
      {/* Logo + name */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
            `bg-gradient-to-br ${subnetGradient(subnet.netuid)}`,
          )}
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
        >
          {subnet.netuid}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-semibold text-white truncate"
            style={{ fontSize: "13px", letterSpacing: "-0.01em" }}
          >
            {subnet.name}
          </div>
          <div className="text-[10px] text-slate-600 font-mono mt-0.5">
            SN{subnet.netuid} · {subnet.category}
          </div>
        </div>
        <button
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{ color: subnet.isWatched ? "#22d3ee" : "#475569" }}
          onClick={(e) => {
            e.stopPropagation();   // don't navigate when bookmarking
          }}
        >
          {subnet.isWatched
            ? <BookmarkCheck className="w-3.5 h-3.5" />
            : <Bookmark className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* Score + Risk */}
      <div className="flex items-center gap-2">
        <span className={cn("tag border", scoreBg(subnet.score))}>Score {subnet.score}</span>
        <span className={cn("tag border", riskBg(subnet.risk))}>{subnet.risk}</span>
      </div>

      {/* Yield + Sparkline */}
      <div className="flex items-end justify-between">
        <div>
          <div
            className="font-bold text-white font-mono leading-none"
            style={{ fontSize: "20px", letterSpacing: "-0.02em" }}
          >
            {subnet.yield}%
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">est. APR</div>
          <div className="mt-1.5">
            <MetricPill value={subnet.yieldDelta7d} size="xs" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Sparkline data={subnet.momentum} color={sparkColor} />
          <span className="text-[9px] text-slate-700 uppercase tracking-wider">14d</span>
        </div>
      </div>

      {onCompareToggle && (
        <button
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-semibold transition-all duration-150"
          style={{
            background: compareActive ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.035)",
            border: compareActive ? "1px solid rgba(34,211,238,0.25)" : "1px solid rgba(255,255,255,0.08)",
            color: compareActive ? "#67e8f9" : "#cbd5e1",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onCompareToggle(subnet);
          }}
        >
          <GitCompare className="w-3.5 h-3.5" />
          {compareActive ? "Selected for compare" : "Add to compare"}
        </button>
      )}

      {/* Footer stats */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.045)" }}
      >
        <div>
          <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">Liquidity</div>
          <div className="text-xs font-semibold text-slate-300 tabular-nums">
            {subnet.liquidity.toLocaleString()} τ
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">Stakers</div>
          <div className="text-xs font-semibold text-slate-300 tabular-nums">
            {subnet.stakers.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">Take</div>
          <div className="text-xs font-semibold text-slate-300 tabular-nums">
            {subnet.validatorTake}%
          </div>
        </div>
      </div>
    </motion.div>
  );
}
