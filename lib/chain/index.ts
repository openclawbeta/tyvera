/**
 * lib/chain/index.ts
 *
 * Barrel export for Tyvera's on-chain data pipeline.
 *
 * All data comes from direct Subtensor chain queries.
 * No external API dependencies.
 */

export { fetchSubnetsFromChain, fetchMetagraphFromChain } from "./subtensor";
export {
  setSubnetCache,
  getSubnetCache,
  isSubnetCacheFresh,
  getSubnetCacheAgeMs,
  setMetagraphCache,
  getMetagraphCache,
  isMetagraphCacheFresh,
  getBlockHeight,
  setHolderAttributionCache,
  getHolderAttributionCache,
  isHolderAttributionCacheFresh,
} from "./cache";
export type {
  ChainSubnet,
  ChainNeuron,
  ChainSnapshot,
  MetagraphCacheEntry,
  ChainHolderPosition,
  HolderAttributionSnapshot,
} from "./types";

// Price engine — on-chain price derivation
export {
  syncPricesFromChain,
  seedTaoPrice,
  getLatestTaoPrice,
  getTaoPriceHistory,
  derivePriceChanges,
  getLatestPriceSnapshot,
} from "./price-engine";

// Delegate scanner — validator data from root subnet
export {
  fetchDelegatesFromChain,
} from "./delegate-scanner";

// Transfer scanner — event history from chain blocks
export {
  scanRecentTransfers,
  getEventsForAddress,
  getTransfersToAddress,
  getEventBufferSize,
  getLastScannedBlock,
} from "./transfer-scanner";

// Root metrics — live economics for netuid 0 (TAO root staking)
export {
  fetchRootMetricsFromChain,
  setRootMetricsCache,
  getRootMetricsCache,
  isRootMetricsCacheFresh,
  getRootMetricsCacheAgeMs,
} from "./root-metrics";
export type { RootMetrics } from "./root-metrics";
