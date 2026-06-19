"use client";

import { useState } from "react";
import { useWallet, shortAddress } from "./WalletProvider";

// Link / unlink an agent to the connected wallet. Rendered on the agent detail
// page; `ownerAddress` is the agent's current owner from the server.
export function ClaimAgentButton({
  agentId,
  ownerAddress,
}: {
  agentId: string;
  ownerAddress: string | null;
}) {
  const { address, connect, connecting, setClaim } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownedByMe = !!address && ownerAddress === address;
  const ownedByOther = !!ownerAddress && ownerAddress !== address;

  const run = async (claim: boolean) => {
    setError(null);
    setBusy(true);
    try {
      await setClaim(agentId, claim);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  // Signed out → invite to connect.
  if (!address) {
    return (
      <button
        type="button"
        onClick={connect}
        disabled={connecting}
        className="rounded-lg border border-glow/30 bg-glow/[0.06] px-3.5 py-2 text-sm font-medium text-glow transition hover:bg-glow/[0.12] disabled:opacity-60"
      >
        {connecting ? "Connecting…" : "Connect wallet to link"}
      </button>
    );
  }

  if (ownedByOther) {
    return (
      <span className="chip text-slate-400">
        Linked to {shortAddress(ownerAddress!)}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {ownedByMe ? (
        <div className="flex items-center gap-2">
          <span className="chip border-glow/40 text-glow">★ Linked to you</span>
          <button
            type="button"
            onClick={() => run(false)}
            disabled={busy}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 transition hover:border-rate-f/40 hover:text-rate-f disabled:opacity-60"
          >
            {busy ? "…" : "Unlink"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => run(true)}
          disabled={busy}
          className="rounded-lg bg-glow px-3.5 py-2 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-glow-soft disabled:opacity-60"
        >
          {busy ? "Linking…" : "Link to my account"}
        </button>
      )}
      {error && <span className="text-xs text-rate-f">{error}</span>}
    </div>
  );
}
