import { ActivityEvent, ActivitySummary } from "@/lib/types/activity";

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
