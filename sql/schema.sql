-- RDS / local Postgres schema (SQLAlchemy also creates these tables).

CREATE TABLE IF NOT EXISTS matches (
  match_id TEXT PRIMARY KEY,
  city TEXT,
  venue TEXT,
  dates JSONB,
  match_type TEXT,
  gender TEXT,
  season TEXT,
  team_type TEXT,
  teams JSONB,
  toss JSONB,
  outcome JSONB,
  event JSONB,
  overs_limit INTEGER,
  balls_per_over INTEGER,
  player_of_match JSONB,
  raw_info JSONB,
  source_path TEXT
);

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  match_id TEXT REFERENCES matches(match_id),
  team TEXT,
  player_name TEXT,
  registry_id TEXT
);

CREATE TABLE IF NOT EXISTS deliveries (
  id SERIAL PRIMARY KEY,
  match_id TEXT REFERENCES matches(match_id),
  innings INTEGER,
  batting_team TEXT,
  over INTEGER,
  ball_in_over INTEGER,
  sequence INTEGER,
  actual_delivery TEXT,
  batter TEXT,
  bowler TEXT,
  non_striker TEXT,
  runs_batter INTEGER,
  runs_extras INTEGER,
  runs_total INTEGER,
  extras_type TEXT,
  extras_json JSONB,
  wicket_kind TEXT,
  player_out TEXT,
  fielders JSONB,
  is_wicket BOOLEAN,
  is_boundary BOOLEAN,
  raw JSONB
);

CREATE INDEX IF NOT EXISTS idx_deliveries_match_seq ON deliveries(match_id, sequence);

CREATE TABLE IF NOT EXISTS partnerships (
  id SERIAL PRIMARY KEY,
  match_id TEXT REFERENCES matches(match_id),
  innings INTEGER,
  batting_team TEXT,
  batter_1 TEXT,
  batter_2 TEXT,
  runs INTEGER,
  balls INTEGER,
  wicket_at_end BOOLEAN,
  start_sequence INTEGER,
  end_sequence INTEGER
);

CREATE TABLE IF NOT EXISTS game_state (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  match_id TEXT,
  sequence INTEGER,
  state_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commentary_events (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  match_id TEXT,
  sequence INTEGER,
  speaker TEXT,
  language TEXT,
  text TEXT,
  audio_path TEXT,
  judge_accuracy DOUBLE PRECISION,
  judge_fluency DOUBLE PRECISION,
  judge_excitement DOUBLE PRECISION,
  prompt_version TEXT,
  model_name TEXT,
  latency_ms DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qa_turns (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  match_id TEXT,
  question TEXT,
  answer TEXT,
  language TEXT,
  via_voice BOOLEAN,
  latency_ms DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompt_versions (
  id SERIAL PRIMARY KEY,
  name TEXT,
  version TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
