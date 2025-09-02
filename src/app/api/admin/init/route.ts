import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

// Creates investment_tiers table if missing (id,name,description,min_amount,max_amount,created_at)
export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Use SQL to create table if not exists
  const { error } = await supabase.rpc('exec', { sql: `
    create table if not exists public.investment_tiers (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      description text,
      min_amount numeric not null default 0,
      max_amount numeric not null default 0,
      created_at timestamp with time zone not null default now()
    );
  ` });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

