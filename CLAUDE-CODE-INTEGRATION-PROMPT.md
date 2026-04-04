# TAO Navigator — Claude Code Integration Prompt

You are working inside the existing TAO Navigator Next.js project.

## Goal
Integrate the already-built frontend with real backend/API fetchers and adapters **without rebuilding UI pages or redesigning components**.

## Critical rule
Do **not** rebuild existing layouts, pages, chart visuals, sidebar/topbar, wallet modal visuals, billing visuals, or recommendation visuals.

This project is in the **integration phase**, not the redesign phase.

## What already exists
The project already contains:
- landing page
- login/signup
- dashboard
- subnets page
- subnet detail page
- recommendations page
- portfolio page
- billing page
- settings page
- wallet connect modal
- wallet approval dialog
- charts and design system
- mock data files in `lib/mock-data/*`

These should remain visually intact.

## Main task
Replace the current frontend’s dependence on mock data with:
- `lib/types/*`
- `lib/api/*`
- `lib/adapters/*`
- page-level fetch integration

Scaffolding files already added:
- `lib/types/subnets.ts`
- `lib/types/recommendations.ts`
- `lib/types/portfolio.ts`
- `lib/types/billing.ts`
- `lib/constants/subnets.ts`
- `lib/api/subnets.ts`
- `lib/api/recommendations.ts`
- `lib/api/portfolio.ts`
- `lib/api/billing.ts`
- `lib/adapters/subnets.ts`
- `lib/adapters/recommendations.ts`
- `lib/adapters/portfolio.ts`
- `lib/adapters/billing.ts`

## Files currently importing mock data
Replace mock-data dependencies in these files:

### Pages
- `app/(app)/billing/page.tsx`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/portfolio/page.tsx`
- `app/(app)/recommendations/page.tsx`
- `app/(app)/subnets/page.tsx`
- `app/(app)/subnets/[netuid]/page.tsx`

### Components/types
- `components/charts/allocation-bar-list.tsx`
- `components/portfolio/allocation-chart-card.tsx`
- `components/portfolio/holdings-list.tsx`
- `components/portfolio/watchlist-card.tsx`
- `components/recommendations/recommendation-card.tsx`
- `components/recommendations/review-panel.tsx`
- `components/recommendations/risk-badge.tsx`
- `components/subnets/subnet-card.tsx`
- `components/subnets/subnet-detail-preview.tsx`
- `components/subnets/subnet-filter-panel.tsx`

## Implementation rules

### 1. Preserve existing component props if possible
Try to keep page/component prop shapes stable by adapting backend DTOs in adapter files.

Do **not** rewrite UI components unless necessary.

### 2. Replace mock-data type imports with `lib/types/*`
All UI components should import from `lib/types/*`, not `lib/mock-data/*`.

### 3. Replace static mock imports in pages with fetchers
Pages should fetch through `lib/api/*`.

### 4. Do not leave fake generated chart logic in place where real history should be used
Specifically replace/remove:
- fake chart seed/history generation in `app/(app)/subnets/[netuid]/page.tsx`
- fake earnings line generation in `app/(app)/portfolio/page.tsx`
- mock-derived chart series in `app/(app)/dashboard/page.tsx`

### 5. If real backend endpoints are not callable in this environment
Still build the fetcher/adapters cleanly and leave TODO-safe defaults or documented assumptions, but do not silently keep mock imports.

### 6. Keep the app buildable
Run build checks after edits and fix TypeScript issues.

## Endpoint assumptions
Use these frontend endpoint contracts:

### Subnets
- `GET /api/subnets`
- `GET /api/subnets/:netuid`
- `GET /api/subnets/:netuid/history?range=30d`

### Recommendations
- `GET /api/recommendations/:address`

### Portfolio
- `GET /api/portfolio/:address`
- `GET /api/portfolio/:address/history?range=30d`
- `GET /api/portfolio/:address/activity`
- `GET /api/watchlist/:address`

### Billing
- `GET /api/billing/status`
- `GET /api/billing/history`
- `POST /api/billing/create-payment`

## Preferred page integration order
Implement in this order:
1. billing
2. recommendations
3. subnets
4. subnet detail
5. dashboard
6. portfolio

## Output expectations
When done:
- list all files changed
- explain any unresolved assumptions
- confirm whether all mock-data imports were removed from the main app pages/components
- run a production build if possible
