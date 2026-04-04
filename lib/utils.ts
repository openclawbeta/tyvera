import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTAO(amount: number, decimals = 4): string {
  return `${amount.toFixed(decimals)} τ`;
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatLargeNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-rose-400";
}

export function scoreBg(score: number): string {
  if (score >= 70) return "bg-emerald-400/10 border-emerald-400/20 text-emerald-300";
  if (score >= 40) return "bg-amber-400/10 border-amber-400/20 text-amber-300";
  return "bg-rose-400/10 border-rose-400/20 text-rose-300";
}

export function riskColor(risk: "LOW" | "MODERATE" | "HIGH" | "SPECULATIVE"): string {
  switch (risk) {
    case "LOW":         return "text-emerald-400";
    case "MODERATE":    return "text-amber-400";
    case "HIGH":        return "text-rose-400";
    case "SPECULATIVE": return "text-violet-400";
  }
}

export function riskBg(risk: "LOW" | "MODERATE" | "HIGH" | "SPECULATIVE"): string {
  switch (risk) {
    case "LOW":         return "bg-emerald-400/10 border-emerald-400/20 text-emerald-300";
    case "MODERATE":    return "bg-amber-400/10 border-amber-400/20 text-amber-300";
    case "HIGH":        return "bg-rose-400/10 border-rose-400/20 text-rose-300";
    case "SPECULATIVE": return "bg-violet-400/10 border-violet-400/20 text-violet-300";
  }
}

// Generate a deterministic gradient for subnet avatars
export function subnetGradient(netuid: number): string {
  const gradients = [
    "from-cyan-500 to-blue-600",
    "from-violet-500 to-purple-700",
    "from-emerald-500 to-teal-700",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-700",
    "from-sky-500 to-indigo-600",
    "from-teal-500 to-cyan-700",
    "from-fuchsia-500 to-violet-700",
    "from-orange-500 to-red-600",
    "from-lime-500 to-emerald-600",
  ];
  return gradients[netuid % gradients.length];
}

export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
