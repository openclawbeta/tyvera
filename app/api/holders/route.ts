import { NextResponse } from "next/server";
import { readHolderSnapshot } from "@/lib/api/holders-snapshot";

export async function GET() {
  const { data, dataSource, generatedAt } = readHolderSnapshot();

  return NextResponse.json(data, {
    headers: {
      "X-Data-Source": dataSource,
      "X-Generated-At": generatedAt ?? data.generatedAt,
      "Cache-Control": "public, s-maxage=300",
    },
  });
}
