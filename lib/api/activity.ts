import { ActivityEvent, ActivitySummary } from "@/lib/types/activity";

/**
 * Get wallet activity events.
 *
 * Currently returns an empty array. Real transaction history will be
 * sourced from the Subscan API or Subtensor extrinsic indexer when
 * integrated. This replaces the previous mock data generator that
 * produced fake deterministic transactions.
 *
 * TODO: Wire to /api/activity endpoint backed by Subscan or SubQuery
 */
export function getWalletActivity(_address?: string): ActivityEvent[] {
  // Return empty — no synthetic data. Real activity comes from chain indexer.
  return [];
}

/**
 * Compute summary statistics from activity events
 */
export function getActivitySummary(events: ActivityEvent[]): ActivitySummary {
  if (!events.length) {
    return {
      totalTransactions: 0,
      totalStaked: 0,
      totalUnstaked: 0,
      totalFees: 0,
      recentBlocks: 0,
    };
  }

  let totalStaked = 0;
  let totalUnstaked = 0;
  let totalFees = 0;

  for (const event of events) {
    totalFees += event.fee;

    if (event.type === "STAKE") {
      totalStaked += event.amountTao;
    } else if (event.type === "UNSTAKE") {
      totalUnstaked += event.amountTao;
    }
  }

  const recentBlocks = Math.max(...events.map(e => e.blockNumber));

  return {
    totalTransactions: events.length,
    totalStaked,
    totalUnstaked,
    totalFees,
    recentBlocks,
  };
}
