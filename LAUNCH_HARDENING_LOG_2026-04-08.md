# Tyvera Launch Hardening Log — 2026-04-08

## Context
This log records the launch-readiness hardening pass completed on 2026-04-08 against the live Tyvera deployment and the fresh working repo copy.

Fresh working repo used for changes:
- `/home/openclaw/.openclaw/workspace/tyvera-fresh-20260408-163643`

Primary repo:
- `https://github.com/openclawbeta/tyvera`

---

## High-level outcome
Tyvera moved from a partially hardened production candidate to a substantially safer launch posture.

### Major improvements completed
- Implemented real wallet signature verification server-side
- Fixed frontend signed wallet auth flow for settings / entitlement / alerts
- Removed customer-facing API/developer product surface while preserving Tyvera internal APIs
- Locked `/api/subnets` down for frontend/internal usage
- Hardened cron/payment routes to fail closed when secrets are missing
- Added `Risk Disclosure` page
- Standardized public security contact to `tyvera.ai@gmail.com`
- Removed silent fallback behavior for missing `DEPOSIT_ADDRESS`
- Added backward-compatible DB migration for older `payment_intents` tables in Turso
- Restored production subscription creation after schema drift was detected

---

## Important confirmed production facts

### Correct payment deposit address
Confirmed correct Tyvera deposit address:
- `5EkH7oV4EvT2otiH1teYu9gM2bkhuQTZbZrrPuqxHQMVTjRZ`

### Public security contact
Confirmed public security contact:
- `tyvera.ai@gmail.com`

---

## Code / deployment milestones

### Key commits from this hardening cycle
- `5b2a42d` — harden auth and remove customer API surface
- `5ca8721` — fix signed wallet auth for settings and alerts flows
- `963ca35` — fail closed on missing deposit address
- `5709a15` — expose subscribe error detail for production debugging
- `3df40bd` — migrate payment_intents schema on startup

---

## Problems found and resolved

### 1) Weak wallet authentication
**Problem:** wallet auth originally accepted timestamp/message format without full signature verification.

**Fix:** upgraded to real cryptographic signature verification.

**Impact:** protected wallet routes now rely on real wallet ownership proof.

---

### 2) Settings / alerts frontend auth mismatch
**Problem:** backend auth was hardened, but frontend protected requests were not sending signed wallet auth headers.

**Fix:** added client-side signed auth header generation and patched entitlement / alerts / rules flows.

**Impact:** wallet-connected + verified flows align with backend auth requirements.

---

### 3) Customer API surface added unnecessary launch risk
**Problem:** Tyvera exposed a developer/API key product direction that was not part of the actual launch plan.

**Fix:** removed developer-facing product surface from navigation and product presentation, while preserving internal APIs required by the app.

**Impact:** reduced attack surface, reduced product confusion, reduced support burden.

---

### 4) Cron/payment routes were too forgiving
**Problem:** cron/payment routes could behave too loosely when secrets were absent.

**Fix:** changed routes to fail closed when required secrets are missing.

**Impact:** improved production safety and reduced accidental exposure risk.

---

### 5) Deposit address fallback behavior
**Problem:** code used a silent fallback deposit address when `DEPOSIT_ADDRESS` was missing.

**Fix:** changed deposit address handling to require env presence explicitly.

**Impact:** reduced risk of misdirected subscription payments.

---

### 6) Turso schema drift broke subscribe flow
**Problem:** live production returned:
- `table payment_intents has no column named billing_cycle`

**Cause:** old Turso table schema existed before newer code expectations.

**Fix:** added startup migration logic to append missing columns to `payment_intents`.

**Impact:** restored live subscription creation flow.

---

## Live checks completed

### Confirmed working
- Homepage loads
- Privacy page loads
- Terms page loads
- Risk Disclosure page loads
- Security headers present
- `security.txt` publishes correct contact address
- `/api/subnets` rejects external/public direct access
- `/api/entitlement` rejects unsigned access
- `/api/cron/verify-payments` rejects unauthorized access
- `/api/subscribe` returns successful payment instructions again

---

## Remaining follow-up items (not blockers for controlled launch)

### 1) Add abuse/rate limiting to `/api/chat`
Current state:
- functional
- no serious anti-abuse / spend protection yet

Recommended next step:
- per-IP or per-wallet rate limiting
- optionally tier-based usage limits

### 2) Revisit `/api/portfolio` privacy model
Current state:
- public by wallet address

Recommendation:
- acceptable for now if intentional
- revisit later if you want stricter privacy expectations

### 3) Keep monitoring billing flow
Recommended:
- verify at least one end-to-end subscription flow carefully
- confirm payment verification behavior in production
- confirm memos and intent matching remain correct

---

## Operational recommendation
Treat this fresh repo as the active source of truth:
- `/home/openclaw/.openclaw/workspace/tyvera-fresh-20260408-163643`

Avoid editing stale Tyvera copies to prevent overwrite/drift loops.

---

## Final assessment
As of 2026-04-08, Tyvera is in a substantially better launch state than at the beginning of the audit.

It is not perfectly hardened, but the critical blockers found during this session were resolved well enough for a controlled production launch, provided near-term follow-up continues on chat abuse controls and general post-launch monitoring.
