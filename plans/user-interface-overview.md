# Theta App — Goal‑Oriented UX & Data Spec (v1)

> Make **goals visible everywhere**: weekly ROI goal + annual return goal. Provide a **simple progress overview** and a **historical performance** page with benchmark comparison. Keep it bullish, premium‑centric, and low‑maintenance.

> Purpose: fast, calming decisions for Covered Calls (primary), Cash‑Secured Puts, Bullish bounce setups, and LEAPS — bullish‑only v1. Simplicity > completeness. Polygon.io + Supabase. Next.js (App Router), TypeScript, Tailwind, shadcn/ui, PWA‑friendly on Vercel.

---

## 0) Principles

* **Always‑on goals**: surface weekly/annual progress in headers, cards, and toasts.
* **Simple, trustworthy math**: deterministic formulas; no confusing accounting.
* **One glance → one action**: if off‑track, suggest the next step (Sell CC, adjust CSP reserve, etc.).

---

## 1) Goal Definitions & Formulas

### 1.1 Weekly ROI (goal)

* **Target**: 1–5%/week (configurable per user, default 2%).
* **Weekly ROI (actual)** per account or aggregate:

  `weekly_roi_pct = weekly_net_premium / avg_deployed_capital_week`

  where:

  * `weekly_net_premium = Σ(premiums_received) - Σ(premiums_paid) - fees` recognized within the week (UTC rollover configurable to user TZ).
  * `avg_deployed_capital_week = average( capital_deployed_by_day )` over the week.
* **Progress**: `progress = clamp( weekly_roi_pct / weekly_target_pct, 0, 1 )`.
* **Color**: < 0.5 amber, 0.5–1 green, > 1 deep green; negative red.

### 1.2 Annual Return (goal)

* **Target**: user‑defined (e.g., 20%/yr).
* **Actual annual return (YTD)**:

  `annual_return_pct = (ending_equity - starting_equity + net_withdrawals) / (time_weighted_denominator)`

  Simpler **TWR** approximation (weekly buckets):

  `twr = Π (1 + weekly_roi_pct) - 1` (over weeks in YTD)

  Use weekly ROI derived above for consistency.
* **Progress to annual goal**: `twr / annual_goal_pct` (clamped).

### 1.3 Benchmarks

* Track **S\&P 500 (SPY)** and **Nasdaq‑100 (QQQ)** total returns approximated by price returns (dividend‑light for v1).
* Compute YTD, MTD, WTD: `ret = price(t2)/price(t1) - 1`.

> **Note:** We intentionally avoid full IRR/fee granularity in v1. Keep it explainable and consistent with premium‑first strategy.

---

## 2) Pages & Layouts (mobile‑first)

### 2.1 **Progress Overview** (simple snapshot)

* **Header metric pills** (sticky):

  * **Weekly ROI**: big % + progress bar to target.
  * **Annual Return (YTD)**: % + tiny bar.
* **Accounts Section** (cards, collapsible):

  * Each card: Account name → *Weekly ROI*, *YTD*, *Deployed vs Available*, *Allocation % of total*.
  * CTA: *Plan next week* (opens Plan tab filtered to account).
* **Positions Pulse** (optional compact list):

  * Top 3 underlyings contributing to weekly premium; flag any “idle lots” with no CC.
* **Goal Hints** (Advice chips):

  * If **Weekly ROI < target**: show “Sell CC on X” or “Open CSP on Y” with expected lift.
* **Footer**: small benchmark badges WTD.

**Interactions**

* Tap header metric → opens quick explainer sheet with formula and last 3 weeks trend sparkline.
* Pull‑to‑refresh updates metrics and benchmarks.

### 2.2 **Performance (History + Benchmarks)**

* **Tabs** within page: *Weekly*, *Monthly*, *Annual*.
* **Chart area**:

  * Line chart of **portfolio return** vs **SPY** and **QQQ** for the selected resolution.
  * Toggle: absolute % vs excess over SPY.
* **Table** below chart:

  * Period, Portfolio %, SPY %, QQQ %, **Delta vs SPY**.
* **YTD Summary card**: Portfolio vs SPY vs QQQ with simple copy (“Ahead of SPY by +3.2% YTD”).
* **Export CSV** action.

**Interactions**

* Tap a point → period popover with note of major premium weeks.
* Long‑press → range select to compute custom period.

---

## 3) Components (goal‑aware)

* `GoalPill` — label, value, tiny progress bar, status color.
* `GoalHeader` — row of `GoalPill`s with subtle shimmer on update.
* `ProgressBar` — rounded, animated fill.
* `AccountProgressCard` — account metrics + allocation.
* `BenchmarkBadges` — SPY/QQQ WTD/MTD quick chips.
* `PerfChart` — portfolio vs benchmarks; weekly/monthly aggregations.
* `PerfTable` — compact, mobile‑friendly, sticky column headers.
* `GoalExplainerSheet` — formula, what counts, last‑3 sparkline.

---

## 4) Data Model & Contracts

