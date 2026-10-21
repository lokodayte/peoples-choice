import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isCategoryId, type CategoryId } from "@/lib/categories";
import { isSameOrigin, rateLimit, requestFingerprint } from "@/lib/security";
import { setVoterCookie, verifyVoterToken, voterIdFromCookie, votedCategories } from "@/lib/voter";

// Loose on purpose: the whole conference may share one campus Wi-Fi address.
// Default: at most 300 ballots per 10 minutes from one network. Change with VOTE_RATE_LIMIT.
const RATE_LIMIT = Number(process.env.VOTE_RATE_LIMIT) || 300;
const RATE_WINDOW_SECONDS = 600;
const MAX_NAME_LENGTH = 80;

type Fail = { status: number; code: string; message: string };
const fail = ({ status, code, message }: Fail) => NextResponse.json({ ok: false, code, message }, { status });

const ALREADY_VOTED: Fail = { status: 409, code: "already_voted", message: "You've already voted for this award. Thanks!" };
const CLOSED: Fail = { status: 403, code: "closed", message: "Voting has closed for this award." };
const BAD_PICKS: Fail = {
  status: 400,
  code: "bad_picks",
  message: "Something was wrong with your picks. Please reload the page and try again.",
};

class VoteError extends Error {
  constructor(public fail: Fail) {
    super(fail.code);
  }
}

/** Checks the browser's data. Returns null if anything is off. */
function parseBallot(body: unknown): { category: CategoryId; picks: number[]; name: string | null } | null {
  if (!body || typeof body !== "object") return null;
  const { category, picks, name } = body as Record<string, unknown>;
  if (!isCategoryId(category)) return null;
  if (!Array.isArray(picks) || picks.length < 1 || picks.length > 3) return null;
  if (!picks.every((p) => Number.isSafeInteger(p) && p > 0)) return null;
  if (new Set(picks).size !== picks.length) return null; // same talk picked twice
  if (name !== undefined && name !== null && typeof name !== "string") return null;
  // Remove invisible control characters, squash spaces, and cap the length.
  const cleanName = (name ?? "").replace(/[\p{C}]/gu, "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
  return { category, picks: picks as number[], name: cleanName || null };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request.headers)) return fail({ status: 403, code: "bad_origin", message: "Not allowed." });

  const body = await request.json().catch(() => null);
  const ballot = parseBallot(body);
  if (!ballot) return fail(BAD_PICKS);

  const { ipHash, ipUaHash } = requestFingerprint(request.headers);
  if (!(await rateLimit(`vote:${ipHash}`, RATE_LIMIT, RATE_WINDOW_SECONDS))) {
    return fail({
      status: 429,
      code: "rate_limited",
      message: "Lots of votes are coming from your network right now. Please wait a minute and try again.",
    });
  }

  // Work out who is voting: the cookie first, the localStorage copy as a backup.
  const cookieId = await voterIdFromCookie();
  const storedId = verifyVoterToken((body as Record<string, unknown>).token);
  const voterId = cookieId ?? storedId;
  if (!voterId) {
    return fail({ status: 400, code: "no_voter", message: "Please reload the page and try again." });
  }
  if (!cookieId) await setVoterCookie(voterId); // put the cookie back

  // If this device carries a second ID that already voted, that counts too.
  const known = [cookieId, storedId].filter((id): id is string => !!id);
  if ((await votedCategories(known)).has(ballot.category)) return fail(ALREADY_VOTED);

  try {
    await sql.begin(async (tx) => {
      const [category] = await tx<{ is_open: boolean }[]>`
        SELECT is_open FROM categories WHERE id = ${ballot.category}`;
      if (!category?.is_open) throw new VoteError(CLOSED);

      const talks = await tx`
        SELECT id FROM talks
        WHERE id IN ${tx(ballot.picks)} AND category_id = ${ballot.category} AND hidden = false`;
      if (talks.length !== ballot.picks.length) throw new VoteError(BAD_PICKS);

      // The UNIQUE (voter_id, category_id) rule means that if two submissions race,
      // the second one waits for the first to finish and then inserts nothing.
      const [inserted] = await tx<{ id: number }[]>`
        INSERT INTO ballots (voter_id, category_id, voter_name, ip_hash, ip_ua_hash, picks_key)
        VALUES (${voterId}, ${ballot.category}, ${ballot.name}, ${ipHash}, ${ipUaHash}, ${ballot.picks.join(",")})
        ON CONFLICT (voter_id, category_id) DO NOTHING
        RETURNING id`;
      if (!inserted) throw new VoteError(ALREADY_VOTED);

      const picks = ballot.picks.map((talkId, i) => ({ ballot_id: inserted.id, rank: i + 1, talk_id: talkId }));
      await tx`INSERT INTO ballot_picks ${tx(picks)}`;
    });
  } catch (err) {
    if (err instanceof VoteError) return fail(err.fail);
    console.error("Vote failed", err);
    return fail({ status: 500, code: "server_error", message: "Something went wrong. Please try again." });
  }

  return NextResponse.json({ ok: true });
}
