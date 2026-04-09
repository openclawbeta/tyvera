import { NextResponse } from "next/server";
import { getHolderIntel } from "@/lib/api/holders";

export async function GET() {
  const data = getHolderIntel();

  return NextResponse.json(data, {
    headers: {
      "X-Data-Source": data.source,
      "Cache-Control": "public, s-maxage=300",
    },
  });
}
