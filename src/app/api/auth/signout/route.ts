import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST() {
  // Create response first so we can mutate cookies on it
  const res = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient({ cookies });
  // Sign out on server (clears sb cookies tied to session)
  await supabase.auth.signOut();

  // Hard clear any lingering sb-* cookies (defensive for edge cases)
  const store = await cookies();
  const all = store.getAll();
  for (const c of all) {
    if (c.name.startsWith("sb-")) {
      res.cookies.set({ name: c.name, value: "", path: "/", expires: new Date(0) });
    }
  }
  return res;
}

