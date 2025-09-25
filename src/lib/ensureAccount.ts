import { supabaseAdmin } from './supabaseAdmin'

// Idempotent self-heal to guarantee user account shows as Verified with correct initial state
export async function ensureUserAccount(userId: string) {
  try {
    // 1) Fetch profile for status and defaults
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, approval_status, account_type, investment_amount')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) return

    // 2) Ensure at least one account exists
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('id, verified_at, type')
      .eq('user_id', userId)

    if (!accounts || accounts.length === 0) {
      const type = (profile.account_type === 'NETWORK' || profile.account_type === 'LENDER') ? profile.account_type : 'LENDER'
      const minBal = type === 'NETWORK' ? 500 : 5000
      await supabaseAdmin.from('accounts').insert({
        user_id: userId,
        type,
        balance: 0,
        minimum_balance: minBal
      })
    }

    // 3) If there is a pending deposit, process it to set initial balance and verified_at
    const { data: pending } = await supabaseAdmin
      .from('pending_deposits')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (pending) {
      try {
        const { processInitialDeposit } = await import('./initialDeposit')
        await processInitialDeposit(userId)
      } catch (e) {
        console.warn('ensureUserAccount: initial deposit process failed (continuing)', e)
      }
    }

    // 4) If user is approved but account(s) not marked verified, set verified_at now
    if ((profile.role === 'user' || profile.approval_status === 'approved')) {
      await supabaseAdmin
        .from('accounts')
        .update({ verified_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('verified_at', null)
    }
  } catch (e) {
    console.warn('ensureUserAccount failed (non-fatal):', e)
  }
}

