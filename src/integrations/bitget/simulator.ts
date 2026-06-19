import { MARKET_REGIMES, type MarketRegime, type StrategyType } from "@/lib/types";
import type {
  BitgetActivitySource,
  IngestOptions,
  RawAgentActivity,
  RawBitgetTrade,
} from "./types";

// ───────────────────────────────────────────────────────────────────────────
//  Bitget Agent-Activity Simulator
//
//  Produces a realistic, fully deterministic dataset of AI trading agents and
//  their closed trades, tagged by market regime. Implements BitgetActivitySource
//  so it is a drop-in stand-in for a live Bitget client during the MVP.
// ───────────────────────────────────────────────────────────────────────────

// Deterministic PRNG (mulberry32) so a given seed always yields the same world.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function gaussian(rng: Rng, mean = 0, sd = 1): number {
  // Box–Muller
  const u = 1 - rng();
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const pick = <T,>(rng: Rng, xs: T[]): T => xs[Math.floor(rng() * xs.length)];
const DAY_MS = 86_400_000;

const SYMBOLS: Record<string, number> = {
  BTCUSDT: 64000,
  ETHUSDT: 3200,
  SOLUSDT: 165,
  BNBUSDT: 580,
  XRPUSDT: 0.58,
  ARBUSDT: 1.1,
};

// Per-regime win-rate & payoff edge for each archetype. winRate is the base
// probability a trade is profitable; payoff is avg win / avg loss ratio.
interface RegimeEdge {
  winRate: number;
  payoff: number;
}
interface Archetype {
  strategy: StrategyType;
  names: string[];
  symbols: string[];
  tradesPerWeek: number;
  baseNotional: number;
  sizeDisciplineCV: number; // lower = more consistent sizing
  riskTier: "tight" | "moderate" | "loose"; // drawdown tendency
  edge: Record<MarketRegime, RegimeEdge>;
}

const E = (winRate: number, payoff: number): RegimeEdge => ({ winRate, payoff });

const ARCHETYPES: Archetype[] = [
  {
    strategy: "Momentum",
    names: ["TrendHunter", "MomentumX", "ApexMomentum"],
    symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
    tradesPerWeek: 9,
    baseNotional: 16000,
    sizeDisciplineCV: 0.18,
    riskTier: "moderate",
    edge: {
      Trending: E(0.62, 1.9),
      "High Volatility": E(0.55, 1.7),
      "Range-bound": E(0.41, 1.0),
      "Low Volatility": E(0.46, 1.1),
    },
  },
  {
    strategy: "Trend Following",
    names: ["AlphaTrend", "MacroMind", "DriftRider"],
    symbols: ["BTCUSDT", "ETHUSDT"],
    tradesPerWeek: 5,
    baseNotional: 22000,
    sizeDisciplineCV: 0.12,
    riskTier: "tight",
    edge: {
      Trending: E(0.58, 2.4),
      "High Volatility": E(0.5, 1.8),
      "Range-bound": E(0.4, 0.95),
      "Low Volatility": E(0.48, 1.2),
    },
  },
  {
    strategy: "Mean Reversion",
    names: ["MeanReverter", "RangeRider", "FadeMaster"],
    symbols: ["ETHUSDT", "SOLUSDT", "BNBUSDT"],
    tradesPerWeek: 14,
    baseNotional: 12000,
    sizeDisciplineCV: 0.2,
    riskTier: "moderate",
    edge: {
      "Range-bound": E(0.63, 1.4),
      "Low Volatility": E(0.6, 1.5),
      Trending: E(0.43, 0.9),
      "High Volatility": E(0.4, 0.85),
    },
  },
  {
    strategy: "Breakout",
    names: ["BreakoutBot", "SolanaSniper", "RangeBuster"],
    symbols: ["SOLUSDT", "ARBUSDT", "XRPUSDT"],
    tradesPerWeek: 8,
    baseNotional: 14000,
    sizeDisciplineCV: 0.28,
    riskTier: "loose",
    edge: {
      "High Volatility": E(0.57, 2.2),
      Trending: E(0.54, 1.9),
      "Range-bound": E(0.38, 0.8),
      "Low Volatility": E(0.42, 0.9),
    },
  },
  {
    strategy: "Market Making",
    names: ["GridForge", "DeltaNeutral", "SpreadSmith"],
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    tradesPerWeek: 28,
    baseNotional: 9000,
    sizeDisciplineCV: 0.08,
    riskTier: "tight",
    edge: {
      "Low Volatility": E(0.66, 1.2),
      "Range-bound": E(0.64, 1.25),
      Trending: E(0.5, 1.0),
      "High Volatility": E(0.44, 0.85),
    },
  },
  {
    strategy: "Scalping",
    names: ["NightScalper", "QuantPulse", "TickHarvester"],
    symbols: ["BTCUSDT", "SOLUSDT", "ARBUSDT"],
    tradesPerWeek: 40,
    baseNotional: 7000,
    sizeDisciplineCV: 0.16,
    riskTier: "moderate",
    edge: {
      "High Volatility": E(0.56, 1.4),
      Trending: E(0.55, 1.35),
      "Low Volatility": E(0.52, 1.1),
      "Range-bound": E(0.5, 1.05),
    },
  },
  {
    strategy: "Swing",
    names: ["SwingSage", "VolHarvester", "TideTrader"],
    symbols: ["ETHUSDT", "BTCUSDT", "XRPUSDT"],
    tradesPerWeek: 4,
    baseNotional: 19000,
    sizeDisciplineCV: 0.15,
    riskTier: "moderate",
    edge: {
      Trending: E(0.57, 2.0),
      "Range-bound": E(0.49, 1.2),
      "High Volatility": E(0.52, 1.6),
      "Low Volatility": E(0.5, 1.3),
    },
  },
  {
    strategy: "Arbitrage",
    names: ["Arbiter", "BasisTrader", "FundingFox"],
    symbols: ["BTCUSDT", "ETHUSDT"],
    tradesPerWeek: 22,
    baseNotional: 25000,
    sizeDisciplineCV: 0.06,
    riskTier: "tight",
    edge: {
      "Low Volatility": E(0.72, 1.1),
      "Range-bound": E(0.69, 1.15),
      Trending: E(0.6, 1.05),
      "High Volatility": E(0.55, 1.0),
    },
  },
];

