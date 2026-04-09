import fs from "node:fs/promises";
import path from "node:path";
import { buildHolderIntelSnapshot } from "../lib/api/holders-snapshot-data.mjs";

const outPath = path.join(process.cwd(), "public", "data", "holders.json");
const subnetsPath = path.join(process.cwd(), "public", "data", "subnets.json");

const raw = await fs.readFile(subnetsPath, "utf-8");
const parsed = JSON.parse(raw);
const subnets = (parsed.subnets ?? parsed)
  .filter((s) => s.netuid !== 0)
  .slice(0, 18);

const intel = buildHolderIntelSnapshot(subnets);
const snapshot = {
  _meta: {
    generated_at: new Date().toISOString(),
    source: "modeled-demo",
    schema_version: 1,
  },
  ...intel,
};

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, JSON.stringify(snapshot, null, 2));
console.log(`Wrote holder snapshot to ${outPath}`);
