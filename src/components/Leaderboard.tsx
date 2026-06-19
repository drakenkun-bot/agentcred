"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AgentSummary } from "@/lib/types";
import { pctFmt, scoreColor } from "@/lib/format";
import { RatingBadge } from "./ui";
import { AgentGlyph } from "./AgentGlyph";
import { useWallet } from "./WalletProvider";

type SortKey =
  | "trust"
  | "performance"
  | "risk"
  | "consistency"
  | "adaptability"
  | "survival"
  | "sharpe"
  | "drawdown"
  | "return";

// Sketch-style columns for the compact dashboard table.
const MARKET_COLS: { key: SortKey; label: string }[] = [
  { key: "trust", label: "Trust" },
  { key: "sharpe", label: "Sharpe" },
  { key: "return", label: "Return" },
  { key: "drawdown", label: "Max DD" },
];

// Spec columns for the full leaderboard: the five reputation sub-scores.
const SCORE_COLS: { key: SortKey; label: string }[] = [
  { key: "trust", label: "Trust" },
  { key: "performance", label: "Perf" },
  { key: "risk", label: "Risk" },
  { key: "consistency", label: "Consist" },
  { key: "adaptability", label: "Adapt" },
  { key: "survival", label: "Surv" },
];

function valueOf(a: AgentSummary, key: SortKey): number {
  switch (key) {
    case "trust":
      return a.scores.trust;
    case "performance":
      return a.scores.performance;
    case "risk":
      return a.scores.risk;
    case "consistency":
      return a.scores.consistency;
    case "adaptability":
      return a.scores.adaptability;
    case "survival":
      return a.scores.survival;
    case "sharpe":
      return a.metrics.sharpeRatio;
    case "return":
      return a.metrics.totalReturnPct;
    case "drawdown":
      return a.metrics.maxDrawdownPct; // negative; closer to 0 is better
  }
}

function ScoreCell({ value }: { value: number }) {
  return (
    <td className="px-3 py-3 text-right">
      <span className="mono font-semibold" style={{ color: scoreColor(value) }}>
        {Math.round(value)}
      </span>
    </td>
  );
}

export function Leaderboard({
  agents,
  compact = false,
}: {
  agents: AgentSummary[];
  compact?: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("trust");
  const cols = compact ? MARKET_COLS : SCORE_COLS;
  const { address } = useWallet();

  const rows = useMemo(() => {
    const sorted = [...agents].sort((a, b) => valueOf(b, sort) - valueOf(a, sort));
    return compact ? sorted.slice(0, 7) : sorted;
  }, [agents, sort, compact]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-left">
            <th className="px-3 py-3 stat-label">#</th>
            <th className="px-3 py-3 stat-label">Agent</th>
            {!compact && <th className="px-3 py-3 stat-label">Strategy</th>}
            {cols.map((c) => (
              <th key={c.key} className="px-3 py-3 text-right">
                <button
                  type="button"
                  onClick={() => setSort(c.key)}
                  className={`stat-label inline-flex items-center gap-1 transition-colors hover:text-glow ${
                    sort === c.key ? "text-glow" : ""
                  }`}
                >
                  {c.label}
                  <span className="text-[8px]">{sort === c.key ? "▼" : ""}</span>
                </button>
              </th>
            ))}
            <th className="px-3 py-3 text-right stat-label">Rating</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr
              key={a.id}
              className="group border-b border-white/[0.04] transition-colors hover:bg-white/[0.025]"
            >
              <td className="px-3 py-3 mono text-slate-500">{i + 1}</td>
              <td className="px-3 py-3">
                <Link href={`/agents/${a.id}`} className="flex items-center gap-3">
                  <AgentGlyph seed={a.name} trust={a.scores.trust} size={28} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate font-medium text-slate-100 group-hover:text-glow">
                      {address && a.ownerAddress === address && (
                        <span className="text-glow" title="Linked to your account">★</span>
                      )}
                      {a.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">{a.symbol}</div>
                  </div>
                </Link>
              </td>
              {!compact && (
                <td className="px-3 py-3">
                  <span className="text-xs text-slate-400">{a.strategyType}</span>
                </td>
              )}

              {compact ? (
                <>
                  <ScoreCell value={a.scores.trust} />
                  <td className="px-3 py-3 text-right mono text-slate-200">
                    {a.metrics.sharpeRatio.toFixed(2)}
                  </td>
                  <td
                    className={`px-3 py-3 text-right mono ${
                      a.metrics.totalReturnPct >= 0 ? "text-glow" : "text-rate-f"
                    }`}
                  >
                    {pctFmt(a.metrics.totalReturnPct)}
                  </td>
                  <td className="px-3 py-3 text-right mono text-rate-d">
                    {a.metrics.maxDrawdownPct.toFixed(1)}%
                  </td>
                </>
              ) : (
                <>
                  <ScoreCell value={a.scores.trust} />
                  <ScoreCell value={a.scores.performance} />
                  <ScoreCell value={a.scores.risk} />
                  <ScoreCell value={a.scores.consistency} />
                  <ScoreCell value={a.scores.adaptability} />
                  <ScoreCell value={a.scores.survival} />
                </>
              )}

              <td className="px-3 py-3 text-right">
                <RatingBadge rating={a.allocation.rating} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
