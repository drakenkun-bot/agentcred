"use client";

import { useWallet } from "./WalletProvider";

// Signed-out call-to-action used on pages that require a connected wallet.
export function ConnectPrompt({ message }: { message: string }) {
  const { connect, connecting, error } = useWallet();
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="max-w-sm text-slate-400">{message}</p>
      <button
        type="button"
        onClick={connect}
        disabled={connecting}
        className="rounded-lg bg-glow px-5 py-2.5 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-glow-soft disabled:opacity-60"
      >
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
      {error && <span className="text-xs text-rate-f">{error}</span>}
    </div>
  );
}
