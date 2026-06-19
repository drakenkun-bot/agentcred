import type { PerformanceMetrics, Trade } from "./types";

// Convention: every agent is evaluated as if managing a fixed notional book.
// All P&L in the simulator is scaled to this size so returns/drawdown are comparable.
export const START_EQUITY = 100_000;

const MS_PER_HOUR = 1000 * 60 * 60;
const TRADING_DAYS = 365; // crypto trades 24/7

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Group realized P&L into per-calendar-day buckets, returns daily-return fractions. */
function dailyReturns(trades: Trade[]): number[] {
  const byDay = new Map<string, number>();
  for (const t of trades) {
    const day = t.timestamp.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + t.pnl);
  }
  return [...byDay.values()].map((pnl) => pnl / START_EQUITY);
}

/** Equity curve (cumulative) starting from START_EQUITY, in chronological order. */
export function equityCurve(trades: Trade[]): { t: string; equity: number }[] {
  const sorted = [...trades].sort(
    (a, b) => +new Date(a.timestamp) - +new Date(b.timestamp),
  );
  let eq = START_EQUITY;
  const out: { t: string; equity: number }[] = [
    { t: sorted[0]?.timestamp ?? new Date().toISOString(), equity: eq },
  ];
  for (const t of sorted) {
    eq += t.pnl;
    out.push({ t: t.timestamp, equity: eq });
  }
  return out;
}

function maxDrawdownPct(trades: Trade[]): number {
  const curve = equityCurve(trades);
  let peak = -Infinity;
  let maxDd = 0;
  for (const { equity } of curve) {
    peak = Math.max(peak, equity);
    if (peak > 0) {
      const dd = (equity - peak) / peak;
      maxDd = Math.min(maxDd, dd);
    }
  }
  return maxDd * 100; // negative
}

function avgTradeDurationHours(trades: Trade[]): number {
  if (trades.length < 2) return 0;
  const sorted = [...trades].sort(
    (a, b) => +new Date(a.timestamp) - +new Date(b.timestamp),
  );
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const dh =
      (+new Date(sorted[i].timestamp) - +new Date(sorted[i - 1].timestamp)) /
      MS_PER_HOUR;
    if (dh > 0) gaps.push(dh);
  }
  // Median gap between trades is a robust proxy for typical holding time.
  return Math.round(median(gaps) * 10) / 10;
}

/** Compute the full PerformanceMetrics block from a set of trades. */
export function computeMetrics(trades: Trade[]): PerformanceMetrics {
  const totalTrades = trades.length;
  if (totalTrades === 0) {
    return {
      totalReturnPct: 0,
      sharpeRatio: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdownPct: 0,
      avgTradeDurationHours: 0,
      totalTrades: 0,
      volatilityPct: 0,
      avgPositionSizeUsd: 0,
    };
  }

  const netPnl = trades.reduce((a, t) => a + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossProfit = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));

  const dr = dailyReturns(trades);
  const drMean = mean(dr);
  const drStd = stdev(dr);
  const rawSharpe = drStd === 0 ? 0 : (drMean / drStd) * Math.sqrt(TRADING_DAYS);
  // Winsorize to a credible band — annualized daily Sharpe on a very smooth
  // (e.g. market-neutral) P&L series explodes well past anything seen in
  // practice. Institutional dashboards cap display metrics the same way.
  const sharpe = Math.max(-3, Math.min(rawSharpe, 4.5));
  const volatility = drStd * Math.sqrt(TRADING_DAYS) * 100;

  return {
    totalReturnPct: (netPnl / START_EQUITY) * 100,
    sharpeRatio: Math.round(sharpe * 100) / 100,
    winRate: wins.length / totalTrades,
    profitFactor:
      grossLoss === 0
        ? grossProfit > 0
          ? 99
          : 0
        : Math.round((grossProfit / grossLoss) * 100) / 100,
    maxDrawdownPct: Math.round(maxDrawdownPct(trades) * 100) / 100,
    avgTradeDurationHours: avgTradeDurationHours(trades),
    totalTrades,
    volatilityPct: Math.round(volatility * 100) / 100,
    avgPositionSizeUsd: Math.round(
      trades.reduce((a, t) => a + t.size, 0) / totalTrades,
    ),
  };
}
