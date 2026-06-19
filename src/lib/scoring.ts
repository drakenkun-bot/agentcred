import {
  type AllocationRating,
  type AllocationRecommendation,
  type PerformanceMetrics,
  type RegimePerformance,
  type ScoreBreakdown,
  type StrategyType,
  type Trade,
} from "./types";

// ───────────────────────────────────────────────────────────────────────────
//  Reputation Engine
//
//  Trust Score is a weighted blend of five sub-scores. Weights are fixed by the
//  product spec and must sum to 1.0:
//
//    Performance   20%   profitability · sharpe · profit factor
//    Risk          25%   max drawdown · volatility · position sizing
//    Consistency   20%   weekly-return stability · trade-frequency stability · result variance
//    Adaptability  20%   performance spread across market regimes
//    Survival      15%   agent age · trade count · longevity
//
//  Every sub-score is normalized to 0..100. Higher is always better
//  (including Risk, where higher means *better risk management*).
// ───────────────────────────────────────────────────────────────────────────

export const SCORE_WEIGHTS = {
  performance: 0.2,
  risk: 0.25,
  consistency: 0.2,
  adaptability: 0.2,
  survival: 0.15,
} as const;

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const pct = (x: number) => Math.round(clamp(x) * 100);

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
/** Coefficient of variation (std / |mean|), bounded for stability scoring. */
function cv(xs: number[]): number {
  const m = mean(xs);
  if (m === 0) return 1;
  return stdev(xs) / Math.abs(m);
}

