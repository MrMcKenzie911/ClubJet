"use client";
import { motion } from "framer-motion";

export default function WhyChoose() {
  const items = [
    {
      title: "Institutional Discipline",
      desc: "Operational controls, audited flows, and clear approvals for every action.",
    },
    {
      title: "Aligned Incentives",
      desc: "Transparent terms for Lender (fixed) and Network (variable) accounts.",
    },
    {
      title: "Modern Experience",
      desc: "Clean dashboards, quick actions, and real-time status updates.",
    },
    {
      title: "Security by Design",
      desc: "Supabase Auth + RLS, role-based routing, and protected admin operations.",
    },
  ];

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-center text-2xl sm:text-3xl font-semibold text-white">Why Choose Club Aureus</h2>
      <p className="mt-2 text-center text-sm text-gray-400">Premium platform with a disciplined operating model</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <motion.div
            key={it.title}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-gray-700 bg-[#1a1a1a] p-5 shadow transition-colors duration-200 hover:bg-[#2a2a2a] hover:border-gray-500 hover:shadow-lg"
          >
            <h3 className="text-white font-semibold">{it.title}</h3>
            <p className="mt-2 text-sm text-gray-400">{it.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

