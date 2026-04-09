import fs from "node:fs/promises";
import path from "node:path";
import { buildHolderIntelSnapshot } from "../lib/api/holders-snapshot-data.mjs";
import { buildHolderIntelFromRealAttribution } from "../lib/api/holders-real-snapshot.mjs";

const outPath = path.join(process.cwd(), "public", "data", "holders.json");
const subnetsPath = path.join(process.cwd(), "public", "data", "subnets.json");
const realAttributionPath = path.join(process.cwd(), "public", "data", "holder-attribution.json");

const raw = await fs.readFile(subnetsPath, "utf-8");
const parsed = JSON.parse(raw);
const subnets = (parsed.subnets ?? parsed)
  .filter((s) => s.netuid !== 0)
  .slice(0, 18);

let intel;
let source = "modeled-demo";

try {
  const realRaw = await fs.readFile(realAttributionPath, "utf-8");
  const realParsed = JSON.parse(realRaw);
  if (Array.isArray(realParsed.positions) && realParsed.positions.length > 0) {
    intel = buildHolderIntelFromRealAttribution(subnets, realParsed);
    source = intel.source;
  }
} catch {
  // no real attribution snapshot yet — fall back to modeled build
}

if (!intel) {
  intel = buildHolderIntelSnapshot(subnets);
}

const snapshot = {
  _meta: {
    generated_at: new Date().toISOString(),
    source,
    schema_version: 1,
  },
  ...intel,
};

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, JSON.stringify(snapshot, null, 2));
console.log(`Wrote holder snapshot to ${outPath} using source=${source}`);
