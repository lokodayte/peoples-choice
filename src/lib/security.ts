import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "./db";

function secret(): string {
  const s = process.env.COOKIE_SECRET;
  if (!s || s.length < 32) throw new Error("COOKIE_SECRET must be set to a random string of at least 32 characters");
  return s;
}

/** Keyed hash. Used for signatures and for hashing IP addresses (so raw IPs are never stored). */
export function hmac(purpose: string, value: string): string {
  return createHmac("sha256", secret()).update(`${purpose}:${value}`).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** The visitor's IP address. On Vercel, the first entry of x-forwarded-for is the real client. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export function requestFingerprint(headers: Headers) {
  const ip = clientIp(headers);
  const ua = headers.get("user-agent") ?? "";
  return { ipHash: hmac("ip", ip), ipUaHash: hmac("ip-ua", `${ip}|${ua}`) };
}

/**
 * Blocks requests that come from another website (a basic protection against
 * pages that try to submit votes on someone's behalf).
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return true; // same-origin fetches from some browsers omit it; cookies are SameSite=Lax anyway
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Counts hits per bucket in fixed time windows, stored in the database so it works
 * across all of Vercel's server instances. Returns true if the request is allowed.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const [row] = await sql<{ hits: number }[]>`
    INSERT INTO rate_limits (bucket, window_start, hits)
    VALUES (${bucket}, to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}), 1)
    ON CONFLICT (bucket, window_start) DO UPDATE SET hits = rate_limits.hits + 1
    RETURNING hits`;
  // Occasionally tidy up old counters.
  if (Math.random() < 0.02) await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
  return row.hits <= limit;
}
