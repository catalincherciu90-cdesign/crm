import { useState } from 'react';
import * as XLSX from 'xlsx';
import { mapImageRows, type ImageRow } from '@/lib/imageFeed';

const CHUNK = 150;
const MAX_RETRIES = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DEFAULT_URL =
  'https://www.spotvisionelectric.ro/userfiles/7c1d5fe1-369c-4324-aa63-b8796942d422/feeds/93b9afbd-f6e4-4da4-aadd-89c7b518ef48.csv';

const inputCls =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';

export default function ImageImporter() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [rows, setRows] = useState<ImageRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState('');

  function reset() {
    setError('');
    setResult('');
    setProgress(null);
    setRows([]);
  }

  function parseCsv(text: string) {
    const clean = text.replace(/^﻿/, '');
    const wb = XLSX.read(clean, { type: 'string', raw: true });
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const mapped = mapImageRows(data);
    if (mapped.length === 0) setError('Nu am găsit poze valide (verifică coloanele Product Code / Size 1280 x 1280).');
    else setRows(mapped);
  }

  async function loadFromUrl() {
    reset();
    if (!url.trim()) return setError('Completează URL-ul feed-ului de poze.');
    setBusy(true);
    try {
      const res = await fetch('/api/image-feed?url=' + encodeURIComponent(url));
      const text = await res.text();
      if (!res.ok) {
        try {
          setError(JSON.parse(text).error || 'Nu am putut încărca feed-ul.');
        } catch {
          setError('Nu am putut încărca feed-ul.');
        }
        return;
      }
      parseCsv(text);
    } catch (e) {
      setError('Eroare rețea: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadFromFile(file: File) {
    reset();
    setBusy(true);
    try {
      parseCsv(await file.text());
    } catch (e) {
      setError('Eroare la citirea fișierului: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setError('');
    setResult('');
    setBusy(true);
    const total = rows.length;
    setProgress({ done: 0, total });
    let done = 0;
    try {
      for (let i = 0; i < total; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        let ok = false;
        let lastErr = '';
        for (let attempt = 0; attempt < MAX_RETRIES && !ok; attempt++) {
          if (attempt > 0) await sleep(700 * 2 ** attempt);
          try {
            const res = await fetch('/api/products/import-images', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ items: chunk }),
            });
            const text = await res.text();
            let data: { processed?: number; error?: string };
            try {
              data = JSON.parse(text);
            } catch {
              throw new Error(`Server ocupat (HTTP ${res.status})`);
            }
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            done += chunk.length;
            setProgress({ done, total });
            ok = true;
          } catch (e) {
            lastErr = (e as Error).message;
          }
        }
        if (!ok) throw new Error(`${lastErr} (la rândul ${i})`);
        await sleep(100);
      }
      setResult(`✅ Poze actualizate pentru ${done} produse (după SKU).`);
      setRows([]);
    } catch (e) {
      setError('Import oprit: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {result && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {result} <a href="/products" className="font-semibold underline">Vezi produsele →</a>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600">URL feed poze (CSV)</label>
        <input className={inputCls + ' mt-1'} value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={loadFromUrl} disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Se încarcă...' : '↓ Încarcă din URL'}
        </button>
        <span className="text-xs text-slate-400">sau</span>
        <label className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          📄 Încarcă fișier CSV
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFromFile(f); }} />
        </label>
      </div>

      {rows.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">{rows.length} produse cu poze găsite</span>
            <button type="button" onClick={runImport} disabled={busy} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {busy ? 'Se importă...' : `Actualizează pozele (${rows.length})`}
            </button>
          </div>
          {progress && (
            <div className="mb-2">
              <div className="mb-1 flex justify-between text-xs text-slate-500"><span>{progress.done} / {progress.total}</span><span>{pct}%</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-green-500 transition-all" style={{ width: pct + '%' }} /></div>
            </div>
          )}
          <p className="text-xs text-slate-400">Se actualizează doar pozele (după SKU). Prețurile și stocul rămân neatinse.</p>
        </div>
      )}
    </div>
  );
}
