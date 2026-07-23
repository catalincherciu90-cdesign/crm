-- Date demo pentru dezvoltare.  Rulare:  npm run db:seed:local
DELETE FROM offer_items;
DELETE FROM offers;
DELETE FROM products;
DELETE FROM clients;

INSERT INTO clients (name, company, email, phone, tax_id, address) VALUES
  ('Andrei Popescu', 'Popescu Construct SRL', 'andrei@popescuconstruct.ro', '0721000111', 'RO12345678', 'Str. Unirii 10, Buzau'),
  ('Maria Ionescu', 'Deco Interior SRL', 'maria@decointerior.ro', '0722000222', 'RO87654321', 'Bd. Dacia 5, Bucuresti'),
  ('Ionut Georgescu', NULL, 'ionut.g@gmail.com', '0733000333', NULL, 'Str. Florilor 3, Ploiesti');

INSERT INTO products (sku, name, description, category, unit, price, vat_rate, stock_qty, low_stock_threshold) VALUES
  ('PRD-001', 'Laptop business 15"', 'Laptop 15 inch, 16GB RAM, 512GB SSD', 'IT', 'buc', 3200.00, 19, 12, 3),
  ('PRD-002', 'Monitor 27" 4K', 'Monitor 27 inch UHD, USB-C', 'IT', 'buc', 1450.00, 19, 8, 4),
  ('PRD-003', 'Scaun ergonomic', 'Scaun birou ergonomic, suport lombar', 'Mobilier', 'buc', 890.00, 19, 2, 5),
  ('PRD-004', 'Servicii instalare', 'Instalare si configurare echipamente', 'Servicii', 'ora', 150.00, 19, 999, 0),
  ('PRD-005', 'Cablu HDMI 2m', 'Cablu HDMI 2.1, 2 metri', 'Accesorii', 'buc', 45.00, 19, 1, 10);

INSERT INTO offers (number, client_id, status, currency, valid_until, discount_pct, notes, subtotal, discount_total, vat_total, total) VALUES
  ('OF-2026-0001', 1, 'sent', 'RON', '2026-08-15', 5, 'Oferta echipamente birou nou', 4650.00, 232.50, 839.33, 5256.83);

INSERT INTO offer_items (offer_id, product_id, description, unit, qty, unit_price, discount_pct, vat_rate, line_total, position) VALUES
  (1, 1, 'Laptop business 15"', 'buc', 1, 3200.00, 0, 19, 3200.00, 0),
  (1, 2, 'Monitor 27" 4K', 'buc', 1, 1450.00, 0, 19, 1450.00, 1);
