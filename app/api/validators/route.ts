import { NextResponse } from "next/server";
import { buildSourceHeaders } from "@/lib/data-source-policy";
import { resolveValidators } from "@/lib/services/validators";

export async function GET() {
  const result = await resolveValidators();
  const servedAt = new Date().toISOString();

  return NextResponse.json({
    validators: result.validators,
    summary: result.summary,
    _meta: {
      source: result.source,
      fallbackUsed: result.fallbackUsed,
      stale: result.stale ?? false,
      servedAt,
      note: result.note,
      attribution: result.source === "validator-tao-app" ? "Powered by TAO.app API" : undefined,
    },
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=300",
      ...buildSourceHeaders({ source: result.source, fallbackUsed: result.fallbackUsed, stale: result.stale, servedAt }),
    },
  });
}
