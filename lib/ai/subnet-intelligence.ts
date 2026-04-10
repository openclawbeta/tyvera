/**
 * lib/ai/subnet-intelligence.ts
 *
 * Client-side AI engine for natural language subnet queries.
 * Not an LLM — a smart pattern matcher + data analyzer that processes intent
 * from common phrasings and returns structured analysis.
 */

import type { SubnetDetailModel } from "@/lib/types/subnets";

export type ChatResponseType = "list" | "comparison" | "calculation" | "insight" | "error";

export interface ChatResponse {
  type: ChatResponseType;
  title: string;
  summary: string;
  data?: SubnetDetailModel[];
  metrics?: Record<string, number | string>;
  suggestion?: string;
  breakdown?: Record<string, number>;
}

interface ComparisonMetrics {
  subnet1: SubnetDetailModel;
  subnet2: SubnetDetailModel;
  metrics: Record<string, { value1: number | string; value2: number | string; unit: string }>;
}

export const QUICK_ASKS = [
  "Assisted queries for smart decisions", // Added context
  "Should I stake root or a subnet?",
  "Top 5 by yield",
  "Lowest risk subnets",
  "Compare SN1 and SN49",
  "Stake 100 TAO",
  "How does yield work?",
];

function formatYieldLabel(yieldPct: number): string {
  if (yieldPct >= 200) return "200%+ est. yield (extreme outlier)";
  if (yieldPct >= 100) return `${yieldPct.toFixed(0)}% est. yield (extreme outlier)`;
  if (yieldPct >= 60) return `${yieldPct.toFixed(1)}% est. yield (very elevated)`;
  return `${yieldPct.toFixed(1)}% est. yield`;
}

function formatYieldMetric(yieldPct: number): string {
  if (yieldPct >= 200) return "200%+ est. yield";
  if (yieldPct >= 100) return `${yieldPct.toFixed(0)}% est. yield`;
  return `${yieldPct.toFixed(1)}% est. yield`;
}

function yieldCaution(yieldPct: number): string {
  if (yieldPct >= 200) {
    return "These are extreme emissions-based outliers and should not be treated like stable comparable APRs.";
  }
  if (yieldPct >= 100) {
    return "These estimates are unusually high and likely to compress quickly as stake enters.";
  }
  if (yieldPct >= 60) {
    return "These are elevated estimates and can move quickly as subnet liquidity changes.";
  }
  return "Estimated yield can change quickly as stake, emissions, and subnet conditions shift.";
}

// ── Intent Matchers ────────────────────────────────────────────────────────

function matchIntent(query: string): string {
  const q = query.toLowerCase().trim();

  if (/best.*subnet|highest.*yield|top.*yield|best.*perform/i.test(q)) return "top-yield";
  if (/lowest.*risk|safest|most.*stable|low.*volatil/i.test(q)) return "lowest-risk";
  if (/gaining.*momentum|trending.*up|movers|gaining|uptrend/i.test(q)) return "trending-up";
  if (/new.*subnet|recently.*launch|latest/i.test(q)) return "new-subnets";
  if (/most.*liquid|highest.*liquid|liquidity/i.test(q)) return "liquidity";
  if (/high.*emission|most.*emission|emission/i.test(q)) return "high-emission";

  if (/compare|vs|versus|SN\d+.*SN\d+|^([a-z]+)\s+vs\s+([a-z]+)/i.test(q)) return "compare";

  if (/should\s+i\s+stake|root\s+(or|vs)|where.*stake|which.*better.*stak|recommend.*stak|advice.*stak|root.*subnet|subnet.*root/i.test(q)) return "staking-advice";
  if (/what.*do.*with|how.*allocat|diversif|split.*between|strategy|rebalance/i.test(q)) return "strategy-advice";

  if (/(?:earn|how much|return.*on|yield.*on).*SN\d+|SN\d+.*(?:earn|yield|return)|calculate/i.test(q)) return "calculate-yield";

  if (/\d+\s*(?:tau|tao|τ)\s/i.test(q) || /stake\s+\d+/i.test(q)) return "stake-options";

  if (/earn|stake|how much|yield.*on|return.*on/i.test(q)) return "staking-advice";

  if (/yield.*above|yield.*threshold|filter.*yield/i.test(q)) return "filter-yield";
  if (/portfolio|summary|all.*stake|my.*stake/i.test(q)) return "portfolio";
  if (/what\s+is|explain|how\s+does|tell\s+me\s+about/i.test(q)) return "explain";

  return "general";
}

