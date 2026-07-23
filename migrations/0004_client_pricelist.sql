-- Lista de pret a clientului (PRET_A / PRET_B) -> folosita implicit in oferte
ALTER TABLE clients ADD COLUMN price_list TEXT;
