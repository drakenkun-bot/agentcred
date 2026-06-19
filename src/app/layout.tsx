import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { WalletProvider } from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "AgentCred — Trust & Reputation for AI Trading Agents",
  description:
    "A credit-score system for AI trading agents on Bitget. Trust scores, behavioral analysis, market-regime performance, and capital-allocation guidance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <WalletProvider>
        <div className="min-h-screen">
          <Nav />
          <main>{children}</main>
          <footer className="border-t hairline mt-24">
            <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-slate-500">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <p>
                  <span className="glow-text font-semibold">AgentCred</span> ·
                  Trust &amp; reputation layer for AI trading agents.
                </p>
              </div>
            </div>
          </footer>
        </div>
        </WalletProvider>
      </body>
    </html>
  );
}
