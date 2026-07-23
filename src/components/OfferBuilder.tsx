import { useMemo, useState } from 'react';
import type { Client, Product } from '@/db/schema';
import { computeOfferTotals } from '@/lib/offer';
import { formatMoney } from '@/lib/money';

interface Line {
  key: number;
  productId: number | null;
  description: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number;
}

interface Props {
  clients: Client[];
  products: Product[];
}

let keySeq = 1;
const emptyLine = (): Line => ({
  key: keySeq++,
  productId: null,
  description: '',
  unit: 'buc',
  qty: 1,
  unitPrice: 0,
  discountPct: 0,
  vatRate: 19,
});

const inputCls =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';

export default function OfferBuilder({ clients, products }: Props) {
  const [clientId, setClientId] = useState<number | ''>('');
  const [status, setStatus] = useState<'draft' | 'sent'>('draft');
  const [validUntil, setValidUntil] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totals = useMemo(
    () => computeOfferTotals(lines.map((l) => ({ qty: l.qty, unitPrice: l.unitPrice, discountPct: l.discountPct, vatRate: l.vatRate })), discountPct),
    [lines, discountPct],
  );

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickProduct(key: number, productId: number) {
    const p = products.find((x) => x.id === productId);
    if (!p) {
      updateLine(key, { productId: null });
      return;
    }
    updateLine(key, {
      productId: p.id,
      description: p.name,
      unit: p.unit,
      unitPrice: p.price,
      vatRate: p.vatRate,
    });
  }

  async function submit() {
    setError('');
    if (!clientId) return setError('Selectează un client.');
    const validLines = lines.filter((l) => l.description.trim() && l.qty > 0);
    if (validLines.length === 0) return setError('Adaugă cel puțin o linie validă (descriere + cantitate).');

    setSaving(true);
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: Number(clientId),
          status,
          validUntil: validUntil || null,
          discountPct,
          notes: notes || null,
          items: validLines.map((l) => ({
            productId: l.productId,
            description: l.description,
            unit: l.unit,
            qty: l.qty,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct,
            vatRate: l.vatRate,
          })),
        }),
      });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error || 'Eroare la salvare.');
        setSaving(false);
        return;
      }
      window.location.href = '/offers/' + data.id;
    } catch (e) {
      setError('Eroare rețea: ' + (e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Antet oferta */}
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-slate-600">Client *</label>
          <select className={inputCls + ' mt-1'} value={clientId} onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">— alege client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Valabilă până la</label>
          <input type="date" className={inputCls + ' mt-1'} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Discount ofertă (%)</label>
          <input type="number" step="0.1" min="0" max="100" className={inputCls + ' mt-1'} value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value) || 0)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Status</label>
          <select className={inputCls + ' mt-1'} value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'sent')}>
            <option value="draft">Ciornă</option>
            <option value="sent">Trimisă</option>
          </select>
        </div>
      </div>

      {/* Linii */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Produs / descriere</th>
              <th className="px-3 py-2 w-20">Cant.</th>
              <th className="px-3 py-2 w-16">UM</th>
              <th className="px-3 py-2 w-28">Preț unit.</th>
              <th className="px-3 py-2 w-20">Disc %</th>
              <th className="px-3 py-2 w-20">TVA %</th>
              <th className="px-3 py-2 w-28 text-right">Net</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l) => {
              const net = l.qty * l.unitPrice * (1 - l.discountPct / 100);
              return (
                <tr key={l.key} className="align-top">
                  <td className="px-3 py-2">
                    <select className={inputCls + ' mb-1'} value={l.productId ?? ''} onChange={(e) => (e.target.value ? pickProduct(l.key, Number(e.target.value)) : updateLine(l.key, { productId: null }))}>
                      <option value="">— produs din catalog —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.price)}</option>
                      ))}
                    </select>
                    <input className={inputCls} placeholder="Descriere linie" value={l.description} onChange={(e) => updateLine(l.key, { description: e.target.value })} />
                  </td>
                  <td className="px-3 py-2"><input type="number" step="0.001" className={inputCls} value={l.qty} onChange={(e) => updateLine(l.key, { qty: Number(e.target.value) || 0 })} /></td>
                  <td className="px-3 py-2"><input className={inputCls} value={l.unit} onChange={(e) => updateLine(l.key, { unit: e.target.value })} /></td>
                  <td className="px-3 py-2"><input type="number" step="0.01" className={inputCls} value={l.unitPrice} onChange={(e) => updateLine(l.key, { unitPrice: Number(e.target.value) || 0 })} /></td>
                  <td className="px-3 py-2"><input type="number" step="0.1" className={inputCls} value={l.discountPct} onChange={(e) => updateLine(l.key, { discountPct: Number(e.target.value) || 0 })} /></td>
                  <td className="px-3 py-2"><input type="number" step="0.1" className={inputCls} value={l.vatRate} onChange={(e) => updateLine(l.key, { vatRate: Number(e.target.value) || 0 })} /></td>
                  <td className="px-3 py-2 text-right font-medium text-slate-900">{formatMoney(net)}</td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== l.key) : prev))} className="text-slate-400 hover:text-red-600" title="Șterge linia">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t border-slate-200 p-3">
          <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])} className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
            + Adaugă linie
          </button>
        </div>
      </div>

      {/* Note + totaluri */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">Note / condiții</label>
          <textarea className={inputCls + ' mt-1'} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Termen de livrare, condiții de plată..." />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal (fără TVA)</dt><dd className="font-medium">{formatMoney(totals.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Discount ofertă</dt><dd className="font-medium text-red-600">− {formatMoney(totals.discountTotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">TVA</dt><dd className="font-medium">{formatMoney(totals.vatTotal)}</dd></div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base"><dt className="font-semibold text-slate-900">Total</dt><dd className="font-bold text-indigo-700">{formatMoney(totals.total)}</dd></div>
          </dl>
          <button type="button" onClick={submit} disabled={saving} className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Se salvează...' : 'Salvează oferta'}
          </button>
        </div>
      </div>
    </div>
  );
}
