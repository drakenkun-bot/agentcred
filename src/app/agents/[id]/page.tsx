import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgentDetail } from "@/lib/agents";
import { Terrain3D } from "@/components/three/Terrain3D";
import { ScoreRadar } from "@/components/charts/ScoreRadar";
import { EquityChart } from "@/components/charts/EquityChart";
import { MetricGrid } from "@/components/MetricGrid";
import { RegimePerformanceBars } from "@/components/RegimePerformanceBars";
import { StrengthsWeaknesses } from "@/components/StrengthsWeaknesses";
import { ReportPanel } from "@/components/ReportPanel";
import { ClaimAgentButton } from "@/components/ClaimAgentButton";
import { AgentGlyph } from "@/components/AgentGlyph";
import { Panel, SectionTitle, ScoreBar, TrustOrb, RatingBadge } from "@/components/ui";
import { relativeAge, scoreColor } from "@/lib/format";
import { regimeNarrative } from "@/lib/regime";

export const dynamic = "force-dynamic";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgentDetail(id);
  if (!agent) notFound();

  const { scores, metrics, report, regimePerformance } = agent;
  const terrainIntensity = Math.min(1, metrics.volatilityPct / 110);
  const terrainColor = scoreColor(scores.trust);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/leaderboard" className="inline-flex text-sm text-slate-500 hover:text-glow">
          ← Back to leaderboard
        </Link>
        <ClaimAgentButton agentId={agent.id} ownerAddress={agent.ownerAddress} />
      </div>

      {/* ── Header ─────────────────────────────────────────── */}
      <Panel className="mb-6 p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <AgentGlyph seed={agent.name} trust={scores.trust} size={56} />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
                {agent.rank && (
                  <span className="chip mono text-xs">Rank #{agent.rank}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-400">{agent.classification}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="chip">{agent.strategyType}</span>
                <span className="chip">{agent.symbol}</span>
                <span className="chip">{relativeAge(agent.ageDays)} live</span>
                <span className="chip border-violet-glow/30 text-violet-glow">
                  {report.behaviorType}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <TrustOrb score={scores.trust} size={92} />
            <div className="text-right">
              <div className="stat-label mb-1">Capital Rating</div>
              <div className="flex items-center justify-end gap-2">
                <RatingBadge rating={agent.allocation.rating} size="lg" />
                <div>
                  <div className="mono text-2xl font-bold text-slate-100">
                    {agent.allocation.allocationPct}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    of book
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main column ──────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          <Panel className="p-6">
            <SectionTitle kicker="Behavioral Analysis" title="Deep-Dive Profile" />
            <ReportPanel agentId={agent.id} initial={report} />
            <div className="mt-5">
              <StrengthsWeaknesses strengths={report.strengths} weaknesses={report.weaknesses} />
            </div>
          </Panel>

          <Panel className="p-6">
            <SectionTitle kicker="Track Record" title="Performance Metrics" />
            <MetricGrid m={metrics} />
            <div className="mt-6">
              <div className="stat-label mb-2">Equity Curve · simulated $100k book</div>
              <EquityChart trades={agent.trades} />
            </div>
          </Panel>
        </div>

        {/* ── Side column ──────────────────────────────────── */}
        <div className="space-y-6">
          <Panel className="p-6">
            <SectionTitle kicker="Reputation" title="Score Breakdown" />
            <ScoreRadar series={[{ name: agent.name, color: terrainColor, scores }]} height={240} />
            <div className="mt-5 space-y-3.5">
              <ScoreBar label="Performance · 20%" score={scores.performance} />
              <ScoreBar label="Risk Control · 25%" score={scores.risk} />
              <ScoreBar label="Consistency · 20%" score={scores.consistency} />
              <ScoreBar label="Adaptability · 20%" score={scores.adaptability} />
              <ScoreBar label="Survival · 15%" score={scores.survival} />
            </div>
          </Panel>

          <Panel className="p-6">
            <SectionTitle kicker="Committee" title="Allocation Verdict" />
            <p className="text-sm leading-relaxed text-slate-300">{agent.allocation.reasoning}</p>
          </Panel>
        </div>
      </div>

      {/* ── Market-regime terrain ─────────────────────────── */}
      <Panel className="relative mt-6 overflow-hidden">
        <div className="absolute inset-0">
          <Terrain3D intensity={terrainIntensity} color={terrainColor} />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-ink-900/40" />

        <div className="relative grid gap-6 p-6 lg:grid-cols-2">
          <div>
            <SectionTitle kicker="Market-Regime Engine" title="Where this agent lives" />
            <p className="mb-4 max-w-md text-sm text-slate-400">
              Performance decomposed across market conditions. Peaks are the regimes this
              agent thrives in; valleys are where it should be sidelined.
            </p>
            <ul className="mb-5 space-y-1.5">
              {regimeNarrative(regimePerformance).map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="mt-1 text-glow">→</span>
                  <span>&ldquo;{line}&rdquo;</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <span className="chip border-glow/30 text-glow">
                Best: {report.bestRegime}
              </span>
              <span className="chip border-rate-f/30 text-rate-f">
                Worst: {report.worstRegime}
              </span>
              <span className="chip">Behavior: {report.behaviorType}</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-ink-900/60 p-5 backdrop-blur-sm">
            <RegimePerformanceBars regimes={regimePerformance} />
          </div>
        </div>
      </Panel>
    </div>
  );
}
