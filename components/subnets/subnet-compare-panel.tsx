"use client";

import { ArrowRightLeft, CheckCircle2, GitCompare, Shield, TrendingUp, Users, Zap } from "lucide-react";
import { cn, riskBg, scoreBg, subnetGradient } from "@/lib/utils";
import type { SubnetDetailModel } from "@/lib/types/subnets";

interface SubnetComparePanelProps {
  subnets: [SubnetDetailModel, SubnetDetailModel];
  onClear: () => void;
}

function CompareMetric({
  label,
  left,
  right,
  leftWins,
  rightWins,
}: {
  label: string;
  left: string;
  right: string;
  leftWins: boolean;
  rightWins: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 border-b border-white/[0.05] last:border-0">
      <div className={cn("text-sm font-semibold", leftWins ? "text-emerald-300" : "text-slate-300")}>{left}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-600">{label}</div>
      <div className={cn("text-sm font-semibold text-right", rightWins ? "text-emerald-300" : "text-slate-300")}>{right}</div>
    </div>
  );
}

function CompareHeader({ subnet }: { subnet: SubnetDetailModel }) {
  return (
    <div className="rounded-2xl p-4 border border-white/[0.07] bg-white/[0.03]">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white", `bg-gradient-to-br ${subnetGradient(subnet.netuid)}`)}>
          {subnet.netuid}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{subnet.name}</div>
          <div className="text-[11px] text-slate-500">SN{subnet.netuid} · {subnet.category}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={cn("tag border", scoreBg(subnet.score))}>Score {subnet.score}</span>
        <span className={cn("tag border", riskBg(subnet.risk))}>{subnet.risk}</span>
      </div>
    </div>
  );
}

export function SubnetComparePanel({ subnets, onClear }: SubnetComparePanelProps) {
  const [left, right] = subnets;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 28px rgba(0,0,0,0.28)",
      }}
    >
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitCompare className="w-4 h-4 text-cyan-300" />
            <span className="text-[11px] uppercase tracking-[0.12em] text-cyan-300 font-semibold">Compare mode</span>
          </div>
          <p className="text-sm text-slate-400">Simple side-by-side readout for exactly two subnets.</p>
        </div>
        <button className="btn-ghost text-xs" onClick={onClear}>Clear compare</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] items-start">
        <CompareHeader subnet={left} />
        <div className="hidden lg:flex items-center justify-center h-full text-slate-600">
          <ArrowRightLeft className="w-5 h-5" />
        </div>
        <CompareHeader subnet={right} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/10 px-4">
        <CompareMetric
          label="Yield"
          left={`${left.yield}%`}
          right={`${right.yield}%`}
          leftWins={left.yield > right.yield}
          rightWins={right.yield > left.yield}
        />
        <CompareMetric
          label="Liquidity"
          left={`${left.liquidity.toLocaleString()} τ`}
          right={`${right.liquidity.toLocaleString()} τ`}
          leftWins={left.liquidity > right.liquidity}
          rightWins={right.liquidity > left.liquidity}
        />
        <CompareMetric
          label="Stakers"
          left={left.stakers.toLocaleString()}
          right={right.stakers.toLocaleString()}
          leftWins={left.stakers > right.stakers}
          rightWins={right.stakers > left.stakers}
        />
        <CompareMetric
          label="Emissions"
          left={`${left.emissions} τ`}
          right={`${right.emissions} τ`}
          leftWins={left.emissions > right.emissions}
          rightWins={right.emissions > left.emissions}
        />
        <CompareMetric
          label="Age"
          left={`${left.age}d`}
          right={`${right.age}d`}
          leftWins={left.age > right.age}
          rightWins={right.age > left.age}
        />
      </div>

      <div className="grid gap-4 mt-5 lg:grid-cols-2">
        {[left, right].map((subnet) => (
          <div key={subnet.netuid} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[11px] uppercase tracking-[0.1em] text-slate-500 mb-3">Quick read</div>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-300 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-slate-400">{subnet.summary ?? subnet.description}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Users className="w-3.5 h-3.5 text-emerald-300 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-slate-400">{subnet.stakers} stakers and {subnet.liquidity.toLocaleString()} τ of liquidity currently support this subnet.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Shield className="w-3.5 h-3.5 text-amber-300 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-slate-400">Risk band is <span className="text-white font-medium">{subnet.risk}</span> with score <span className="text-white font-medium">{subnet.score}</span>.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap className="w-3.5 h-3.5 text-violet-300 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-slate-400">Use this compare view as a shortlist tool before deeper allocator or portfolio decisions.</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-5 text-[11px] text-slate-500">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        Phase 1 compare foundation only — no backend persistence or recommendation-engine changes in this slice.
      </div>
    </div>
  );
}
