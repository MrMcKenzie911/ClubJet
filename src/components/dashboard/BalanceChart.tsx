"use client";

import { Line, LineChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts";

type Props = { initialBalance: number; startDateISO: string; monthlyTargetPct?: number };

export default function BalanceChart({ initialBalance, startDateISO, monthlyTargetPct = 1.5 }: Props) {
  const data = buildData(initialBalance, startDateISO, monthlyTargetPct);
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

