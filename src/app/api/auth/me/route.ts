import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/session";

export const dynamic = "force-dynamic";

// Returns the currently connected wallet address (or null).
export async function GET() {
  const address = await getSessionAddress();
  return NextResponse.json({ address });
}
