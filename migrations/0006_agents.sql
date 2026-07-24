-- Agenti de vanzari + legatura client -> agent
CREATE TABLE IF NOT EXISTS agents (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  email      TEXT,
  phone      TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE clients ADD COLUMN agent_id INTEGER REFERENCES agents (id);
CREATE INDEX IF NOT EXISTS idx_clients_agent ON clients (agent_id);
