import { useState } from 'react';
import type { NewProduct } from '@/db/schema';

const CHUNK = 100;
const MAX_RETRIES = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Props {
  url: string;
  priceField?: string;
  source?: string;
}

export default function QuickFeedSync({ url, priceField = 'PRET_A', source = 'spotvision-b2b' }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function sync() {
    if (busy) return;
    setBusy(true);
    setError('');
    setStatus('Descarc feed-ul...');
    setProgress(null);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, priceField, source }),
      });
      const data = (await res.json()) as { products?: NewProduct[]; error?: string };
      if (!res.ok || !data.products) {
        setError(data.error || 'Nu am putut descărca feed-ul. Încearcă „Import feed" cu fișier.');
        setBusy(false);
        setStatus('');
        return;
      }
      const products = data.products;
      const total = products.length;
      let done = 0;
      setStatus('');
      setProgress({ done, total });

      for (let i = 0; i < total; i += CHUNK) {
        const chunk = products.slice(i, i + CHUNK);
        let ok = false;
        let lastErr = '';
        for (let attempt = 0; attempt < MAX_RETRIES && !ok; attempt++) {
          if (attempt > 0) await sleep(700 * 2 ** attempt);
          try {
            const r = await fetch('/api/products/import', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ items: chunk, ensure: i === 0 }),
            });
            const t = await r.text();
            let d: { processed?: number; error?: string };
            try {
              d = JSON.parse(t);
            } catch {
              throw new Error(`Server ocupat (HTTP ${r.status})`);
            }
            if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
            done += chunk.length;
            setProgress({ done, total });
            ok = true;
          } catch (e) {
            lastErr = (e as Error).message;
          }
        }
        if (!ok) throw new Error(lastErr);
        await sleep(80);
      }

      await fetch('/api/feed', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: source, url, priceField, count: done }),
      }).catch(() => {});

      setProgress(null);
      setStatus(`✅ ${done} produse actualizate. Reîncarc...`);
      setTimeout(() => location.reload(), 1400);
    } catch (e) {
      setError('Actualizare oprită: ' + (e as Error).message);
      setBusy(false);
    }
  }

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
      >
        {busy ? '⏳ Se actualizează...' : '🔄 Actualizează prețuri & stoc'}
      </button>
      {progress && (
        <div className="flex min-w-[160px] flex-1 items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: pct + '%' }} />
          </div>
          <span className="text-xs text-slate-500">{progress.done}/{progress.total}</span>
        </div>
      )}
      {status && <span className="text-sm text-emerald-700">{status}</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
