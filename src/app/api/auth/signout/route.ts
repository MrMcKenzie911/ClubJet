import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST() {
  // Create response first so we can mutate cookies on it
  const res = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient({ cookies });
  // Global sign-out invalidates refresh tokens server-side
  await supabase.auth.signOut();

  // Hard clear any lingering Supabase cookies (defensive)
  const all = (await cookies()).getAll();
  for (const c of all) {
    const n = c.name;
    if (n.startsWith('sb-') || n.includes('supabase')) {
      res.cookies.set({ name: n, value: '', path: '/', expires: new Date(0) });
    }
  }
  return res;
}

