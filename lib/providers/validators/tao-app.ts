import { getValidatorSummary } from "@/lib/api/validators";
import type { ValidatorInfo } from "@/lib/types/validators";
import type { ValidatorProvider, ValidatorProviderResult } from "./types";

const TAO_APP_BASE = "https://api.tao.app";
const ATTRIBUTION = "Powered by TAO.app API";

interface TaoAppIdentity {
  hotkey?: string;
  name?: string;
  display_name?: string;
  [key: string]: unknown;
}

interface TaoAppStake {
  hotkey?: string;
  total_stake?: number;
  root_stake?: number;
  alpha_stake?: number;
  subnet_count?: number;
  [key: string]: unknown;
}

let cached: ValidatorProviderResult | null = null;
let cachedAt = 0;
const TTL_MS = 15 * 60 * 1000;

export const taoAppValidatorProvider: ValidatorProvider = {
  name: "tao-app",
  async fetch(): Promise<ValidatorProviderResult | null> {
    if (cached && Date.now() - cachedAt < TTL_MS) return cached;

    const apiKey = process.env.TAO_APP_API_KEY;
    if (!apiKey) return null;

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-API-Key": apiKey,
    };

    try {
      const [identitiesRes, stakesRes] = await Promise.all([
        fetch(`${TAO_APP_BASE}/api/beta/validator_identities`, {
          headers,
          signal: AbortSignal.timeout(10000),
        }),
        fetch(`${TAO_APP_BASE}/api/beta/validators/stakes`, {
          headers,
          signal: AbortSignal.timeout(10000),
        }),
      ]);

      if (!identitiesRes.ok || !stakesRes.ok) return null;

      const identitiesJson = await identitiesRes.json();
      const stakesJson = await stakesRes.json();

      const identities: TaoAppIdentity[] = Array.isArray(identitiesJson)
        ? identitiesJson
        : Array.isArray(identitiesJson?.data)
        ? identitiesJson.data
        : [];

      const stakes: TaoAppStake[] = Array.isArray(stakesJson)
        ? stakesJson
        : Array.isArray(stakesJson?.data)
        ? stakesJson.data
        : [];

      if (stakes.length === 0) return null;

      const identityMap = new Map<string, TaoAppIdentity>();
      for (const item of identities) {
        if (item.hotkey) identityMap.set(item.hotkey, item);
      }

      const normalizedStakes = stakes
        .map((item) => {
          const rawTotal = Number(item.total_stake ?? 0);
          const total = rawTotal > 1e6 ? rawTotal / 1e9 : rawTotal;
          return { ...item, _total: total };
        })
        .filter((item) => item.hotkey && item._total > 0)
        .sort((a, b) => b._total - a._total)
        .slice(0, 50);

      const totalNetworkStake = normalizedStakes.reduce((sum, item) => sum + item._total, 0) || 1;

      const validators: ValidatorInfo[] = normalizedStakes.map((item, index) => {
        const identity = item.hotkey ? identityMap.get(item.hotkey) : undefined;
        const rootStakeRaw = Number(item.root_stake ?? 0);
        const alphaStakeRaw = Number(item.alpha_stake ?? 0);
        const rootStake = rootStakeRaw > 1e6 ? rootStakeRaw / 1e9 : rootStakeRaw;
        const alphaStake = alphaStakeRaw > 1e6 ? alphaStakeRaw / 1e9 : alphaStakeRaw;
        const totalWeight = item._total;
        const dominance = (totalWeight / totalNetworkStake) * 100;

        return {
          rank: index + 1,
          name: String(identity?.display_name ?? identity?.name ?? `${String(item.hotkey).slice(0, 8)}...${String(item.hotkey).slice(-4)}`),
          address: String(item.hotkey),
          dominance: Math.round(dominance * 100) / 100,
          nominators: 0,
          change24h: 0,
          activeSubnets: Number(item.subnet_count ?? 0),
          totalWeight,
          weightChange24h: 0,
          rootStake,
          alphaStake,
          verified: Boolean(identity?.display_name || identity?.name),
        };
      });

      if (validators.length === 0) return null;

      cached = {
        validators,
        summary: getValidatorSummary(validators),
        source: "validator-tao-app",
        fallbackUsed: false,
        note: ATTRIBUTION,
      };
      cachedAt = Date.now();
      return cached;
    } catch {
      return null;
    }
  },
};
