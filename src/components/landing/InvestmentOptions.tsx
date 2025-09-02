"use client";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.5 }}
      className="group relative rounded-2xl p-[1px] bg-gradient-to-b from-amber-400/40 to-transparent h-full"
    >
      <div className="rounded-2xl bg-gray-900/70 border border-white/10 p-6 shadow-2xl shadow-black/20 flex flex-col h-full">
        {children}
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500 bg-[radial-gradient(300px_120px_at_20%_0%,rgba(252,187,0,0.15),transparent)]" />
    </motion.div>
  );
}

export default function InvestmentOptions({ onOpenSignup }: { onOpenSignup: () => void }) {
  return (
    <section id="services" className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">Vehicle Options</h2>
        <p className="mt-2 text-gray-400">Choose the strategy that aligns with your goals and risk profile.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 items-stretch">
        <Card>
          <div className="flex items-start justify-between">
            <h3 className="text-xl font-semibold text-white">Lender Account</h3>
            <span className="rounded-full bg-amber-400/15 text-amber-300 text-xs px-2 py-1 border border-amber-400/30">Fixed Returns</span>
          </div>
          <div className="flex flex-col flex-1">
            <p className="mt-2 text-gray-400">Stable returns with fixed monthly rates based on investment amount and duration.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-200">
              <div>Standard Rate</div><div className="text-right">1.00%</div>
              <div>Premium Rate</div><div className="text-right">1.125%</div>
              <div>Elite Rate</div><div className="text-right">1.25%</div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-300">
              {[
                "Guaranteed returns",
                "Lower risk profile",
                "Predictable income stream",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-300" />{t}</li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <button onClick={onOpenSignup} className="w-full rounded-md bg-amber-400 px-4 py-2 font-semibold text-black hover:bg-amber-300 transition">Apply Now</button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <h3 className="text-xl font-semibold text-white">Network Account</h3>
            <span className="rounded-full bg-amber-400/15 text-amber-300 text-xs px-2 py-1 border border-amber-400/30">Variable Returns</span>
          </div>
          <div className="flex flex-col flex-1">
            <p className="mt-2 text-gray-400">Share in performance-based returns with higher potential upside.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-200">
              <div>Revenue Share</div><div className="text-right">50%</div>
              <div>Performance Based</div><div className="text-right">Monthly</div>
              <div>Potential Upside</div><div className="text-right">Unlimited</div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-300">
              {[
                "Higher growth potential",
                "Participate in upside",
                "Performance transparency",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-300" />{t}</li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <button onClick={onOpenSignup} className="w-full rounded-md bg-amber-400 px-4 py-2 font-semibold text-black hover:bg-amber-300 transition">Get Started</button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

