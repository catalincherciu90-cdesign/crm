-- Poze si fisiere tehnice (datasheets) din feed
-- Aplicare:  npm run db:migrate:remote  (sau in consola D1)

ALTER TABLE products ADD COLUMN images TEXT; -- URL-uri poze, separate cu '#'
ALTER TABLE products ADD COLUMN files TEXT;  -- URL-uri fise tehnice PDF, separate cu '#'
