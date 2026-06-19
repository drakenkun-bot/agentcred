import type { MarketRegime, StrategyType, TradeSide } from "@/lib/types";

// ───────────────────────────────────────────────────────────────────────────
//  Bitget ingestion contract
//
//  This is the boundary between AgentCred and Bitget. The MVP fulfils it with a
//  deterministic simulator (./simulator), but a real implementation (REST/WS
//  client hitting Bitget's copy-trading / agent endpoints) would return the exact
//  same shapes. The scoring pipeline only ever sees `RawAgentActivity`.
// ───────────────────────────────────────────────────────────────────────────

/** A single closed position as reported by Bitget. */
export interface RawBitgetTrade {
  timestamp: string; // ISO 8601, time the position was opened
  symbol: string; // e.g. "BTCUSDT"
  side: TradeSide; // long | short
  entryPrice: number;
  exitPrice: number;
  pnl: number; // realized P&L in USDT
  size: number; // position notional in USDT
  /**
   * Market regime active when the trade opened. In production this is assigned
   * by the Market Regime Engine from the price series; the simulator tags it
   * directly so the engine has ground truth to aggregate against.
   */
  regime: MarketRegime;
}

/** All activity for one agent, as ingested from Bitget. */
export interface RawAgentActivity {
  externalId: string; // Bitget agent / trader id
  name: string;
  strategyType: StrategyType;
  symbol: string; // primary instrument
  creationDate: string; // ISO 8601, when the agent went live
  trades: RawBitgetTrade[];
}

export interface IngestOptions {
  /** Deterministic seed so the simulated dataset is reproducible. */
  seed?: number;
  /** Number of agents to materialize (simulator only). */
  agentCount?: number;
  /** ISO timestamp treated as "now" — the end of the observation window. */
  asOf?: string;
}

/**
 * The ingestion interface every Bitget data source implements. Swap the
 * simulator for a live client without touching the scoring pipeline.
 */
export interface BitgetActivitySource {
  fetchAgentActivity(opts?: IngestOptions): Promise<RawAgentActivity[]>;
}
