"use client";

import { Line, LineChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Area } from "recharts";

type Txn = { created_at: string; type: string; amount: number; status?: string };
type Props = { initialBalance: number; startDateISO: string; monthlyTargetPct?: number; transactions?: Txn[] };

export default function BalanceChart({ initialBalance, startDateISO, monthlyTargetPct = 1.5, transactions = [] }: Props) {
  const data = buildDataFromTransactions(initialBalance, startDateISO, monthlyTargetPct, transactions);
  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0B0F14] p-4">
      <h3 className="mb-2 font-semibold text-white">Performance Overview</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="gold-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EAB308" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#EAB308" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={{ background: '#0B0F14', border: '1px solid #374151', color: '#e5e7eb' }} formatter={(v: number | string) => `$${Number(v).toFixed(2)}`} />
            <Area dataKey="balance" stroke="#EAB308" fill="url(#gold-fill)" type="monotone" />
            <Line dataKey="balance" stroke="#FACC15" strokeWidth={3} dot={{ r: 3, stroke: '#FACC15', strokeWidth: 2, fill: '#0B0F14' }} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function buildDataFromTransactions(initialBalance: number, startDateISO: string, monthlyTargetPct: number, transactions: Txn[]) {
  const now = new Date();
  const startDate = startDateISO ? new Date(startDateISO) : new Date(now.getTime() - 30*86_400_000);
  const msPerDay = 86_400_000;
  const daysSinceStart = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / msPerDay));

  // Build a daily ledger for last 30 days using posted/completed transactions.
  // Start from initialBalance and apply daily growth + same-day transactions.
  const windowStart = new Date(now.getTime() - Math.min(29, daysSinceStart) * msPerDay);
  const perDayTx: Record<string, number> = {};
  (transactions || []).forEach(t => {
    if (!t?.created_at) return;
    if (t.status && !['posted','completed',''].includes(String(t.status))) return;
    const d = new Date(t.created_at);
    if (d < windowStart) return;
    const key = d.toISOString().slice(0,10);
    const sign = t.type === 'DEPOSIT' || t.type === 'INTEREST' || t.type === 'COMMISSION' ? 1 : (t.type === 'WITHDRAWAL' ? -1 : 0);
    if (!sign) return;
    perDayTx[key] = (perDayTx[key] || 0) + sign * Number(t.amount || 0);
  });

  // Estimate the balance at windowStart using growth from startDate to windowStart
  const dailyRate = monthlyTargetPct / 100 / 30;
  const daysFromStartToWindow = Math.max(0, Math.floor((windowStart.getTime() - startDate.getTime()) / msPerDay));
  let balance = initialBalance * Math.pow(1 + dailyRate, daysFromStartToWindow);

  const points: { label: string; balance: number }[] = [];
  for (let offset = 0; offset <= Math.min(29, daysSinceStart); offset++) {
    const date = new Date(windowStart.getTime() + offset * msPerDay);
    // apply modeled daily growth
    balance = balance * (1 + dailyRate);
    // apply transactions of the day
    const key = date.toISOString().slice(0,10);
    if (perDayTx[key]) balance += perDayTx[key];
    points.push({ label: `${date.getMonth() + 1}/${date.getDate()}`, balance });
  }
  return points;
}

