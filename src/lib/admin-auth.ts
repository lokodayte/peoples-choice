import "server-only";
import { cookies } from "next/headers";
import { hmac, safeEqual } from "./security";

const ADMIN_COOKIE = "pc_admin";
const SESSION_HOURS = 12;

function adminPassword(): string {
  const p = process.env.ADMIN_PASSWORD;
  if (!p || p.length < 8) throw new Error("ADMIN_PASSWORD must be set (at least 8 characters)");
  return p;
}

// The session cookie is "<expiry time>.<signature>". The signature includes the password,
// so changing ADMIN_PASSWORD logs everyone out.
function sign(expires: string) {
  return hmac("admin", `${expires}|${adminPassword()}`);
}

export function checkPassword(attempt: string): boolean {
  return safeEqual(hmac("pw", attempt), hmac("pw", adminPassword()));
}

export async function startAdminSession() {
  const expires = String(Date.now() + SESSION_HOURS * 3600_000);
  (await cookies()).set(ADMIN_COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "lax" so opening /admin from a link (email, chat) keeps you signed in.
    // Admin changes are POST-only server actions, which Next.js rejects from other websites.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const [expires, sig] = value.split(".");
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  return safeEqual(sig, sign(expires));
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not signed in as admin");
}
