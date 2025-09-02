"use client";
import { motion } from "framer-motion";
import { useState } from "react";

export default function ContactAlt({ onOpenSignup }: { onOpenSignup: () => void }) {
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload: { event: "contact"; name: FormDataEntryValue | null; email: FormDataEntryValue | null; message: FormDataEntryValue | null } = {
      event: "contact",
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
    };
    try {
      setStatus("Sending...");
      const res = await fetch("/api/send-to-n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to send");
      setStatus("Message sent. We'll be in touch.");
      e.currentTarget.reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send";
      setStatus(message);
    }
  }

  return (
    <section id="contact" className="mx-auto max-w-6xl px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-br from-black/70 to-black/40 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -inset-px rounded-3xl bg-[radial-gradient(600px_200px_at_50%_0,rgba(252,187,0,0.08),transparent)]" />
        <div className="relative text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Let’s Talk About Your Next Move</h2>
          <p className="mt-2 text-gray-300">Prefer a guided start? Our team will reach out after you apply.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onOpenSignup} className="rounded-md bg-amber-400 px-5 py-2 font-semibold text-black hover:bg-amber-300 transition">Apply Now</button>
          </div>
          <form onSubmit={onSubmit} className="mt-8 grid gap-3 sm:grid-cols-3">
            <input name="name" placeholder="Your name" className="rounded-md bg-black/40 border border-white/10 px-3 py-2 text-white" required />
            <input type="email" name="email" placeholder="Email" className="rounded-md bg-black/40 border border-white/10 px-3 py-2 text-white" required />
            <button type="submit" className="rounded-md bg-amber-400 px-5 py-2 font-semibold text-black hover:bg-amber-300 transition">Send</button>
            <textarea name="message" placeholder="Message" className="sm:col-span-3 rounded-md bg-black/40 border border-white/10 px-3 py-2 text-white min-h-[120px]" />
          </form>
          {status && <p className="mt-3 text-sm text-gray-300">{status}</p>}
        </div>
      </motion.div>
    </section>
  );
}

