"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const DATA = [
  { name: "SN49", yield: 26.7, delta: 0.4 },
  { name: "SN40", yield: 32.1, delta: -8.4 },
  { name: "SN19", yield: 28.4, delta: -3.2 },
  { name: "SN1",  yield: 24.3, delta: 1.2  },
  { name: "SN18", yield: 23.0, delta: 1.8  },
  { name: "SN25", yield: 22.1, delta: 1.5  },
  { name: "SN4",  yield: 21.7, delta: 0.8  },
  { name: "SN8",  yield: 19.4, delta: 2.6  },
  { name: "SN21", yield: 18.6, delta: 0.3  },
  { name: "SN32", yield: 17.8, delta: -1.0 },
  { name: "SN3",  yield: 15.0, delta: -2.1 },
  { name: "SN11", yield: 13.2, delta: -0.4 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass px-3 py-2.5 text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className="text-slate-400">Yield: <span className="text-cyan-300 font-mono">{d.yield}%</span></p>
      <p className="text-slate-400">7d: <span className={d.delta >= 0 ? "text-emerald-400" : "text-rose-400"}>{d.delta >= 0 ? "+" : ""}{d.delta}%</span></p>
    </div>
  );
};

export function MomentumBarChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={DATA} barSize={18} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#64748b", fontSize: 10 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#64748b", fontSize: 10 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
        <Bar dataKey="yield" radius={[4, 4, 0, 0]}>
          {DATA.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.delta > 1
                  ? "#22d3ee"
                  : entry.delta > 0
                  ? "#38bdf8"
                  : entry.delta < -2
                  ? "#f43f5e"
                  : "#64748b"
              }
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
