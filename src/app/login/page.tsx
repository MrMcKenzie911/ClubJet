"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Sync auth to server cookies so middleware/server can see the session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      await fetch('/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, session }),
      })
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // Auto-redirect if already authenticated
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) {
        await supabase.auth.getSession();
        router.refresh();
        router.replace(profile?.role === "admin" ? "/admin" : "/dashboard");
      }
    })();
    return () => { cancelled = true };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    const userId = data.user?.id;
    if (!userId) {
      setError("Login succeeded but no user ID returned.");
      return;
    }
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr) {
      setError("Failed to fetch user profile.");
      return;
    }
    await supabase.auth.getSession();
    router.refresh();
    if (profile?.role === "admin") router.push("/admin");
    else router.push("/dashboard");
  };

  const handleForgotPassword = async () => {
    setError(null);
    setResetSent(null);
    if (!email) {
      setError("Enter your email to reset your password.");
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
    });
    setResetLoading(false);
    if (error) setError(error.message);
    else setResetSent("Reset email sent. Check your inbox.");
  };

  return (
    <div className="relative min-h-screen bg-[url('/login-bg.png')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3 rounded-xl border border-white/10 bg-black/70 backdrop-blur-sm p-6 shadow-2xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white">
            <ArrowLeft size={16} />
            Back Home
          </Link>
          <h1 className="text-xl font-semibold text-white">Login</h1>
          {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2 text-sm">{error}</div>}
          {resetSent && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3 py-2 text-sm">{resetSent}</div>}
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-md bg-black/60 border border-white/10 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            required
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCapsOn((e as unknown as KeyboardEvent).getModifierState?.('CapsLock') ?? false)}
              onFocus={(e) => setCapsOn((e as unknown as KeyboardEvent).getModifierState?.('CapsLock') ?? false)}
              onBlur={() => setCapsOn(false)}
              placeholder="Password"
              className="w-full rounded-md bg-black/60 border border-white/10 pr-10 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              required
            />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {capsOn && <p className="text-xs text-amber-300">Caps Lock is ON</p>}
          <button type="submit" disabled={loading} className="w-full rounded-md bg-amber-400 py-2 font-semibold text-black hover:bg-amber-300 disabled:opacity-50">{loading ? "Logging in..." : "Login"}</button>
          <div className="flex items-center justify-between text-sm text-gray-300">
            <button type="button" onClick={handleForgotPassword} disabled={resetLoading} aria-busy={resetLoading} className="hover:text-white disabled:opacity-60">
              {resetLoading ? "Sending..." : "Forgot password?"}
            </button>
            <Link href="/#services" className="hover:text-white">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

