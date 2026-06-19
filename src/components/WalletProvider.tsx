"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

// Minimal EIP-1193 provider shape (avoids pulling a wallet SDK dependency).
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isBitKeep?: boolean;
  isBitget?: boolean;
  providers?: Eip1193Provider[];
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
    bitkeep?: { ethereum?: Eip1193Provider };
  }
}

interface WalletState {
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** Claim (link) or release an agent; returns the new owner or throws on error. */
  setClaim: (agentId: string, claim: boolean) => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

// Prefer the Bitget Wallet provider when several wallets are injected.
function pickProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const bitget = window.bitkeep?.ethereum;
  if (bitget) return bitget;
  const eth = window.ethereum;
  if (!eth) return null;
  if (eth.providers?.length) {
    return eth.providers.find((p) => p.isBitget || p.isBitKeep) ?? eth.providers[0];
  }
  return eth;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from the existing session cookie on mount.
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { address: string | null }) => {
        if (active) setAddress(d.address ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const provider = pickProvider();
    if (!provider) {
      setError("No wallet detected. Install Bitget Wallet or MetaMask.");
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const account = accounts?.[0];
      if (!account) throw new Error("No account returned by wallet.");

      // 1. Get the challenge message.
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account }),
      });
      if (!nonceRes.ok) throw new Error("Could not start sign-in.");
      const { message } = (await nonceRes.json()) as { message: string };

      // 2. Ask the wallet to sign it (EIP-191 personal_sign).
      const signature = (await provider.request({
        method: "personal_sign",
        params: [message, account],
      })) as string;

      // 3. Verify server-side and set the session.
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account, signature }),
      });
      if (!verifyRes.ok) {
        const { error: msg } = (await verifyRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(msg || "Verification failed.");
      }
      const { address: confirmed } = (await verifyRes.json()) as { address: string };
      setAddress(confirmed);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wallet connection failed.";
      // User-rejected signature requests shouldn't read as a hard error.
      setError(/reject|denied|4001/i.test(msg) ? null : msg);
    } finally {
      setConnecting(false);
    }
  }, [router]);

  const disconnect = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setAddress(null);
    router.refresh();
  }, [router]);

  const setClaim = useCallback(
    async (agentId: string, claim: boolean) => {
      const res = await fetch(`/api/agents/${agentId}/claim`, {
        method: claim ? "POST" : "DELETE",
      });
      if (!res.ok) {
        const { error: msg } = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(msg || "Could not update link.");
      }
      router.refresh();
    },
    [router],
  );

  const value = useMemo(
    () => ({ address, connecting, error, connect, disconnect, setClaim }),
    [address, connecting, error, connect, disconnect, setClaim],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within <WalletProvider>");
  return ctx;
}

/** Shorten 0xabc…1234 for display. */
export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
