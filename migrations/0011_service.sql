-- Istoric service / revizii per masina
CREATE TABLE IF NOT EXISTS service_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id  INTEGER NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
  date        TEXT NOT NULL DEFAULT (date('now')),
  odometer    REAL,
  cost        REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_service_vehicle ON service_records (vehicle_id);
