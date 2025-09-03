/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'

async function getAdminData() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { redirect: true as const }
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { redirect: true as const }

  const { data: pendingUsers } = await supabase.from('profiles').select('*').eq('role', 'pending').order('created_at', { ascending: true })
  const { data: pendingDeposits } = await supabase
    .from('transactions')
    .select('*, account:accounts(id, user:profiles(id, email, first_name, last_name, phone))')
    .eq('type', 'DEPOSIT')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const { data: pendingWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select('*, account:accounts(id, user:profiles(id, email, first_name, last_name, phone))')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
  const { data: rates } = await supabase.from('earnings_rates').select('*').order('effective_from', { ascending: false })

  // Pending accounts: owners are pending and account.verified_at is null
  const pendingOwnerIds = (pendingUsers ?? []).map(u => u.id)
  const { data: pendingAccounts } = await supabase
    .from('accounts')
    .select('id, user_id, type, balance, minimum_balance, start_date, lockup_end_date, verified_at, user:profiles(id, email, first_name, last_name, phone)')
    .is('verified_at', null)
    .in('user_id', pendingOwnerIds)

  return { pendingUsers: pendingUsers ?? [], pendingDeposits: pendingDeposits ?? [], pendingWithdrawals: pendingWithdrawals ?? [], rates: rates ?? [], pendingAccounts: pendingAccounts ?? [] }
}
export default async function AdminPage() {
  const res = await getAdminData()
  if ('redirect' in res) redirect('/login')

  const { pendingUsers, pendingDeposits, pendingWithdrawals, rates, pendingAccounts } = res

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
        {/* quick sign out */}
        <SignOutInline />
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-3 bg-[#1a1a1a] p-6 rounded-2xl shadow-inner">
          <div className="space-y-2">
            {/* Deposits */}
            {pendingDeposits.map((t: any) => (
              <form key={`dep-${t.id}`} action={approveDeposit} className="rounded-lg border border-gray-700 bg-[#1e1e1e] p-4 shadow transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg">
                <input type="hidden" name="tx_id" defaultValue={t.id} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-medium">{t.account?.user?.first_name} {t.account?.user?.last_name}</div>
                    <div className="text-xs text-gray-400">{t.account?.user?.email} • {t.account?.user?.phone ?? 'n/a'}</div>
                    <div className="mt-1 text-sm text-gray-300">Deposit • ${Number(t.amount).toLocaleString()} • {new Date(t.created_at).toLocaleString()}</div>
                    {t.metadata?.reference && <div className="text-xs text-gray-500">Ref: {t.metadata.reference}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button name="decision" value="approve" className="rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-white">Approve</button>
                    <button name="decision" value="deny" className="rounded bg-red-600 hover:bg-red-500 px-3 py-1 text-white">Deny</button>
                  </div>
                </div>
              </form>
            ))}
            {/* Withdrawals */}
            {pendingWithdrawals.map((w: any) => (
              <form key={`wr-${w.id}`} action={decideWithdrawal} className="rounded-lg border border-gray-700 bg-[#1e1e1e] p-4 shadow transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg">
                <input type="hidden" name="wr_id" defaultValue={w.id} />
                <input type="hidden" name="account_id" defaultValue={w.account_id} />
                <input type="hidden" name="amount" defaultValue={w.amount} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-medium">{w.account?.user?.first_name} {w.account?.user?.last_name}</div>
                    <div className="text-xs text-gray-400">{w.account?.user?.email} • {w.account?.user?.phone ?? 'n/a'}</div>
                    <div className="mt-1 text-sm text-gray-300">Withdraw • ${Number(w.amount).toLocaleString()} • {w.method}</div>
                    <div className="text-xs text-gray-500">Requested: {new Date(w.requested_at).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button name="decision" value="approve" className="rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-white">Approve</button>
                    <button name="decision" value="deny" className="rounded bg-red-600 hover:bg-red-500 px-3 py-1 text-white">Deny</button>
                  </div>
                </div>
              </form>
            ))}
            {pendingDeposits.length + pendingWithdrawals.length === 0 && (
              <div className="text-sm text-gray-400">No client requests.</div>
            )}
          </div>

        {/* Client Requests (Unified) */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 lg:col-span-1">
          <h2 className="mb-3 text-white font-semibold">Client Requests</h2>
        </div>
        <div className="rounded-xl border border-gray-700 bg-[#1e1e1e] p-6 lg:col-span-1 shadow transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg">
          <h2 className="mb-3 text-white font-semibold">Pending Users</h2>
          <div className="space-y-2">
            {pendingUsers.map((u: any) => (
              <form key={u.id} action={approveUser} className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 p-2">
                <input type="hidden" name="user_id" defaultValue={u.id} />
                <div className="text-sm text-gray-300">{u.email} • {u.first_name} {u.last_name}</div>
                <div className="flex gap-2">
                  <button name="decision" value="approve" className="rounded bg-emerald-600 px-3 py-1 text-white">Approve</button>
                  <button name="decision" value="reject" className="rounded bg-red-600 px-3 py-1 text-white">Reject</button>
                </div>
              </form>
            ))}
            {pendingUsers.length === 0 && <div className="text-sm text-gray-400">No pending users.</div>}
          </div>
        </div>

        <div className="hidden">
          <h2 className="mb-3 text-white font-semibold">Pending Deposits (Wires)</h2>
          <div className="space-y-2">
            {pendingDeposits.map((t: any) => (
              <form key={t.id} action={approveDeposit} className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 p-2">
                <input type="hidden" name="tx_id" defaultValue={t.id} />
                <div className="text-sm text-gray-300">Acct {t.account_id} • ${Number(t.amount).toFixed(2)} • {new Date(t.created_at).toLocaleString()}</div>
        {/* Pending Accounts (from pending users) */}
        <div className="rounded-xl border border-gray-700 bg-[#1e1e1e] p-6 shadow transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg">
          <h2 className="mb-3 text-white font-semibold">Pending Accounts</h2>
          <div className="space-y-2">
            {pendingAccounts.map((a: any) => (
              <form key={a.id} action={verifyAccount} className="rounded border border-gray-800 bg-[#0E141C] p-3">
                <input type="hidden" name="account_id" defaultValue={a.id} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-white font-medium">{a.user?.first_name} {a.user?.last_name}</div>
                    <div className="text-xs text-gray-400">{a.user?.email} • {a.user?.phone ?? 'n/a'}</div>
                    <div className="mt-2 text-sm text-gray-300">Type: <span className="text-amber-400">{a.type}</span> • Balance: ${Number(a.balance).toLocaleString()} • Min: ${Number(a.minimum_balance).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Start: {a.start_date ?? '—'}</div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <button formAction={updateAccount} name="action" value="edit" className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1">Save</button>
                    <button formAction={deleteAccount} name="action" value="delete" className="rounded bg-red-600 hover:bg-red-500 px-3 py-1">Delete</button>
                    <button name="action" value="verify" className="rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-white">Verify</button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  <label className="text-xs text-gray-400">Type
                    <select name="type" defaultValue={a.type} className="mt-1 w-full rounded bg-black/40 border border-gray-700 px-2 py-1 text-white">
                      <option value="LENDER">LENDER</option>
                      <option value="NETWORK">NETWORK</option>
                    </select>
                  </label>
                  <label className="text-xs text-gray-400">Min Balance
                    <input name="minimum_balance" defaultValue={a.minimum_balance} className="mt-1 w-full rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" />
                  </label>
                  <label className="text-xs text-gray-400">Balance
                    <input name="balance" defaultValue={a.balance} className="mt-1 w-full rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" />
                  </label>
                  <label className="text-xs text-gray-400">Start Date
                    <input name="start_date" type="date" defaultValue={a.start_date ?? ''} className="mt-1 w-full rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" />
                  </label>
                  <label className="text-xs text-gray-400">Lockup End
                    <input name="lockup_end_date" type="date" defaultValue={a.lockup_end_date ?? ''} className="mt-1 w-full rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" />
                  </label>
                </div>
              </form>

            ))}
            {pendingAccounts.length === 0 && <div className="text-sm text-gray-400">No pending accounts.</div>}
          </div>
        </div>

                <div className="flex gap-2">
                  <button name="decision" value="approve" className="rounded bg-emerald-600 px-3 py-1 text-white">Approve</button>
                  <button name="decision" value="deny" className="rounded bg-red-600 px-3 py-1 text-white">Deny</button>
                </div>
              </form>
            ))}
            {pendingDeposits.length === 0 && <div className="text-sm text-gray-400">No pending deposits.</div>}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="hidden">
          <h2 className="mb-3 text-white font-semibold">Withdrawal Requests</h2>
          <div className="space-y-2">
            {pendingWithdrawals.map((w: any) => (
              <form key={w.id} action={decideWithdrawal} className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 p-2">
                <input type="hidden" name="wr_id" defaultValue={w.id} />
                <input type="hidden" name="account_id" defaultValue={w.account_id} />
                <input type="hidden" name="amount" defaultValue={w.amount} />
                <div className="text-sm text-gray-300">Acct {w.account_id} • ${Number(w.amount).toFixed(2)} • {w.method}</div>
                <div className="flex gap-2">
                  <button name="decision" value="approve" className="rounded bg-emerald-600 px-3 py-1 text-white">Approve</button>
                  <button name="decision" value="deny" className="rounded bg-red-600 px-3 py-1 text-white">Deny</button>
                </div>
              </form>
            ))}
            {pendingWithdrawals.length === 0 && <div className="text-sm text-gray-400">No pending withdrawals.</div>}
          </div>
        </div>

        <div id="lender-bands" className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-white font-semibold">LENDER Fixed Bands</h2>
          <LenderBandsEditor />
          <div className="mt-6">
            <h3 className="mb-2 text-white font-semibold">Earnings Rates (legacy)</h3>
            <form action={setRate} className="flex gap-2">
              <select name="account_type" className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white">
                <option value="LENDER">LENDER</option>
                <option value="NETWORK">NETWORK</option>
              </select>
              <input name="fixed_rate_monthly" type="number" step="0.001" placeholder="Monthly % (e.g., 1.25)" className="w-48 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white" />
              <button className="rounded bg-emerald-600 px-3 py-1 text-white">Set</button>
            </form>
            <div className="mt-3 text-sm text-gray-300">Recent:</div>
            <ul className="text-sm text-gray-400">
              {rates.map((r: any) => (
                <li key={r.id}>{r.account_type} • {r.fixed_rate_monthly ?? 'n/a'}% • from {r.effective_from}</li>

              ))}
            </ul>
          </div>
        </div>
      </section>
      {/* Management sections */}
      {/* Users Manager */}
      <UsersManagerSection />
    </div>
  )
}

// Small server wrappers that render client components (keeps admin auth guard on server)
import SignOutButton from '@/components/SignOutButton'
import UsersManager from '@/components/admin/UsersManager'
import LenderBandsEditor from '@/components/admin/LenderBandsEditor'

function SignOutInline() {
  return <SignOutButton />
}

function UsersManagerSection() {
  return (
    <div className="mt-8">
      <UsersManager />
    </div>
  )
}


export async function approveUser(formData: FormData) {
  'use server'
  const supabase = getSupabaseServer()
  const userId = String(formData.get('user_id'))
  const decision = String(formData.get('decision'))
  try {
    if (decision === 'approve') {
      const { error: upErr } = await supabase.from('profiles').update({ role: 'user' }).eq('id', userId)
      if (upErr) throw upErr
      // Also mark first account (if any) as verified
      const { data: acct } = await supabase.from('accounts').select('id').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).single()
      if (acct) {
        const { error: vErr } = await supabase.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', acct.id)
        if (vErr) throw vErr
      }
    } else if (decision === 'reject') {
      const { error: delErr } = await supabase.from('profiles').delete().eq('id', userId)
      if (delErr) throw delErr
    }
  } finally {
    // Always refresh the page data so UI doesn’t get stuck
    revalidatePath('/admin')
  }
}

export async function approveDeposit(formData: FormData) {
  'use server'
  const supabase = getSupabaseServer()
  const txId = String(formData.get('tx_id'))
  const decision = String(formData.get('decision'))
  if (decision === 'approve') {
    const { data: tx } = await supabase.from('transactions').select('*').eq('id', txId).single()
    if (tx) {
      // set posted
      await supabase.from('transactions').update({ status: 'posted' }).eq('id', txId)
      // increment account balance
      const { data: acct } = await supabase.from('accounts').select('*').eq('id', tx.account_id).single()
      if (acct) {
        const newBal = Number(acct.balance) + Number(tx.amount)
        await supabase.from('accounts').update({ balance: newBal }).eq('id', acct.id)
      }
    }
  } else if (decision === 'deny') {
    await supabase.from('transactions').update({ status: 'denied' }).eq('id', txId)
  }
}

export async function verifyAccount(formData: FormData) {
  'use server'
  const supabase = getSupabaseServer()
  const accountId = String(formData.get('account_id'))
  if (!accountId) return
  await supabase.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', accountId)
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
  const supabase = getSupabaseServer()
  const wrId = String(formData.get('wr_id'))
  const accountId = String(formData.get('account_id'))
  const amount = Number(formData.get('amount'))
  const decision = String(formData.get('decision'))
  if (decision === 'approve') {
    const schedule = nextReleaseDate(new Date())
    await supabase.from('withdrawal_requests').update({ status: 'approved', scheduled_release_at: schedule }).eq('id', wrId)
  } else if (decision === 'deny') {
    await supabase.from('withdrawal_requests').update({ status: 'denied' }).eq('id', wrId)
  }
}

export async function setRate(formData: FormData) {
  'use server'
  const supabase = getSupabaseServer()
  const account_type = String(formData.get('account_type'))
  const fixed_rate_monthly = Number(formData.get('fixed_rate_monthly')) || null
  await supabase.from('earnings_rates').insert({ account_type, fixed_rate_monthly, effective_from: new Date().toISOString().slice(0, 10) })
}



export async function updateAccount(formData: FormData) {
  'use server'
  const supabase = getSupabaseServer()
  const accountId = String(formData.get('account_id'))
  const type = String(formData.get('type'))
  const minimum_balance = Number(formData.get('minimum_balance'))
  const balance = Number(formData.get('balance'))
  const start_date_raw = String(formData.get('start_date') || '')
  const lockup_end_raw = String(formData.get('lockup_end_date') || '')
  const patch: any = { type, minimum_balance, balance }
  if (start_date_raw) patch.start_date = start_date_raw
  if (lockup_end_raw) patch.lockup_end_date = lockup_end_raw
  if (!accountId) return
  await supabase.from('accounts').update(patch).eq('id', accountId)
  revalidatePath('/admin')
}

export async function deleteAccount(formData: FormData) {
  'use server'
  const supabase = getSupabaseServer()
  const accountId = String(formData.get('account_id'))
  if (!accountId) return
  await supabase.from('accounts').delete().eq('id', accountId)
  revalidatePath('/admin')
}
