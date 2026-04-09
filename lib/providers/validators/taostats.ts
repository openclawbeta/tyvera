import type { ValidatorInfo } from "@/lib/types/validators";
import { getValidatorSummary } from "@/lib/api/validators";
import type { ValidatorProvider, ValidatorProviderResult } from "./types";

const DELEGATE_REGISTRY_URL = "https://raw.githubusercontent.com/opentensor/bittensor-delegates/main/public/delegates.json";
const TAOSTATS_DELEGATES_URL = "https://api.taostats.io/api/v1/delegate";

interface DelegateEntry {
  name?: string;
  [key: string]: unknown;
}

interface TaoStatsDelegateEntry {
  hotkey?: string;
  delegate_name?: string;
  name?: string;
  total_stake?: number;
  nominators?: number;
  nominator_count?: number;
  registrations?: number[];
  [key: string]: unknown;
}

export const taostatsValidatorProvider: ValidatorProvider = {
  name: "taostats",
  async fetch(): Promise<ValidatorProviderResult | null> {
    const [registryResult, taoStatsResult] = await Promise.allSettled([
      fetch(DELEGATE_REGISTRY_URL, { signal: AbortSignal.timeout(8000) })
        .then((r) => (r.ok ? r.json() : null)) as Promise<Record<string, DelegateEntry> | null>,
      fetch(TAOSTATS_DELEGATES_URL, { signal: AbortSignal.timeout(10000), headers: { Accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : null)) as Promise<TaoStatsDelegateEntry[] | { data: TaoStatsDelegateEntry[] } | null>,
    ]);

    const registry: Record<string, DelegateEntry> =
      registryResult.status === "fulfilled" && registryResult.value ? registryResult.value : {};

    let taoStatsDelegates: TaoStatsDelegateEntry[] = [];
    if (taoStatsResult.status === "fulfilled" && taoStatsResult.value) {
      const raw = taoStatsResult.value;
      taoStatsDelegates = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { data: TaoStatsDelegateEntry[] }).data)
        ? (raw as { data: TaoStatsDelegateEntry[] }).data
        : [];
    }

    if (taoStatsDelegates.length === 0 && Object.keys(registry).length === 0) return null;

    const totalNetworkStake = taoStatsDelegates.reduce((sum, d) => {
      const stake = Number(d.total_stake ?? 0);
      return sum + (stake > 1e6 ? stake / 1e9 : stake);
    }, 0);

    const validators: ValidatorInfo[] = [...taoStatsDelegates]
      .sort((a, b) => Number(b.total_stake ?? 0) - Number(a.total_stake ?? 0))
      .slice(0, 50)
      .map((d, index) => {
        const address = d.hotkey ?? "";
        const rawStake = Number(d.total_stake ?? 0);
        const stake = rawStake > 1e6 ? rawStake / 1e9 : rawStake;
        const nominators = Number(d.nominators ?? d.nominator_count ?? 0);
        const registrations = Array.isArray(d.registrations) ? d.registrations.length : 0;
        const regEntry = registry[address];
        const name = regEntry?.name || d.delegate_name || d.name || `${address.slice(0, 8)}...${address.slice(-4)}`;
        const dominance = totalNetworkStake > 0 ? (stake / totalNetworkStake) * 100 : 0;
        return {
          rank: index + 1,
          name,
          address,
          dominance: Math.round(dominance * 100) / 100,
          nominators,
          change24h: 0,
          activeSubnets: registrations,
          totalWeight: stake,
          weightChange24h: 0,
          rootStake: stake,
          alphaStake: 0,
          verified: !!regEntry?.name || !!d.delegate_name,
        };
      });

    if (validators.length === 0 && Object.keys(registry).length > 0) {
      const regOnly = Object.entries(registry).slice(0, 50).map(([address, delegate], index) => ({
        rank: index + 1,
        name: delegate.name || `${address.slice(0, 8)}...${address.slice(-4)}`,
        address,
        dominance: 0,
        nominators: 0,
        change24h: 0,
        activeSubnets: 0,
        totalWeight: 0,
        weightChange24h: 0,
        rootStake: 0,
        alphaStake: 0,
        verified: !!delegate.name,
      }));

      return {
        validators: regOnly,
        summary: getValidatorSummary(regOnly),
        source: "validator-registry-partial",
        fallbackUsed: true,
        note: "Community registry available but TaoStats delegate metrics unavailable.",
      };
    }

    return {
      validators,
      summary: getValidatorSummary(validators),
      source: validators.length >= 25 ? "validator-taostats-live" : "validator-taostats-partial",
      fallbackUsed: validators.length < 25,
      note: validators.length < 25 ? "Partial TaoStats delegate coverage." : undefined,
    };
  },
};
