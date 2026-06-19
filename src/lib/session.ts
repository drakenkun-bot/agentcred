import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// ───────────────────────────────────────────────────────────────────────────
//  Wallet sign-in session.
//
//  Identity is an EVM wallet address proven via an EIP-191 `personal_sign`
//  signature (see /api/auth/verify). Once proven, we issue a stateless,
//  HMAC-signed httpOnly cookie holding the lowercased address — no DB session
//  table needed. The address is the user's account; agents are claimed by it.
// ───────────────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "agentcred_session";
export const NONCE_COOKIE = "agentcred_nonce";

// Dev fallback keeps the zero-setup MVP working without extra env wiring; set
// SESSION_SECRET in production so cookies can't be forged.
const SECRET =
  process.env.SESSION_SECRET || "agentcred-dev-session-secret-change-me";

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

/** A fresh random nonce for a sign-in challenge. */
export function newNonce(): string {
  return randomBytes(16).toString("hex");
}

/** The exact human-readable message the wallet is asked to sign. */
export function buildSignInMessage(address: string, nonce: string): string {
  return [
    "Sign in to AgentCred to link trading agents to your account.",
    "",
    `Wallet: ${address}`,
    `Nonce: ${nonce}`,
    "",
    "Signing is free and will not trigger a blockchain transaction.",
  ].join("\n");
}

/** Encode `address.signature` for the session cookie. */
export function encodeSession(address: string): string {
  const addr = address.toLowerCase();
  return `${addr}.${sign(addr)}`;
}

/** Decode + verify a session cookie value, returning the address or null. */
export function decodeSession(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const addr = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = sign(addr);
  // Constant-time compare; bail if lengths differ.
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return addr;
}

/** Read the connected wallet address for the current request (server-side). */
export async function getSessionAddress(): Promise<string | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}
