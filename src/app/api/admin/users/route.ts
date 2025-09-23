import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
  const { email, password = 'Temp1234!', first_name, last_name, phone, role = 'user', account_type, investment_amount, referrerCode, referrerEmail } = body || {};
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

  // 1) Create auth user if not exists
  const created = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  const authUser = created.data.user;
  if (!authUser) return NextResponse.json({ error: created.error?.message || 'Failed to create auth user' }, { status: 500 });

  // 2) Resolve referrer (optional)
  let referrer_id: string | null = null;
  if (referrerEmail) {
    const { data: refByEmail } = await supabaseAdmin.from('profiles').select('id').eq('email', String(referrerEmail)).maybeSingle();
    referrer_id = (refByEmail?.id as string) || null;
  }
  if (!referrer_id && referrerCode) {
    const { data: refByCode } = await supabaseAdmin.from('profiles').select('id').eq('referral_code', String(referrerCode)).maybeSingle();
    referrer_id = (refByCode?.id as string) || null;
  }

  // 3) Upsert profile with provided fields
  const { error: upErr } = await supabaseAdmin.from('profiles').upsert({
    id: authUser.id,
    email,
    first_name,
    last_name,
    phone,
    role,
    referrer_id,
    updated_at: new Date().toISOString(),
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // 4) Optionally create initial account and deposit
  if (account_type === 'LENDER' || account_type === 'NETWORK') {
    const bal = Number(investment_amount || 0) || 0;
    const { data: acct, error: acctErr } = await supabaseAdmin.from('accounts').insert({
      user_id: authUser.id,
      type: account_type,
      balance: bal,
      minimum_balance: 0,
      start_date: null,
      lockup_end_date: null,
      verified_at: null,
    }).select('id').maybeSingle();
    if (acctErr) return NextResponse.json({ error: acctErr.message }, { status: 500 });
    if (acct?.id && bal > 0) {
      await supabaseAdmin.from('transactions').insert({ account_id: acct.id, type: 'DEPOSIT', amount: bal, status: 'posted' });
    }
  }

  return NextResponse.json({ ok: true, id: authUser.id });
}

// Edit user profile (admin)
export async function PATCH(req: Request) {
  const { error } = await ensureAdminJSON();
  if (error) return error;
  const body = await req.json().catch(()=>({})) as { id?: string; first_name?: string; last_name?: string; email?: string; role?: string; new_pin?: string };
  const { id, first_name, last_name, email, role, new_pin } = body || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Update profile fields; include pin_code if provided
  const updatePatch: Record<string, unknown> = { first_name, last_name, email, role, updated_at: new Date().toISOString() };
  if (new_pin) updatePatch["pin_code"] = String(new_pin);
  const { error: upErr } = await supabaseAdmin.from('profiles')
    .update(updatePatch)
    .eq('id', id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Keep Supabase Auth in sync
  if (new_pin) {
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, { password: String(new_pin) });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });
  }
  if (email) {
    const { error: authEmailErr } = await supabaseAdmin.auth.admin.updateUserById(id, { email });
    if (authEmailErr) return NextResponse.json({ error: authEmailErr.message }, { status: 500 });
  }

  try { revalidatePath('/admin'); revalidatePath('/dashboard'); } catch {}
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
