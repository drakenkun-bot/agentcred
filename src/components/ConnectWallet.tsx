"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWallet, shortAddress } from "./WalletProvider";

// Nav-bar wallet control: a Connect button when signed out, or the truncated
// address with a dropdown (My Agents / Disconnect) when connected.
export function ConnectWallet() {
  const { address, connecting, error, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!address) {
    return (
      <div className="flex flex-col items-end">
        <button
          type="button"
          onClick={connect}
          disabled={connecting}
          className="rounded-lg border border-glow/30 bg-glow/[0.06] px-3.5 py-2 text-sm font-medium text-glow transition hover:bg-glow/[0.12] hover:shadow-glow disabled:opacity-60"
        >
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
        {error && (
          <span className="absolute top-14 max-w-[16rem] text-right text-xs text-rate-f">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-glow/30 bg-glow/[0.06] px-3 py-2 text-sm font-medium text-glow transition hover:bg-glow/[0.12]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-glow animate-pulse-glow" />
        <span className="mono">{shortAddress(address)}</span>
        <span className="text-[8px] text-glow/70">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-white/[0.08] bg-ink-850 shadow-xl">
          <Link
            href="/my-agents"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/[0.04] hover:text-glow"
          >
            My Agents
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              disconnect();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-rate-f"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
