"use client";

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";

type Props = { initialBalance: number; startDateISO: string; monthlyTargetPct?: number };

export default function BalanceChart({ initialBalance, startDateISO, monthlyTargetPct = 1.5 }: Props) {
  const data = buildData(initialBalance, startDateISO, monthlyTargetPct);
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-2 font-semibold text-white">Balance (Last 30 Days)</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#e5e7eb' }} formatter={(v: number | string) => `$${Number(v).toFixed(2)}`} />
            <Area dataKey="balance" stroke="#10b981" fill="url(#g)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function buildData(initialBalance: number, startDateISO: string, monthlyTargetPct: number) {
  const now = new Date();
  const startDate = new Date(startDateISO);
  const msPerDay = 86_400_000;
  const daysSinceStart = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / msPerDay));
  const dailyRate = monthlyTargetPct / 100 / 30;
  const points: { label: string; balance: number }[] = [];
  for (let i = Math.max(0, daysSinceStart - 29); i <= daysSinceStart; i++) {
    const date = new Date(now.getTime() - (daysSinceStart - i) * msPerDay);
    const balance = initialBalance * Math.pow(1 + dailyRate, i);
    points.push({ label: `${date.getMonth() + 1}/${date.getDate()}`, balance });
  }
  return points;
}

