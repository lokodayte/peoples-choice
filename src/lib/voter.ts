import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "./db";
import { hmac, safeEqual } from "./security";
import type { CategoryId } from "./categories";

// The device's voter ID travels as a signed "token": "<uuid>.<signature>".
// The signature proves the server created it, so nobody can invent IDs.
export const VOTER_COOKIE = "pc_voter";
const ONE_YEAR = 60 * 60 * 24 * 365;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function signVoterId(id: string): string {
  return `${id}.${hmac("voter", id)}`;
}

/** Returns the voter ID inside a token, or null if the token is missing, malformed or forged. */
export function verifyVoterToken(token: unknown): string | null {
  if (typeof token !== "string" || token.length > 200) return null;
  const [id, sig, extra] = token.split(".");
  if (extra !== undefined || !id || !sig || !UUID_RE.test(id)) return null;
  return safeEqual(sig, hmac("voter", id)) ? id : null;
}

export function newVoterId(): string {
  return randomUUID();
}

export async function setVoterCookie(id: string) {
  (await cookies()).set(VOTER_COOKIE, signVoterId(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

/** The voter ID from this request's cookie (server components and route handlers). */
export async function voterIdFromCookie(): Promise<string | null> {
  return verifyVoterToken((await cookies()).get(VOTER_COOKIE)?.value);
}

export async function votedCategories(voterIds: string[]): Promise<Set<CategoryId>> {
  if (voterIds.length === 0) return new Set();
  const rows = await sql<{ category_id: CategoryId }[]>`
    SELECT DISTINCT category_id FROM ballots WHERE voter_id IN ${sql(voterIds)}`;
  return new Set(rows.map((r) => r.category_id));
}
