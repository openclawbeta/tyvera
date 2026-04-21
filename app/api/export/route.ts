/**
 * /api/export
 *
 * Data export endpoint — serves subnet, validator, holder, or portfolio data
 * as CSV or JSON. Wallet-gated: requires Analyst+ (data_export).
 *
 * GET ?format=csv|json&type=subnets|validators|holders|portfolio
 *
 * Strategist+ with data_export_unlimited get full fields.
 * Analyst gets a standard field subset.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWalletAuth } from "@/lib/api/wallet-auth";
import { resolveWalletTier } from "@/lib/api/require-entitlement";
import { tierHasFeature } from "@/lib/types/tiers";
import { getSubnets } from "@/lib/api/subnets";
import { resolveHolders } from "@/lib/services/holders";

type ExportType = "subnets" | "validators" | "holders" | "portfolio";
type ExportFormat = "csv" | "json";

const VALID_TYPES: ExportType[] = ["subnets", "validators", "holders", "portfolio"];
const VALID_FORMATS: ExportFormat[] = ["csv", "json"];

/* ── CSV helper ──────────────────────────────────────────────────── */

function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const keys = columns ?? Object.keys(rows[0]);
  const header = keys.map(escCsv).join(",");
  const lines = rows.map((row) =>
    keys.map((k) => escCsv(String(row[k] ?? ""))).join(","),
  );
  return [header, ...lines].join("\n");
}

function escCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/* ── Data fetchers per type ──────────────────────────────────────── */

async function exportSubnets(unlimited: boolean) {
  const subnets = getSubnets();
  const baseColumns = [
    "netuid", "name", "symbol", "category", "stakers", "emissions",
    "yield", "risk", "score", "taoIn", "validatorTake",
  ];
  const extraColumns = unlimited
    ? ["momentum", "yieldDelta7d", "breakeven", "dailyReturn", "alphaPrice", "alphaMarketCap"]
    : [];
  const columns = [...baseColumns, ...extraColumns];

  const rows = subnets.map((s) => {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      row[col] = (s as unknown as Record<string, unknown>)[col] ?? "";
    }
    return row;
  });

  return { rows, columns };
}

async function exportValidators(unlimited: boolean) {
  // Use the same data source as the validators page
  const { fetchValidators } = await import("@/lib/api/validators");
  let validators: Record<string, unknown>[] = [];
  try {
    const data = await fetchValidators();
    validators = (Array.isArray(data) ? data : []) as unknown as Record<string, unknown>[];
  } catch {
    validators = [];
  }

  const baseColumns = [
    "uid", "hotkey", "coldkey", "netuid", "stake", "trust",
    "consensus", "incentive", "dividends", "emission",
  ];
  const extraColumns = unlimited
    ? ["validatorPermit", "take", "updated", "active"]
    : [];
  const columns = [...baseColumns, ...extraColumns];

  const rows = validators.map((v) => {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      row[col] = v[col] ?? "";
    }
    return row;
  });

  return { rows, columns };
}

async function exportHolders(unlimited: boolean) {
  const result = await resolveHolders();
  const holders = result?.data?.topHolders ?? [];

  const baseColumns = [
    "rank", "wallet", "label", "totalTao", "subnetStakedTao",
    "dominantSubnetName", "strategyTag",
  ];
  const extraColumns = unlimited
    ? ["rootStakedTao", "dominantSubnetNetuid"]
    : [];
  const columns = [...baseColumns, ...extraColumns];

  const rows = (holders as unknown as Record<string, unknown>[]).map((h) => {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      row[col] = h[col] ?? "";
    }
    return row;
  });

  return { rows, columns };
}

async function exportPortfolio(_unlimited: boolean) {
  // Portfolio is wallet-specific. For export, we provide the subnet allocation
  // template — the actual portfolio data is client-side only.
  const subnets = getSubnets();
  const columns = ["netuid", "name", "symbol", "yield", "risk", "score"];
  const rows = subnets.map((s) => {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      row[col] = (s as unknown as Record<string, unknown>)[col] ?? "";
    }
    return row;
  });

  return { rows, columns };
}

/* ── Handler ─────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  // Auth
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  // Tier check
  const tier = await resolveWalletTier(address);
  if (!tierHasFeature(tier, "data_export")) {
    return NextResponse.json(
      {
        error: "Data export requires Analyst tier or above",
        currentTier: tier,
        requiredTier: "analyst",
        upgrade_url: "/pricing",
      },
      { status: 403 },
    );
  }

  const unlimited = tierHasFeature(tier, "data_export_unlimited");

  // Parse params
  const format = (req.nextUrl.searchParams.get("format") ?? "json") as ExportFormat;
  const type = (req.nextUrl.searchParams.get("type") ?? "subnets") as ExportType;

  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `Invalid format. Must be one of: ${VALID_FORMATS.join(", ")}` },
      { status: 400 },
    );
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // Fetch data
  let rows: Record<string, unknown>[];
  let columns: string[];

  try {
    switch (type) {
      case "subnets": {
        const r = await exportSubnets(unlimited);
        rows = r.rows;
        columns = r.columns;
        break;
      }
      case "validators": {
        const r = await exportValidators(unlimited);
        rows = r.rows;
        columns = r.columns;
        break;
      }
      case "holders": {
        const r = await exportHolders(unlimited);
        rows = r.rows;
        columns = r.columns;
        break;
      }
      case "portfolio": {
        const r = await exportPortfolio(unlimited);
        rows = r.rows;
        columns = r.columns;
        break;
      }
    }
  } catch (err) {
    console.error("[export] Error fetching data:", err);
    return NextResponse.json({ error: "Failed to fetch export data" }, { status: 500 });
  }

  // Return
  if (format === "csv") {
    const csv = toCsv(rows, columns);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tyvera-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  return NextResponse.json(
    {
      type,
      exportedAt: new Date().toISOString(),
      tier,
      count: rows.length,
      data: rows,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="tyvera-${type}-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
