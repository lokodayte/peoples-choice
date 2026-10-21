import "server-only";
import postgres from "postgres";

// One shared database connection pool, reused between requests.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // prepare: false keeps this compatible with Neon's connection pooler.
  return postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
}

export const sql = globalForDb.sql ?? connect();
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
