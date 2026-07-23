import { useState } from 'react';
import * as XLSX from 'xlsx';
import { mapClients, type MappedClient } from '@/lib/clientMap';

const CHUNK = 200;
const MAX_RETRIES = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ClientImporter() {
  const [clients, setClients] = useState<MappedClient[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState('');

  async function onFile(file: File) {
    setError('');
    setResult('');
    setProgress(null);
    setClients([]);
    setFileName(file.name);
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      const mapped = mapClients(rows);
      if (mapped.length === 0) setError('Nu am găsit clienți valizi (lipsește coloana de nume?).');
      else setClients(mapped);
    } catch (e) {
      setError('Nu am putut citi fișierul: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setError('');
    setResult('');
    setBusy(true);
    const total = clients.length;
    setProgress({ done: 0, total });
    let done = 0;
    let inserted = 0;
    let skipped = 0;
    try {
      for (let i = 0; i < total; i += CHUNK) {
        const chunk = clients.slice(i, i + CHUNK);
        let ok = false;
        let lastErr = '';
        for (let attempt = 0; attempt < MAX_RETRIES && !ok; attempt++) {
          if (attempt > 0) await sleep(700 * 2 ** attempt);
          try {
            const res = await fetch('/api/clients/import', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ clients: chunk }),
            });
            const text = await res.text();
            let data: { inserted?: number; skipped?: number; error?: string };
            try {
              data = JSON.parse(text);
            } catch {
              throw new Error(`Server ocupat (HTTP ${res.status})`);
            }
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            inserted += data.inserted ?? 0;
            skipped += data.skipped ?? 0;
            done += chunk.length;
            setProgress({ done, total });
            ok = true;
          } catch (e) {
            lastErr = (e as Error).message;
          }
        }
        if (!ok) throw new Error(`${lastErr} (la rândul ${i}, după ${MAX_RETRIES} încercări)`);
        await sleep(100);
      }
      setResult(`✅ Import finalizat: ${inserted} clienți adăugați, ${skipped} săriți (duplicate după email sau fără nume).`);
      setClients([]);
    } catch (e) {
      setError('Import oprit: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nume', 'Firma', 'Email', 'Telefon', 'CIF', 'Adresa', 'Note'],
      ['Popescu Andrei', 'Exemplu SRL', 'andrei@exemplu.ro', '0721000111', 'RO12345678', 'Str. Exemplu 1, București', 'client nou'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clienti');
    XLSX.writeFile(wb, 'template-clienti.xlsx');
  }

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const preview = clients.slice(0, 8);

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {result && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {result} <a href="/clients" className="font-semibold underline">Vezi clienții →</a>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            📄 Alege fișier Excel / CSV
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          </label>
          {fileName && <span className="text-sm text-slate-500">{fileName}</span>}
          <button type="button" onClick={downloadTemplate} className="ml-auto text-sm text-indigo-600 hover:underline">
            ↓ Descarcă template
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Coloane recunoscute automat: Nume (sau First/Last Name), Firmă, Email, Telefon, CIF, Adresă (Address/City/County), Note.
        </p>
      </div>

      {clients.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{clients.length} clienți pregătiți</h2>
            <button type="button" onClick={runImport} disabled={busy} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {busy ? 'Se importă...' : `Importă ${clients.length} clienți`}
            </button>
          </div>

          {progress && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs text-slate-500"><span>{progress.done} / {progress.total}</span><span>{pct}%</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-green-500 transition-all" style={{ width: pct + '%' }} /></div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr><th className="py-2">Nume</th><th className="py-2">Firmă</th><th className="py-2">Email</th><th className="py-2">Telefon</th><th className="py-2">CIF</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((c, i) => (
                  <tr key={i}>
                    <td className="py-1.5 font-medium text-slate-800">{c.name}</td>
                    <td className="py-1.5 text-slate-500">{c.company || '—'}</td>
                    <td className="py-1.5 text-slate-500">{c.email || '—'}</td>
                    <td className="py-1.5 text-slate-500">{c.phone || '—'}</td>
                    <td className="py-1.5 text-slate-500">{c.taxId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clients.length > preview.length && <p className="mt-2 text-xs text-slate-400">... și încă {clients.length - preview.length} clienți.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