function getTopByYield(subnets: SubnetDetailModel[], count = 5): ChatResponse {
  const capped = Math.min(count, 50);
  const sorted = [...subnets]
    .filter((s) => s.yield > 0)
    .sort((a, b) => b.yield - a.yield)
    .slice(0, capped);

  const leader = sorted[0];
  return {
    type: "list",
    title: `Top ${capped} Subnets by Estimated Yield`,
    summary: leader
      ? `Here are the top ${sorted.length} highest estimated-yield subnets. ${leader.name} currently leads at ${formatYieldLabel(leader.yield)}. ${yieldCaution(leader.yield)}`
      : "No yield-bearing subnets were found.",
    data: sorted,
    suggestion: "Ask me to compare any two, or dive into risk profiles for these subnets.",
  };
}

function getLowestRisk(subnets: SubnetDetailModel[]): ChatResponse {
  const lowRisk = subnets.filter((s) => s.risk === "LOW" || s.risk === "MODERATE");

  if (lowRisk.length === 0) {
    return {
      type: "insight",
      title: "Low-Risk Subnets",
      summary: "No subnets currently meet strict LOW risk criteria. Here are MODERATE risk options:",
      data: subnets.filter((s) => s.risk === "MODERATE").sort((a, b) => b.score - a.score).slice(0, 5),
      suggestion: "Risk assessment depends on your risk tolerance. Ask about specific subnets.",
    };
  }

  return {
    type: "list",
    title: "Lowest-Risk Subnets",
    summary: `${lowRisk.length} subnets are LOW or MODERATE risk. Sorted by composite score.`,
    data: lowRisk.sort((a, b) => b.score - a.score).slice(0, 10),
    suggestion: "Compare yields among these, or I can analyze volatility deeper.",
  };
}

function getTrendingUp(subnets: SubnetDetailModel[]): ChatResponse {
  const trending = subnets.filter((s) => s.yieldDelta7d > 0).sort((a, b) => b.yieldDelta7d - a.yieldDelta7d).slice(0, 8);

  if (trending.length === 0) {
    return {
      type: "insight",
      title: "No Uptrend This Week",
      summary: "No subnets have positive 7-day yield momentum. Market is cooling.",
      suggestion: "Try asking about stable yields instead, or check which subnets have held yield steady.",
    };
  }

  return {
    type: "list",
    title: "Trending Up This Week",
    summary: `${trending.length} subnets have gained yield in the past 7 days. Top mover is ${trending[0]?.name} (+${trending[0]?.yieldDelta7d.toFixed(2)}%).`,
    data: trending,
    suggestion: "Uptrends can reverse. Check the risk profile before moving stake.",
  };
}

function getNewSubnets(subnets: SubnetDetailModel[]): ChatResponse {
  const recent = [...subnets].sort((a, b) => a.age - b.age).slice(0, 8);

  return {
    type: "list",
    title: "Recently Launched Subnets",
    summary: `The youngest subnet in the network is ${recent[0]?.name}, launched ${recent[0]?.age} days ago.`,
    data: recent,
    suggestion: "Newer subnets are higher risk but often have early-mover yield bonuses. Verify your risk tolerance.",
  };
}

