"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { isCategoryId } from "@/lib/categories";
import { checkPassword, endAdminSession, requireAdmin, startAdminSession } from "@/lib/admin-auth";
import { hmac, clientIp, rateLimit } from "@/lib/security";

// Every action below checks the admin cookie first: the browser is never trusted.

export async function login(_prev: { error?: string } | undefined, form: FormData) {
  const ip = clientIp(await headers());
  if (!(await rateLimit(`login:${hmac("ip", ip)}`, 10, 900))) {
    return { error: "Too many attempts. Wait 15 minutes and try again." };
  }
  const password = String(form.get("password") ?? "");
  if (!checkPassword(password)) return { error: "Wrong password." };
  await startAdminSession();
  revalidatePath("/admin");
  return {};
}

export async function logout() {
  await endAdminSession();
  revalidatePath("/admin");
}

export async function setVotingOpen(form: FormData) {
  await requireAdmin();
  const category = form.get("category");
  if (!isCategoryId(category)) throw new Error("Bad category");
  const open = form.get("open") === "true";
  await sql`UPDATE categories SET is_open = ${open} WHERE id = ${category}`;
  revalidatePath("/", "layout");
}

export async function removeBallot(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Bad ballot id");
  // Soft delete: the ballot stops counting, but the voter ID stays "used" so it can't vote again.
  await sql`UPDATE ballots SET removed_at = now() WHERE id = ${id} AND removed_at IS NULL`;
  revalidatePath("/admin");
}

export type TalkFormState = { error?: string; ok?: boolean } | undefined;

/** For clearing out test votes before the conference. Talks are kept. */
export async function deleteAllBallots(_prev: TalkFormState, form: FormData): Promise<TalkFormState> {
  await requireAdmin();
  if (String(form.get("confirm") ?? "").trim() !== "DELETE ALL") {
    return { error: 'Type DELETE ALL (in capitals) to confirm.' };
  }
  await sql`TRUNCATE ballot_picks, ballots RESTART IDENTITY`;
  revalidatePath("/", "layout");
  return { ok: true };
}

function readTalk(form: FormData) {
  const text = (key: string, max: number) => String(form.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const category = form.get("category");
  const startTime = text("start_time", 10).toUpperCase().replace(/\s*(AM|PM)$/, " $1");
  const room = text("room", 30);
  const speakers = text("speakers", 600);
  const title = text("title", 300);
  const position = Number(form.get("position") || 0);

  if (!isCategoryId(category)) return { error: "Choose an award." };
  const m = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(startTime);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12 || Number(m[2]) > 59) {
    return { error: 'Time must look like "10:20 AM" or "2:05 PM".' };
  }
  if (!room || !speakers || !title) return { error: "Room, speakers and title are all required." };
  if (!Number.isInteger(position) || position < 0 || position > 999) return { error: "Order must be a whole number." };

  const startMinute = ((Number(m[1]) % 12) + (m[3] === "PM" ? 12 : 0)) * 60 + Number(m[2]);
  return { talk: { category_id: category, start_time: startTime, start_minute: startMinute, room, speakers, title, position } };
}

export async function addTalk(_prev: TalkFormState, form: FormData): Promise<TalkFormState> {
  await requireAdmin();
  const { talk, error } = readTalk(form);
  if (!talk) return { error };
  await sql`INSERT INTO talks ${sql(talk)}`;
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateTalk(_prev: TalkFormState, form: FormData): Promise<TalkFormState> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Bad talk id." };
  const { talk, error } = readTalk(form);
  if (!talk) return { error };
  // The award can't change once created: existing votes belong to that award.
  const { category_id, ...fields } = talk;
  const result = await sql`UPDATE talks SET ${sql(fields)} WHERE id = ${id} AND category_id = ${category_id}`;
  if (result.count === 0) return { error: "Talk not found." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setTalkHidden(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Bad talk id");
  const hidden = form.get("hidden") === "true";
  // "Removing" a talk hides it from ballots. Votes it already got are kept (and shown in results).
  await sql`UPDATE talks SET hidden = ${hidden} WHERE id = ${id}`;
  revalidatePath("/", "layout");
}
