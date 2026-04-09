import { NextResponse } from "next/server";
import { fetchValidators, getValidators, getValidatorSummary } from "@/lib/api/validators";
import { buildSourceHeaders } from "@/lib/data-source-policy";

export async function GET() {
  let validators = getValidators();
  let source = "validator-fallback";
  let fallbackUsed = true;

  try {
    const fresh = await fetchValidators();
    if (fresh.length > 0) {
      validators = fresh;
      source = validators.length >= 25 ? "validator-live" : "validator-partial";
      fallbackUsed = validators.length < 25;
    }
  } catch {
    // keep fallback
  }

  const summary = getValidatorSummary(validators);
  const servedAt = new Date().toISOString();

  return NextResponse.json({
    validators,
    summary,
    _meta: {
      source,
      fallbackUsed,
      servedAt,
      note: fallbackUsed
        ? "Validator dataset is using a fallback/partial path; expand internal validator snapshot pipeline next."
        : undefined,
    },
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=300",
      ...buildSourceHeaders({ source, fallbackUsed, servedAt }),
    },
  });
}