function getHighestLiquidity(subnets: SubnetDetailModel[]): ChatResponse {
  const liquid = [...subnets].filter((s) => s.liquidity > 0).sort((a, b) => b.liquidity - a.liquidity).slice(0, 8);

  return {
    type: "list",
    title: "Most Liquid Subnets",
    summary: `${liquid[0]?.name} has the deepest liquidity at ${(liquid[0]?.liquidity || 0).toLocaleString()} τ.`,
    data: liquid,
    suggestion: "Liquidity matters for entry/exit speed. These subnets can absorb larger stake moves.",
  };
}

function getHighEmission(subnets: SubnetDetailModel[]): ChatResponse {
  const emitters = [...subnets].filter((s) => s.emissions > 0).sort((a, b) => b.emissions - a.emissions).slice(0, 8);

  return {
    type: "list",
    title: "Highest Emission Subnets",
    summary: `${emitters[0]?.name} emits the most TAO per day at ${emitters[0]?.emissions.toLocaleString()} τ/day.`,
    data: emitters,
    suggestion: "High emission ≠ high yield. Yield also depends on total TAO locked. Ask me to compare side-by-side.",
  };
}

function compareSubnets(query: string, subnets: SubnetDetailModel[]): ChatResponse {
  const snMatch = query.match(/SN(\d+)|subnet\s+(\d+)|(\d+)/gi);
  const snNumbers: number[] = [];

  if (snMatch) {
    snMatch.forEach((m) => {
      const num = parseInt(m.replace(/\D/g, ""));
      if (!isNaN(num)) snNumbers.push(num);
    });
  }

  const names = query
    .toLowerCase()
    .split(/\s+(vs|versus|and|compare)\s+/)
    .filter((p) => p && p !== "vs" && p !== "versus" && p !== "and" && p !== "compare")
    .slice(0, 2);

  let s1: SubnetDetailModel | undefined;
  let s2: SubnetDetailModel | undefined;

  if (snNumbers.length >= 2) {
    s1 = subnets.find((s) => s.netuid === snNumbers[0]);
    s2 = subnets.find((s) => s.netuid === snNumbers[1]);
  }

  if (!s1 && names.length >= 1) {
    s1 = subnets.find((s) => s.name.toLowerCase().includes(names[0]) || s.symbol.toLowerCase().includes(names[0]));
  }
  if (!s2 && names.length >= 2) {
    s2 = subnets.find((s) => s.name.toLowerCase().includes(names[1]) || s.symbol.toLowerCase().includes(names[1]));
  }

  if (!s1 || !s2) {
    const sorted = [...subnets].sort((a, b) => b.yield - a.yield);
    if (!s1) s1 = sorted[0];
    if (!s2) s2 = sorted[1];
  }

  if (!s1 || !s2) {
    return {
      type: "error",
      title: "Comparison Failed",
      summary: "Could not identify subnets to compare. Try 'Compare SN1 and SN49' or subnet names.",
    };
  }

  const comparison: ComparisonMetrics = {
    subnet1: s1,
    subnet2: s2,
    metrics: {
      yield: { value1: s1.yield, value2: s2.yield, unit: "%" },
      risk: { value1: s1.risk, value2: s2.risk, unit: "" },
      liquidity: { value1: s1.liquidity, value2: s2.liquidity, unit: "τ" },
      stakers: { value1: s1.stakers, value2: s2.stakers, unit: "" },
      score: { value1: s1.score, value2: s2.score, unit: "/100" },
      "7d momentum": { value1: s1.yieldDelta7d, value2: s2.yieldDelta7d, unit: "%" },
    },
  };

  const winner = s1.yield > s2.yield ? `${s1.name} leads on estimated yield` : s2.yield > s1.yield ? `${s2.name} leads on estimated yield` : "Tied on estimated yield";

  return {
    type: "comparison",
    title: `${s1.name} vs ${s2.name}`,
    summary: `${winner}. ${s1.name}: ${formatYieldLabel(s1.yield)}, ${s1.risk} risk. ${s2.name}: ${formatYieldLabel(s2.yield)}, ${s2.risk} risk.`,
    data: [s1, s2],
    metrics: Object.fromEntries(Object.entries(comparison.metrics).map(([k, v]) => [k, `${v.value1} ${v.unit} vs ${v.value2} ${v.unit}`])),
    suggestion: "Ask about staking calculations or risk breakdown for either subnet.",
  };
}

