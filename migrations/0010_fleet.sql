-- Parc auto
CREATE TABLE IF NOT EXISTS vehicles (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  plate            TEXT NOT NULL UNIQUE,
  make             TEXT,
  model            TEXT,
  year             INTEGER,
  vin              TEXT,
  fuel_type        TEXT DEFAULT 'Motorină',
  odometer         REAL NOT NULL DEFAULT 0,
  agent_id         INTEGER REFERENCES agents (id),
  itp_expiry       TEXT,
  rca_expiry       TEXT,
  rovinieta_expiry TEXT,
  casco_expiry     TEXT,
  active           INTEGER NOT NULL DEFAULT 1,
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vehicles_agent ON vehicles (agent_id);

ALTER TABLE expenses ADD COLUMN vehicle_id INTEGER REFERENCES vehicles (id);
