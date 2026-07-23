# Deploy pe Cloudflare Pages

CRM-ul rulează pe **Cloudflare Pages** (SSR via adaptorul Astro) cu baza de date **D1**.
Ai două căi: **manual** (o singură dată, din terminalul tău) sau **automat** (GitHub Actions la fiecare push).

---

## Pregătire (o singură dată)

Ai nevoie de un cont Cloudflare (planul gratuit e suficient pentru început).

```bash
cd crm
npm install
npx wrangler login          # deschide browserul și autentifică-te
```

### 1. Creează baza de date D1

```bash
npx wrangler d1 create crm-db
```

Comanda afișează un `database_id`. **Copiază-l în `wrangler.toml`**, înlocuind
`REPLACE_WITH_YOUR_D1_DATABASE_ID`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "crm-db"
database_id = "aici-id-ul-tău"
migrations_dir = "migrations"
```

### 2. Aplică schema (migrations) pe D1 în cloud

```bash
npm run db:migrate:remote
# opțional, date demo:
npm run db:seed:remote
```

---

## Varianta A — Deploy manual

```bash
npm run deploy        # build + wrangler pages deploy ./dist
```

Prima dată wrangler te întreabă să confirme crearea proiectului Pages `crm` și branch-ul
de producție. Bindingul D1 se ia automat din `wrangler.toml`.

La final primești un URL `https://crm-xxx.pages.dev`. Gata. 🎉

Pentru actualizări ulterioare rulezi din nou `npm run deploy`.

---

## Varianta B — Deploy automat (GitHub Actions)

Workflow-ul [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) face build,
aplică migrations pe D1 și publică pe Pages **la fiecare push pe `main`** (sau manual
din tab-ul Actions).

Trebuie doar să adaugi 2 **secrets** în repo (GitHub → Settings → Secrets and variables → Actions):

| Secret | De unde |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → *Create Token*. Permisiuni: **Account · Cloudflare Pages · Edit** și **Account · D1 · Edit**. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → orice domeniu / Workers & Pages → *Account ID* (bara din dreapta). |

> Baza D1 trebuie creată o dată manual (pasul 1 de mai sus) și `database_id`-ul pus în
> `wrangler.toml`, **înainte** de primul deploy automat.

După ce ai pus secrets și ai făcut merge pe `main`, deploy-ul rulează singur.

---

## Legarea unui domeniu propriu (opțional)

Cloudflare Dashboard → Workers & Pages → `crm` → **Custom domains** → adaugi domeniul tău.

## Depanare

- **„D1_ERROR: no such table"** → n-ai aplicat migrations pe remote: `npm run db:migrate:remote`.
- **„Invalid binding `DB`"** → `database_id` lipsește sau e greșit în `wrangler.toml`.
- **Feed-ul nu se descarcă din URL** → în producție Worker-ul are acces la internet; dacă tot dă eroare, verifică că URL-ul feed-ului e public (sau folosește importul prin fișier XML).
