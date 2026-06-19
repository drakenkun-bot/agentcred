import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/session";
import { setAgentOwner } from "@/lib/agents";

export const dynamic = "force-dynamic";

// POST   → claim the agent for the connected wallet
// DELETE → release it (must be the current owner)
async function handle(
  action: "claim" | "release",
  params: Promise<{ id: string }>,
) {
  const address = await getSessionAddress();
  if (!address) {
    return NextResponse.json(
      { error: "Connect your wallet first." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const result = await setAgentOwner(id, address, action);

  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 409;
    const error =
      result.error === "not_found"
        ? "Agent not found."
        : "This agent is already linked to another account.";
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ ownerAddress: result.ownerAddress });
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle("claim", ctx.params);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle("release", ctx.params);
}
