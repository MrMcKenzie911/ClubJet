import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

async function ensureAdminJSON() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { supabase };
}

// Create auth user + profile (admin only)
export async function POST(req: Request) {
  const { error } = await ensureAdminJSON();
  if (error) return error;

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

// Edit user profile (admin)
export async function PATCH(req: Request) {
  const { error } = await ensureAdminJSON();
  if (error) return error;
  const body = await req.json().catch(()=>({}));
  const { id, first_name, last_name, email, role } = body || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error: upErr } = await supabaseAdmin.from('profiles')
    .update({ first_name, last_name, email, role, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Delete user (admin)
export async function DELETE(req: Request) {
  const { error } = await ensureAdminJSON();
  if (error) return error;
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  // Delete user's accounts first to satisfy FK constraints (if any)
  await supabaseAdmin.from('accounts').delete().eq('user_id', id);
  const { error: delErr } = await supabaseAdmin.from('profiles').delete().eq('id', id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