function calculateYield(query: string, subnets: SubnetDetailModel[]): ChatResponse {
  const stakeMatch = query.match(/\d+[\s,]*(?:tau|tao|τ|k)?/i);
  const snMatch = query.match(/SN(\d+)|subnet\s+(\d+)/i);

  if (!stakeMatch || !snMatch) {
    return {
      type: "error",
      title: "Yield Calculation",
      summary: "Please specify an amount (e.g., '1000 TAO') and subnet (e.g., 'SN1'). Try: 'How much would I earn staking 100 TAO in SN49?'",
    };
  }

  let stakeAmount = parseFloat(stakeMatch[0].replace(/[^\d.]/g, ""));
  if (stakeMatch[0].toLowerCase().includes("k")) stakeAmount *= 1000;

  const netuid = parseInt(snMatch[1] || snMatch[2]);
  const subnet = subnets.find((s) => s.netuid === netuid);

  if (!subnet) {
    return {
      type: "error",
      title: "Subnet Not Found",
      summary: `Could not find subnet SN${netuid}. Check the network ID.`,
    };
  }

  const dailyYield = (stakeAmount * (subnet.yield / 100)) / 365;
  const monthlyYield = dailyYield * 30;
  const yearlyYield = stakeAmount * (subnet.yield / 100);

  return {
    type: "calculation",
    title: `Staking ${stakeAmount.toLocaleString()} τ in ${subnet.name}`,
    summary: `Using the current estimated yield of ${formatYieldLabel(subnet.yield)}, you'd earn approximately ${dailyYield.toFixed(2)} τ/day at today's conditions. ${yieldCaution(subnet.yield)}`,
    metrics: {
      "Estimated daily yield": dailyYield.toFixed(2),
      "Estimated monthly yield": monthlyYield.toFixed(2),
      "Estimated yearly yield": yearlyYield.toFixed(2),
      "Breakeven days": subnet.breakeven.toString(),
    },
    suggestion: `Breakeven in ${subnet.breakeven} days. Risk: ${subnet.risk}. These estimates can change quickly.`,
  };
}

function filterYield(query: string, subnets: SubnetDetailModel[]): ChatResponse {
  const thresholdMatch = query.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!thresholdMatch) {
    return {
      type: "error",
      title: "Yield Filter",
      summary: "Specify a threshold: 'Subnets with yield above 3%' or 'Show me all yields over 2.5%'",
    };
  }

  const threshold = parseFloat(thresholdMatch[1]);
  const filtered = subnets.filter((s) => s.yield >= threshold).sort((a, b) => b.yield - a.yield);

  if (filtered.length === 0) {
    return {
      type: "insight",
      title: `No Subnets Above ${threshold}%`,
      summary: `No subnets currently show an estimated yield of ${threshold}% or higher. Highest is ${subnets[0]?.name} at ${formatYieldLabel(subnets[0]?.yield ?? 0)}.`,
      data: subnets.sort((a, b) => b.yield - a.yield).slice(0, 5),
      suggestion: "Yields fluctuate daily. Ask me to monitor a threshold.",
    };
  }

  return {
    type: "list",
    title: `Subnets Above ${threshold}% Estimated Yield`,
    summary: `${filtered.length} subnets meet this threshold. Highest: ${filtered[0]?.name} at ${formatYieldLabel(filtered[0]?.yield)}.`,
    data: filtered,
    suggestion: "Compare these by risk and liquidity before treating the headline estimate as actionable.",
  };
}

