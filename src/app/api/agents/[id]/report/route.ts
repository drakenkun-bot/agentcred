import { NextResponse } from "next/server";
import { getAgentDetail, saveReport } from "@/lib/agents";
import {
  OpenRouterNotConfiguredError,
  generateBehavioralReport,
  isOpenRouterConfigured,
} from "@/lib/openrouter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/agents/:id/report — generate a live OpenRouter behavioral report
// and cache it on the agent. `?refresh=1` regenerates even if one is cached.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";

  const agent = await getAgentDetail(id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (!refresh && agent.report.generatedBy === "openrouter") {
    return NextResponse.json({ report: agent.report, cached: true });
  }

  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      {
        error: "OpenRouter is not configured.",
        hint: "Set OPENROUTER_API_KEY in .env to enable live AI reports. A deterministic baseline report is shown meanwhile.",
        report: agent.report,
      },
      { status: 503 },
    );
  }

  try {
    const report = await generateBehavioralReport(agent);
    await saveReport(id, report);
    return NextResponse.json({ report, cached: false });
  } catch (err) {
    const status = err instanceof OpenRouterNotConfiguredError ? 503 : 502;
    return NextResponse.json(
      {
        error: "Failed to generate AI report.",
        detail: err instanceof Error ? err.message : String(err),
        report: agent.report,
      },
      { status },
    );
  }
}
