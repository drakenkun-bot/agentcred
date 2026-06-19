import type { Agent as PrismaAgent, Trade as PrismaTrade } from "@prisma/client";
import { prisma } from "./prisma";
import { heuristicReport } from "./openrouter";
import type {
  AgentDetail,
  AgentSummary,
  BehavioralReport,
  OverviewStats,
  PerformanceMetrics,
  RegimePerformance,
  StrategyType,
  Trade,
  TradeSide,
} from "./types";

// The observation window's "now" — the dataset is generated as-of this date,
// so agent age is measured against it (keeps ages stable regardless of when the
// app is run).
export const OBSERVATION_AS_OF = new Date("2026-06-15T00:00:00Z");
const DAY_MS = 86_400_000;

function ageDaysOf(creationDate: Date): number {
  return Math.max(1, Math.round((OBSERVATION_AS_OF.getTime() - creationDate.getTime()) / DAY_MS));
}

function toSummary(a: PrismaAgent): AgentSummary {
  const metrics = JSON.parse(a.metricsJson) as PerformanceMetrics;
  return {
    id: a.id,
    name: a.name,
    strategyType: a.strategyType as StrategyType,
    creationDate: a.creationDate.toISOString(),
    ageDays: ageDaysOf(a.creationDate),
    classification: a.classification,
    symbol: a.symbol,
    scores: {
      trust: a.trustScore,
      performance: a.performanceScore,
      risk: a.riskScore,
      consistency: a.consistencyScore,
      adaptability: a.adaptabilityScore,
      survival: a.survivalScore,
    },
    metrics,
    allocation: {
      rating: a.allocationRating as AgentSummary["allocation"]["rating"],
      allocationPct: a.allocationPct,
      reasoning: a.allocationReason,
    },
    ownerAddress: a.ownerAddress,
  };
}

function toTrade(t: PrismaTrade): Trade {
  return {
    id: t.id,
    timestamp: t.timestamp.toISOString(),
    symbol: t.symbol,
    side: t.side as TradeSide,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    pnl: t.pnl,
    size: t.size,
    regime: t.regime as Trade["regime"],
  };
}

export async function getRankedAgents(): Promise<AgentSummary[]> {
  const agents = await prisma.agent.findMany({ orderBy: { trustScore: "desc" } });
  return agents.map((a, i) => ({ ...toSummary(a), rank: i + 1 }));
}

async function rankOf(agentId: string): Promise<number | undefined> {
  const ranked = await getRankedAgents();
  return ranked.find((a) => a.id === agentId)?.rank;
}

export async function getAgentDetail(id: string): Promise<AgentDetail | null> {
  const a = await prisma.agent.findUnique({
    where: { id },
    include: { trades: { orderBy: { timestamp: "asc" } } },
  });
  if (!a) return null;

  const summary = toSummary(a);
  summary.rank = await rankOf(a.id);
  const regimePerformance = JSON.parse(a.regimeJson) as RegimePerformance[];

  const report: BehavioralReport = a.reportJson
    ? (JSON.parse(a.reportJson) as BehavioralReport)
    : heuristicReport(summary, regimePerformance);

  return {
    ...summary,
    trades: a.trades.map(toTrade),
    regimePerformance,
    report,
  };
}

export async function getAgentByName(name: string): Promise<AgentDetail | null> {
  const a = await prisma.agent.findUnique({ where: { name } });
  return a ? getAgentDetail(a.id) : null;
}

export async function saveReport(id: string, report: BehavioralReport): Promise<void> {
  await prisma.agent.update({ where: { id }, data: { reportJson: JSON.stringify(report) } });
}

/** Agents claimed by a given wallet address, ranked by trust like the leaderboard. */
export async function getAgentsByOwner(address: string): Promise<AgentSummary[]> {
  const owner = address.toLowerCase();
  const ranked = await getRankedAgents();
  return ranked.filter((a) => a.ownerAddress === owner);
}

export type ClaimResult =
  | { ok: true; ownerAddress: string | null }
  | { ok: false; error: "not_found" | "owned_by_other" };

/**
 * Claim or release an agent for a wallet. An agent can only be claimed when
 * unclaimed (or already owned by the caller); releasing requires ownership.
 */
export async function setAgentOwner(
  id: string,
  address: string,
  action: "claim" | "release",
): Promise<ClaimResult> {
  const owner = address.toLowerCase();
  const agent = await prisma.agent.findUnique({ where: { id }, select: { ownerAddress: true } });
  if (!agent) return { ok: false, error: "not_found" };

  if (agent.ownerAddress && agent.ownerAddress !== owner) {
    return { ok: false, error: "owned_by_other" };
  }

  const next = action === "claim" ? owner : null;
  await prisma.agent.update({ where: { id }, data: { ownerAddress: next } });
  return { ok: true, ownerAddress: next };
}

export async function getOverview(): Promise<OverviewStats> {
  const ranked = await getRankedAgents();
  const totalAgents = ranked.length;

  if (totalAgents === 0) {
    return {
      totalAgents: 0,
      averageTrustScore: 0,
      totalTrades: 0,
      totalTrackedCapital: 0,
      topAgent: null,
      mostConsistentAgent: null,
      highestRiskAgent: null,
    };
  }

  const averageTrustScore =
    Math.round((ranked.reduce((a, x) => a + x.scores.trust, 0) / totalAgents) * 10) / 10;
  const totalTrades = ranked.reduce((a, x) => a + x.metrics.totalTrades, 0);
  const totalTrackedCapital = ranked.reduce((a, x) => a + x.metrics.avgPositionSizeUsd, 0);

  const mostConsistentAgent = [...ranked].sort(
    (a, b) => b.scores.consistency - a.scores.consistency,
  )[0];
  // "Highest risk" = weakest risk-management score (most dangerous).
  const highestRiskAgent = [...ranked].sort((a, b) => a.scores.risk - b.scores.risk)[0];

  return {
    totalAgents,
    averageTrustScore,
    totalTrades,
    totalTrackedCapital,
    topAgent: ranked[0],
    mostConsistentAgent,
    highestRiskAgent,
  };
}
