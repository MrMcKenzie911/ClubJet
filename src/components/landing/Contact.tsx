"use client";
import { useState } from "react";

export default function Contact({ onOpenSignup }: { onOpenSignup: () => void }) {
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
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
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-bold text-white text-center">Ready to Elevate Your Investment Portfolio?</h2>
        <p className="mt-2 text-gray-300 text-center">
          Join Club Jet today and start earning premium returns on luxury aviation assets. Our team will guide you through the application process.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onOpenSignup} className="rounded-md bg-amber-400 px-5 py-2 font-semibold text-black hover:bg-amber-300 transition">
            Apply Now
          </button>
        </div>
        <form onSubmit={onSubmit} className="mt-8 grid gap-3 sm:grid-cols-3">
          <input name="name" placeholder="Your name" className="rounded-md bg-black/40 border border-white/10 px-3 py-2 text-white" required />
          <input type="email" name="email" placeholder="Email" className="rounded-md bg-black/40 border border-white/10 px-3 py-2 text-white" required />
          <button type="submit" className="rounded-md bg-amber-400 px-5 py-2 font-semibold text-black hover:bg-amber-300 transition">Send</button>
          <textarea name="message" placeholder="Message" className="sm:col-span-3 rounded-md bg-black/40 border border-white/10 px-3 py-2 text-white min-h-[120px]" />
        </form>
        {status && <p className="mt-3 text-sm text-gray-300">{status}</p>}
      </div>
    </section>
  );
}

