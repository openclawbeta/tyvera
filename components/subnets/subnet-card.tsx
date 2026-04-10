"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, GitCompare, Globe, FileText, ExternalLink, MessageSquare } from "lucide-react";
import { cn, subnetGradient, scoreBg, riskBg } from "@/lib/utils";
import { MetricPill } from "@/components/ui-custom/metric-pill";
import { YieldOutlierTag } from "@/components/subnets/subnet-risk-banner";
import type { SubnetDetailModel as Subnet } from "@/lib/types/subnets";
import type { CurrencyMode } from "@/lib/currency";
import { formatCurrencyValue, formatPriceValue } from "@/lib/currency";
import { useSubnetWatchlist } from "@/lib/hooks/use-subnet-watchlist";

interface SubnetCardProps {
  subnet: Subnet;
  selected?: boolean;
  onSelect?: () => void;    // kept for optional side-panel use
  onCompareToggle?: (subnet: Subnet) => void;
  compareActive?: boolean;
  index?: number;
  linkOnClick?: boolean;    // default true — navigate to detail page on click
  currency?: CurrencyMode;
  taoUsdRate?: number | null;
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

export const SubnetCard = memo(function SubnetCard({
  subnet,
  selected,
  onSelect,
  onCompareToggle,
  compareActive,
  index = 0,
  linkOnClick = true,
  currency = "tau",
  taoUsdRate = null,
}: SubnetCardProps) {
  const router = useRouter();
  const { isWatched, toggleWatch } = useSubnetWatchlist();
  const watched = isWatched(subnet.netuid);
  const isUp = subnet.yieldDelta7d >= 0;
  const sparkColor = isUp ? "#22d3ee" : "#f43f5e";

  function handleClick() {
    if (onSelect) onSelect();
    if (linkOnClick) router.push(`/subnets/${subnet.netuid}`);
  }

  const researchLinks = [
    subnet.links?.website ? { href: subnet.links.website, label: "Website", icon: Globe } : null,
    subnet.links?.x ? { href: subnet.links.x, label: "X", icon: MessageSquare } : null,
    subnet.links?.docs ? { href: subnet.links.docs, label: "Docs", icon: FileText } : null,
    subnet.links?.explorer ? { href: subnet.links.explorer, label: "Explorer", icon: ExternalLink } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof Globe }>;

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
          style={{ color: watched ? "#22d3ee" : "#475569" }}
          onClick={(e) => {
            e.stopPropagation();
            toggleWatch(subnet.netuid);
          }}
          aria-label={watched ? `Remove ${subnet.name} from watchlist` : `Add ${subnet.name} to watchlist`}
          title={watched ? "Watching" : "Add to watchlist"}
        >
          {watched
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
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-slate-600">est. APR</span>
            <YieldOutlierTag yield={subnet.yield} />
          </div>
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

      {/* Quick research links */}
      {researchLinks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {researchLinks.map(({ href, label, icon: Icon }) => (
            <a
              key={`${subnet.netuid}-${label}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <Icon className="w-3 h-3" />
              {label}
            </a>
          ))}
        </div>
      )}

      {/* Footer stats */}
      <div
        className="grid grid-cols-2 gap-3 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.045)" }}
      >
        <div>
          <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">Liquidity</div>
          <div className="text-xs font-semibold text-slate-300 tabular-nums">
            {formatCurrencyValue(subnet.liquidity, currency, taoUsdRate)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">Alpha Price</div>
          <div className="text-xs font-semibold text-slate-300 tabular-nums">
            {formatPriceValue(subnet.alphaPrice ?? 0, currency, taoUsdRate, 6)}
          </div>
        </div>
        <div>
          <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">Stakers</div>
          <div className="text-xs font-semibold text-slate-300 tabular-nums">
            {subnet.stakers.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">7D Flow</div>
          <div className="text-xs font-semibold tabular-nums" style={{ color: (subnet.flow1w ?? subnet.inflow) >= 0 ? "#6ee7b7" : "#fda4af" }}>
            {(subnet.flow1w ?? subnet.inflow) >= 0 ? "+" : ""}{formatCurrencyValue(Math.abs(subnet.flow1w ?? subnet.inflow ?? 0), currency, taoUsdRate)}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