```ts
export interface GoalConfig {
  weeklyTargetPct: number; // e.g., 0.02 = 2%
  annualTargetPct: number; // e.g., 0.20 = 20%
}

export interface PeriodReturn {
  periodStart: string; // ISO date (week start / month start)
  periodEnd: string;   // ISO date (inclusive end)
  portfolioPct: number; // e.g., 0.015 = 1.5%
  spyPct?: number;
  qqqPct?: number;
}

export interface ProgressSnapshot {
  weeklyRoiPct: number;
  weeklyProgressToTarget: number; // 0..1
  ytdPct: number; // TWR across weeks YTD
  ytdProgressToTarget: number; // 0..1
  accounts: Array<{
    id: string; name: string;
    weeklyRoiPct: number; ytdPct: number;
    deployed: number; available: number; allocationPct: number;
  }>;
}
```

**Supabase Views (denormalized)**

* `vw_weekly_premiums(account_id, week_start, net_premium)`
* `vw_daily_deployed(account_id, date, deployed)`
* `vw_accounts_summary(account_id, deployed, available)`
* `vw_positions_contrib(symbol, week_start, net_premium)`

**Derivations**

* `weekly_roi_pct = net_premium / avg(daily_deployed)` per account, then aggregate weighted by deployed.
* `twr` multiply (1+weekly\_roi\_pct) sequentially from Jan 1 to current week.

**Benchmarks** (Polygon adapter)

* Endpoints: `getAggs(ticker, bucket=day|week|month)` and cache to weekly/monthly closes.
* Keys: `["benchmarks", { ticker, granularity, year }]`, `staleTime: 6h`.

---

## 5) State, Caching & Performance

* **Server Components** compute **`ProgressSnapshot`** on first load using Supabase views + cached Polygon aggregates.
* **TanStack Query** caches:

  * `progressSnapshot` — `staleTime: 30s`, refetch on focus.
  * `periodReturns(granularity, year)` — `staleTime: 6h`.
  * `benchmarks(granularity, year)` — `staleTime: 6h`.
* **Zustand** for UI state: selected granularity, selected range, toggles.
* **Precomputation Job** (edge cron, optional): roll weekly/monthly returns nightly to speed charts.
* **Optimistic effects**: when a trade ticket posts premium, increment current week’s `weekly_net_premium` locally to immediately update `GoalPill`s.

---

## 6) UI Specs (Tailwind/shadcn)

**GoalPill**

* Layout: `flex items-center gap-2 rounded-2xl px-3 py-2 shadow-sm border`.
* Value: `text-xl font-semibold` with sign formatting; delta badge if changed since yesterday.
* Progress: `h-1.5 rounded-full overflow-hidden bg-muted` with animated inner bar.

**Progress Overview screen**

* **Header**: `GoalHeader` pinned beneath navbar.
* **Accounts**: grid 1‑col mobile / 2‑col desktop; each `AccountProgressCard` has mini bar and allocation ring.
* **Empty state**: “Add an account to start tracking goals.”

**Performance screen**

* Chart area: `Card` with 56vh height; Recharts line chart; legend toggles.
* Table: virtualized list for long histories; sticky header.

---

## 7) Calculations — Pseudocode

```ts
function computeWeeklyRoi(weekStart: Date, accountId: string) {
  const net = getNetPremium(accountId, weekStart);
  const deployed = avgDailyDeployed(accountId, weekStart);
  return deployed > 0 ? net / deployed : 0;
}

function computeTwrYtd(accountId?: string) {
  const weeks = getWeeksFromJan1();
  let twr = 1;
  for (const w of weeks) {
    const roi = computeWeeklyRoi(w, accountId);
    twr *= (1 + roi);
  }
  return twr - 1;
}

function aggregateAccountsWeightedWeeklyRoi(weekStart: Date) {
  const rows = accounts.map(a => ({ a, roi: computeWeeklyRoi(weekStart, a.id), weight: avgDailyDeployed(a.id, weekStart) }));
  const denom = rows.reduce((s, r) => s + r.weight, 0);
  return denom ? rows.reduce((s, r) => s + r.roi * r.weight, 0) / denom : 0;
}
```

---

## 8) Acceptance Criteria (BDD)

**Progress Overview**

* *Given* accounts exist, *when* I open the app, *then* I see Weekly ROI and Annual Return with progress bars and status colors.
* *When* Weekly ROI < target, *then* I see at least one actionable hint that increases expected weekly ROI.
* *When* I execute a trade, *then* the Weekly ROI pill updates immediately (optimistic) within the current week.

**Performance**

* *Given* I open Performance → Monthly, *then* I see a chart of my monthly returns vs SPY and QQQ, and a table with deltas.
* *When* I toggle “excess over SPY”, *then* the chart re‑scales and the table recomputes deltas without refetching.
* *When* I export CSV, *then* I receive a file with period returns and benchmarks.

---

## 9) Tests (Essential)

* **Unit**: weekly ROI math (net premium & average deployed), TWR compounding; benchmark aggregation.
* **Integration**: `progressSnapshot` hydrates server‑side and revalidates on focus; optimistic update after ticket.
* **E2E**: Goal pills render and color correctly across thresholds; Performance chart toggles and matches table values; CSV export matches on‑screen data.

---

## 10) Copy Deck (micro)

* Weekly ROI pill: “Weekly ROI” / sublabel: “Target 2%” / tooltip: “Net premium ÷ avg deployed capital this week.”
* Annual pill: “YTD Return” / sublabel: “Goal 20%”.
* Hint when behind: “You’re at 0.9× this week’s target. Consider selling a 7D CC on AAPL @ \$210 for \~1.2%.”

— End v1 —
