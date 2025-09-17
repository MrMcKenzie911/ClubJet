"use server"

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function setRate(formData: FormData) {
  const account_type = String(formData.get('account_type'))
  const fixed_rate_monthly_raw = String(formData.get('fixed_rate_monthly') ?? '')
  const fixed_rate_monthly = Number(fixed_rate_monthly_raw)
  try {
    if (!account_type || !isFinite(fixed_rate_monthly)) {
      redirect('/admin?toast=error')
      return
    }
    // 1) Record the new rate
    await supabaseAdmin
      .from('earnings_rates')
      .insert({ account_type, fixed_rate_monthly, effective_from: new Date().toISOString().slice(0, 10) })

    // 2) Immediately apply interest to all verified accounts of this type
    const { data: accts } = await supabaseAdmin
      .from('accounts')
      .select('id, balance')
      .eq('type', account_type)
      .not('verified_at','is', null)

    const pct = fixed_rate_monthly / 100
    const nowIso = new Date().toISOString()
    for (const a of (accts || []) as { id: string; balance: number | null }[]) {
      const bal = Number(a.balance || 0)
      const delta = +(bal * pct).toFixed(2)
      if (delta <= 0) continue
      await supabaseAdmin
        .from('transactions')
        .insert({ account_id: a.id, type: 'INTEREST', amount: delta, status: 'posted', created_at: nowIso, memo: `Monthly interest ${fixed_rate_monthly}%` })
      await supabaseAdmin.from('accounts').update({ balance: bal + delta }).eq('id', a.id)
    }

    try { revalidatePath('/admin'); revalidatePath('/dashboard') } catch {}
    redirect('/admin?toast=rate_set')
  } catch (e) {
    console.error('setRate failed', e)
    redirect('/admin?toast=error')
  }
}

