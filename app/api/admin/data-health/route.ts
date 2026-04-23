import { NextResponse } from "next/server";
import { getDataHealthSummary } from "@/lib/data-health";
import { logAdminAction } from "@/lib/db/admin-audit";
import { safeSecretEqual } from "@/lib/api/secret-compare";

export async function GET(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    // Fail-closed on misconfig; surfaces as 503 so ops can distinguish
    // "secret not set" from a legitimate auth rejection (401).
    return NextResponse.json(
      { error: "ADMIN_SECRET not configured" },
      { status: 503 },
    );
  }

  const provided = request.headers.get("x-admin-secret");
  if (!safeSecretEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fwd = request.headers.get("x-forwarded-for");
  const actorIp = fwd ? fwd.split(",")[0]?.trim() ?? null : request.headers.get("x-real-ip");

  await logAdminAction({
    action: "data_health_read",
    method: "GET",
    path: new URL(request.url).pathname,
    status: 200,
    actorIp,
  });

  return NextResponse.json(getDataHealthSummary(), {
    headers: {
      "Cache-Control": "no-store",
      "X-Data-Source": "internal-health",
    },
  });
}
