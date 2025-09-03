"use client";
import { useEffect, useState } from "react";

type Band = { name: string; min_amount: number; max_amount: number; rate_percent: number; duration_months: number };

export default function LenderBandsEditor() {
  const [bands, setBands] = useState<Band[]>([
    { name: '1.00%', min_amount: 0, max_amount: 9999, rate_percent: 1.00, duration_months: 12 },
    { name: '1 1/8', min_amount: 10000, max_amount: 49999, rate_percent: 1.125, duration_months: 12 },
    { name: '1.25%', min_amount: 50000, max_amount: 999999999, rate_percent: 1.25, duration_months: 12 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/lender-bands');
      const j = await res.json();
      if (Array.isArray(j.data) && j.data.length) {
        setBands(j.data.map((x:Band)=>({ name: x.name, min_amount: Number(x.min_amount), max_amount: Number(x.max_amount), rate_percent: Number(x.rate_percent), duration_months: Number(x.duration_months) })));
      }
    })();
  }, []);

  async function save() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/lender-bands', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bands })
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Failed to save bands');
    }
  }

  function update(i: number, patch: Partial<Band>) {
    setBands((prev) => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  }

  return (
    <div id="lender-bands" className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">LENDER Fixed Bands</h3>
        <button onClick={save} disabled={loading} className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1 disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
      </div>
      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {bands.map((b, i) => (
          <div key={i} className="rounded border border-gray-800 bg-black/20 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <label className="w-24 text-sm text-gray-400">Name</label>
              <input className="flex-1 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" value={b.name} onChange={(e)=>update(i,{name:e.target.value})} />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 text-sm text-gray-400">Min</label>
              <input type="number" className="flex-1 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" value={b.min_amount} onChange={(e)=>update(i,{min_amount:Number(e.target.value)})} />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 text-sm text-gray-400">Max</label>
              <input type="number" className="flex-1 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" value={b.max_amount} onChange={(e)=>update(i,{max_amount:Number(e.target.value)})} />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 text-sm text-gray-400">Rate %</label>
              <input type="number" step="0.001" className="flex-1 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" value={b.rate_percent} onChange={(e)=>update(i,{rate_percent:Number(e.target.value)})} />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 text-sm text-gray-400">Duration</label>
              <input type="number" className="flex-1 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" value={b.duration_months} onChange={(e)=>update(i,{duration_months:Number(e.target.value)})} />
              <span className="text-xs text-gray-400">months</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

