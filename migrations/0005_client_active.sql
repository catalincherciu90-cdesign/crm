-- Status activ/inactiv al clientului (din feed)
ALTER TABLE clients ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
