# AgentCred

**A credit-score system for AI trading agents on Bitget.**

AgentCred turns raw Bitget trade history into a transparent, weighted **Trust Score** so
capital can flow to the AI agents that have actually earned it — not just the loudest
backtest. Think Bloomberg Terminal meets a credit bureau, for autonomous traders.

> Dark, glowing "trading-intelligence" aesthetic · live 3D agent constellation · pentagon
> risk-return polyhedrons · animated market-regime terrain · AI-authored behavioral reports.

---

## What it does

- **Reputation engine** — every agent gets a 0–100 Trust Score, a weighted blend of five
  sub-scores:

  | Dimension | Weight | Measures |
  |---|---|---|
  | Performance | 20% | total return · Sharpe · profit factor |
  | Risk | 25% | max drawdown · volatility · position-sizing discipline |
  | Consistency | 20% | weekly-return stability · trade-frequency stability · result variance |
  | Adaptability | 20% | performance spread across market regimes |
  | Survival | 15% | agent age · trade count · sustained activity |

- **Market-Regime Engine** — classifies activity into _Trending / Range-bound / High
  Volatility / Low Volatility_ and scores how well each agent performs in each.
- **Capital-allocation guidance** — every agent gets an **A–F rating** and a recommended
  book allocation %, with a written rationale that weighs risk over raw profit.
- **AI behavioral reports** — OpenRouter generates a Bloomberg-style behavioral assessment
  (summary, strengths, weaknesses, behavior type) grounded in the agent's real metrics.
- **Head-to-head comparison** — overlaid radar profiles, a metric-by-metric table, and an
  AI allocation verdict on which agent is the better bet.
- **Bitget data simulator** — a deterministic stand-in for live Bitget data, behind a clean
  ingestion interface you can swap for a real client without touching the scoring pipeline.

---

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS** for the dark terminal UI
- **Prisma + PostgreSQL** (runs on Vercel + Render)
- **three.js** for the 3D constellation map and regime terrain (hand-rolled, no R3F coupling)
- **Recharts** for the radar polyhedrons and equity curves
- **OpenRouter** for live LLM behavioral reports and comparison verdicts

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure env — set DATABASE_URL to a Postgres connection string
cp .env.example .env
#    Optional: add OPENROUTER_API_KEY to enable live AI reports.

# 3. Create the database and seed simulated agents + trades
npm run db:push
npm run db:seed

# 4. Run
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build && npm run start
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string (local + prod). |
| `SESSION_SECRET` | yes (prod) | HMAC secret signing the wallet sign-in cookie. Generate with `openssl rand -hex 32`. |
| `OPENROUTER_API_KEY` | no | Enables live AI reports/verdicts. Without it, a deterministic baseline report is shown and clearly labeled. |
| `OPENROUTER_MODEL` | no | Any OpenRouter model id. Default `anthropic/claude-haiku-4.5`. |
| `OPENROUTER_SITE_URL` / `OPENROUTER_SITE_NAME` | no | Attribution headers shown on the OpenRouter dashboard. |

> **AI reports are live-only by design.** Structural facts (behavior type, strengths,
> weaknesses, best/worst regime) are always derived deterministically from the scores so the
> UI is never empty, but the prose narrative and comparison verdict are authored live by the
> LLM and labeled with the model used. Set `OPENROUTER_API_KEY`, open any agent, and click
> **Generate AI report**.

---

## Pages

| Route | What's there |
|---|---|
| `/` | Dashboard — 3D agent constellation hero, overview stats, the "Agent Arena" leaderboard, top-agent risk-return polyhedron, highlight cards. |
| `/leaderboard` | Full, sortable ranking of every agent (sort by trust, Sharpe, return, drawdown). |
| `/agents/[id]` | Deep-dive profile — trust orb, score breakdown + radar, AI behavioral report, strengths/weaknesses, performance metrics, equity curve, and the animated **market-regime terrain**. |
| `/compare` | Head-to-head — overlaid radar, metric-by-metric table, AI allocation verdict. |

### API

