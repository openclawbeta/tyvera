import fs from "node:fs/promises";
import path from "node:path";
import { fetchHolderAttributionFromChain } from "../lib/chain/holders.ts";

const outPath = path.join(process.cwd(), "public", "data", "holder-attribution.json");
const start = Date.now();

const snapshot = await fetchHolderAttributionFromChain(250);
const output = {
  ...snapshot,
  _meta: {
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - start,
    extraction: {
      method: "bounded-chain-scan",
      limit: 250,
      notes: snapshot.notes ?? null,
    },
  },
};

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote holder attribution to ${outPath} with source=${snapshot.source}`);
