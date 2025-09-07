"use client";
import React from "react";

// Black + Gold modal that shows the detailed referral tree examples
// Design adapted from the provided HTML; trimmed and Tailwind-ified
// This is static content for the showcase modal.

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ReferralDetailedModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-amber-700/40 bg-[#0B0F14] shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0E1116] via-[#0B0F14] to-[#0E1116] border-b border-amber-800/40 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-amber-400">CORRECTED Referral Tree Examples</h2>
              <p className="mt-1 text-xs text-amber-200/80">Founding members earn bonuses for EVERY person in their downline at each level</p>
            </div>
            <button onClick={onClose} className="rounded-md border border-amber-700/40 bg-[#0F141B] px-3 py-1 text-amber-300 hover:text-amber-100">Close</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="max-h-[72vh] overflow-y-auto p-5 space-y-6">
          {/* Tree component */}
          <TreeSection title="Tree #1: Small Network (4 Members)">
            <Person name="Sarah Chen" invest="$8,500" status="Founding Member" founding />
            <Connector />
            <Person name="Mike Rodriguez" invest="$2,000" status="Level 1 under Sarah" />
            <Connector />
            <Person name="Lisa Park" invest="$1,500" status="Level 2 under Sarah" />
            <Connector />
            <Person name="Tom Wilson" invest="$3,200" status="Level 3 under Sarah" />
            <BonusSummary
              items={[
                { level: 1, calc: "1 person × $25", amount: "$25.00" },
                { level: 2, calc: "1 person × $25", amount: "$25.00" },
                { level: 3, calc: "1 person × $16.67", amount: "$16.67" },
              ]}
              total="$66.67"
            />
            <Stats totalMembers={4} totalInvest="$15,200" depth="3 Levels" />
          </TreeSection>

          <TreeSection title="Tree #2: Medium Network (7 Members)">
            <Person name="Alex Thompson" invest="$12,000" status="Founding Member" founding />
            <Connector />
            <div className="flex flex-wrap items-start justify-center gap-3">
              <Person name="Emma Davis" invest="$4,500" status="Level 1" />
              <Person name="James Lee" invest="$6,200" status="Level 1" />
            </div>
            <Connector />
            <div className="flex flex-wrap items-start justify-center gap-3">
              <Person name="Brian Kim" invest="$2,200" status="Level 2" />
              <Person name="Sofia Patel" invest="$3,300" status="Level 2" />
            </div>
            <Connector />
            <div className="flex flex-wrap items-start justify-center gap-3">
              <Person name="Noah Green" invest="$1,100" status="Level 3" />
              <Person name="Ava Brooks" invest="$1,250" status="Level 3" />
            </div>
            <BonusSummary
              items={[
                { level: 1, calc: "2 people × $25", amount: "$50.00" },
                { level: 2, calc: "2 people × $25", amount: "$50.00" },
                { level: 3, calc: "2 people × $16.67", amount: "$33.34" },
              ]}
              total="$133.34"
            />
            <Stats totalMembers={7} totalInvest="$30,550" depth="4 Levels" />
          </TreeSection>

          <TreeSection title="Tree #3: Large Network (9 Members)">
            <Person name="Jordan Miller" invest="$20,000" status="Founding Member" founding />
            <Connector />
            <div className="flex flex-wrap items-start justify-center gap-3">
              <Person name="Zoe Carter" invest="$7,800" status="Level 1" />
              <Person name="Ethan Ross" invest="$5,600" status="Level 1" />
              <Person name="Olivia Nguyen" invest="$4,100" status="Level 1" />
            </div>
            <Connector />
            <div className="flex flex-wrap items-start justify-center gap-3">
              <Person name="Liam Adams" invest="$2,900" status="Level 2" />
              <Person name="Mia Clark" invest="$3,400" status="Level 2" />
            </div>
            <Connector />
            <div className="flex flex-wrap items-start justify-center gap-3">
              <Person name="Caleb Ortiz" invest="$1,450" status="Level 3" />
              <Person name="Hannah Park" invest="$1,750" status="Level 3" />
            </div>
            <Connector />
            <div className="flex flex-wrap items-start justify-center gap-3">
              <Person name="Wyatt Reed" invest="$1,200" status="Level 4" />
              <Person name="Nora King" invest="$1,300" status="Level 4" />
            </div>
            <BonusSummary
              items={[
                { level: 1, calc: "3 people × $25", amount: "$75.00" },
                { level: 2, calc: "2 people × $25", amount: "$50.00" },
                { level: 3, calc: "2 people × $16.67", amount: "$33.34" },
                { level: 4, calc: "2 people × $16.67", amount: "$33.34" },
              ]}
              total="$191.68"
            />
            <Stats totalMembers={9} totalInvest="$49,500" depth="5 Levels" />
          </TreeSection>
        </div>
      </div>
    </div>
  );
}

function TreeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0F141B] p-4">
      <div className="mb-3 rounded-lg border border-amber-800/40 bg-gradient-to-r from-[#0F141B] to-[#0B0F14] p-3 text-center text-amber-200">
        <div className="text-base font-semibold text-amber-300">{title}</div>
      </div>
      <div className="flex flex-col items-center gap-3">{children}</div>
    </div>
  );
}

function Person({ name, invest, status, founding }: { name: string; invest: string; status: string; founding?: boolean }) {
  return (
    <div className={`min-w-[200px] rounded-xl border p-3 text-center shadow-md transition-transform hover:scale-[1.02] ${
      founding ? "border-amber-500/70 bg-[#0B0F14]" : "border-blue-500/50 bg-[#0F141B]"
    }`}>
      <div className="text-sm font-semibold text-amber-200">{name}</div>
      <div className="text-xs font-semibold text-emerald-400">Investment: {invest}</div>
      <div className={`text-[11px] italic ${founding ? "text-amber-400" : "text-blue-300"}`}>{founding ? "⭐ " : "👤 "}{status}</div>
    </div>
  );
}

function Connector() {
  return <div className="h-6 w-[2px] bg-gray-700" />;
}

function BonusSummary({ items, total }: { items: Array<{ level: number; calc: string; amount: string }>; total: string }) {
  return (
    <div className="mt-2 rounded-xl border border-amber-700/40 bg-[#0B0F14] p-4">
      <div className="text-sm font-semibold text-amber-300">Founding Member Bonuses</div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.level} className="rounded-lg border border-amber-800/40 bg-[#0F141B] p-3">
            <div className="text-xs font-semibold text-amber-400">Level {it.level}</div>
            <div className="text-xs text-amber-200/80">{it.calc}</div>
            <div className="text-sm font-bold text-amber-300">{it.amount}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-emerald-700/30 bg-[#0F141B] p-3 text-center">
        <div className="text-xs font-semibold text-emerald-300">Total Bonus</div>
        <div className="text-lg font-extrabold text-emerald-400">{total}</div>
      </div>
    </div>
  );
}

function Stats({ totalMembers, totalInvest, depth }: { totalMembers: number; totalInvest: string; depth: string }) {
  return (
    <div className="mt-2 rounded-xl border border-gray-800 bg-[#0F141B] p-3 text-center">
      <div className="space-x-4 text-xs">
        <span className="font-semibold text-amber-300">Total Members:</span>
        <span className="text-amber-200/80">{totalMembers}</span>
        <span className="font-semibold text-amber-300">Total Investments:</span>
        <span className="text-amber-200/80">{totalInvest}</span>
        <span className="font-semibold text-amber-300">Network Depth:</span>
        <span className="text-amber-200/80">{depth}</span>
      </div>
    </div>
  );
}

