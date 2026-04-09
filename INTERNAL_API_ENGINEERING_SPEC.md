# Tyvera Internal API Engineering Spec

_Last updated: 2026-04-09_

This document turns the internal-API direction into a concrete engineering plan for making Tyvera production-worthy, robust, and progressively independent from third-party sources.

---

## 1. Objective

Build Tyvera as an **internal-data-first Bittensor intelligence platform**.

### Desired end state
- Tyvera frontend consumes **Tyvera-owned API routes only**
- Core on-chain truth comes from **direct Bittensor/Subtensor ingestion**
- Performance comes from **Tyvera-owned snapshots/materialized data**
- Historical analytics come from **Tyvera-owned storage**
- Third-party sources become **optional enrichment/fallback**, not critical dependencies

---

## 2. Scope

### In scope
- internal API architecture
- ingestion jobs
- snapshot/materialization pipeline
- data source policy
- source/freshness metadata standards
- holder attribution path
- health/observability path
- production hardening for internal API routes

### Out of scope (for this spec)
- full real chain transaction execution
- pricing/business model design
- visual redesign work
- non-core marketing pages

---

## 3. System design

## 3.1 Data layers

### Layer A — Raw ingestion
Direct chain access via Subtensor/WebSocket/RPC.

### Layer B — Normalization
Convert raw chain structures into stable Tyvera models.

### Layer C — Materialization
Write snapshots / derived data products used by API routes.

### Layer D — Internal API
Serve stable frontend-facing responses with source metadata and graceful fallback.

### Layer E — Historical archive
Persist snapshots over time for charts, trends, flows, and analytics.

---

## 3.2 Current files relevant to this plan

### Existing chain/data code
- `lib/chain/subtensor.ts`
- `lib/chain/index.ts`
- `lib/chain/cache.ts`
- `lib/chain/types.ts`
- `lib/chain/holders.ts`
- `lib/api/subnets.ts`
- `lib/api/holders.ts`
- `lib/api/holders-snapshot.ts`
- `lib/api/holders-real-snapshot.mjs`
- `scripts/fetch_subnets_subtensor.py`
- `scripts/build-holder-attribution.mjs`
- `scripts/build-holder-snapshot.mjs`

### Existing API routes
- `app/api/subnets/route.ts`
- `app/api/metagraph/route.ts`
- `app/api/holders/route.ts`
- `app/api/holders/real/route.ts`
- `app/api/portfolio/route.ts`
- `app/api/validators/route.ts` (or equivalent source path if added later)
- `app/api/tao-rate/route.ts`
- `app/api/tao-price-history/route.ts`

---

## 4. Milestones

# Milestone 1 — Standardize data-source behavior

## Goal
Make all core routes behave consistently around source selection, stale data, fallback, and metadata.

## Deliverables

### 4.1 New module: `lib/data-source-policy.ts`
Responsibilities:
- define fallback priority rules
- define freshness windows
- expose helper functions:
  - `isFresh(timestamp, maxAgeMs)`
  - `preferSource(...)`
  - `markFallback(...)`
  - `buildSourceMeta(...)`

### 4.2 New module: `lib/snapshot-metadata.ts`
Responsibilities:
- define standard metadata shape for all snapshots
- include:
  - `generatedAt`
  - `source`
  - `schemaVersion`
  - `stale`
  - `notes`
  - `durationMs`
  - `fallbackUsed`

### 4.3 Route metadata standard
All key routes should return:
- `X-Data-Source`
- `X-Generated-At`
- `X-Data-Stale`
- `X-Fallback-Used`

### 4.4 Files to update
- `app/api/subnets/route.ts`
- `app/api/metagraph/route.ts`
- `app/api/holders/route.ts`
- `app/api/holders/real/route.ts`
- `app/api/tao-rate/route.ts`
- `app/api/tao-price-history/route.ts`

## Success criteria
- routes behave consistently
- no route silently fabricates fallback state
- frontend can always tell what source it is looking at

---

# Milestone 2 — Formalize ingestion/materialization jobs

## Goal
Turn scattered scripts into a production refresh pipeline.

## Deliverables

### 4.5 New / formalized job scripts

#### `scripts/build-subnet-snapshot.mjs` or formalized Python wrapper
Source of truth for:
- normalized subnet snapshot
- metadata and source status

#### `scripts/build-metagraph-snapshot.mjs`
Builds:
- metagraph snapshots for selected/high-priority subnets
- or rolling batch of all supported subnets