const RISK_SD: Record<Archetype["riskTier"], number> = {
  tight: 0.45,
  moderate: 0.7,
  loose: 1.05,
};

/** Build a day-by-day market regime timeline as multi-day blocks. */
function buildRegimeTimeline(rng: Rng, days: number): MarketRegime[] {
  const timeline: MarketRegime[] = [];
  while (timeline.length < days) {
    const regime = pick(rng, MARKET_REGIMES);
    const blockLen = 4 + Math.floor(rng() * 18); // 4..21 day regimes
    for (let i = 0; i < blockLen && timeline.length < days; i++) {
      timeline.push(regime);
    }
  }
  return timeline;
}

function makeTrade(
  rng: Rng,
  arch: Archetype,
  symbol: string,
  timestamp: string,
  regime: MarketRegime,
): RawBitgetTrade {
  const edge = arch.edge[regime];
  const win = rng() < edge.winRate;

  // Notional with sizing discipline noise.
  const notional = Math.max(
    1500,
    arch.baseNotional * (1 + gaussian(rng, 0, arch.sizeDisciplineCV)),
  );

  // Move as a fraction of notional; loss magnitude is the base "R", win scales by payoff.
  const baseR = Math.abs(gaussian(rng, 0.011, 0.006 * RISK_SD[arch.riskTier])) + 0.002;
  const moveFrac = win ? baseR * edge.payoff : -baseR;
  const pnl = notional * moveFrac;

  const side = rng() < 0.62 ? "long" : "short";
  const entry = SYMBOLS[symbol] * (1 + gaussian(rng, 0, 0.03));
  const exit =
    side === "long" ? entry * (1 + pnl / notional) : entry * (1 - pnl / notional);

  const round = (x: number) => {
    const p = entry < 5 ? 4 : 2;
    return Math.round(x * 10 ** p) / 10 ** p;
  };

  return {
    timestamp,
    symbol,
    side,
    entryPrice: round(entry),
    exitPrice: round(exit),
    pnl: Math.round(pnl * 100) / 100,
    size: Math.round(notional),
    regime,
  };
}

export class BitgetSimulator implements BitgetActivitySource {
  async fetchAgentActivity(opts: IngestOptions = {}): Promise<RawAgentActivity[]> {
    const seed = opts.seed ?? 1337;
    const agentCount = opts.agentCount ?? 16;
    const asOf = opts.asOf ? new Date(opts.asOf) : new Date("2026-06-15T00:00:00Z");
    const rng = mulberry32(seed);

    // 300-day observation window with a shared market regime timeline.
    const windowDays = 300;
    const timeline = buildRegimeTimeline(rng, windowDays);
    const windowStart = new Date(asOf.getTime() - windowDays * DAY_MS);

    const regimeOn = (date: Date): MarketRegime => {
      const idx = Math.min(
        timeline.length - 1,
        Math.max(0, Math.floor((date.getTime() - windowStart.getTime()) / DAY_MS)),
      );
      return timeline[idx];
    };

    const usedNames = new Set<string>();
    const agents: RawAgentActivity[] = [];

    for (let i = 0; i < agentCount; i++) {
      const arch = ARCHETYPES[i % ARCHETYPES.length];

      // Unique name per agent.
      let name = pick(rng, arch.names);
      let guard = 0;
      while (usedNames.has(name) && guard++ < 20) {
        name = `${pick(rng, arch.names)}-${Math.floor(rng() * 90 + 10)}`;
      }
      usedNames.add(name);

      const symbol = pick(rng, arch.symbols);

      // Agent age: 30..285 days of operation (affects survival score).
      const ageDays = 30 + Math.floor(rng() * 255);
      const creation = new Date(asOf.getTime() - ageDays * DAY_MS);

      // Generate trades from creation -> asOf at the archetype's cadence,
      // with some week-to-week variance to create realistic consistency spread.
      const weeks = ageDays / 7;
      const trades: RawBitgetTrade[] = [];
      let cursor = creation.getTime();
      const end = asOf.getTime();
      const freqJitter = 0.6 + rng() * 0.8; // per-agent activity multiplier
      const avgGapMs = (7 * DAY_MS) / (arch.tradesPerWeek * freqJitter);

      while (cursor < end) {
        const gap = avgGapMs * (0.4 + rng() * 1.4);
        cursor += gap;
        if (cursor >= end) break;
        const ts = new Date(cursor);
        trades.push(makeTrade(rng, arch, symbol, ts.toISOString(), regimeOn(ts)));
      }

      // Guarantee a usable minimum sample.
      void weeks;
      if (trades.length < 20) continue;

      agents.push({
        externalId: `bitget_${(seed * 31 + i).toString(36)}`,
        name,
        strategyType: arch.strategy,
        symbol,
        creationDate: creation.toISOString(),
        trades,
      });
    }

    return agents;
  }
}

export const bitgetSimulator = new BitgetSimulator();
