import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getDataHealthSummary } from "@/lib/data-health";
import { logAdminAction } from "@/lib/db/admin-audit";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export async function GET(request: Request) {
  const secret = process.env.ADMIN_SECRET ?? "";
  const provided = request.headers.get("x-admin-secret") ?? "";

  if (!secret || !provided || !safeEqual(secret, provided)) {
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
