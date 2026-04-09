# Tyvera Project Completion Plan

_Last updated: 2026-04-09_

This file tracks what remains to finish Tyvera from the current state into a trustworthy, shippable product.

---

## Current State

Recent implemented work:
- `126568a` — shared currency toggle + richer subnet cards
- `ff439df` — first-pass holder intelligence surface
- `23e46d3` — real-attribution scaffolding + honest API surface
- `d2ddd8d` — materialized holder snapshot pipeline
- `175088e` — real-attribution-preferred hybrid snapshot pipeline

### What is now working
- Whole-subnets-page TAO/USD behavior across table, summary cards, and subnet cards
- Richer subnet cards with research links (Website / X / Docs / Explorer when available)
- Holder Intelligence page and API surface
- Materialized holder snapshot generation
- Hybrid holder snapshot pipeline that prefers real attribution input when available and falls back otherwise

### What is still not complete
- Real chain-backed holder attribution generation at production quality
- Historical holder flow snapshots over time
- Production scheduling/automation for holder snapshot generation
- Full verification/testing loop for deployment and runtime
- Final trust cleanup for any remaining modeled/demo behavior surfaces

---

## Definition of Done

Tyvera should only be considered complete when all of the following are true:

1. **Truthful product behavior**
   - no misleading simulated financial surfaces without visible disclosure
   - wallet/integration states reflect real capability
   - holder intelligence clearly marks real vs modeled data source

2. **Core intelligence surfaces are strong**
   - Subnets page supports ranking, comparison, and research launch points
   - Holder Intelligence shows either real extracted holder data or clearly labeled fallback
   - Recommendations / Dashboard / Portfolio remain coherent and trusted

3. **Repeatable data pipelines exist**
   - subnet snapshot generation
   - holder attribution generation
   - holder materialized snapshot generation
   - automated refresh path

4. **Deployment is verifiable**
   - GitHub commit pushed
   - production deploy succeeds
   - key pages checked live

5. **Build/test path exists**
   - dependencies installed
   - build runnable
   - scripted sanity checks documented

---

## Remaining Work by Priority

## P0 — Finish the holder data architecture

### P0.1 Build `holder-attribution.json` generator
Status: implemented, but still needs stronger real-yield discovery.

Current state:
- script exists: `scripts/build-holder-attribution.mjs`
- output exists: `public/data/holder-attribution.json`
- bounded extraction metadata is written honestly
- runtime now completes cleanly

Remaining work:
- improve real-yield discovery so the extractor returns actual attributed positions instead of mostly empty results
- widen candidate strategy using owned hotkeys, metagraph-derived candidates, and subnet-biased probing
- keep runtime bounded while increasing attribution hit rate

Success criteria:
- script completes reliably
- output file is produced
- output schema matches hybrid snapshot pipeline expectations
- extractor returns meaningful non-empty attributed positions often enough to be useful

### P0.2 Make holder pipeline two-stage and explicit
Goal: separate raw extraction from product shaping.

Pipeline should become:
1. `build-holder-attribution`
2. `build-holder-snapshot`

Success criteria:
- raw extracted attribution can be inspected independently
- product-facing holder snapshot remains stable even if extractor changes

### P0.3 Add source labeling in holder UI
Goal: make real vs modeled vs partial data impossible to misunderstand.

Needed:
- visible source badge on Holder Intelligence page
- explain whether source is:
  - modeled demo
  - chain partial
  - chain live
- show snapshot generation time

Success criteria:
- user can tell what kind of holder data they are seeing in <3 seconds

---

## P1 — Automation and operations

### P1.1 Add holder snapshot generation to operational workflow
Needed:
- document commands
- optionally add cron or deploy hook
- ensure generation order is correct:
  1. subnets snapshot
  2. holder attribution
  3. holder snapshot

Success criteria:
- one command sequence can refresh all intelligence artifacts

### P1.2 Create runbook for data refresh
Needed:
- exact commands
- expected outputs
- failure cases
- what to verify after each run

Success criteria:
- another operator can refresh data without guessing

---

## P2 — Testing and verification

### P2.1 Install dependencies and run actual build
Current blocker:
- local repo did not have usable `node_modules`, so full build verification wasn’t available during implementation

Needed:
- install deps in `tyvera/`
- run:
  - `npm install`
  - `npm run build`
  - ideally `npm run lint`

Success criteria:
- clean successful build
- no runtime-breaking type/import issues

### P2.2 Add basic smoke tests / verification checklist
Pages to verify live:
- `/subnets`
- `/subnets/[netuid]`
- `/holders`
- `/dashboard`
- `/portfolio`
- `/tax`

Checks:
- shared TAO/USD toggle works where intended
- subnet cards show research links
- holder page renders snapshot data
- tax disclaimer visible
- no obviously dead buttons on key routes

Success criteria:
- production verification checklist completed after deploy

---

## P3 — Trust and polish completion

### P3.1 Audit remaining modeled/demo surfaces
Needed:
- portfolio demo labeling
- any synthetic chart continuation labeling
- holder intelligence wording consistency
- any remaining fake interaction or fake identity surfaces

Success criteria:
- no trust-damaging unlabeled demo data remains in decision-critical flows

### P3.2 Align holder intelligence with product roadmap
Needed:
- integrate holder view into capital-allocation workflow
- connect holder signals to subnets and recommendations where useful
- avoid making holder page an isolated novelty feature

Success criteria:
- holder intelligence helps actual subnet allocation decisions

---

## Recommended Execution Order

1. Build `holder-attribution.json` generator
2. Test bounded real extraction end-to-end
3. Improve holder UI source labeling
4. Install deps and run full build
5. Push + deploy
6. Run production verification checklist
7. Add automation / cron / runbook
8. Do final trust audit sweep

---

## Commands To Support

Current:
- `npm run build-holder-attribution`
- `npm run build-holder-snapshot`
- `npm run refresh-intel`

Refresh sequence:
1. `python scripts/fetch_subnets_subtensor.py`
2. `npm run build-holder-attribution`
3. `npm run build-holder-snapshot`

---

## Immediate Next Task

**Improve holder-attribution hit rate by changing candidate discovery, not just runtime limits.**

Most likely next practical options:
1. use `ownedHotkeys(coldkey)` aggressively instead of relying only on `stakingHotkeys(coldkey)`
2. derive candidate hotkeys from high-signal metagraph subnets
3. bias alpha probing toward netuids with real observed activity/liquidity
4. if direct RPC probing remains low-yield, move real attribution generation to a richer snapshot/indexer path

That is still the main bridge between the now-working holder UI/snapshot pipeline and a genuinely data-backed product.
