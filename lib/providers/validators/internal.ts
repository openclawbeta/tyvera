import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ValidatorInfo, ValidatorSummary } from "@/lib/types/validators";
import type { ValidatorProvider, ValidatorProviderResult } from "./types";

interface ValidatorSnapshotFile {
  validators?: ValidatorInfo[];
  summary?: ValidatorSummary;
  _meta?: {
    source?: string;
    note?: string;
  };
}

function readValidatorSnapshot(): ValidatorSnapshotFile | null {
  const path = join(process.cwd(), "public", "data", "validators.json");
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as ValidatorSnapshotFile;
  } catch {
    return null;
  }
}

export const internalValidatorProvider: ValidatorProvider = {
  name: "internal",
  async fetch(): Promise<ValidatorProviderResult | null> {
    const snapshot = readValidatorSnapshot();
    if (!snapshot?.validators || snapshot.validators.length === 0 || !snapshot.summary) return null;

    return {
      validators: snapshot.validators,
      summary: snapshot.summary,
      source: snapshot._meta?.source ?? "validator-internal-snapshot",
      fallbackUsed: false,
      note: snapshot._meta?.note ?? "Validator snapshot served from Tyvera-owned internal data.",
    };
  },
};
