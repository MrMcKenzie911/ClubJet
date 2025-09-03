"use client";
import { motion } from "framer-motion";
import { ShieldCheck, BarChart3, Users, TimerReset } from "lucide-react";

const items = [
  { icon: BarChart3, title: "Premium Returns", body: "Competitive yields with transparent fees and performance tracking." },
  { icon: ShieldCheck, title: "Secure Platform", body: "Bank‑level security, encrypted transactions, and audit trails." },
  { icon: Users, title: "Expert Management", body: "Experienced team in aviation and investment oversight." },
  { icon: TimerReset, title: "Flexible Terms", body: "Structured schedules and clear release timelines." },
];

export default function FeaturesRow() {
  return (
    <section className="bg-gradient-to-b from-transparent to-black/20">
      <div className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">Why Choose Club Aureus</h2>
        <p className="mt-2 text-gray-400">Professional asset management with institutional‑grade security and transparency.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {items.map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(252,187,0,0.15)" }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-transform"
            >
              <Icon className="h-6 w-6 text-amber-300" />
              <h3 className="mt-3 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-gray-300">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

