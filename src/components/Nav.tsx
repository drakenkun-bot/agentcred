"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "./ConnectWallet";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/compare", label: "Compare" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-7 w-7 items-center justify-center">
            <span className="absolute inset-0 rounded-md bg-glow/20 blur-[6px] transition group-hover:bg-glow/40" />
            <svg viewBox="0 0 24 24" className="relative h-7 w-7" fill="none">
              <path
                d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z"
                stroke="#22e3c4"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M8.5 12.5 11 15l4.5-5" stroke="#5af2dc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[15px] font-bold tracking-tight">
            Agent<span className="glow-text">Cred</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative rounded-lg px-3.5 py-2 text-sm transition-colors ${
                  active ? "text-glow" : "text-slate-400 hover:text-slate-100"
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-glow shadow-glow" />
                )}
              </Link>
            );
          })}
        </nav>

        <ConnectWallet />
      </div>
    </header>
  );
}
