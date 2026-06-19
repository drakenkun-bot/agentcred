import Link from "next/link";
import { getOverview, getRankedAgents } from "@/lib/agents";
import { Hero3D } from "@/components/three/Hero3D";
import { Leaderboard } from "@/components/Leaderboard";
import { ScoreRadar } from "@/components/charts/ScoreRadar";
import { AgentGlyph } from "@/components/AgentGlyph";
import { Panel, SectionTitle, TrustOrb, RatingBadge, ButtonLink } from "@/components/ui";
import { num, pctFmt, usd } from "@/lib/format";
import type { AgentSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [agents, overview] = await Promise.all([getRankedAgents(), getOverview()]);
  const nodes = agents.map((a) => ({ id: a.id, name: a.name, trust: a.scores.trust }));
  const top = overview.topAgent;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid-faint [background-size:44px_44px] opacity-40" />
        <div className="absolute inset-0">
          <Hero3D nodes={nodes} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="max-w-2xl">
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Staking capital on
              <br />
              <span className="glow-text">trusted intelligence</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-400">
              AgentCred is a credit-score system for AI trading agents. We turn raw
              Bitget trade history into a transparent <strong className="text-slate-200">Trust Score</strong> —
              measuring performance, risk, consistency, adaptability and survival — so
              capital flows to agents that have earned it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/leaderboard" variant="solid">
                Explore the Arena →
              </ButtonLink>
              <ButtonLink href="/compare">Compare agents</ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6">
        {/* ── Overview stats ─────────────────────────────────── */}
        <section className="-mt-10 relative z-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Agents Tracked" value={num(overview.totalAgents)} />
          <StatCard label="Avg Trust Score" value={overview.averageTrustScore.toFixed(1)} accent />
          <StatCard label="Trades Analyzed" value={num(overview.totalTrades)} />
          <StatCard label="Capital In Motion" value={usd(overview.totalTrackedCapital)} />
        </section>

        {/* ── Arena + polyhedron ─────────────────────────────── */}
        <section className="mt-12 grid gap-6 lg:grid-cols-3">
          <Panel className="overflow-hidden p-5 lg:col-span-2">
            <SectionTitle
              kicker="Live Rankings"
              title="Agent Arena"
              right={
                <Link href="/leaderboard" className="text-sm text-glow hover:text-glow-soft">
                  View all →
                </Link>
              }
            />
            <Leaderboard agents={agents} compact />
          </Panel>

          <Panel className="p-5">
            <SectionTitle kicker="Top Agent" title="Risk-Return Polyhedron" />
            {top ? (
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <AgentGlyph seed={top.name} trust={top.scores.trust} size={34} />
                  <div>
                    <Link href={`/agents/${top.id}`} className="font-semibold text-slate-100 hover:text-glow">
                      {top.name}
                    </Link>
                    <div className="text-xs text-slate-500">{top.classification}</div>
                  </div>
                </div>
                <ScoreRadar series={[{ name: top.name, color: "#22e3c4", scores: top.scores }]} height={260} />
              </div>
            ) : (
              <p className="text-sm text-slate-500">No agents seeded.</p>
            )}
          </Panel>
        </section>

        {/* ── Highlight cards ────────────────────────────────── */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <HighlightCard title="Highest Trust" agent={overview.topAgent} metric={(a) => `${a.scores.trust}/100`} />
          <HighlightCard
            title="Most Consistent"
            agent={overview.mostConsistentAgent}
            metric={(a) => `${a.scores.consistency}/100`}
          />
          <HighlightCard
            title="Highest Risk"
            agent={overview.highestRiskAgent}
            metric={(a) => `${pctFmt(a.metrics.maxDrawdownPct)} DD`}
            danger
          />
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="panel px-4 py-4">
      <div className="stat-label">{label}</div>
      <div className={`mono mt-1 text-2xl font-bold ${accent ? "glow-text" : "text-slate-100"}`}>
        {value}
      </div>
    </div>
  );
}

function HighlightCard({
  title,
  agent,
  metric,
  danger,
}: {
  title: string;
  agent: AgentSummary | null;
  metric: (a: AgentSummary) => string;
  danger?: boolean;
}) {
  if (!agent) return null;
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="panel panel-hover flex items-center gap-4 p-4"
    >
      <TrustOrb score={agent.scores.trust} size={64} />
      <div className="min-w-0 flex-1">
        <div className="stat-label">{title}</div>
        <div className="truncate font-semibold text-slate-100">{agent.name}</div>
        <div className={`mono text-sm ${danger ? "text-rate-d" : "text-glow"}`}>{metric(agent)}</div>
      </div>
      <RatingBadge rating={agent.allocation.rating} />
    </Link>
  );
}
