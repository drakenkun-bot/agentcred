import type { RegimePerformance } from "@/lib/types";
import { scoreColor } from "@/lib/format";

const REGIME_ICON: Record<string, string> = {
  Trending: "↗",
  "Range-bound": "↔",
  "High Volatility": "⚡",
  "Low Volatility": "≈",
};

export function RegimePerformanceBars({ regimes }: { regimes: RegimePerformance[] }) {
  return (
    <div className="space-y-4">
      {regimes.map((r) => {
        const color = r.trades > 0 ? scoreColor(r.score) : "#3a4658";
        return (
          <div key={r.regime}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="text-glow/80">{REGIME_ICON[r.regime]}</span>
                {r.regime}
              </span>
              <span className="mono text-xs text-slate-500">
                {r.trades > 0 ? (
                  <>
                    {r.trades} trades · {(r.winRate * 100).toFixed(0)}% win ·{" "}
                    <span style={{ color }}>{r.score}/100</span>
                  </>
                ) : (
                  "no activity"
                )}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${r.trades > 0 ? r.score : 2}%`,
                  background: color,
                  boxShadow: r.trades > 0 ? `0 0 12px -2px ${color}` : "none",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
