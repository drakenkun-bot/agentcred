import type { RawAgentActivity } from "@/integrations/bitget";
import { computeMetrics } from "./metrics";
import { computeRegimePerformance } from "./regime";
import {
  classify,
  computeScores,
  recommendAllocation,
} from "./scoring";
import type {
  AllocationRecommendation,
  PerformanceMetrics,
  RegimePerformance,
  ScoreBreakdown,
  StrategyType,
  Trade,
} from "./types";

const DAY_MS = 86_400_000;

export interface ScoredAgent {
  name: string;
  strategyType: StrategyType;
  symbol: string;
  creationDate: string;
  ageDays: number;
  trades: Trade[];
  metrics: PerformanceMetrics;
  regimePerformance: RegimePerformance[];
  scores: ScoreBreakdown;
  classification: string;
  allocation: AllocationRecommendation;
}

/**
 * Pure transform: raw Bitget activity → fully scored agent. Used by the seed
 * script and any code path that needs to (re)derive scores from trades.
 */
export function scoreAgent(activity: RawAgentActivity, asOf: Date): ScoredAgent {
  const trades: Trade[] = activity.trades.map((t, i) => ({
    id: `${activity.externalId}_${i}`,
    timestamp: t.timestamp,
    symbol: t.symbol,
    side: t.side,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    pnl: t.pnl,
    size: t.size,
    regime: t.regime,
  }));

  const ageDays = Math.max(
    1,
    Math.round((asOf.getTime() - new Date(activity.creationDate).getTime()) / DAY_MS),
  );

  const metrics = computeMetrics(trades);
  const regimePerformance = computeRegimePerformance(trades);
  const scores = computeScores(trades, metrics, regimePerformance, ageDays);
  const classification = classify(activity.strategyType, scores);
  const allocation = recommendAllocation(scores, metrics);

  return {
    name: activity.name,
    strategyType: activity.strategyType,
    symbol: activity.symbol,
    creationDate: activity.creationDate,
    ageDays,
    trades,
    metrics,
    regimePerformance,
    scores,
    classification,
    allocation,
  };
}
