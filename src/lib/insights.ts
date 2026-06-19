import { bestRegime, worstRegime } from "./regime";
import type {
  AgentSummary,
  PerformanceMetrics,
  RegimePerformance,
  ScoreBreakdown,
  StrategyType,
} from "./types";

// Heuristic, deterministic insights derived directly from the scores & regime
// breakdown. These are structural facts about an agent (not prose), used to:
//   1. ground the OpenRouter prompt so the AI stays factual, and
//   2. populate the Strengths / Weaknesses / Behavior-Type UI even if the AI
//      report has not been generated yet.

export function deriveBehaviorType(
  strategy: StrategyType,
  scores: ScoreBreakdown,
  regime: RegimePerformance[],
): string {
  const best = bestRegime(regime);
  if (scores.adaptability >= 72 && scores.risk >= 65) return "All-Weather Generalist";
  if (strategy === "Momentum" || strategy === "Trend Following") {
    return best === "Trending" ? "Momentum Specialist" : "Directional Trader";
  }
  if (strategy === "Mean Reversion" || strategy === "Market Making") return "Range Specialist";
  if (strategy === "Breakout") return "Volatility Breakout Trader";
  if (strategy === "Scalping") return "High-Frequency Scalper";
  if (strategy === "Arbitrage") return "Market-Neutral Operator";
  if (best === "High Volatility") return "Volatility Harvester";
  return "Adaptive Trader";
}

export function deriveStrengths(
  scores: ScoreBreakdown,
  metrics: PerformanceMetrics,
  regime: RegimePerformance[],
): string[] {
  const out: string[] = [];
  const best = bestRegime(regime);
  if (scores.risk >= 70) out.push("Excellent drawdown control");
  if (Math.abs(metrics.maxDrawdownPct) <= 15) out.push(`Contained ${Math.abs(metrics.maxDrawdownPct).toFixed(1)}% max drawdown`);
  if (scores.consistency >= 68) out.push("Consistent trade sizing and stable weekly returns");
  if (scores.performance >= 68) out.push("Strong risk-adjusted returns");
  if (metrics.sharpeRatio >= 1.3) out.push(`High Sharpe ratio (${metrics.sharpeRatio.toFixed(2)})`);
  out.push(`Strong performance in ${best} markets`);
  if (scores.survival >= 70) out.push("Proven longevity and trade volume");
  if (scores.adaptability >= 72) out.push("Performs across multiple market regimes");
  // De-dup and cap.
  return [...new Set(out)].slice(0, 4);
}

export function deriveWeaknesses(
  scores: ScoreBreakdown,
  metrics: PerformanceMetrics,
  regime: RegimePerformance[],
): string[] {
  const out: string[] = [];
  const worst = worstRegime(regime);
  out.push(`Struggles in ${worst} conditions`);
  if (scores.risk < 55) out.push(`Elevated drawdowns (${Math.abs(metrics.maxDrawdownPct).toFixed(1)}%)`);
  if (scores.consistency < 55) out.push("Inconsistent week-to-week results");
  if (scores.adaptability < 55) out.push("Performance varies sharply by regime");
  if (metrics.profitFactor < 1.1) out.push("Thin profit factor leaves little margin");
  const lowVol = regime.find((r) => r.regime === "Low Volatility");
  if (lowVol && lowVol.trades > 5 && lowVol.score < 45)
    out.push("Lower performance during low-volatility consolidation");
  if (scores.survival < 50) out.push("Limited track record — short operating history");
  return [...new Set(out)].slice(0, 4);
}

/** Compact factual block fed to the LLM so reports stay grounded in the data. */
export function groundingFacts(agent: AgentSummary, regime: RegimePerformance[]): string {
  const m = agent.metrics;
  const s = agent.scores;
  const regimeLines = regime
    .filter((r) => r.trades > 0)
    .map((r) => `  - ${r.regime}: ${r.trades} trades, win ${(r.winRate * 100).toFixed(0)}%, regime-score ${r.score}/100`)
    .join("\n");
  return [
    `Agent: ${agent.name}`,
    `Strategy: ${agent.strategyType}`,
    `Primary symbol: ${agent.symbol}`,
    `Age: ${agent.ageDays} days`,
    `Trust score: ${s.trust}/100 (Performance ${s.performance}, Risk ${s.risk}, Consistency ${s.consistency}, Adaptability ${s.adaptability}, Survival ${s.survival})`,
    `Total return: ${m.totalReturnPct.toFixed(1)}% | Sharpe: ${m.sharpeRatio} | Win rate: ${(m.winRate * 100).toFixed(0)}% | Profit factor: ${m.profitFactor} | Max drawdown: ${m.maxDrawdownPct}% | Trades: ${m.totalTrades}`,
    `Capital rating: ${agent.allocation.rating} (recommended ${agent.allocation.allocationPct}% allocation)`,
    `Per-regime performance:`,
    regimeLines,
  ].join("\n");
}