function isoWeek(ts: string): string {
  const d = new Date(ts);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

interface RawSignals {
  sizeStability: number; // 0..1, higher = more disciplined sizing
  weeklyStability: number; // 0..1
  freqStability: number; // 0..1
  resultStability: number; // 0..1
}

function computeRawSignals(trades: Trade[]): RawSignals {
  if (trades.length < 2) {
    return { sizeStability: 0.5, weeklyStability: 0.5, freqStability: 0.5, resultStability: 0.5 };
  }

  const sizes = trades.map((t) => t.size);
  const sizeStability = clamp(1 - cv(sizes));

  // Weekly aggregates
  const byWeekPnl = new Map<string, number>();
  const byWeekCount = new Map<string, number>();
  for (const t of trades) {
    const w = isoWeek(t.timestamp);
    byWeekPnl.set(w, (byWeekPnl.get(w) ?? 0) + t.pnl);
    byWeekCount.set(w, (byWeekCount.get(w) ?? 0) + 1);
  }
  const weeklyPctReturns = [...byWeekPnl.values()].map((p) => (p / 100_000) * 100);
  // std of weekly % return; 0% std -> 1.0, ~6% std -> 0
  const weeklyStability = clamp(1 - stdev(weeklyPctReturns) / 6);
  const freqStability = clamp(1 - cv([...byWeekCount.values()]));

  // Per-trade result variance, normalized by typical trade magnitude
  const pnls = trades.map((t) => t.pnl);
  const avgAbs = mean(pnls.map(Math.abs)) || 1;
  const resultStability = clamp(1 - stdev(pnls) / (avgAbs * 2.5));

  return { sizeStability, weeklyStability, freqStability, resultStability };
}

// ── Individual sub-scores ──────────────────────────────────────────────────

function performanceScore(m: PerformanceMetrics): number {
  // Profitability: total return on book, -20%..+60% mapped to 0..1
  const profitability = clamp((m.totalReturnPct + 20) / 80);
  // Sharpe: 0..3 mapped to 0..1
  const sharpe = clamp(m.sharpeRatio / 3);
  // Profit factor: 0.8..2.5 mapped to 0..1
  const pf = clamp((m.profitFactor - 0.8) / 1.7);
  return pct(0.4 * profitability + 0.35 * sharpe + 0.25 * pf);
}

function riskScore(m: PerformanceMetrics, sig: RawSignals): number {
  // Lower drawdown is better: 0%..-45% -> 1..0
  const drawdown = clamp(1 - Math.abs(m.maxDrawdownPct) / 45);
  // Lower volatility is better: 0%..120% -> 1..0
  const volatility = clamp(1 - m.volatilityPct / 120);
  // Disciplined, consistent position sizing
  const sizing = sig.sizeStability;
  return pct(0.45 * drawdown + 0.3 * volatility + 0.25 * sizing);
}

function consistencyScore(sig: RawSignals): number {
  return pct(
    0.4 * sig.weeklyStability + 0.3 * sig.freqStability + 0.3 * sig.resultStability,
  );
}

function adaptabilityScore(rp: RegimePerformance[]): number {
  const active = rp.filter((r) => r.trades > 0);
  if (active.length === 0) return 0;
  const scores = active.map((r) => r.score / 100);
  const avg = mean(scores);
  const spread = Math.max(...scores) - Math.min(...scores);
  // Reward high average regime performance AND low spread (works everywhere).
  // Also reward breadth: agents that traded across more regimes.
  const breadth = active.length / 4;
  return pct(0.55 * avg + 0.3 * (1 - spread) + 0.15 * breadth);
}

function survivalScore(ageDays: number, totalTrades: number): number {
  const age = clamp(ageDays / 365); // 1y of operation -> full marks
  const volume = clamp(totalTrades / 600); // 600 trades -> full marks
  const longevity = clamp((ageDays / 365) * (totalTrades / 400)); // sustained activity
  return pct(0.4 * age + 0.35 * volume + 0.25 * longevity);
}

// ── Composite ──────────────────────────────────────────────────────────────

export function computeScores(
  trades: Trade[],
  metrics: PerformanceMetrics,
  regimePerformance: RegimePerformance[],
  ageDays: number,
): ScoreBreakdown {
  const sig = computeRawSignals(trades);
  const performance = performanceScore(metrics);
  const risk = riskScore(metrics, sig);
  const consistency = consistencyScore(sig);
  const adaptability = adaptabilityScore(regimePerformance);
  const survival = survivalScore(ageDays, metrics.totalTrades);

  const trust = Math.round(
    SCORE_WEIGHTS.performance * performance +
      SCORE_WEIGHTS.risk * risk +
      SCORE_WEIGHTS.consistency * consistency +
      SCORE_WEIGHTS.adaptability * adaptability +
      SCORE_WEIGHTS.survival * survival,
  );

  return { trust, performance, risk, consistency, adaptability, survival };
}

// ── Classification + capital allocation ──────────────────────────────────────

export function classify(strategy: StrategyType, scores: ScoreBreakdown): string {
  let qualifier: string;
  if (scores.trust >= 82) qualifier = "Elite";
  else if (scores.trust >= 70) qualifier = "Reliable";
  else if (scores.trust >= 58) qualifier = "Developing";
  else if (scores.trust >= 45) qualifier = "Speculative";
  else qualifier = "High-Risk";

  // Add a behavioral tilt where one dimension clearly dominates.
  const { risk, performance, consistency, adaptability } = scores;
  let tilt = "";
  const top = Math.max(risk, performance, consistency, adaptability);
  if (top - scores.trust > 12) {
    if (top === risk) tilt = "Risk-Disciplined ";
    else if (top === performance) tilt = "High-Performance ";
    else if (top === consistency) tilt = "Steady ";
    else if (top === adaptability) tilt = "All-Weather ";
  }

  return `${qualifier} ${tilt}${strategy} Agent`.replace(/\s+/g, " ").trim();
}

export function ratingFromTrust(trust: number): AllocationRating {
  if (trust >= 80) return "A";
  if (trust >= 68) return "B";
  if (trust >= 55) return "C";
  if (trust >= 42) return "D";
  return "F";
}

const BASE_ALLOCATION: Record<AllocationRating, number> = {
  A: 25,
  B: 15,
  C: 8,
  D: 3,
  F: 0,
};

export function recommendAllocation(
  scores: ScoreBreakdown,
  metrics: PerformanceMetrics,
): AllocationRecommendation {
  const rating = ratingFromTrust(scores.trust);
  let allocationPct = BASE_ALLOCATION[rating];

  // Risk overlay: shave allocation when drawdown control is weak,
  // nudge up when risk management is excellent.
  if (scores.risk >= 80) allocationPct += 3;
  else if (scores.risk < 50) allocationPct = Math.max(0, allocationPct - 4);

  allocationPct = Math.max(0, Math.min(30, Math.round(allocationPct)));

  const reasoning = buildAllocationReasoning(rating, scores, metrics, allocationPct);
  return { rating, allocationPct, reasoning };
}

function buildAllocationReasoning(
  rating: AllocationRating,
  scores: ScoreBreakdown,
  metrics: PerformanceMetrics,
  allocationPct: number,
): string {
  const dd = Math.abs(metrics.maxDrawdownPct).toFixed(1);
  if (rating === "A") {
    return `A-Rated. Trust ${scores.trust}/100 with strong risk control (${scores.risk}/100) and a contained ${dd}% max drawdown. Recommended allocation: ${allocationPct}% of book.`;
  }
  if (rating === "B") {
    return `B-Rated. Solid overall trust (${scores.trust}/100). Performance is dependable but ${scores.consistency < 60 ? "consistency" : "adaptability"} leaves some upside on the table. Recommended allocation: ${allocationPct}%.`;
  }
  if (rating === "C") {
    return `C-Rated. Trust ${scores.trust}/100. Usable in a diversified book but ${scores.risk < 55 ? `risk control is soft (${dd}% drawdown)` : "results are uneven across regimes"}. Recommended allocation: ${allocationPct}%.`;
  }
  if (rating === "D") {
    return `D-Rated. Trust ${scores.trust}/100. Speculative — only a token allocation is justified until the track record matures. Recommended allocation: ${allocationPct}%.`;
  }
  return `F-Rated. Trust ${scores.trust}/100. Risk and/or survivability are below threshold; no capital allocation recommended at this time.`;
}
