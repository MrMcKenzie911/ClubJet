"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */


import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

type Props = { open: boolean; onClose: () => void };

export default function SignupModal({ open, onClose }: Props) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    referral_code: "",
    referrer_email: "",
    account_type: "LENDER" as "LENDER" | "NETWORK",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { first_name: form.first_name, last_name: form.last_name, phone: form.phone, referral_code: form.referral_code } },
      });
      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;
      if (userId) {
        // create profile with role=pending using service key on server
        const res = await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: userId,
            email: form.email,
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            referral_code: form.referral_code,
            referrer_email: form.referrer_email,
            account_type: form.account_type,
          }),
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(`Profile create failed: ${msg}`);
        }
      }

      // forward to n8n webhook for Vapi follow-up
      try {
        const res = await fetch("/api/send-to-n8n", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "signup",
            payload: form,
            user_id: userId,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(()=>({}));
          console.warn('Webhook forwarding failed', body);
        }
      } catch (werr) {
        console.warn('Webhook forwarding error', werr);
      }

      toast.success("Signup submitted. Look out for approval call.");
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="w-full max-w-lg rounded-xl bg-black/85 backdrop-blur p-6 shadow-2xl border border-amber-400/25" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold text-amber-300">Create Your Account</h2>
              <p className="text-sm text-gray-300">We’ll verify your details before activation.</p>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input name="first_name" placeholder="First name" value={form.first_name} onChange={handleChange} className="rounded-md bg-black/60 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60" required />
                <input name="last_name" placeholder="Last name" value={form.last_name} onChange={handleChange} className="rounded-md bg-black/60 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60" required />
              </div>
              <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="rounded-md bg-black/60 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60" required />
              <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} className="rounded-md bg-black/60 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60" required />
              <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="rounded-md bg-black/60 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60" required />
              <input name="referral_code" placeholder="Referrer code (or leave blank)" value={form.referral_code} onChange={handleChange} className="rounded-md bg-black/60 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60" />
              <input name="referrer_email" placeholder="Referrer email (if no code)" type="email" value={form.referrer_email} onChange={handleChange} className="rounded-md bg-black/60 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60" />
              <p className="text-xs text-gray-400">Provide either a referral code or a referrer email. If both provided, code takes precedence.</p>
              <select name="account_type" value={form.account_type} onChange={(e) => setForm(f => ({ ...f, account_type: e.target.value as any }))} className="rounded-md bg-black/60 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60">
                <option value="LENDER">Lender (Fixed)</option>
                <option value="NETWORK">Network (Variable)</option>
              </select>
              <button disabled={loading} className="mt-2 rounded-md bg-amber-400 px-4 py-2 font-semibold text-black hover:bg-amber-300 disabled:opacity-50">{loading ? "Submitting..." : "Sign Up"}</button>
              <p className="text-xs text-gray-400">Look out for approval call.</p>
            </form>
            <button onClick={onClose} className="mt-4 w-full rounded-md border border-amber-400/25 px-4 py-2 text-gray-200 hover:bg-white/5">Cancel</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

