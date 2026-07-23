/** Mapare flexibila a coloanelor dintr-un Excel/CSV de clienti catre campurile CRM. */

export interface MappedClient {
  name: string;
  company: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  notes: string;
}

/** Normalizeaza un header: minuscule, fara diacritice/spatii/semne. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/î/g, 'i')
    .replace(/ș|ş/g, 's')
    .replace(/ț|ţ/g, 't')
    .replace(/[^a-z0-9]/g, '');
}

type Field =
  | 'name' | 'firstName' | 'lastName' | 'company' | 'email'
  | 'phone' | 'taxId' | 'address' | 'city' | 'county' | 'country' | 'notes';

const ALIASES: Record<Field, string[]> = {
  name: ['name', 'nume', 'denumire', 'numeclient', 'client', 'fullname'],
  firstName: ['firstname', 'prenume'],
  lastName: ['lastname', 'numedefamilie'],
  company: ['companyname', 'firma', 'companie', 'company', 'societate', 'numefirma'],
  email: ['emailaddress', 'email', 'mail', 'adresaemail', 'eadresa'],
  phone: ['phone', 'telefon', 'tel', 'mobil', 'telefonmobil', 'phonenumber'],
  taxId: ['cif', 'cui', 'codfiscal', 'taxid', 'vat', 'vatid'],
  address: ['address', 'adresa', 'strada'],
  city: ['city', 'oras', 'localitate'],
  county: ['county', 'judet'],
  country: ['country', 'tara'],
  notes: ['notes', 'note', 'observatii', 'mentiuni', 'comentarii'],
};

/** Gaseste, pentru fiecare camp, header-ul real din fisier care se potriveste. */
export function resolveHeaders(headers: string[]): Partial<Record<Field, string>> {
  const map: Partial<Record<Field, string>> = {};
  const normed = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const field of Object.keys(ALIASES) as Field[]) {
    const found = normed.find((h) => ALIASES[field].includes(h.n));
    if (found) map[field] = found.raw;
  }
  return map;
}

/** Transforma un rand brut in client mapat. */
export function mapClientRow(
  row: Record<string, unknown>,
  map: Partial<Record<Field, string>>,
): MappedClient {
  const val = (f: Field) => (map[f] ? String(row[map[f]!] ?? '').trim() : '');

  let name = val('name');
  if (!name) name = [val('firstName'), val('lastName')].filter(Boolean).join(' ').trim();

  const address = [val('address'), val('city'), val('county'), val('country')]
    .filter(Boolean)
    .join(', ');

  return {
    name,
    company: val('company'),
    email: val('email'),
    phone: val('phone'),
    taxId: val('taxId'),
    address,
    notes: val('notes'),
  };
}

/** Mapare completa a unui set de randuri, sarind randurile fara nume. */
export function mapClients(rows: Record<string, unknown>[]): MappedClient[] {
  if (rows.length === 0) return [];
  const map = resolveHeaders(Object.keys(rows[0]));
  return rows.map((r) => mapClientRow(r, map)).filter((c) => c.name);
}
