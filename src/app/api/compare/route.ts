import { NextResponse } from "next/server";
import { getAgentDetail } from "@/lib/agents";
import {
  generateComparisonVerdict,
  heuristicVerdict,
  isOpenRouterConfigured,
} from "@/lib/openrouter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/compare?a=ID&b=ID — returns both agent details plus an allocation
// verdict. The verdict is generated live via OpenRouter when configured,
// otherwise a deterministic heuristic verdict is returned.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const aId = searchParams.get("a");
  const bId = searchParams.get("b");

  if (!aId || !bId) {
    return NextResponse.json({ error: "Provide ?a=<id>&b=<id>" }, { status: 400 });
  }
  if (aId === bId) {
    return NextResponse.json({ error: "Pick two different agents." }, { status: 400 });
  }

  const [a, b] = await Promise.all([getAgentDetail(aId), getAgentDetail(bId)]);
  if (!a || !b) {
    return NextResponse.json({ error: "One or both agents not found." }, { status: 404 });
  }

  let verdict: string;
  let generatedBy: "openrouter" | "heuristic" = "heuristic";
  let model: string | undefined;

  if (isOpenRouterConfigured()) {
    try {
      const v = await generateComparisonVerdict(a, b, a.regimePerformance, b.regimePerformance);
      verdict = v.verdict;
      generatedBy = v.generatedBy;
      model = v.model;
    } catch {
      verdict = heuristicVerdict(a, b);
    }
  } else {
    verdict = heuristicVerdict(a, b);
  }

  return NextResponse.json({ a, b, verdict, generatedBy, model });
}
