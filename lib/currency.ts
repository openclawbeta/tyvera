export type CurrencyMode = "tau" | "usd";

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function formatCurrencyValue(
  amountTao: number,
  currency: CurrencyMode,
  taoUsdRate: number | null,
  decimals = 2,
): string {
  if (currency === "usd") {
    const usd = amountTao * (taoUsdRate ?? 0);
    if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
    if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
    return `$${usd.toFixed(decimals)}`;
  }

  if (Math.abs(amountTao) >= 1_000) return `${formatCompactNumber(amountTao)} τ`;
  return `${amountTao.toFixed(decimals)} τ`;
}

export function formatPriceValue(
  amountTao: number,
  currency: CurrencyMode,
  taoUsdRate: number | null,
  decimals = 4,
): string {
  if (currency === "usd") {
    const usd = amountTao * (taoUsdRate ?? 0);
    return `$${usd.toFixed(2)}`;
  }
  return `${amountTao.toFixed(decimals)} τ`;
}
