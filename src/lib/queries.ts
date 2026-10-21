import "server-only";
import { sql } from "./db";
import type { CategoryId } from "./categories";

export type Talk = {
  id: number;
  category_id: CategoryId;
  start_time: string;
  start_minute: number;
  position: number;
  room: string;
  speakers: string;
  title: string;
  hidden: boolean;
};

export async function getTalks(category: CategoryId, includeHidden = false): Promise<Talk[]> {
  return sql<Talk[]>`
    SELECT id, category_id, start_time, start_minute, position, room, speakers, title, hidden
    FROM talks
    WHERE category_id = ${category} AND (${includeHidden} OR hidden = false)
    ORDER BY start_minute, position, room, id`;
}

export async function getCategoryStatus(): Promise<Record<CategoryId, boolean>> {
  const rows = await sql<{ id: CategoryId; is_open: boolean }[]>`SELECT id, is_open FROM categories`;
  const status = { papers: false, lightning: false };
  for (const r of rows) status[r.id] = r.is_open;
  return status;
}

export type ResultRow = Talk & { points: number; firsts: number; seconds: number; thirds: number };

/** Points per talk (1st = 3, 2nd = 2, 3rd = 1), ignoring ballots an admin removed. */
export async function getResults(category: CategoryId): Promise<{ rows: ResultRow[]; ballots: number }> {
  const rows = await sql<ResultRow[]>`
    SELECT t.id, t.category_id, t.start_time, t.start_minute, t.position, t.room, t.speakers, t.title, t.hidden,
      COALESCE(SUM(4 - p.rank), 0)::int AS points,
      COUNT(*) FILTER (WHERE p.rank = 1)::int AS firsts,
      COUNT(*) FILTER (WHERE p.rank = 2)::int AS seconds,
      COUNT(*) FILTER (WHERE p.rank = 3)::int AS thirds
    FROM talks t
    LEFT JOIN ballot_picks p ON p.talk_id = t.id
      AND EXISTS (SELECT 1 FROM ballots b WHERE b.id = p.ballot_id AND b.removed_at IS NULL)
    WHERE t.category_id = ${category}
    GROUP BY t.id
    HAVING NOT t.hidden OR COUNT(p.talk_id) > 0
    ORDER BY points DESC, firsts DESC, seconds DESC, t.start_minute, t.position, t.id`;
  const [{ count }] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM ballots WHERE category_id = ${category} AND removed_at IS NULL`;
  return { rows, ballots: count };
}

export type FlaggedBallot = {
  id: number;
  category_id: CategoryId;
  voter_name: string | null;
  created_at: Date;
  picks: string;
  reasons: string[];
};

// Rules for "suspicious". These are hints for a human, not proof:
// many phones of the same model on the same campus Wi-Fi look identical to the server.
const SAME_PICKS_MINUTES = 10; // same network + browser, identical picks, within this many minutes
const BURST_MINUTES = 2;       // same network + browser ...
const BURST_COUNT = 6;         // ... sending at least this many ballots for one award within BURST_MINUTES

export async function getFlaggedBallots(): Promise<FlaggedBallot[]> {
  const rows = await sql<(Omit<FlaggedBallot, "reasons"> & { same_picks: number; burst: number })[]>`
    WITH live AS (SELECT * FROM ballots WHERE removed_at IS NULL),
    scored AS (
      SELECT b.*,
        (SELECT count(*) FROM live o
           WHERE o.id <> b.id AND o.category_id = b.category_id AND o.ip_ua_hash = b.ip_ua_hash
             AND o.picks_key = b.picks_key
             AND abs(extract(epoch FROM o.created_at - b.created_at)) <= ${SAME_PICKS_MINUTES * 60}) AS same_picks,
        (SELECT count(*) FROM live o
           WHERE o.category_id = b.category_id AND o.ip_ua_hash = b.ip_ua_hash
             AND abs(extract(epoch FROM o.created_at - b.created_at)) <= ${BURST_MINUTES * 60}) AS burst
      FROM live b
    )
    SELECT s.id, s.category_id, s.voter_name, s.created_at, s.same_picks::int, s.burst::int,
      (SELECT string_agg(p.rank || ': ' || t.title, '  |  ' ORDER BY p.rank)
         FROM ballot_picks p JOIN talks t ON t.id = p.talk_id WHERE p.ballot_id = s.id) AS picks
    FROM scored s
    WHERE s.same_picks > 0 OR s.burst >= ${BURST_COUNT}
    ORDER BY s.created_at DESC`;

  return rows.map(({ same_picks, burst, ...ballot }) => ({
    ...ballot,
    reasons: [
      same_picks > 0 && `Same network & browser cast identical picks within ${SAME_PICKS_MINUTES} min`,
      burst >= BURST_COUNT && `Burst: ${burst} ballots from same network & browser within ${BURST_MINUTES} min`,
    ].filter((r): r is string => !!r),
  }));
}

export type BallotExportRow = {
  id: number;
  category_id: CategoryId;
  voter_name: string | null;
  created_at: Date;
  removed_at: Date | null;
  first: string | null;
  second: string | null;
  third: string | null;
  ip_hash: string;
  ip_ua_hash: string;
};

export async function getAllBallots(): Promise<BallotExportRow[]> {
  return sql<BallotExportRow[]>`
    SELECT b.id, b.category_id, b.voter_name, b.created_at, b.removed_at, b.ip_hash, b.ip_ua_hash,
      MAX(t.title) FILTER (WHERE p.rank = 1) AS first,
      MAX(t.title) FILTER (WHERE p.rank = 2) AS second,
      MAX(t.title) FILTER (WHERE p.rank = 3) AS third
    FROM ballots b
    LEFT JOIN ballot_picks p ON p.ballot_id = b.id
    LEFT JOIN talks t ON t.id = p.talk_id
    GROUP BY b.id
    ORDER BY b.created_at`;
}
