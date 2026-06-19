import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyMessage, isAddress } from "viem";
import {
  NONCE_COOKIE,
  SESSION_COOKIE,
  buildSignInMessage,
  encodeSession,
} from "@/lib/session";

export const dynamic = "force-dynamic";

// Verifies the wallet signature against the nonce we issued, then establishes
// the session cookie. On success the wallet address becomes the user's account.
export async function POST(req: Request) {
  const { address, signature } = (await req.json().catch(() => ({}))) as {
    address?: string;
    signature?: string;
  };

  if (!address || !isAddress(address) || !signature) {
    return NextResponse.json(
      { error: "address and signature are required" },
      { status: 400 },
    );
  }

  const store = await cookies();
  const nonce = store.get(NONCE_COOKIE)?.value;
  if (!nonce) {
    return NextResponse.json(
      { error: "Sign-in challenge expired — please try again." },
      { status: 400 },
    );
  }

  const message = buildSignInMessage(address.toLowerCase(), nonce);

  let valid = false;
  try {
    valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    valid = false;
  }

  if (!valid) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  // Nonce is single-use.
  store.delete(NONCE_COOKIE);
  store.set(SESSION_COOKIE, encodeSession(address), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return NextResponse.json({ address: address.toLowerCase() });
}
