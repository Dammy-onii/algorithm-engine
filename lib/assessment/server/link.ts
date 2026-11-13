import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed, stateless link tokens: "<id>.<signature>". The same INTERVIEW_LINK_SECRET
 * as simulation interview links signs them, with a different purpose prefix so a
 * candidate token can never be used as a review token (or vice versa).
 */
export type LinkKind = "candidate" | "review";

const DEVELOPMENT_SECRET = "ctrl-development-interview-link-v1";
const SIGNATURE_BYTES = 10;

function secret() {
  return process.env.INTERVIEW_LINK_SECRET || DEVELOPMENT_SECRET;
}

function sign(kind: LinkKind, id: string): string {
  return createHmac("sha256", secret())
    .update(`assessment:${kind}:${id}`)
    .digest()
    .subarray(0, SIGNATURE_BYTES)
    .toString("base64url");
}

export function newId(bytes = 12): string {
  return randomBytes(bytes).toString("base64url");
}

export function createLinkToken(kind: LinkKind, id: string): string {
  return `${id}.${sign(kind, id)}`;
}

/** Returns the assessment id when the token is authentic for this kind, else undefined. */
export function verifyLinkToken(kind: LinkKind, token: string): string | undefined {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return undefined;
  const id = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(kind, id), "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;
  return id;
}
