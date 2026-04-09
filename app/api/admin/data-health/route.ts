import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getDataHealthSummary } from "@/lib/data-health";

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

  return NextResponse.json(getDataHealthSummary(), {
    headers: {
      "Cache-Control": "no-store",
      "X-Data-Source": "internal-health",
    },
  });
}
