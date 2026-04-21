# Tyvera — Bittensor Subnet Intelligence

Live subnet analytics, AI-powered recommendations, and TAO-native subscription management for the Bittensor network.

## Quick Start

```bash
cp .env.local.example .env.local   # configure secrets (see comments in file)
npm install
npm run dev                         # http://localhost:3000
```

The app boots without any env vars — it falls back to cached JSON snapshots and an in-memory SQLite database. For full functionality (subscriptions, cron jobs, live data), configure the secrets documented in `.env.local.example`.

## Architecture

Next.js 15 App Router with client-rendered pages. Data flows through a provider chain with automatic fallback:

- **Subnet data**: Taostats API -> cached JSON snapshot -> stale fallback
- **Holder intel**: TAO.app API -> real-attribution snapshot -> modeled fallback
- **Chain events**: Subtensor RPC via @polkadot/api -> persisted to DB -> in-memory buffer
- **Database**: Turso (libsql) in production, sql.js locally

Every data surface displays its source provenance via `DataSourceBadge`.

## Key Directories

```
app/(app)/          # Pages: subnets, portfolio, recommendations, pricing, etc.
app/api/            # API routes: entitlement, activity, chat, alerts, cron jobs
lib/api/            # Data fetching, recommendations engine, wallet auth
lib/db/             # Database CRUD: subscriptions, alerts, chain events, usage
lib/chain/          # Transfer scanner, Subtensor RPC helpers
lib/providers/      # Pluggable data providers (taostats, tao-app, modeled)
lib/types/          # TypeScript interfaces and tier definitions
components/         # Reusable UI components
```

## Subscription Tiers

| Tier | Price | Key Features |
|------|-------|-------------|
| Explorer | Free | Subnet browser, basic yield, 3 AI queries/day |
| Analyst | $19.99/mo | Full data, 30d history, 25 AI queries/day, 5 alert rules |
| Strategist | $49.99/mo | Recommendations, unlimited AI/alerts, all-time history |
| Institutional | $99.99/mo | Team access, webhooks, priority support |

Payments are settled in TAO on-chain. The `verify-payments` cron matches incoming transfers by memo or fractional amount offset.

## Cron Jobs

Configured in `vercel.json`, protected by `CRON_SECRET`:

| Job | Schedule | Purpose |
|-----|----------|---------|
| sync-chain | Every 5 min | Scan recent blocks for transfers |
| verify-payments | Every 1 min | Match pending payment intents |
| reset-counters | Daily 00:00 UTC | Reset API key daily counters |

## Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run fetch-subnets    # Refresh subnet snapshot from Taostats
npm run test:auth        # Manual wallet auth tests
npm run test:recs        # Recommendation engine tests
```

## Deployment

Deployed on Vercel with automatic deploys from `main`. Required Vercel env vars:

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` — production database
- `CRON_SECRET` — protects cron endpoints
- `DEPOSIT_ADDRESS` — TAO payment receiving wallet
- `TAOSTATS_API_KEY` — subnet data provider

Optional: `OPENAI_API_KEY`, `TAO_APP_API_KEY`, `CMC_API_KEY`, `ADMIN_SECRET`, `ALERT_WEBHOOK_URL`.
