import { PrismaClient } from "@prisma/client";
import { ingestAgentActivity } from "../src/integrations/bitget";
import { scoreAgent } from "../src/lib/pipeline";

const prisma = new PrismaClient();

const AS_OF = new Date("2026-06-15T00:00:00Z");

async function main() {
  console.log("→ Ingesting agent activity from Bitget source (simulator)…");
  const activity = await ingestAgentActivity({ seed: 20260615, agentCount: 16, asOf: AS_OF.toISOString() });
  console.log(`  ingested ${activity.length} agents`);

  console.log("→ Resetting database…");
  await prisma.trade.deleteMany();
  await prisma.agent.deleteMany();

  let tradeTotal = 0;
  for (const a of activity) {
    const scored = scoreAgent(a, AS_OF);
    tradeTotal += scored.trades.length;

    await prisma.agent.create({
      data: {
        name: scored.name,
        strategyType: scored.strategyType,
        symbol: scored.symbol,
        creationDate: new Date(scored.creationDate),
        trustScore: scored.scores.trust,
        performanceScore: scored.scores.performance,
        riskScore: scored.scores.risk,
        consistencyScore: scored.scores.consistency,
        adaptabilityScore: scored.scores.adaptability,
        survivalScore: scored.scores.survival,
        classification: scored.classification,
        allocationRating: scored.allocation.rating,
        allocationPct: scored.allocation.allocationPct,
        allocationReason: scored.allocation.reasoning,
        metricsJson: JSON.stringify(scored.metrics),
        regimeJson: JSON.stringify(scored.regimePerformance),
        trades: {
          create: scored.trades.map((t) => ({
            timestamp: new Date(t.timestamp),
            symbol: t.symbol,
            side: t.side,
            entryPrice: t.entryPrice,
            exitPrice: t.exitPrice,
            pnl: t.pnl,
            size: t.size,
            regime: t.regime,
          })),
        },
      },
    });

    console.log(
      `  ✓ ${scored.name.padEnd(18)} trust=${String(scored.scores.trust).padStart(3)} ` +
        `rating=${scored.allocation.rating} trades=${scored.trades.length}`,
    );
  }

  console.log(`\n✔ Seeded ${activity.length} agents · ${tradeTotal} trades.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
