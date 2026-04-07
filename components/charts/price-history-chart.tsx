"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PriceData {
  date: string;
  price: number;
}

interface PriceHistoryResponse {
  prices: PriceData[];
  change24h: number;
  change7d: number;
  change30d: number;
}

interface Period {
  label: string;
  days: number;
}

const PERIODS: Period[] = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="glass px-3 py-2 text-xs">
      <p className="text-slate-400">{data?.date}</p>
      <p className="font-semibold text-white">${data?.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  );
};

export function PriceHistoryChart() {
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [data, setData] = useState<PriceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  const fetchPriceHistory = async (days: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tao-price-history?days=${days}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result: PriceHistoryResponse = await response.json();
      setData(result);
      if (result.prices.length > 0) {
        setCurrentPrice(result.prices[result.prices.length - 1].price);
      }
    } catch (error) {
      console.error("Failed to fetch price history:", error);
      // Set fallback data
      setData({
        prices: [],
        change24h: 0,
        change7d: 0,
        change30d: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceHistory(selectedPeriod);
  }, [selectedPeriod]);

  const getChangeColor = (value: number) => {
    return value >= 0 ? "text-emerald-400" : "text-red-400";
  };

  const getChartColor = (value: number) => {
    return value >= 0 ? "#22d3ee" : "#ef4444";
  };

  const chartColor = data && data.prices.length > 0
    ? getChartColor(data.prices[data.prices.length - 1].price - (data.prices[0]?.price || 0))
    : "#22d3ee";

  const relevantChange =
    selectedPeriod === 7
      ? data?.change7d
      : selectedPeriod === 30
      ? data?.change30d
      : selectedPeriod === 90
      ? data?.change7d
      : data?.change30d;

  return (
    <div className="w-full">
      {/* Header with price and change */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            {currentPrice !== null ? (
              <>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Current Price
                </div>
                <div
                  className="font-bold text-white tabular-nums leading-none"
                  style={{ fontSize: "32px", letterSpacing: "-0.025em" }}
                >
                  ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </>
            ) : (
              <div className="h-10 bg-slate-700 rounded animate-pulse w-32" />
            )}
          </div>

          {/* Period buttons */}
          <div className="flex items-center gap-1.5">
            {PERIODS.map((period) => (
              <button
                key={period.days}
                onClick={() => setSelectedPeriod(period.days)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
                style={{
                  color: selectedPeriod === period.days ? "#22d3ee" : "#475569",
                  background: selectedPeriod === period.days ? "rgba(34,211,238,0.08)" : "transparent",
                }}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Change percentages */}
        {data && (
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                24H Change
              </div>
              <div className={`text-sm font-semibold tabular-nums ${getChangeColor(data.change24h)}`}>
                {data.change24h >= 0 ? "+" : ""}{data.change24h.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                7D Change
              </div>
              <div className={`text-sm font-semibold tabular-nums ${getChangeColor(data.change7d)}`}>
                {data.change7d >= 0 ? "+" : ""}{data.change7d.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                30D Change
              </div>
              <div className={`text-sm font-semibold tabular-nums ${getChangeColor(data.change30d)}`}>
                {data.change30d >= 0 ? "+" : ""}{data.change30d.toFixed(2)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-[180px] bg-slate-700/30 rounded-lg animate-pulse" />
      ) : data && data.prices.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data.prices} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 9 }}
              interval={Math.max(0, Math.floor(data.prices.length / 6) - 1)}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 9 }}
              tickFormatter={(v) => `$${v}`}
              domain={["dataMin - 5", "auto"]}
            />
            <Tooltip content={(props) => <CustomTooltip {...props} />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={chartColor}
              strokeWidth={1.5}
              fill="url(#priceGrad)"
              dot={false}
              activeDot={{ r: 4, fill: chartColor, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[180px] flex items-center justify-center text-slate-500">
          No data available
        </div>
      )}
    </div>
  );
}
