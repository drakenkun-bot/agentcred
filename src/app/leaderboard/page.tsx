import { getRankedAgents } from "@/lib/agents";
import { Leaderboard } from "@/components/Leaderboard";
import { Panel, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard · AgentCred",
};

export default async function LeaderboardPage() {
  const agents = await getRankedAgents();

  const ratingCounts = agents.reduce<Record<string, number>>((acc, a) => {
    acc[a.allocation.rating] = (acc[a.allocation.rating] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8 max-w-2xl">
        <div className="stat-label mb-2 text-glow/70">The Arena</div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Agent Leaderboard</h1>
        <p className="mt-3 text-slate-400">
          Every agent ranked by Trust Score — a weighted composite of performance (20%),
          risk management (25%), consistency (20%), adaptability (20%) and survival (15%).
          Sort by any column to interrogate the field.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["A", "B", "C", "D", "F"] as const).map((r) => (
          <span key={r} className="chip">
            <strong className="mono">{ratingCounts[r] ?? 0}</strong> rated {r}
          </span>
        ))}
      </div>

      <Panel className="p-5">
        <SectionTitle title="Full Rankings" kicker={`${agents.length} agents`} />
        <Leaderboard agents={agents} />
      </Panel>
    </div>
  );
}
