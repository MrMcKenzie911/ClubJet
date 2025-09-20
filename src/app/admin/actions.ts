"use server"

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { calculateSignupFee } from '@/lib/fees'


export async function approveUser(formData: FormData) {
  'use server'
  const userId = String(formData.get('user_id'))
  const decision = String(formData.get('decision'))
  try {
    if (decision === 'approve') {
      const { error: upErr } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'user', approval_status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', userId)
      if (upErr) throw upErr
      const { data: acct } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (acct?.id) {
        const { error: vErr } = await supabaseAdmin
          .from('accounts')
          .update({ verified_at: new Date().toISOString() })
          .eq('id', acct.id)
        if (vErr) throw vErr
      }
      // Credit referrer $25 commission upon approval
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('referrer_id')
        .eq('id', userId)
        .maybeSingle()
      const refId = (prof?.referrer_id as string | null) ?? null
      if (refId) {
        const { data: refAcct } = await supabaseAdmin
          .from('accounts')
          .select('id, balance')
          .eq('user_id', refId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (refAcct?.id) {
          const amt = 25
          await supabaseAdmin
            .from('transactions')
            .insert({ account_id: refAcct.id, type: 'COMMISSION', amount: amt, status: 'posted', created_at: new Date().toISOString(), memo: 'Referral approval bonus' })
          await supabaseAdmin
            .from('accounts')
            .update({ balance: Number(refAcct.balance || 0) + amt })
            .eq('id', refAcct.id)
        }
      }
      try { revalidatePath('/admin'); revalidatePath('/dashboard') } catch {}
      redirect('/admin?toast=user_approved')
    } else if (decision === 'reject') {
      const { error: delErr } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId)
      if (delErr) throw delErr
      try { revalidatePath('/admin') } catch {}
      redirect('/admin?toast=user_rejected')
    }
  } catch (e) {
    console.error('approveUser failed', e)
    redirect('/admin?toast=error')
  }
}

export async function approveDeposit(formData: FormData) {
  'use server'
  const txId = String(formData.get('tx_id'))
  const decision = String(formData.get('decision'))
  try {
    if (decision === 'approve') {
      const { data: tx, error: txErr } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('id', txId)
        .maybeSingle()
      if (txErr) throw txErr
      if (tx) {
        await supabaseAdmin.from('transactions').update({ status: 'posted' }).eq('id', txId)
        const { data: acct, error: acctErr } = await supabaseAdmin.from('accounts').select('id, user_id, balance').eq('id', tx.account_id).maybeSingle()
        if (acctErr) throw acctErr
        if (acct) {
          const newBal = Number(acct.balance) + Number(tx.amount)
          await supabaseAdmin.from('accounts').update({ balance: newBal }).eq('id', acct.id)

          // Apply one-time signup fee distribution + slush fund credit on first approved deposit (< $5000)
          try {
            const userId: string | undefined = acct?.user_id ?? undefined
            if (userId && Number(tx.amount) > 0) {
              const { data: existingFee } = await supabaseAdmin
                .from('signup_fees')
                .select('id')
                .eq('user_id', userId)
                .limit(1)
                .maybeSingle()
              if (!existingFee && Number(tx.amount) < 5000) {
                const fees = calculateSignupFee(Number(tx.amount))
                if (fees.fee > 0) {
                  await supabaseAdmin.from('signup_fees').insert({
                    user_id: userId,
                    initial_deposit: Number(tx.amount),
                    fee_amount: fees.fee,
                    referrer1_share: fees.ref1,
                    referrer2_share: fees.ref2,
                    slush_fund_share: fees.slush,
                  })
                  await supabaseAdmin.from('slush_fund_transactions').insert({ transaction_type: 'deposit', amount: fees.slush, reference_account_id: acct.id, description: 'signup_fee' })
                }
              }
            }
          } catch (e) {
            console.error('signup fee/slush processing failed', e)
          }
        }
      }
      try { revalidatePath('/admin'); revalidatePath('/dashboard') } catch {}
      redirect('/admin?toast=deposit_approved')
    } else if (decision === 'deny') {
      await supabaseAdmin.from('transactions').update({ status: 'denied' }).eq('id', txId)
      try { revalidatePath('/admin') } catch {}
      redirect('/admin?toast=deposit_denied')
    }
  } catch (e) {
    console.error('approveDeposit failed', e)
    redirect('/admin?toast=error')
  }
}

export async function verifyAccount(formData: FormData) {
  'use server'
  const accountId = String(formData.get('account_id'))
  if (!accountId) return
  try {
    await supabaseAdmin.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', accountId)
    redirect('/admin?toast=account_verified')
  } catch (e) {
    console.error('verifyAccount failed', e)
    redirect('/admin?toast=error')
  }
}

function nextReleaseDate(requestedAt: Date): string {
  const d = new Date(requestedAt)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()
  if (day <= 1) return new Date(Date.UTC(y, m, 10)).toISOString().slice(0, 10)
  return new Date(Date.UTC(y, m + 1, 10)).toISOString().slice(0, 10)
}

