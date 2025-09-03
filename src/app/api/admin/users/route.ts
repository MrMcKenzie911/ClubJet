import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Create auth user + profile (admin only)
export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { email, password = 'Temp1234!', first_name, last_name, role = 'user' } = body || {};
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

  // 1) Create auth user if not exists
  const created = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  const authUser = created.data.user;
  if (!authUser) return NextResponse.json({ error: created.error?.message || 'Failed to create auth user' }, { status: 500 });

  // 2) Upsert profile with provided fields
  const { error: upErr } = await supabaseAdmin.from('profiles').upsert({
    id: authUser.id,
    email,
    first_name,
    last_name,
    role,
    updated_at: new Date().toISOString(),
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: authUser.id });
}

