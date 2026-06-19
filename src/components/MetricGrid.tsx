import type { PerformanceMetrics } from "@/lib/types";
import { num, pctFmt, usd } from "@/lib/format";

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "pos" | "neg";
}) {
  const color =
    tone === "pos" ? "text-glow" : tone === "neg" ? "text-rate-f" : "text-slate-100";
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] px-3.5 py-3">
      <div className="stat-label mb-1">{label}</div>
      <div className={`mono text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export function MetricGrid({ m }: { m: PerformanceMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      <Metric label="Total Return" value={pctFmt(m.totalReturnPct)} tone={m.totalReturnPct >= 0 ? "pos" : "neg"} />
      <Metric label="Sharpe Ratio" value={m.sharpeRatio.toFixed(2)} tone={m.sharpeRatio >= 1 ? "pos" : "neutral"} />
      <Metric label="Win Rate" value={`${(m.winRate * 100).toFixed(1)}%`} />
      <Metric label="Profit Factor" value={m.profitFactor.toFixed(2)} tone={m.profitFactor >= 1.2 ? "pos" : "neutral"} />
      <Metric label="Max Drawdown" value={`${m.maxDrawdownPct.toFixed(1)}%`} tone="neg" />
      <Metric label="Volatility" value={`${m.volatilityPct.toFixed(1)}%`} />
      <Metric label="Total Trades" value={num(m.totalTrades)} />
      <Metric label="Avg Position" value={usd(m.avgPositionSizeUsd)} />
      <Metric label="Avg Hold" value={`${m.avgTradeDurationHours.toFixed(1)}h`} />
    </div>
  );
}
