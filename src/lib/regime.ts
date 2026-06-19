import { MARKET_REGIMES, type MarketRegime, type RegimePerformance, type Trade } from "./types";
import { START_EQUITY } from "./metrics";

// Market Regime Engine.
//
// In the simulator each trade is tagged with the regime that was active when it
// was opened. Here we aggregate per-agent performance within each regime and
// normalize it into a 0..100 "regime score" so agents can be compared on how
// well they adapt across market conditions.

function regimeScoreFromStats(
  winRate: number,
  returnPct: number,
  trades: number,
): number {
  if (trades === 0) return 0;
  // Blend win-rate and return into a bounded score.
  // returnPct here is per-regime return on book; clamp to a sane band.
  const retComponent = clamp((returnPct + 8) / 24, 0, 1); // -8%..+16% -> 0..1
  const winComponent = clamp(winRate, 0, 1);
  const raw = 0.55 * retComponent + 0.45 * winComponent;
  // Light penalty when sample is tiny (low confidence).
  const confidence = clamp(trades / 25, 0.5, 1);
  return Math.round(raw * 100 * confidence);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function computeRegimePerformance(trades: Trade[]): RegimePerformance[] {
  return MARKET_REGIMES.map((regime) => {
    const subset = trades.filter((t) => t.regime === regime);
    const netPnl = subset.reduce((a, t) => a + t.pnl, 0);
    const wins = subset.filter((t) => t.pnl > 0).length;
    const winRate = subset.length ? wins / subset.length : 0;
    const returnPct = (netPnl / START_EQUITY) * 100;
    return {
      regime,
      trades: subset.length,
      winRate,
      netPnl: Math.round(netPnl),
      returnPct: Math.round(returnPct * 100) / 100,
      score: regimeScoreFromStats(winRate, returnPct, subset.length),
    };
  });
}

export function bestRegime(rp: RegimePerformance[]): MarketRegime {
  const ranked = [...rp].filter((r) => r.trades > 0).sort((a, b) => b.score - a.score);
  return ranked[0]?.regime ?? "Trending";
}

export function worstRegime(rp: RegimePerformance[]): MarketRegime {
  const ranked = [...rp].filter((r) => r.trades > 0).sort((a, b) => a.score - b.score);
  return ranked[0]?.regime ?? "Range-bound";
}

/** Human sentence used in the regime engine display + AI prompt grounding. */
export function regimeNarrative(rp: RegimePerformance[]): string[] {
  const active = rp.filter((r) => r.trades > 0);
  if (active.length === 0) return ["Insufficient regime data."];
  const best = bestRegime(rp);
  const worst = worstRegime(rp);
  const lines = [`Agent performs best during ${best} markets.`];
  if (worst !== best) lines.push(`Agent performs poorly during ${worst} conditions.`);
  return lines;
}