#### `scripts/build-holder-attribution.mjs`
Already exists, but needs hardening and metadata normalization.

#### `scripts/build-holder-snapshot.mjs`
Already exists.

#### `scripts/build-validator-snapshot.mjs`
New.
Builds a Tyvera-owned validator dataset with fallback labeling.

#### `scripts/refresh-intel.mjs`
Single orchestrator job.
Sequence:
1. subnet snapshot
2. metagraph snapshot
3. holder attribution
4. holder snapshot
5. validator snapshot
6. optional health summary write

### 4.6 Update `package.json`
Add commands:
- `build-subnet-snapshot`
- `build-metagraph-snapshot`
- `build-holder-attribution`
- `build-holder-snapshot`
- `build-validator-snapshot`
- `refresh-intel`

## Success criteria
- one command refreshes the full internal intelligence layer
- each step emits consistent metadata and exits predictably

---

# Milestone 3 — Bittensor-native metagraph path

## Goal
Reduce or eliminate TaoStats as a critical dependency for metagraph data.

## Deliverables

### 4.7 New module: `lib/ingest/metagraph.ts`
Responsibilities:
- fetch metagraph directly from chain
- normalize neuron records
- handle bounded query scope/timeouts

### 4.8 New storage output
- `public/data/metagraph/<netuid>.json`
- optionally one manifest file for snapshot freshness

### 4.9 Update route
- `app/api/metagraph/route.ts`

Route behavior priority:
1. fresh internal metagraph snapshot
2. stale internal metagraph snapshot (labeled)
3. optional external fallback (labeled)
4. synthetic fallback only if explicitly labeled

## Success criteria
- metagraph can operate without TaoStats for core functionality
- synthetic fallback becomes rare and clearly labeled

---

# Milestone 4 — Holder attribution upgrade

## Goal
Move holder intelligence from architecture-complete to data-credible.

## Deliverables

### 4.10 New module: `lib/ingest/holders.ts`
Responsibilities:
- candidate discovery
- ownership resolution
- stake attribution gathering
- bounded query strategy

### 4.11 Candidate strategies to implement
Priority order:
1. `ownedHotkeys(coldkey)`-based candidate discovery
2. metagraph-derived hotkey selection from high-value subnets
3. subnet-priority probing by liquidity/activity
4. index-based coldkey fallback only when needed

### 4.12 Attribution output contract
`public/data/holder-attribution.json`
Must include:
- positions
- generatedAt
- source
- query coverage stats
- coldkeys scanned
- hotkeys scanned
- netuids scanned
- durationMs
- fallbackUsed
- notes

### 4.13 Improve product materialization
Update:
- `lib/api/holders-real-snapshot.mjs`
- `lib/api/holders-snapshot.ts`
- `scripts/build-holder-snapshot.mjs`

## Success criteria
- real attribution returns meaningful non-empty results often enough to matter
- fallback remains honest when attribution is empty/unavailable

---

# Milestone 5 — Validator-owned data path

## Goal
Make validator surfaces internal-first and truth-labeled.

## Deliverables

### 4.14 New module: `lib/ingest/validators.ts`
Responsibilities:
- gather validator-related data from chain or owned snapshot sources
- normalize validator records
- emit source metadata

### 4.15 New output
- `public/data/validators.json`

### 4.16 Update route/page behavior
- validator page should prefer internal snapshot
- fallback notice remains explicit when needed

## Success criteria
- validator page does not depend solely on third-party live fetch behavior

---

# Milestone 6 — Data health / observability

## Goal
Make failures diagnosable and operations visible.

## Deliverables

### 4.17 New module: `lib/data-health.ts`
Responsibilities:
- aggregate snapshot metadata
- compute stale/failing datasets
- summarize last refresh status

### 4.18 New internal route
- `app/api/admin/data-health/route.ts`

Protected by admin secret.

Returns:
- last successful run per dataset
- stale status
- source type
- fallbackUsed
- item counts
- latest job notes/errors

### 4.19 Optional future UI
- internal-only health panel

## Success criteria
- operators can tell quickly what dataset is stale or degraded

---

# Milestone 7 — Historical archive foundation

## Goal
Support trends, flows, backtests, and holder history without relying on ephemeral JSON only.

## Deliverables

### 4.20 Storage decision
Pick one:
- SQLite/Turso (good short-term fit)
- Postgres (better long-term)

