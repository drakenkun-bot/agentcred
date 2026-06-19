// Shared domain types for AgentCred.
// These mirror the Prisma models but are the canonical shapes the UI/API speak in,
// with computed fields (scores, metrics, regime breakdown) expanded as objects.

export type MarketRegime =
  | "Trending"
  | "Range-bound"
  | "High Volatility"
  | "Low Volatility";

export const MARKET_REGIMES: MarketRegime[] = [
  "Trending",
  "Range-bound",
  "High Volatility",
  "Low Volatility",
];

export type StrategyType =
  | "Momentum"
  | "Trend Following"
  | "Mean Reversion"
  | "Breakout"
  | "Market Making"
  | "Arbitrage"
  | "Scalping"
  | "Swing";

export type TradeSide = "long" | "short";

export interface Trade {
  id: string;
  timestamp: string; // ISO
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  exitPrice: number;
  pnl: number; // realized P&L in quote currency (USDT)
  size: number; // notional size in USDT
  regime: MarketRegime;
}

export interface PerformanceMetrics {
  totalReturnPct: number; // % return on deployed capital
  sharpeRatio: number;
  winRate: number; // 0..1
  profitFactor: number;
  maxDrawdownPct: number; // negative number, e.g. -18.5
  avgTradeDurationHours: number;
  totalTrades: number;
  volatilityPct: number; // stdev of daily returns, annualized %
  avgPositionSizeUsd: number;
}

export interface ScoreBreakdown {
  trust: number; // 0..100 overall
  performance: number;
  risk: number;
  consistency: number;
  adaptability: number;
  survival: number;
}

export type AllocationRating = "A" | "B" | "C" | "D" | "F";

export interface RegimePerformance {
  regime: MarketRegime;
  trades: number;
  winRate: number; // 0..1
  netPnl: number;
  returnPct: number;
  score: number; // 0..100 normalized regime performance
}

export interface AllocationRecommendation {
  rating: AllocationRating;
  allocationPct: number; // recommended % of book
  reasoning: string;
}

export interface BehavioralReport {
  summary: string; // prose
  strengths: string[];
  weaknesses: string[];
  behaviorType: string; // e.g. "Momentum Specialist"
  bestRegime: MarketRegime;
  worstRegime: MarketRegime;
  generatedBy: "openrouter" | "heuristic";
  model?: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  strategyType: StrategyType;
  creationDate: string; // ISO
  ageDays: number;
  classification: string;
  scores: ScoreBreakdown;
  metrics: PerformanceMetrics;
  allocation: AllocationRecommendation;
  symbol: string; // primary traded symbol
  rank?: number;
  ownerAddress: string | null; // lowercase wallet that claimed this agent, or null
}

export interface AgentDetail extends AgentSummary {
  trades: Trade[];
  regimePerformance: RegimePerformance[];
  report: BehavioralReport;
}

export interface OverviewStats {
  totalAgents: number;
  averageTrustScore: number;
  totalTrades: number;
  totalTrackedCapital: number;
  topAgent: AgentSummary | null;
  mostConsistentAgent: AgentSummary | null;
  highestRiskAgent: AgentSummary | null;
}
