-- Cheltuieli (inclusiv combustibil)
CREATE TABLE IF NOT EXISTS expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL DEFAULT (date('now')),
  category    TEXT NOT NULL DEFAULT 'Altele',
  amount      REAL NOT NULL DEFAULT 0,
  liters      REAL,
  description TEXT,
  agent_id    INTEGER REFERENCES agents (id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_agent ON expenses (agent_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date);
