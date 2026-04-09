# Tyvera Bug Tracker — 2026-04-09

## Status legend
- **Open** — confirmed issue, not fixed yet
- **In Progress** — being worked on
- **Fixed** — code change landed, needs deploy/live verification or already verified
- **Deferred** — known issue, intentionally postponed

---

## BUG-2026-04-09-01 — Subnet summary cards show misleading Root/Alpha split
**Status:** Open  
**Priority:** Critical  
**Area:** Subnets page / summary cards  
**Files:** `components/subnets/subnet-summary-cards.tsx`

### Problem
The summary cards split totals into Root vs Alpha using `netuid === 0`. If root data is not actually present in the displayed dataset, the UI shows:
- `0.00 τ Root`
- everything else as Alpha
- `0% Root`

This reads as fake/misleading rather than informative.

### Expected fix
Replace the Root/Alpha split with honest displayed-list totals unless root data is actually included. Prefer:
- Total displayed market cap/value
- Total displayed liquidity/stake
- Total displayed 24h volume

If a Root/Alpha split is retained, only show it when root subnet data is actually present in the source set.

### Acceptance criteria
- No `0.00 τ Root / 0% Root` fake-looking breakdowns when root is absent
- Summary cards reflect the actual displayed data truthfully

---

## BUG-2026-04-09-02 — Holders page claims Top 100 but only renders 20
**Status:** Open  
**Priority:** High  
**Area:** Holders page  
**Files:** `app/(app)/holders/page.tsx`

### Problem
The page copy says:
- `Top 100 wallet cohort tracking`
- `Top 20 of 100 tracked wallets`

But the rendered list uses:
```ts
 data.topHolders.slice(0, 20)
```

So the user does not actually see 100 wallets.

### Expected fix
Either:
1. render/paginate/search across all 100 wallets, or
2. change page copy to match the actual rendered scope

### Acceptance criteria
- UI wording matches actual displayed wallet count
- If 100 are claimed, the user can actually access 100

---

## BUG-2026-04-09-03 — Validators dataset is too thin / source path unclear
**Status:** Open  
**Priority:** High  
**Area:** Validators page / validator data pipeline  
**Files:** `lib/api/validators.ts` and any newer scanner route/module if added

### Problem
Current checked validator code still shows:
- TaoStats-based data path
- registry enrichment
- hardcoded fallback list of only 10 validators

This conflicts with the expectation of a much broader 50+ validator surface and with claims that a newer internal validator scanner may exist.

### Expected fix
- Verify the actual production validator source path
- If internal scanner exists, fully wire it into the served route
- If fallback remains necessary, expand the fallback dataset and label it clearly
- Prefer a Tyvera-owned internal validator snapshot for production

### Acceptance criteria
- Validators page reliably shows broad coverage (target: 50+ if product copy implies that)
- Source labeling is accurate
- No hidden silent fallback to a thin 10-validator list without clear notice

---

## BUG-2026-04-09-04 — Global ticker needs value-first display behavior
**Status:** Open  
**Priority:** Medium  
**Area:** Global ticker  
**Files:** `components/layout/global-ticker.tsx`

### Requirement clarified by user
Ticker should show:
- value of TAO
- percent up/down
- green if up
- red if down

### Current issue
The ticker technically shows both value and % already, but the UX still feels percent-driven instead of clearly value-first. The visual emphasis should make price the main thing and % the secondary change signal.

### Expected fix
Desktop/mobile primary segment should read like:
- `τ $412.37   +2.31%`
- green for positive, red for negative
- value visually emphasized more than percent

Also:
- if pricing source is awaiting/null, show `τ Awaiting pricing source...`
- do not show a lonely % without a valid price

### Acceptance criteria
- Price is visually primary
- Percent is secondary and color-coded
- No percent-only-feeling display
- Null price state is graceful and honest

---

## Notes
These issues were identified after post-deploy review and should be tracked independently of previously closed audit items.
