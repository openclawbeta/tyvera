# TAO Navigator — Setup Guide

## Quick Start

```bash
cd tao-navigator
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the marketing homepage.

App routes (with sidebar + topbar):
- `/dashboard` — Portfolio control center
- `/subnets` — Live subnet explorer
- `/recommendations` — AI-scored reallocation suggestions
- `/portfolio` — Allocation breakdown and holdings
- `/billing` — Premium subscription management
- `/settings` — Account and guardrail preferences

## Stack

- **Next.js 15** App Router with route groups `(app)` for the dashboard shell
- **TypeScript** throughout
- **Tailwind CSS** with custom dark design tokens in `globals.css`
- **Framer Motion** for card hover lifts, panel transitions, stagger entrances
- **Recharts** (client components) for all charts
- **lucide-react** for icons

## Before running

This project uses `@radix-ui/*` primitives directly. If you want full shadcn/ui
component support (Dialog, Tooltip, etc.), initialize shadcn first:

```bash
npx shadcn@latest init
npx shadcn@latest add button badge separator avatar tabs scroll-area progress tooltip
```

Then import from `@/components/ui/...` in any page that needs them.

## Key Design Decisions

- **Dark navy palette** — `#070a12` page background, `#0a0e1a` cards, `rgba(255,255,255,0.07)` borders
- **Glass cards** — `.glass` utility class uses `backdrop-blur-xl bg-white/[0.025]`
- **Cyan accent** — `#22d3ee` (cyan-400) for primary actions, live indicators, CTA buttons
- **Violet accent** — `#8b5cf6` for secondary data and score bands
- **Trust copy** — "You approve every move" appears in sidebar, review panel, billing, and homepage trust section. Never use language suggesting autonomous execution.

## Live data integration

All data is currently mocked in `lib/mock-data/`. To integrate live data:
1. Replace mock imports in page files with API calls to your NestJS backend
2. Use `fetch()` in server components or SWR/React Query in client components
3. The `SubnetMarketSnapshot` and `RecommendationRun` Prisma models (from the architecture docs) map directly to the TypeScript interfaces in `lib/mock-data/`
