-- Preturile A si B din feed (pe langa pretul de vanzare si pretul de lista)
-- Aplicare:  deschide /api/setup in browser, sau ruleaza in consola D1.

ALTER TABLE products ADD COLUMN price_a REAL NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN price_b REAL NOT NULL DEFAULT 0;