| Endpoint | Description |
|---|---|
| `GET /api/overview` | Aggregate stats + standout agents. |
| `GET /api/agents` | All agents, ranked by trust. |
| `GET /api/agents/:id` | Full agent detail (scores, metrics, regimes, trades, report). |
| `POST /api/agents/:id/report` | Generate & cache a live OpenRouter behavioral report (`?refresh=1` to regenerate). |
| `GET /api/compare?a=ID&b=ID` | Two agent details + an allocation verdict. |

---

## Architecture

```
src/
├─ app/                      Next.js routes (pages + API handlers)
├─ components/
│  ├─ three/                 ConstellationMap + RegimeTerrain (three.js) and ssr:false wrappers
│  ├─ charts/                ScoreRadar (pentagon) + EquityChart (Recharts)
│  └─ …                      Leaderboard, ReportPanel, score widgets, glyphs
├─ lib/
│  ├─ types.ts               Canonical domain types
│  ├─ metrics.ts             Trade history → PerformanceMetrics (Sharpe, drawdown, …)
│  ├─ regime.ts              Market-Regime Engine
│  ├─ scoring.ts             Reputation Engine — sub-scores, Trust Score, rating, allocation
│  ├─ insights.ts            Deterministic behavior type / strengths / weaknesses + LLM grounding
│  ├─ openrouter.ts          OpenRouter client + report/verdict generation
│  ├─ pipeline.ts            Raw activity → fully-scored agent (pure transform)
│  └─ agents.ts              DB read layer (Prisma → typed domain objects)
├─ integrations/bitget/      Bitget ingestion boundary (see below)
└─ prisma/                   schema.prisma (PostgreSQL) + seed.ts
```

The flow is one direction:

```
Bitget source  →  RawAgentActivity  →  scoreAgent()  →  Prisma  →  API  →  UI
 (simulator)        (ingestion)        (scoring)       (Postgres)
```

### The Bitget integration boundary

`src/integrations/bitget/` defines a single contract, `BitgetActivitySource`, with one method
returning `RawAgentActivity[]`. The MVP fulfils it with `BitgetSimulator` — a deterministic
(seeded) generator that builds eight strategy archetypes (Momentum, Trend Following, Mean
Reversion, Breakout, Market Making, Scalping, Swing, Arbitrage), each with its own per-regime
edge, sizing discipline, and risk posture, then emits realistic closed trades tagged by the
market regime active at the time.

To go live, implement `BitgetActivitySource` with a real client (trade-history / paper-trading
/ copy-trading lead-trader endpoints) and return it from `getBitgetSource()`. **Nothing
downstream changes** — the scoring pipeline only depends on the contract.

### Deployment

The app runs on any Node host with a Postgres database.

**Vercel**

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Add env vars: `DATABASE_URL` (Postgres), `SESSION_SECRET`, and optionally `OPENROUTER_API_KEY`.
3. The build command (`prisma generate && next build`) runs automatically.
4. One-time, against the production `DATABASE_URL`: `npx prisma db push && npm run db:seed`.

**Render**

A [`render.yaml`](./render.yaml) blueprint provisions a web service + managed Postgres.
Create a new **Blueprint** in the Render dashboard, point it at this repo, and set
`OPENROUTER_API_KEY`. Run `npm run db:seed` once from the service shell after first deploy.

> Re-seeding wipes and rebuilds all agents (and clears any wallet links), so it is a
> deliberate one-time/manual step — **not** part of the deploy build.

---

## Scripts

| Script | Action |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run db:push` | Create/sync the Postgres schema |
| `npm run db:seed` | Ingest from the Bitget source and score every agent |
| `npm run db:reset` | Force-reset the DB and reseed |
| `npm run typecheck` | `tsc --noEmit` |

---

## Notes & honest caveats

- The dataset is **simulated**, deterministically, as-of `2026-06-15`. Agent ages and metrics
  are stable across runs given the same seed (`prisma/seed.ts`).
- Display metrics are lightly **winsorized** (e.g. Sharpe capped at 4.5) — annualized daily
  Sharpe on a very smooth market-neutral P&L series otherwise explodes past anything credible.
- Scores are computed once at seed time and cached on the agent row; re-run `npm run db:seed`
  after changing any scoring logic.
