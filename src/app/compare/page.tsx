"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AgentDetail, AgentSummary } from "@/lib/types";
import { ScoreRadar } from "@/components/charts/ScoreRadar";
import { AgentGlyph } from "@/components/AgentGlyph";
import { Panel, SectionTitle, RatingBadge } from "@/components/ui";
import { pctFmt } from "@/lib/format";

const A_COLOR = "#22e3c4";
const B_COLOR = "#9b6bff";

export default function ComparePage() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [result, setResult] = useState<{
    a: AgentDetail;
    b: AgentDetail;
    verdict: string;
    generatedBy: string;
    model?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d: { agents: AgentSummary[] }) => {
        setAgents(d.agents);
        if (d.agents[0]) setAId(d.agents[0].id);
        if (d.agents[1]) setBId(d.agents[1].id);
      })
      .catch(() => setError("Failed to load agents."));
  }, []);

  useEffect(() => {
    if (!aId || !bId || aId === bId) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    fetch(`/api/compare?a=${aId}&b=${bId}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setResult(d);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError("Comparison failed.");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [aId, bId]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 max-w-2xl">
        <div className="stat-label mb-2 text-glow/70">Head-to-Head</div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Compare Agents</h1>
        <p className="mt-3 text-slate-400">
          Put two agents side by side. The allocation committee weighs risk-adjusted
          performance and reliability — not just raw profit — to call the better bet.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <AgentSelect label="Agent A" color={A_COLOR} agents={agents} value={aId} onChange={setAId} exclude={bId} />
        <AgentSelect label="Agent B" color={B_COLOR} agents={agents} value={bId} onChange={setBId} exclude={aId} />
      </div>

      {error && (
        <Panel className="p-4 text-sm text-rate-c">{error}</Panel>
      )}

      {aId && bId && aId === bId && (
        <Panel className="p-4 text-sm text-slate-400">Pick two different agents to compare.</Panel>
      )}

      {result && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel className="p-6">
              <SectionTitle kicker="Risk-Return" title="Overlaid Profiles" />
              <ScoreRadar
                height={320}
                series={[
                  { name: result.a.name, color: A_COLOR, scores: result.a.scores },
                  { name: result.b.name, color: B_COLOR, scores: result.b.scores },
                ]}
              />
              <div className="mt-3 flex justify-center gap-6 text-sm">
                <LegendDot color={A_COLOR} label={result.a.name} />
                <LegendDot color={B_COLOR} label={result.b.name} />
              </div>
            </Panel>

            <Panel className="p-6">
              <SectionTitle kicker="The Call" title="Allocation Verdict" />
              <div className="mb-3">
                <span
                  className={`chip ${
                    result.generatedBy === "openrouter" ? "border-glow/30 text-glow" : "text-slate-400"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      result.generatedBy === "openrouter" ? "bg-glow animate-pulse-glow" : "bg-slate-500"
                    }`}
                  />
                  {result.generatedBy === "openrouter"
                    ? `AI · ${result.model ?? "OpenRouter"}`
                    : "Deterministic verdict"}
                </span>
              </div>
              <p className="text-[15px] leading-relaxed text-slate-300">{result.verdict}</p>
            </Panel>
          </div>

          <Panel className="p-6">
            <SectionTitle kicker="Metric by Metric" title="Side-by-Side" />
            <ComparisonTable a={result.a} b={result.b} />
          </Panel>
        </div>
      )}

      {loading && !result && (
        <Panel className="p-8 text-center text-sm text-slate-500">Loading comparison…</Panel>
      )}
    </div>
  );
}

function AgentSelect({
  label,
  color,
  agents,
  value,
  onChange,
  exclude,
}: {
  label: string;
  color: string;
  agents: AgentSummary[];
  value: string;
  onChange: (v: string) => void;
  exclude: string;
}) {
  const selected = agents.find((a) => a.id === value);
  return (
    <Panel className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="stat-label">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {selected && <AgentGlyph seed={selected.name} trust={selected.scores.trust} size={36} />}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-glow/40"
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id} disabled={a.id === exclude}>
              {a.name} · trust {a.scores.trust} · {a.allocation.rating}
            </option>
          ))}
        </select>
      </div>
    </Panel>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-slate-300">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

const ROWS: {
  label: string;
  get: (a: AgentDetail) => number;
  fmt: (n: number) => string;
  higherBetter: boolean;
}[] = [
  { label: "Trust Score", get: (a) => a.scores.trust, fmt: (n) => `${n}`, higherBetter: true },
  { label: "Total Return", get: (a) => a.metrics.totalReturnPct, fmt: (n) => pctFmt(n), higherBetter: true },
  { label: "Sharpe Ratio", get: (a) => a.metrics.sharpeRatio, fmt: (n) => n.toFixed(2), higherBetter: true },
  { label: "Win Rate", get: (a) => a.metrics.winRate * 100, fmt: (n) => `${n.toFixed(1)}%`, higherBetter: true },
  { label: "Profit Factor", get: (a) => a.metrics.profitFactor, fmt: (n) => n.toFixed(2), higherBetter: true },
  { label: "Max Drawdown", get: (a) => a.metrics.maxDrawdownPct, fmt: (n) => `${n.toFixed(1)}%`, higherBetter: true },
  { label: "Risk Control", get: (a) => a.scores.risk, fmt: (n) => `${n}`, higherBetter: true },
  { label: "Consistency", get: (a) => a.scores.consistency, fmt: (n) => `${n}`, higherBetter: true },
  { label: "Adaptability", get: (a) => a.scores.adaptability, fmt: (n) => `${n}`, higherBetter: true },
  { label: "Allocation", get: (a) => a.allocation.allocationPct, fmt: (n) => `${n}%`, higherBetter: true },
];

function ComparisonTable({ a, b }: { a: AgentDetail; b: AgentDetail }) {
  const rows = useMemo(() => ROWS, []);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-left">
            <th className="px-3 py-2.5 stat-label">Metric</th>
            <th className="px-3 py-2.5 text-right stat-label" style={{ color: A_COLOR }}>{a.name}</th>
            <th className="px-3 py-2.5 text-right stat-label" style={{ color: B_COLOR }}>{b.name}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const av = row.get(a);
            const bv = row.get(b);
            const aWins = row.higherBetter ? av > bv : av < bv;
            const tie = av === bv;
            return (
              <tr key={row.label} className="border-b border-white/[0.04]">
                <td className="px-3 py-2.5 text-slate-400">{row.label}</td>
                <td
                  className={`px-3 py-2.5 text-right mono ${!tie && aWins ? "font-semibold" : "text-slate-300"}`}
                  style={!tie && aWins ? { color: A_COLOR } : undefined}
                >
                  {row.fmt(av)}
                </td>
                <td
                  className={`px-3 py-2.5 text-right mono ${!tie && !aWins ? "font-semibold" : "text-slate-300"}`}
                  style={!tie && !aWins ? { color: B_COLOR } : undefined}
                >
                  {row.fmt(bv)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
