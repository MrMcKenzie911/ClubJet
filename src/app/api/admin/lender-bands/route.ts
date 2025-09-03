import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data } = await supabase.from('lender_bands').select('*').order('min_amount', { ascending: true });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  if (Array.isArray(body?.bands)) {
    // replace all
    await supabase.from('lender_bands').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    type Band = { name: string; min_amount: number; max_amount: number; rate_percent: number; duration_months?: number }
    const input: Band[] = body.bands as Band[]
    const { error } = await supabase.from('lender_bands').insert(input.map((b: Band) => ({
      id: crypto.randomUUID(),
      name: b.name,
      min_amount: b.min_amount,
      max_amount: b.max_amount,
      rate_percent: b.rate_percent,
      duration_months: b.duration_months ?? 12,
    })));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
}

