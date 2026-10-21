import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import {
  newVoterId,
  setVoterCookie,
  signVoterId,
  verifyVoterToken,
  voterIdFromCookie,
  votedCategories,
} from "@/lib/voter";

// Called by every page when it loads. It makes sure this device has ONE voter ID,
// kept both in the httpOnly cookie and in the browser's localStorage:
//  - cookie missing but localStorage has it  -> the cookie is restored
//  - localStorage missing but cookie has it  -> the browser saves it again from our reply
//  - both missing                            -> a brand-new ID is created
export async function POST(request: Request) {
  if (!isSameOrigin(request.headers)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const cookieId = await voterIdFromCookie();
  const storedId = verifyVoterToken(body?.token);

  let chosen = cookieId ?? storedId;
  if (cookieId && storedId && cookieId !== storedId) {
    // Two different IDs on one device: keep the one that has already voted, so swapping can't reset a vote.
    const [fromCookie, fromStorage] = await Promise.all([votedCategories([cookieId]), votedCategories([storedId])]);
    chosen = fromStorage.size > fromCookie.size ? storedId : cookieId;
  }
  chosen ??= newVoterId();

  if (chosen !== cookieId) await setVoterCookie(chosen);

  const known = [cookieId, storedId].filter((id): id is string => !!id);
  const voted = await votedCategories(known);

  return NextResponse.json(
    { token: signVoterId(chosen), voted: [...voted], cookieChanged: chosen !== cookieId },
    { headers: { "Cache-Control": "no-store" } },
  );
}
