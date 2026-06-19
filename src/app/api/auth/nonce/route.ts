import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NONCE_COOKIE, buildSignInMessage, newNonce } from "@/lib/session";

export const dynamic = "force-dynamic";

// Issues a one-time nonce + the exact message to sign. The nonce is stashed in
// a short-lived httpOnly cookie so /api/auth/verify can confirm the signed
// message matches what we challenged (replay protection).
export async function POST(req: Request) {
  const { address } = (await req.json().catch(() => ({}))) as {
    address?: string;
  };
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const nonce = newNonce();
  const message = buildSignInMessage(address.toLowerCase(), nonce);

  const store = await cookies();
  store.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 5, // 5 minutes to sign
  });

  return NextResponse.json({ message, nonce });
}
