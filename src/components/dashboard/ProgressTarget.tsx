"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  initialBalance: number; // starting principal
  startDateISO: string; // account start date
  monthlyTargetPct?: number; // default 1.5%
  currentBalance?: number; // actual current balance from accounts
};

export default function ProgressTarget({ initialBalance, startDateISO, monthlyTargetPct = 1.5, currentBalance }: Props) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000); // update each minute
    return () => clearInterval(t);
  }, []);

  const { actualCurrentBalance, progressPct, goalThisCycle } = useMemo(() => {
    const startDate = new Date(startDateISO);
    const msPerDay = 86_400_000;
    const daysSinceStart = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / msPerDay));

    // Use actual current balance if provided, otherwise calculate theoretical
    const actualCurrentBalance = currentBalance ?? (initialBalance * Math.pow(1 + (monthlyTargetPct / 100 / 30), daysSinceStart));

    const cycleDays = 30;
    const daysIntoCurrentCycle = daysSinceStart % cycleDays;
    const progressPct = (daysIntoCurrentCycle / cycleDays) * 100;

    // Calculate this month's target growth
    const monthlyGrowthTarget = actualCurrentBalance * (monthlyTargetPct / 100);
    const goalThisCycle = monthlyGrowthTarget;

    return { actualCurrentBalance, progressPct, goalThisCycle };
  }, [initialBalance, startDateISO, monthlyTargetPct, now, currentBalance]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-white">Monthly Target</h3>
        <span className="text-xs rounded-full border border-emerald-600/60 bg-emerald-600/10 px-2 py-0.5 text-emerald-300">+{monthlyTargetPct.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-gray-800">
        <div className="h-2 bg-emerald-500" style={{ width: `${progressPct.toFixed(2)}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="text-gray-400">Current Balance</div>
        <div className="text-right text-white">${actualCurrentBalance.toFixed(2)}</div>
        <div className="text-gray-400">This 30-Day Goal</div>
        <div className="text-right text-emerald-400">+${goalThisCycle.toFixed(2)}</div>
      </div>
    </div>
  );
}

