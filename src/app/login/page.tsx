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
    let lastEvent: string | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Prevent duplicate events from firing
      if (event === lastEvent) return;
      lastEvent = event;
      
      // Only sync on actual auth changes, not every state update
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        await fetch('/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, session }),
        })
      }
      
      // If signed_out, also call server signout to clear cookies
      if (event === 'SIGNED_OUT') {
        await fetch('/api/auth/signout', { method: 'POST' })
        try {
          for (const key in localStorage) {
            if (key && key.startsWith('sb-')) localStorage.removeItem(key);
          }
        } catch {}
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // Auto-redirect if already authenticated (guarded) - only check once on mount
  useEffect(() => {
    let cancelled = false;
    let hasRedirected = false;
    
    (async () => {
      // Prevent multiple redirects
      if (hasRedirected) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      
      const user = session.user;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_founding_member')
        .eq('id', user.id)
        .maybeSingle();
        
      if (!cancelled && !hasRedirected) {
        hasRedirected = true;
        const toAdmin = profile?.role === 'admin' || profile?.is_founding_member === true
        router.replace(toAdmin ? '/admin' : '/dashboard');
      }
    })();
    
    return () => { cancelled = true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(null);
    setLoading(true);
    const em = email.trim();
    const pw = password.trim();

    type PinLoginResp = { error?: string; ok?: boolean; role?: string; is_founding_member?: boolean }

    // Always call server route to enforce PIN->Auth sync, but also ensure client session is set
    try {
      const resp = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, pin: pw })
      })
      if (resp.status === 401) {
        const j = await resp.json().catch(() => ({} as PinLoginResp))
        setError(j.error || 'Invalid credentials')
        setLoading(false)
        return
      }
      // proceed regardless of resp.ok to set client session reliably below
    } catch (error) {
      // if server temporarily unavailable, still proceed to client sign-in below
      console.log('Server login attempt failed:', error)
    }

    // Ensure browser session exists: try PIN, then seeded fallback
    {
      const res1 = await supabase.auth.signInWithPassword({ email: em, password: pw })
      if (res1.error) {
        const fallback = `Cj${pw}!${pw}`
        const res2 = await supabase.auth.signInWithPassword({ email: em, password: fallback })
        if (res2.error) {
          setLoading(false)
          setError(res2.error.message || res1.error.message || 'Invalid credentials')
          return
        }
      }
    }

    setLoading(false)
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    if (!userId) {
      setError('Login succeeded but no user ID returned.')
      return
    }
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role, is_founding_member')
      .eq('id', userId)
      .maybeSingle();
    if (profileErr) {
      setError('Failed to fetch user profile.')
      return
    }
    await supabase.auth.getSession();
    router.refresh();
    const toAdmin = profile?.role === 'admin' || profile?.is_founding_member === true
    router.push(toAdmin ? '/admin' : '/dashboard');
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
    <div className="relative min-h-[100svh] w-full bg-[url('/images/ClubA_Background_login.png')] bg-cover bg-center bg-no-repeat md:bg-fixed">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3 rounded-xl border border-white/10 bg-black/70 backdrop-blur-sm p-6 shadow-2xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white">
            <ArrowLeft size={16} />
            Back Home
          </Link>
          <h1 className="text-xl font-semibold text-white">Club Aureus Login</h1>
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