function getPortfolioSummary(subnets: SubnetDetailModel[]): ChatResponse {
  const topYield = subnets.filter((s) => s.yield > 0).sort((a, b) => b.yield - a.yield)[0];
  const safest = subnets.filter((s) => s.risk === "LOW").sort((a, b) => b.score - a.score)[0];
  const liquid = subnets.sort((a, b) => b.liquidity - a.liquidity)[0];

  const suggested = [topYield, safest, liquid].filter((s, i, arr) => arr.indexOf(s) === i);

  return {
    type: "insight",
    title: "Portfolio Strategy",
    summary: `A balanced approach: diversify across yield (${topYield?.name}), safety (${safest?.name}), and liquidity (${liquid?.name}).`,
    data: suggested as SubnetDetailModel[],
    suggestion: "Tell me your risk tolerance or staking amount for a personalized allocation.",
  };
}

function getStakingAdvice(query: string, subnets: SubnetDetailModel[]): ChatResponse {
  const root = subnets.find((s) => s.netuid === 0);
  const rootYield = root?.yield ?? 18;

  const topSubnets = [...subnets]
    .filter((s) => s.netuid !== 0 && s.yield > 0)
    .sort((a, b) => b.yield - a.yield)
    .slice(0, 5);

  const safeSubnets = [...subnets]
    .filter((s) => s.netuid !== 0 && (s.risk === "LOW" || s.risk === "MODERATE"))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const avgSubnetYield = topSubnets.reduce((sum, s) => sum + s.yield, 0) / (topSubnets.length || 1);

  const amountMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:tau|tao|τ|k)?/i);
  let amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
  if (amountMatch && amountMatch[0].toLowerCase().includes("k")) amount *= 1000;

  const amountStr = amount > 0 ? `${amount.toLocaleString()} τ` : "your TAO";
  const rootDaily = amount > 0 ? (amount * (rootYield / 100)) / 365 : 0;
  const topSubnetDaily = amount > 0 && topSubnets[0] ? (amount * (topSubnets[0].yield / 100)) / 365 : 0;

  const leader = topSubnets[0];
  const summaryParts: string[] = [];

  summaryParts.push(`Root network (SN0) currently yields ~${rootYield.toFixed(1)}% APR and remains the lowest-risk baseline for most allocators.`);

  if (leader) {
    summaryParts.push(`The highest-yield alpha subnets are currently showing very elevated estimated yields. The leader right now is ${leader.name} at ${formatYieldLabel(leader.yield)}.`);
    summaryParts.push(`Across the top 5 alpha subnets, the current average estimated yield is ${formatYieldMetric(avgSubnetYield)}. ${yieldCaution(avgSubnetYield)}`);
  }

  if (amount > 0 && leader) {
    summaryParts.push(`At today's estimates, staking ${amountStr} would imply roughly ${rootDaily.toFixed(2)} τ/day on root versus ${topSubnetDaily.toFixed(2)} τ/day on ${leader.name}, but alpha-subnet estimates can compress quickly as stake enters.`);
  }

  summaryParts.push(`For beginners or conservative stakers, root is still the safer default. For higher-risk positioning, consider spreading exposure and treating extreme yield estimates as unstable rather than guaranteed.`);

  const metrics: Record<string, string | number> = {
    "Root (SN0) APR": `${rootYield.toFixed(1)}%`,
    "Root risk": root?.risk ?? "LOW",
    ...(leader ? { [`Top subnet (${leader.name})`]: formatYieldMetric(leader.yield) } : {}),
    ...(leader ? { "Top subnet risk": leader.risk } : {}),
    "Avg top-5 est. yield": formatYieldMetric(avgSubnetYield),
  };

  if (amount > 0 && leader) {
    metrics["Root daily yield"] = `${rootDaily.toFixed(2)} τ`;
    metrics["Top subnet daily"] = `${topSubnetDaily.toFixed(2)} τ`;
  }

  return {
    type: "insight",
    title: "Root vs Subnet Staking",
    summary: summaryParts.join(" "),
    data: [root, ...topSubnets].filter(Boolean) as SubnetDetailModel[],
    metrics,
    suggestion: safeSubnets.length > 0
      ? `Safer middle ground: ${safeSubnets.map((s) => s.name).join(", ")} rank better on allocator-quality signals. Ask me to compare any two.`
      : "Ask me to compare specific subnets, or check the yield calculator for exact projections.",
  };
}

