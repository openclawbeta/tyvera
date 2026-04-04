"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  label: string;
  value: number;
}

interface SimpleLineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  prefix?: string;
  suffix?: string;
  gradientId?: string;
}

const CustomTooltip = ({ active, payload, prefix = "", suffix = "" }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs">
      <p className="text-slate-400">{payload[0]?.payload?.label}</p>
      <p className="font-semibold text-white">{prefix}{payload[0]?.value?.toLocaleString()}{suffix}</p>
    </div>
  );
};

export function SimpleLineChart({
  data,
  color = "#22d3ee",
  height = 160,
  showGrid = false,
  prefix = "",
  suffix = "",
  gradientId = "lineGrad",
}: SimpleLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        )}
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#475569", fontSize: 9 }}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#475569", fontSize: 9 }}
          tickFormatter={(v) => `${prefix}${v}${suffix}`}
        />
        <Tooltip content={(props) => <CustomTooltip {...props} prefix={prefix} suffix={suffix} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
