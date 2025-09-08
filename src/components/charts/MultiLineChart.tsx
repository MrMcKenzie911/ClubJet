"use client";

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export type SeriesDef = { key: string; label: string; color?: string };
export type MultiLineDatum = { label: string; [key: string]: number | string };

export default function MultiLineChart({ data, series }: { data: MultiLineDatum[]; series: SeriesDef[] }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0B0F14] p-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="label" tick={{ fill: '#d1d5db', fontSize: 12 }} tickLine={{ stroke: '#374151' }} axisLine={{ stroke: '#374151' }} />
            <YAxis tick={{ fill: '#d1d5db', fontSize: 12 }} tickFormatter={(v) => `$${Number(v).toLocaleString(undefined,{maximumFractionDigits:0})}`} tickLine={{ stroke: '#374151' }} axisLine={{ stroke: '#374151' }} />
            <Tooltip contentStyle={{ background: '#0B0F14', border: '1px solid #4b5563', color: '#f9fafb' }} formatter={(v: number | string) => `$${Number(v).toLocaleString()}`} />
            <Legend wrapperStyle={{ color: '#f9fafb' }} />
            {series.map((s, idx) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color || (idx === 0 ? '#FFD700' : '#9CA3AF')} strokeWidth={3} dot={{ r: 2, stroke: '#FFD700', strokeWidth: 1 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

