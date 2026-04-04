"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AllocationBarList } from "@/components/charts/allocation-bar-list";
import type { AllocationModel as Allocation } from "@/lib/types/portfolio";

interface AllocationChartCardProps {
  allocations: Allocation[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass px-3 py-2 text-xs">
      <p className="font-semibold text-white">{d.name}</p>
      <p className="text-slate-400">{d.amountTao.toFixed(2)} τ · {(d.fraction * 100).toFixed(1)}%</p>
    </div>
  );
};

export function AllocationChartCard({ allocations }: AllocationChartCardProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Donut chart */}
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={allocations}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={2}
                dataKey="fraction"
                strokeWidth={0}
              >
                {allocations.map((a, i) => (
                  <Cell key={i} fill={a.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Center overlay */}
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-0.5">Total staked</p>
          <p className="text-2xl font-bold text-white">
            {allocations.reduce((s, a) => s + a.amountTao, 0).toFixed(2)} τ
          </p>
          <p className="text-xs text-slate-500 mt-1">across {allocations.length} subnets</p>
        </div>
      </div>

      {/* Bar list */}
      <AllocationBarList allocations={allocations} />
    </div>
  );
}
