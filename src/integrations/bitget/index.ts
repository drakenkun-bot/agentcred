import type { BitgetActivitySource, IngestOptions, RawAgentActivity } from "./types";
import { bitgetSimulator } from "./simulator";

export * from "./types";
export { BitgetSimulator, bitgetSimulator } from "./simulator";

// ───────────────────────────────────────────────────────────────────────────
//  Bitget integration entry point.
//
//  Today this resolves to the deterministic simulator. To go live, implement a
//  `BitgetActivitySource` backed by Bitget's API and select it here (e.g. via an
//  env flag), supporting:
//    • trade history ingestion   (closed positions / fills)
//    • paper trading logs        (demo / backtest agents)
//    • agent activity records    (copy-trading lead-trader stats)
//  Nothing downstream changes — the scoring pipeline only depends on this contract.
// ───────────────────────────────────────────────────────────────────────────

export function getBitgetSource(): BitgetActivitySource {
  // const mode = process.env.BITGET_SOURCE; // "live" | "simulator"
  // if (mode === "live") return new BitgetLiveClient(...);
  return bitgetSimulator;
}

export async function ingestAgentActivity(
  opts?: IngestOptions,
): Promise<RawAgentActivity[]> {
  return getBitgetSource().fetchAgentActivity(opts);
}