### 4.21 Initial tables
- `snapshot_runs`
- `subnet_snapshots`
- `metagraph_snapshots`
- `holder_attribution_snapshots`
- `holder_product_snapshots`
- `validator_snapshots`
- `price_snapshots`

### 4.22 Archive writer jobs
After each materialization step, optionally write summary rows/history records.

## Success criteria
- historical product features can be powered from Tyvera-owned records

---

## 5. Route-by-route production requirements

## `/api/subnets`
### Must do
- serve fresh internal snapshot if available
- if stale, serve stale labeled snapshot
- optional external enrichments only after internal truth
- return consistent source metadata

### Must not do
- silently change semantics between sources
- block whole route on one enrichment failure

---

## `/api/metagraph`
### Must do
- prefer internal metagraph snapshot
- return source tier + freshness
- use synthetic fallback only with explicit label

---

## `/api/holders`
### Must do
- serve product-facing holder snapshot
- include generatedAt/source metadata
- remain fast regardless of raw extraction difficulty

---

## `/api/holders/real`
### Must do
- expose raw attribution state honestly
- never pretend empty results are authoritative success
- include coverage stats and notes

---

## `/api/validators`
### Must do
- prefer internal snapshot
- label cached/fallback state

---

## `/api/tao-rate`
### Must do
- remain external-source-backed
- clearly label source
- cache aggressively

---

## `/api/tao-price-history`
### Must do
- label synthetic history explicitly
- avoid pretending synthetic data is historical truth

---

## 6. Security and robustness requirements

### Every public route
- validate inputs
- bound runtime
- avoid leaking internal stack traces
- return safe fallback or explicit failure

### Every protected route
- use timing-safe secret comparison
- log unauthorized attempts if operational logging exists

### Every job
- bounded timeout
- explicit success/failure metadata
- partial failure notes where appropriate

---

## 7. File/module creation plan

## New files to add
- `lib/data-source-policy.ts`
- `lib/snapshot-metadata.ts`
- `lib/ingest/subnets.ts`
- `lib/ingest/metagraph.ts`
- `lib/ingest/holders.ts`
- `lib/ingest/validators.ts`
- `lib/data-health.ts`
- `scripts/build-metagraph-snapshot.mjs`
- `scripts/build-validator-snapshot.mjs`
- `scripts/refresh-intel.mjs`
- `app/api/admin/data-health/route.ts`

## Existing files to refactor/update
- `lib/chain/holders.ts`
- `lib/api/subnets.ts`
- `lib/api/holders.ts`
- `lib/api/holders-snapshot.ts`
- `lib/api/holders-real-snapshot.mjs`
- `app/api/subnets/route.ts`
- `app/api/metagraph/route.ts`
- `app/api/holders/route.ts`
- `app/api/holders/real/route.ts`
- `app/api/tao-rate/route.ts`
- `app/api/tao-price-history/route.ts`
- `package.json`

---

## 8. Execution order

### Phase A — Standardization (fastest leverage)
1. add `data-source-policy.ts`
2. add `snapshot-metadata.ts`
3. standardize route headers/metadata
4. add `refresh-intel.mjs`

### Phase B — Bittensor-native strengthening
5. build `ingest/metagraph.ts`
6. build metagraph snapshots
7. update `/api/metagraph`
8. build validator snapshots

### Phase C — Holder credibility improvement
9. build `ingest/holders.ts`
10. improve holder attribution coverage
11. enrich holder attribution metadata
12. stabilize holder product snapshot

### Phase D — Observability + history
13. add `data-health.ts`
14. add admin health route
15. add historical archive tables

---

## 9. Definition of done

Tyvera’s internal API is production-worthy when:

1. core on-chain surfaces are powered by Tyvera-owned chain ingestion or Tyvera-owned snapshots
2. routes have uniform source/freshness metadata
3. snapshot refresh is formalized and repeatable
4. failures degrade honestly and visibly
5. holder attribution produces useful real data often enough to matter
6. operators can inspect data health quickly
7. historical storage exists for future analytics growth

---

## 10. Immediate recommendation

### Start with Milestone 1 + Milestone 2
These provide the highest leverage and lowest architectural regret:
- standardize metadata/fallback behavior
- formalize the refresh pipeline

Then move to:
- metagraph internal-first strengthening
- holder attribution quality

That sequence gives Tyvera a more robust production backbone without waiting for every advanced analytics feature to be perfect.
