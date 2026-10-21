// Creates the database tables and loads the talks.
// Runs automatically before every build (see "build" in package.json), and is safe to repeat:
// it never deletes anything, and it only loads talks when the talks table is empty.
//
//   npm run db:setup              create tables + load talks if empty
//   npm run db:setup -- --wipe    DELETE ALL BALLOTS AND TALKS, then start fresh (asks you to type "yes")

import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import postgres from "postgres";
import { papers, lightning, lightningTime, lightningRoom } from "../db/seed-talks.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local (locally) or to Vercel's Environment Variables.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });

function toMinutes(time) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!m) throw new Error(`Bad time "${time}". Use a format like "10:20 AM".`);
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

function lines(text) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.split("|").map((p) => p.trim()));
}

try {
  if (process.argv.includes("--wipe")) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('This deletes ALL ballots and talks. Type "yes" to continue: ');
    rl.close();
    if (answer.trim() !== "yes") {
      console.log("Cancelled.");
      process.exit(0);
    }
    await sql`DROP TABLE IF EXISTS ballot_picks, ballots, talks, rate_limits, categories CASCADE`;
    console.log("Wiped.");
  }

  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await sql.unsafe(schema);
  console.log("Tables are ready.");

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM talks`;
  if (count > 0) {
    console.log(`Talks already loaded (${count}), not re-seeding.`);
  } else {
    const rows = [
      ...lines(papers).map(([time, room, speakers, title]) => ({
        category_id: "papers", start_time: time, start_minute: toMinutes(time), position: 0, room, speakers, title,
      })),
      ...lines(lightning).map(([order, speakers, title]) => ({
        category_id: "lightning", start_time: lightningTime, start_minute: toMinutes(lightningTime),
        position: Number(order), room: lightningRoom, speakers, title,
      })),
    ];
    await sql`INSERT INTO talks ${sql(rows)}`;
    console.log(`Loaded ${rows.length} talks.`);
  }
} finally {
  await sql.end();
}
