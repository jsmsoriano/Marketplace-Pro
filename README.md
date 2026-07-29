# Solopreneur Engine

A financial app for gig workers and freelancers, built around the reality of
**irregular income**. Instead of a calendar-month budget that assumes a steady
paycheck, the Engine answers the questions freelancers actually ask: _"How long
can I survive?"_, _"How much have I really set aside for taxes?"_, and _"Can I
afford this today?"_

Built with Next.js (App Router) + React + Tailwind, and an optional
Claude-powered affordability advisor.

## The idea

Most money apps track **what happened**. The Solopreneur Engine forecasts
**what's possible** — it moves the focus from a monthly balance to a single
_Safe-to-Spend_ number and a _runway_ measured in days of survival.

| | Traditional app | Solopreneur Engine |
| :-- | :-- | :-- |
| Primary metric | Monthly balance | **Safe-to-Spend** number |
| Income view | Past deposits | Cash **+ expected invoices** |
| Tax handling | Manual | Automated **Tax Quarantine** |
| Budget cycle | Calendar month | **Runway** (days of survival) |

## Modules

- **Runway** — the home screen. A live _Safe-to-Spend_ hero (cash minus taxes
  owed, upcoming fixed costs and your emergency buffer), a runway ring showing
  days of survival with and without outstanding invoices, and a one-tap
  **"Can I afford this?"** advisor.
- **Invoices** — every invoice is a data point in the forecast. Net-of-fee math
  per platform (Stripe / Upwork / PayPal / Direct), overdue detection with
  auto-reminders, and "mark paid" that flows straight into cash and runway.
- **Tax (Quarantine)** — money set aside before you can touch it. Shows tax
  owed vs. quarantined, an ember-urgency shortfall meter, a one-tap
  "quarantine now" action, the next quarterly deadline, and an adjustable
  set-aside rate.
- **Spending** — pay-period **category caps** with an `OVER CAP` / `Near cap`
  state (budgeting runs on the freelancer's biweekly cycle, not the calendar
  month), plus dual-mode tracking: swipe any charge between **business** and
  **personal**, mapped to Schedule C categories (meals auto-computed at 50%),
  with running deductions captured.
- **Clients** — the competitive wedge: a **Client Profitability Score** that
  ranks clients by _true profit_ — net revenue minus the cost of unbilled
  communication time, penalized for a history of late payment.

Plus a global **Strict Mode** toggle and a **"STRICT MODE · ON TRACK"** status
bar: Strict Mode hides discretionary spending and recomputes runway around
essentials only; the status bar flips to **OFF TRACK** (ember) when period
spend exceeds the total budget or Safe-to-Spend goes negative.

## Design language

Blends a dark, hero-centric canvas with the **Capline** reference's iOS
patterns and forest-green accent:

- Deep-charcoal canvas with a **forest-green** primary accent for health,
  "on track" and primary actions; **orange→red (ember)** reserved for urgency
  and warnings (tax deadlines, overdue invoices, over-cap, off-track).
- An in-app status strip echoing Capline's **"STRICT MODE · ON TRACK"** bar,
  and grouped iOS-style list sections (`CATEGORIES & CAPS`, `TRANSACTIONS`).
- Symbolic single-letter monogram icons (**T** for Tax, **I** for Invoices…)
  instead of emoji.
- Hero-centric, mobile-first layout that renders as a phone frame on desktop.

## The affordability advisor

The **"Can I afford this?"** flow sends the engine's already-computed snapshot
(Safe-to-Spend, runway, unfunded tax, outstanding invoices) to a route handler
that asks Claude for a grounded verdict — _yes / think twice / not today_ — with
one line of reasoning that references your real numbers.

If no `ANTHROPIC_API_KEY` is configured, the route falls back to a deterministic
rule, so the feature still works out of the box. To enable the Claude-powered
version:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
# or
npm run build && npm run start
```

All data is seeded in `src/lib/finance.ts` (a freelance designer, mid-quarter)
and lives in client state, so every action — marking an invoice paid, moving
money to the tax vault, retagging an expense, flipping survival mode —
recalculates the whole model live.

## Project structure

```
src/
  lib/finance.ts                  # pure model: types, seed data, calculations
  app/page.tsx                    # FinanceProvider + AppShell
  app/api/affordability/route.ts  # Claude advisor (+ deterministic fallback)
  components/finance/
    FinanceProvider.tsx           # context store + mutations
    AppShell.tsx                  # phone frame, header, bottom nav
    RunwayView / IncomeView / TaxView / SpendingView / ClientsView
    AffordabilityModal.tsx        # "Can I afford this?" flow
    ui.tsx                        # Monogram, Meter, RunwayRing, Sheet, Pill
```
