"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  initialBalance: number; // starting principal
  startDateISO: string; // account start date
  monthlyTargetPct?: number; // default 1.5%
};

export default function ProgressTarget({ initialBalance, startDateISO, monthlyTargetPct = 1.5 }: Props) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000); // update each minute
    return () => clearInterval(t);
  }, []);

  const { currentBalance, progressPct, goalThisCycle } = useMemo(() => {
    const startDate = new Date(startDateISO);
    const msPerDay = 86_400_000;
    const daysSinceStart = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / msPerDay));

    // approximate daily rate from monthly target
    const dailyRate = monthlyTargetPct / 100 / 30; // e.g., 1.5% / 30

    const currentBalance = initialBalance * Math.pow(1 + dailyRate, daysSinceStart);

    const cycleDays = 30;
    const daysIntoCurrentCycle = daysSinceStart % cycleDays;
    const progressPct = (daysIntoCurrentCycle / cycleDays) * 100;

    const daysAtCycleStart = daysSinceStart - daysIntoCurrentCycle;
    const balanceAtCycleStart = initialBalance * Math.pow(1 + dailyRate, daysAtCycleStart);
    const balanceAtCycleEnd = balanceAtCycleStart * Math.pow(1 + dailyRate, cycleDays);
    const goalThisCycle = balanceAtCycleEnd - balanceAtCycleStart;

    return { currentBalance, progressPct, goalThisCycle };
  }, [initialBalance, startDateISO, monthlyTargetPct, now]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-white">Monthly Target {monthlyTargetPct.toFixed(2)}%</h3>
        <span className="text-xs text-gray-400">30-day cycle</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-gray-800">
        <div className="h-2 bg-emerald-500" style={{ width: `${progressPct.toFixed(2)}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="text-gray-400">Current Balance</div>
        <div className="text-right text-white">${currentBalance.toFixed(2)}</div>
        <div className="text-gray-400">This 30-Day Goal</div>
        <div className="text-right text-emerald-400">+${goalThisCycle.toFixed(2)}</div>
      </div>
    </div>
  );
}

