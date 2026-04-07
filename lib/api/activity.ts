import { ActivityEvent, ActivitySummary, ActivityType } from "@/lib/types/activity";

/**
 * Seeded pseudo-random number generator for consistent mock data
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate a deterministic tx hash from address and index
 */
function generateTxHash(address: string, index: number): string {
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    const charSeed = address.charCodeAt(i % address.length) + index + i;
    const digit = Math.floor(seededRandom(charSeed) * 16);
    hash += digit.toString(16);
  }
  return hash;
}

/**
 * Generate mock wallet activity for a given address
 * Returns 30-50 events over the last 90 days
 */
export function getWalletActivity(address?: string): ActivityEvent[] {
  if (!address) {
    return [];
  }

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Generate 35-45 transactions
  const eventCount = 35 + Math.floor(seededRandom(address.length) * 10);
  const events: ActivityEvent[] = [];

  const activityTypes: ActivityType[] = ["TRANSFER", "STAKE", "UNSTAKE", "MOVE_STAKE", "CLAIM"];
  const subnets = ["Consensus", "Storage", "Compute", "Finance", "Analytics", "ML", "Security"];

  // Generate starting block number based on address
  let blockNumber = 2_000_000 + Math.floor(seededRandom(parseInt(address.slice(2, 10), 16)) * 100_000);

  for (let i = 0; i < eventCount; i++) {
    const seed = address.charCodeAt(0) + i;

    // Random timestamp within 90 days
    const daysAgo = Math.floor(seededRandom(seed) * 90);
    const hoursAgo = Math.floor(seededRandom(seed + 100) * 24);
    const minutesAgo = Math.floor(seededRandom(seed + 200) * 60);

    const timestamp = new Date(
      now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000 - minutesAgo * 60 * 1000
    );

    // Activity type
    const typeIndex = Math.floor(seededRandom(seed + 300) * activityTypes.length);
    const type = activityTypes[typeIndex];

    // Amount (0.1 - 50 TAO)
    const amountTao = 0.1 + seededRandom(seed + 400) * 49.9;

    // Fee (0.0001 - 0.001 TAO)
    const fee = 0.0001 + seededRandom(seed + 500) * 0.0009;

    // Subnet
    const subnetIndex = Math.floor(seededRandom(seed + 600) * subnets.length);
    const subnet = subnets[subnetIndex];

    // Addresses
    const fromAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    const toAddress = `5${(Math.floor(seededRandom(seed + 700) * 100000000)).toString().padStart(8, "0")}...${Math.floor(seededRandom(seed + 800) * 10000).toString().padStart(4, "0")}`;

    // TX hash
    const txHash = generateTxHash(address, i);

    // Status (mostly confirmed, some pending)
    const statusRoll = seededRandom(seed + 900);
    const status = statusRoll > 0.95 ? "PENDING" : statusRoll > 0.98 ? "FAILED" : "CONFIRMED";

    // Block number increases per transaction
    blockNumber += 1 + Math.floor(seededRandom(seed + 1000) * 50);

    events.push({
      id: `activity-${address}-${i}`,
      blockNumber,
      timestamp,
      type,
      fromAddress,
      toAddress,
      amountTao,
      fee,
      subnet,
      txHash,
      status: status as any,
    });
  }

  // Sort by timestamp descending (most recent first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events;
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