function getStrategyAdvice(query: string, subnets: SubnetDetailModel[]): ChatResponse {
  const lowRisk = subnets.filter((s) => s.risk === "LOW").sort((a, b) => b.score - a.score).slice(0, 3);
  const highYield = subnets.filter((s) => s.yield > 0).sort((a, b) => b.yield - a.yield).slice(0, 3);
  const balanced = subnets.filter((s) => s.risk === "MODERATE" && s.yield > 5).sort((a, b) => b.score - a.score).slice(0, 3);

  return {
    type: "insight",
    title: "Staking Strategy Overview",
    summary: `Three approaches: (1) Conservative — stick to root or low-risk subnets like ${lowRisk[0]?.name ?? "SN0"} for steadier returns. (2) Balanced — spread across moderate-risk subnets like ${balanced[0]?.name ?? "mid-tier options"} for better yield without extreme exposure. (3) Aggressive — chase top estimated yields in ${highYield[0]?.name ?? "high-emission subnets"}, but treat extreme readings as unstable and monitor them closely.`,
    data: [...lowRisk, ...balanced, ...highYield].filter((s, i, arr) => arr.findIndex((x) => x.netuid === s.netuid) === i).slice(0, 8),
    metrics: {
      "Conservative est. yield": `${lowRisk[0]?.yield.toFixed(1) ?? "~15"}%`,
      "Balanced est. yield": `${balanced[0]?.yield.toFixed(1) ?? "~20"}%`,
      "Aggressive est. yield": formatYieldMetric(highYield[0]?.yield ?? 0),
    },
    suggestion: "Tell me your risk tolerance (low/medium/high) and amount, and I'll suggest a specific allocation split.",
  };
}

function getStakeOptions(query: string, subnets: SubnetDetailModel[]): ChatResponse {
  const amountMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:tau|tao|τ|k)?/i);
  let amount = amountMatch ? parseFloat(amountMatch[1]) : 100;
  if (amountMatch && amountMatch[0].toLowerCase().includes("k")) amount *= 1000;

  const topOptions = [...subnets]
    .filter((s) => s.yield > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const rows = topOptions.map((s) => {
    const daily = (amount * (s.yield / 100)) / 365;
    const monthly = daily * 30;
    return `${s.name} (SN${s.netuid}): ${formatYieldLabel(s.yield)} → ~${daily.toFixed(2)} τ/day, ~${monthly.toFixed(1)} τ/month — Risk: ${s.risk}`;
  });

  return {
    type: "calculation",
    title: `Staking ${amount.toLocaleString()} τ — Top Options`,
    summary: rows.join("\n"),
    data: topOptions,
    metrics: Object.fromEntries(topOptions.map((s) => [`${s.name} daily`, `${((amount * (s.yield / 100)) / 365).toFixed(2)} τ`])),
    suggestion: `Pick a subnet and ask "stake ${amount} TAO in SN${topOptions[0]?.netuid}" for a detailed breakdown.`,
  };
}

