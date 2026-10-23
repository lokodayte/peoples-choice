-- People's Choice Awards: database tables.
-- Safe to run more than once: every statement uses "IF NOT EXISTS".

-- The two awards. "is_open" controls whether the ballot accepts votes.
CREATE TABLE IF NOT EXISTS categories (
  id       text PRIMARY KEY,            -- 'papers' or 'lightning'
  name     text NOT NULL,
  is_open  boolean NOT NULL DEFAULT false
);

-- The talks people can vote for.
CREATE TABLE IF NOT EXISTS talks (
  id           serial PRIMARY KEY,
  category_id  text NOT NULL REFERENCES categories(id),
  start_time   text NOT NULL,           -- shown to voters, e.g. '10:20 AM'
  start_minute integer NOT NULL,        -- minutes after midnight, used for sorting
  position     integer NOT NULL DEFAULT 0, -- order within a time slot (lightning talk number)
  room         text NOT NULL,
  speakers     text NOT NULL,
  title        text NOT NULL,
  hidden       boolean NOT NULL DEFAULT false, -- "removed" talks are hidden, so old votes stay valid
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- One row per ballot. The UNIQUE rule is what makes "one ballot per award per device" airtight:
-- the database itself refuses a second row with the same voter_id + category_id,
-- even if two submissions arrive at the exact same moment.
CREATE TABLE IF NOT EXISTS ballots (
  id           serial PRIMARY KEY,
  voter_id     uuid NOT NULL,
  category_id  text NOT NULL REFERENCES categories(id),
  voter_name   text,
  ip_hash      text NOT NULL,           -- hashed, never the raw IP address
  ip_ua_hash   text NOT NULL,           -- hash of IP + browser "user agent"
  picks_key    text NOT NULL,           -- e.g. '12,5,7' (1st,2nd,3rd talk ids), used to spot copies
  created_at   timestamptz NOT NULL DEFAULT now(),
  removed_at   timestamptz,             -- set when an admin removes a suspicious ballot
  CONSTRAINT one_ballot_per_voter_per_category UNIQUE (voter_id, category_id)
);

-- The 1st / 2nd / 3rd picks inside each ballot.
CREATE TABLE IF NOT EXISTS ballot_picks (
  ballot_id  integer NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  rank       smallint NOT NULL CHECK (rank BETWEEN 1 AND 3),
  talk_id    integer NOT NULL REFERENCES talks(id),
  PRIMARY KEY (ballot_id, rank),
  CONSTRAINT no_repeat_talk_in_ballot UNIQUE (ballot_id, talk_id)
);

-- Counters for the per-network rate limit.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket        text NOT NULL,
  window_start  timestamptz NOT NULL,
  hits          integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX IF NOT EXISTS ballots_category_idx ON ballots (category_id, created_at);
CREATE INDEX IF NOT EXISTS ballots_ip_ua_idx ON ballots (ip_ua_hash, category_id);
CREATE INDEX IF NOT EXISTS ballot_picks_talk_idx ON ballot_picks (talk_id);

-- Both awards start CLOSED. Open them from the admin page on the day.
INSERT INTO categories (id, name, is_open) VALUES
  ('papers', 'Best Paper Presentation', false),
  ('lightning', 'Best Lightning Talk', false)
ON CONFLICT (id) DO NOTHING;

-- Automatic closing time for each award: after it passes, ballots show "Voting has closed".
-- When this column is first added, both awards get Friday Oct 30, 2026 at 4:00 PM New York time.
-- "ADD COLUMN IF NOT EXISTS" only runs once, so later changes made on the admin page are kept.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS closes_at timestamptz DEFAULT '2026-10-30 16:00:00 America/New_York';
ALTER TABLE categories ALTER COLUMN closes_at DROP DEFAULT;
