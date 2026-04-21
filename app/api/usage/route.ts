/**
 * GET /api/usage
 *
 * Returns the authenticated wallet's daily usage stats and limits.
 * Used by the client-side rate limit banner to show approaching limits.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWalletAuth } from "@/lib/api/wallet-auth";
import {
  resolveWalletTier,
  getChatQueryLimit,
  getAlertRuleQuota,
} from "@/lib/api/require-entitlement";
import { getDailyUsage } from "@/lib/db/daily-usage";
import { getApiRateLimit } from "@/lib/types/tiers";

export async function GET(request: NextRequest) {
  const auth = await requireWalletAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;
  const tier = await resolveWalletTier(address);

  const [apiUsage, chatUsage] = await Promise.all([
    getDailyUsage(address, "api_request"),
    getDailyUsage(address, "chat_query"),
  ]);

  const apiLimit = getApiRateLimit(tier);
  const chatLimit = getChatQueryLimit(tier);
  const alertQuota = getAlertRuleQuota(tier);

  // Calculate reset time (next midnight UTC)
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);

  return NextResponse.json({
    tier,
    resetsAt: midnight.toISOString(),
    counters: {
      api: {
        used: apiUsage,
        limit: apiLimit,
        remaining: apiLimit > 0 ? Math.max(0, apiLimit - apiUsage) : null,
      },
      chat: {
        used: chatUsage,
        limit: chatLimit,
        remaining: chatLimit > 0 ? Math.max(0, chatLimit - chatUsage) : null,
      },
      alertRules: {
        limit: alertQuota,
      },
    },
  });
}
