import { NextResponse } from "next/server";
import { getRankedAgents } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  const agents = await getRankedAgents();
  return NextResponse.json({ agents });
}