export async function decideWithdrawal(formData: FormData) {
  'use server'
  const wrId = String(formData.get('wr_id'))
  const decision = String(formData.get('decision'))
  try {
    if (decision === 'approve') {
      // Mark approved and schedule, then immediately decrement the account balance
      const { data: wr, error: wrErr } = await supabaseAdmin
        .from('withdrawal_requests')
        .select('*')
        .eq('id', wrId)
        .maybeSingle()
      if (wrErr) throw wrErr
      if (wr) {
        const schedule = nextReleaseDate(new Date())
        await supabaseAdmin.from('withdrawal_requests').update({ status: 'approved', scheduled_release_at: schedule }).eq('id', wrId)
        const { data: acct, error: acctErr } = await supabaseAdmin.from('accounts').select('id, balance').eq('id', wr.account_id).maybeSingle()
        if (acctErr) throw acctErr
        if (acct) {
          const newBal = Math.max(0, Number(acct.balance || 0) - Number(wr.amount || 0))
          await supabaseAdmin.from('accounts').update({ balance: newBal }).eq('id', acct.id)
        }
      }
      try { revalidatePath('/admin'); revalidatePath('/dashboard') } catch {}
      redirect('/admin?toast=withdrawal_approved')
    } else if (decision === 'deny') {
      await supabaseAdmin.from('withdrawal_requests').update({ status: 'denied' }).eq('id', wrId)
      try { revalidatePath('/admin') } catch {}
      redirect('/admin?toast=withdrawal_denied')
    }
  } catch (e) {
    console.error('decideWithdrawal failed', e)
    redirect('/admin?toast=error')
  }
}

export async function updateAccount(formData: FormData) {
  'use server'
  const accountId = String(formData.get('account_id'))
  const type = String(formData.get('type'))
  const minimum_balance = Number(formData.get('minimum_balance'))
  const balance = Number(formData.get('balance'))
  const start_date_raw = String(formData.get('start_date') || '')
  const lockup_end_raw = String(formData.get('lockup_end_date') || '')
  const patch: Record<string, unknown> = { type, minimum_balance, balance }
  if (start_date_raw) patch.start_date = start_date_raw
  if (lockup_end_raw) patch.lockup_end_date = lockup_end_raw
  if (!accountId) return
  try {
    await supabaseAdmin.from('accounts').update(patch).eq('id', accountId)
    redirect('/admin?toast=account_updated')
  } catch (e) {
    console.error('updateAccount failed', e)
    redirect('/admin?toast=error')
  }
}

export async function deleteAccount(formData: FormData) {
  'use server'
  const accountId = String(formData.get('account_id'))
  if (!accountId) return
  try {
    await supabaseAdmin.from('accounts').delete().eq('id', accountId)
    redirect('/admin?toast=account_deleted')
  } catch (e) {
    console.error('deleteAccount failed', e)
    redirect('/admin?toast=error')
  }
}


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
        .insert({ account_id: a.id, type: 'INTEREST', amount: delta, status: 'posted', created_at: nowIso })
      await supabaseAdmin.from('accounts').update({ balance: bal + delta }).eq('id', a.id)
    }

    try { revalidatePath('/admin'); revalidatePath('/dashboard') } catch {}
    redirect('/admin?toast=rate_set')
  } catch (e) {
    console.error('setRate failed', e)
    redirect('/admin?toast=error')
  }
}

export async function undoLastRate(formData: FormData) {
  const account_type = String(formData.get('account_type'))
  try {
    if (!account_type) {
      redirect('/admin?toast=error')
      return
    }
    // 1) Gather verified account IDs for this type
    const { data: accts } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('type', account_type)
      .not('verified_at','is', null)
    type IdOnly = { id: string }
    const ids = ((accts || []) as IdOnly[]).map((a) => a.id)
    if (!ids.length) {
      redirect('/admin?toast=undo_none')
      return
    }

    // 2) Find the latest INTEREST batch created across these accounts
    const { data: lastTx } = await supabaseAdmin
      .from('transactions')
      .select('created_at')
      .in('account_id', ids)
      .eq('type', 'INTEREST')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const created_at = lastTx?.created_at as string | undefined
    if (!created_at) {
      redirect('/admin?toast=undo_none')
      return
    }

    // 3) Load the batch and reverse each by inserting a negative INTEREST and decrementing balances
    const { data: batch } = await supabaseAdmin
      .from('transactions')
      .select('id, account_id, amount')
      .in('account_id', ids)
      .eq('type', 'INTEREST')
      .eq('created_at', created_at)

    for (const tx of (batch || []) as { id: string; account_id: string; amount: number }[]) {
      const amt = Number(tx.amount || 0)
      if (amt <= 0) continue
      // Compensating entry
      await supabaseAdmin.from('transactions').insert({
        account_id: tx.account_id,
        type: 'INTEREST',
        amount: -amt,
        status: 'posted',
        created_at: new Date().toISOString(),
      })
      // Balance rollback
      await supabaseAdmin.rpc('increment_balance', { account_id: tx.account_id, amount: -amt as unknown as number })
    }

    try { revalidatePath('/admin'); revalidatePath('/dashboard') } catch {}
    redirect('/admin?toast=rate_undone')
  } catch (e) {
    console.error('undoLastRate failed', e)
    redirect('/admin?toast=error')
  }
}

