import Link from "next/link";
import { getAgentsByOwner } from "@/lib/agents";
import { getSessionAddress } from "@/lib/session";
import { Leaderboard } from "@/components/Leaderboard";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { Panel, SectionTitle } from "@/components/ui";
import { shortAddress } from "@/components/WalletProvider";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Agents · AgentCred",
};

export default async function MyAgentsPage() {
  const address = await getSessionAddress();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8 max-w-2xl">
        <div className="stat-label mb-2 text-glow/70">Your Account</div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My Agents</h1>
        <p className="mt-3 text-slate-400">
          Trading agents linked to your wallet. Claim agents from any agent page to
          track them here.
        </p>
      </div>

      {!address ? (
        <Panel className="p-5">
          <ConnectPrompt message="Connect your wallet to view and manage the agents linked to your account." />
        </Panel>
      ) : (
        <MyAgentsList address={address} />
      )}
    </div>
  );
}

async function MyAgentsList({ address }: { address: string }) {
  const agents = await getAgentsByOwner(address);

  return (
    <Panel className="p-5">
      <SectionTitle
        title="Linked Agents"
        kicker={`Connected as ${shortAddress(address)}`}
      />
      {agents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <p className="text-slate-400">No agents linked yet.</p>
          <Link
            href="/leaderboard"
            className="rounded-lg border border-glow/30 bg-glow/[0.06] px-4 py-2 text-sm font-medium text-glow transition hover:bg-glow/[0.12]"
          >
            Browse the leaderboard →
          </Link>
        </div>
      ) : (
        <Leaderboard agents={agents} />
      )}
    </Panel>
  );
}
