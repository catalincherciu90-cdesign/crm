# CRM — Oferte & Stocuri

CRM pentru **crearea ofertelor către clienți** și **gestiunea stocurilor de produse**.
Construit pe stack-ul echipei: **Astro (SSR) + Cloudflare Pages + D1 + Drizzle ORM + Tailwind CSS**, cu insule React pentru părțile interactive.

## Funcționalități (Faza 1)

- **Clienți** — listă, adăugare, editare (nume, firmă, CUI, contact, adresă, note)
- **Produse & Stocuri** — catalog cu SKU, preț, cotă TVA, unitate, cantitate în stoc și prag de stoc scăzut; status vizual (în stoc / scăzut / epuizat)
- **Oferte** — constructor interactiv:
  - alegi clientul
  - adaugi linii din catalog sau linii libere
  - calcul automat **net → discount linie → discount ofertă → TVA → total** (live)
  - status: ciornă / trimisă / acceptată / respinsă
  - numerotare automată `OF-AAAA-NNNN`
  - pagină de ofertă printabilă (**Print → PDF**)
- **Dashboard** — nr. clienți/produse/oferte, valoare pipeline, oferte recente, alerte stoc scăzut

## Pregătit pentru Faza 2 — Product Feed

Tabela `products` are câmpurile `source` și `external_id`, iar SKU-ul e cheie unică — un import de feed (XML / CSV / Google Merchant) va face **upsert** direct în catalog fără migrare de schemă.

## Structură

```
migrations/            # SQL D1 (0000_init.sql) + seed.sql (date demo)
src/
  db/                  # schema Drizzle + client D1
  lib/                 # money.ts (formatare), offer.ts (calcul totaluri), http.ts
  layouts/             # Layout.astro (shell + navigație)
  components/          # ClientForm, ProductForm (.astro), OfferBuilder.tsx (insulă React)
  pages/
    index.astro        # dashboard
    clients/           # listă + new + [id] (edit)
    products/          # listă + new + [id] (edit)
    offers/            # listă + new (builder) + [id] (document + print)
    api/               # clients, products, offers, offer-status
```

## Dezvoltare locală

```bash
npm install

# 1. creează baza D1 și copiază database_id în wrangler.toml
npx wrangler d1 create crm-db

# 2. aplică migrarea + datele demo pe baza locală
npm run db:migrate:local
npm run db:seed:local        # opțional

# 3. pornește dev server-ul
npm run dev
```

> Adaptorul Cloudflare rulează cu `platformProxy`, deci binding-ul D1 (`DB`) e disponibil
> local în `astro dev`.

## Deploy pe Cloudflare Pages

```bash
npm run db:migrate:remote    # aplică schema pe D1 în cloud
npm run deploy               # build + wrangler pages deploy
```

Asigură-te că proiectul Pages are binding-ul D1 `DB` legat la baza `crm-db`
(din dashboard Cloudflare → Pages → Settings → Functions → D1 bindings, sau via `wrangler.toml`).

## Comenzi utile

| Comandă | Descriere |
|---------|-----------|
| `npm run dev` | Dev server local |
| `npm run build` | Build de producție |
| `npm run db:generate` | Generează migrations din `src/db/schema.ts` (Drizzle Kit) |
| `npm run db:migrate:local` / `:remote` | Aplică migrations pe D1 |
| `npm run db:seed:local` / `:remote` | Încarcă datele demo |

## Model de date

- **clients** — clienți
- **products** — produse + stocuri (`stock_qty`, `low_stock_threshold`, `source`, `external_id`)
- **offers** — oferte (status, totaluri cache-uite, discount de ofertă)
- **offer_items** — linii de ofertă (snapshot preț/descriere la momentul ofertei)

---

Proiect inițializat de echipa AI (coordonare **@ana**, tech lead **@danbastan**, dezvoltare **@cosmin**).
Convenții tehnice: [`ai-agenti/shared/stack.md`](https://github.com/catalincherciu90-cdesign/ai-agenti/blob/main/shared/stack.md).
