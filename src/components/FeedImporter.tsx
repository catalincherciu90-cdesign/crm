import { useState } from 'react';
import type { FeedSource, NewProduct } from '@/db/schema';
import { parseAndMapFeed, type PriceField } from '@/lib/feed';
import { formatMoney } from '@/lib/money';

interface Props {
  sources: FeedSource[];
}

const CHUNK = 200;
const inputCls =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';

export default function FeedImporter({ sources }: Props) {
  const preset = sources[0];
  const [url, setUrl] = useState(preset?.url ?? '');
  const [source, setSource] = useState(preset?.name ?? 'spotvision-b2b');
  const [priceField, setPriceField] = useState<PriceField>((preset?.priceField as PriceField) ?? 'PRET_A');
  const [vatRate, setVatRate] = useState(19);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<NewProduct[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<string>('');

  function reset() {
    setError('');
    setResult('');
    setProgress(null);
    setProducts([]);
  }

  // --- Sursa 1: descarca de la URL (server-side) ---
  async function loadFromUrl() {
    reset();
    if (!url.trim()) return setError('Completează URL-ul feed-ului.');
    setBusy(true);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, priceField, vatRate, source }),
      });
      const data = (await res.json()) as { products?: NewProduct[]; count?: number; source?: string; error?: string };
      if (!res.ok || !data.products) {
        setError(data.error || 'Nu am putut încărca feed-ul.');
      } else {
        setProducts(data.products);
        if (data.source) setSource(data.source);
      }
    } catch (e) {
      setError('Eroare rețea: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // --- Sursa 2: fisier XML local (parsare in browser) ---
  async function loadFromFile(file: File) {
    reset();
    setBusy(true);
    try {
      const xml = await file.text();
      const mapped = parseAndMapFeed(xml, { priceField, vatRate, source });
      if (mapped.length === 0) setError('Fișierul nu conține produse valide.');
      else setProducts(mapped);
    } catch (e) {
      setError('Eroare la parsarea fișierului: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // --- Import: upsert pe chunk-uri, cu progres ---
  async function runImport() {
    setError('');
    setResult('');
    setBusy(true);
    const total = products.length;
    setProgress({ done: 0, total });
    let done = 0;
    try {
      for (let i = 0; i < total; i += CHUNK) {
        const chunk = products.slice(i, i + CHUNK);
        const res = await fetch('/api/products/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: chunk }),
        });
        const data = (await res.json()) as { processed?: number; error?: string };
        if (!res.ok) throw new Error(data.error || `Chunk ${i} a eșuat.`);
        done += data.processed ?? chunk.length;
        setProgress({ done, total });
      }
      // inregistreaza sincronizarea
      if (url.trim()) {
        await fetch('/api/feed', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: source, url, priceField, count: done }),
        });
      }
      setResult(`✅ Import finalizat: ${done} produse sincronizate (adăugate sau actualizate).`);
      setProducts([]);
    } catch (e) {
      setError('Import oprit: ' + (e as Error).message + ` (procesate: ${done})`);
    } finally {
      setBusy(false);
    }
  }

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const preview = products.slice(0, 8);

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {result && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{result} <a href="/products" className="font-semibold underline">Vezi produsele →</a></div>}

      {/* Config */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600">URL feed</label>
            <input className={inputCls + ' mt-1'} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Nume sursă</label>
            <input className={inputCls + ' mt-1'} value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Listă de preț importată</label>
            <select className={inputCls + ' mt-1'} value={priceField} onChange={(e) => setPriceField(e.target.value as PriceField)}>
              <option value="PRET_A">PREȚ A</option>
              <option value="PRET_B">PREȚ B</option>
              <option value="PRET_LISTA">PREȚ LISTĂ</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">TVA implicit (%)</label>
            <input type="number" step="0.1" className={inputCls + ' mt-1'} value={vatRate} onChange={(e) => setVatRate(Number(e.target.value) || 0)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={loadFromUrl} disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy ? 'Se încarcă...' : '↓ Încarcă din URL'}
          </button>
          <span className="text-xs text-slate-400">sau</span>
          <label className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            📄 Încarcă fișier XML
            <input type="file" accept=".xml,text/xml,application/xml" className="hidden" disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFromFile(f); }} />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Notă: descărcarea din URL rulează pe server (Cloudflare). Dacă domeniul feed-ului nu e accesibil din mediul curent, folosește fișierul XML.
        </p>
      </div>

      {/* Preview + import */}
      {products.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{products.length} produse pregătite pentru import</h2>
            <button type="button" onClick={runImport} disabled={busy} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {busy ? 'Se importă...' : `Importă ${products.length} produse`}
            </button>
          </div>

          {progress && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>{progress.done} / {progress.total}</span><span>{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-green-500 transition-all" style={{ width: pct + '%' }} />
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr><th className="py-2">SKU</th><th className="py-2">Nume</th><th className="py-2">Brand</th><th className="py-2 text-right">Preț</th><th className="py-2 text-right">Stoc</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((p, i) => (
                  <tr key={i}>
                    <td className="py-1.5 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="py-1.5 text-slate-800">{p.name}</td>
                    <td className="py-1.5 text-slate-500">{p.brand ?? '—'}</td>
                    <td className="py-1.5 text-right text-slate-700">{formatMoney(p.price ?? 0)}</td>
                    <td className="py-1.5 text-right text-slate-700">{p.stockQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length > preview.length && <p className="mt-2 text-xs text-slate-400">... și încă {products.length - preview.length} produse.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