function getExplainer(query: string, subnets: SubnetDetailModel[]): ChatResponse {
  const q = query.toLowerCase();

  if (/root|sn0/i.test(q)) {
    return {
      type: "insight",
      title: "Root Network (SN0)",
      summary: "The root network is Bittensor's base staking layer. It offers lower but more stable returns compared to alpha subnets. Staking on root means your TAO is distributed across all subnets proportionally — it's the 'index fund' approach to Bittensor staking. Risk is lowest here, making it ideal for conservative stakers or large holdings.",
      suggestion: "Ask 'root vs subnet' to see a yield comparison, or 'top 5 by yield' for the best alternatives.",
    };
  }

  if (/subnet|alpha/i.test(q)) {
    return {
      type: "insight",
      title: "Alpha Subnets",
      summary: `Bittensor has ${subnets.length} active subnets, each focused on a specific AI task. Staking on individual subnets offers higher return potential but more volatility. Each subnet has its own emission rate, validator set, and risk profile. Use the Subnets page to explore or ask me to rank by any metric.`,
      suggestion: 'Try "top 5 by yield", "lowest risk subnets", or "compare SN1 and SN49".',
    };
  }

  if (/yield|apr|return|earn/i.test(q)) {
    return {
      type: "insight",
      title: "Understanding Yield",
      summary: "Estimated yield in Tyvera is an annualized staking return heuristic based on emissions, stake depth, and subnet conditions. On thinner or fast-moving subnets, the estimate can become very high and should not be treated like a stable guaranteed APR. High emission + low total stake often creates elevated outlier readings that compress as stake flows in.",
      suggestion: "Ask 'top 5 by yield' to see current leaders, or use the Yield Calculator page for projections.",
    };
  }

  if (/risk|safe/i.test(q)) {
    return {
      type: "insight",
      title: "Risk Levels Explained",
      summary: "Tyvera rates subnets as LOW, MODERATE, HIGH, or SPECULATIVE based on age, liquidity, staker count, yield stability, and emission consistency. LOW risk subnets are well-established with deep liquidity. SPECULATIVE subnets are new or volatile — they may offer high yield but can lose value quickly.",
      suggestion: 'Ask "lowest risk subnets" or "safest subnets" to see current LOW-risk options.',
    };
  }

  return {
    type: "insight",
    title: "Bittensor Staking Basics",
    summary: `Bittensor is a decentralized AI network with ${subnets.length} subnets. You can stake TAO on root (SN0) for more stable returns, or on individual alpha subnets for higher but riskier estimated yields. I can help you analyze yields, compare subnets, assess risk, and plan staking strategies.`,
    suggestion: 'Try: "should I stake root or subnet?", "top 5 by yield", "compare SN1 and SN49", "stake 100 TAO", "lowest risk subnets"',
  };
}

function getGeneralHelpMessage(subnets: SubnetDetailModel[]): ChatResponse {
  return {
    type: "insight",
    title: "I can help with subnet analysis",
    summary: `I have live data on ${subnets.length} Bittensor subnets. Here's what I can do:\n\n• Rank subnets by yield, risk, liquidity, or emissions\n• Compare any two subnets side-by-side\n• Calculate staking returns for specific amounts\n• Advise on root vs subnet staking strategy\n• Explain how Bittensor staking works`,
    suggestion: 'Try: "Should I stake root or subnet?", "Top 5 by yield", "Compare SN1 and SN49", "Stake 100 TAO", "Lowest risk subnets"',
  };
}

export function analyzeQuery(query: string, subnets: SubnetDetailModel[]): ChatResponse {
  if (!query.trim()) {
    return getGeneralHelpMessage(subnets);
  }

  const intent = matchIntent(query);
  const topCountMatch = query.match(/top\s+(\d+)/i);
  const topCount = topCountMatch ? parseInt(topCountMatch[1]) : 5;

  switch (intent) {
    case "top-yield":
      return getTopByYield(subnets, topCount);
    case "lowest-risk":
      return getLowestRisk(subnets);
    case "trending-up":
      return getTrendingUp(subnets);
    case "new-subnets":
      return getNewSubnets(subnets);
    case "liquidity":
      return getHighestLiquidity(subnets);
    case "high-emission":
      return getHighEmission(subnets);
    case "compare":
      return compareSubnets(query, subnets);
    case "staking-advice":
      return getStakingAdvice(query, subnets);
    case "strategy-advice":
      return getStrategyAdvice(query, subnets);
    case "stake-options":
      return getStakeOptions(query, subnets);
    case "calculate-yield":
      return calculateYield(query, subnets);
    case "filter-yield":
      return filterYield(query, subnets);
    case "portfolio":
      return getPortfolioSummary(subnets);
    case "explain":
      return getExplainer(query, subnets);
    default:
      return getGeneralHelpMessage(subnets);
  }
}
