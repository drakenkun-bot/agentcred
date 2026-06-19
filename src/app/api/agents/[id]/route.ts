import { NextResponse } from "next/server";
import { getAgentDetail } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const agent = await getAgentDetail(id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  return NextResponse.json({ agent });
}
