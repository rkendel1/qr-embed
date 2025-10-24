CREATE TABLE IF NOT EXISTS known_routes (
  path TEXT PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);