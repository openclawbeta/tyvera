import fs from "node:fs/promises";
import path from "node:path";

const subnetsPath = path.join(process.cwd(), "public", "data", "subnets.json");
const validatorsPath = path.join(process.cwd(), "public", "data", "validators.json");

const raw = await fs.readFile(subnetsPath, "utf-8");
const parsed = JSON.parse(raw);
const subnets = (parsed.subnets ?? parsed)
  .filter((s) => s.netuid !== 0)
  .sort((a, b) => (b.liquidity ?? 0) - (a.liquidity ?? 0))
  .slice(0, 50);

const totalLiquidity = subnets.reduce((sum, subnet) => sum + (subnet.liquidity ?? 0), 0) || 1;

const validators = subnets.map((subnet, index) => ({
  rank: index + 1,
  name: `${subnet.name ?? `SN${subnet.netuid}`} Validator Set`,
  address: `SN${subnet.netuid}`,
  dominance: +((((subnet.liquidity ?? 0) / totalLiquidity) * 100).toFixed(2)),
  nominators: subnet.stakers ?? 0,
  change24h: 0,
  activeSubnets: 1,
  totalWeight: subnet.liquidity ?? 0,
  weightChange24h: subnet.emissions ?? 0,
  rootStake: 0,
  alphaStake: subnet.liquidity ?? 0,
  verified: (subnet.validatorTake ?? 18) <= 18,
}));

const summary = {
  totalValidators: validators.length,
  totalStake: validators.reduce((sum, validator) => sum + validator.totalWeight, 0),
  totalNominators: validators.reduce((sum, validator) => sum + validator.nominators, 0),
  avgDominance: validators.length ? validators.reduce((sum, validator) => sum + validator.dominance, 0) / validators.length : 0,
};

const snapshot = {
  _meta: {
    generated_at: new Date().toISOString(),
    source: "validator-internal-snapshot",
    schema_version: 1,
    note: "Derived from Tyvera-owned subnet snapshot until a dedicated chain validator snapshot is available.",
  },
  validators,
  summary,
};

await fs.mkdir(path.dirname(validatorsPath), { recursive: true });
await fs.writeFile(validatorsPath, JSON.stringify(snapshot, null, 2));
console.log(`Wrote validator snapshot to ${validatorsPath}`);
