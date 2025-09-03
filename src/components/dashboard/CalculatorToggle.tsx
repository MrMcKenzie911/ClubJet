"use client";
import { useMemo, useState } from "react";

export default function CalculatorToggle() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [rate, setRate] = useState<string>("1.5"); // % per month
  const [months, setMonths] = useState<string>("12");

  const projected = useMemo(() => {
    const A = parseFloat(amount || "0");
    const r = (parseFloat(rate || "0") || 0) / 100;
    const m = parseInt(months || "0", 10) || 0;
    if (!A || !m) return 0;
    return A * Math.pow(1 + r, m);
  }, [amount, rate, months]);

  return (
    <>
      <button
        className="rounded-lg border border-gray-800 bg-[#0F141B] text-gray-200 hover:border-amber-600 hover:text-amber-400 px-3 py-2 text-sm"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Growth Calculator
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-[#0B0F14] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Calculator</h3>
              <button onClick={() => setOpen(false)} className="rounded bg-gray-800 px-2 py-1 text-gray-200">Close</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-300">Amount
                <input value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-2 py-1 text-white" />
              </label>
              <label className="text-sm text-gray-300">Rate % / mo
                <input value={rate} onChange={e=>setRate(e.target.value)} className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-2 py-1 text-white" />
              </label>
              <label className="text-sm text-gray-300">Months
                <input value={months} onChange={e=>setMonths(e.target.value)} className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-2 py-1 text-white" />
              </label>
              <div className="flex items-end">
                <div className="w-full rounded bg-black/30 px-3 py-2 text-sm text-amber-400 border border-gray-800">
                  Projected Value: ${projected.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

