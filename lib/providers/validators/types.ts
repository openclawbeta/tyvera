import type { ValidatorInfo, ValidatorSummary } from "@/lib/types/validators";

export interface ValidatorProviderResult {
  validators: ValidatorInfo[];
  summary: ValidatorSummary;
  source: string;
  fallbackUsed: boolean;
  stale?: boolean;
  note?: string;
}

export interface ValidatorProvider {
  name: string;
  fetch(): Promise<ValidatorProviderResult | null>;
}
