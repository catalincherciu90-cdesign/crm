-- Target lunar de vanzari pentru fiecare agent
ALTER TABLE agents ADD COLUMN monthly_target REAL NOT NULL DEFAULT 0;
