/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'

async function getAdminData() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { redirect: true as const }
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { redirect: true as const }

  const { data: pendingUsers } = await supabase.from('profiles').select('*').eq('role', 'pending').order('created_at', { ascending: true })
  const { data: pendingDeposits } = await supabase.from('transactions').select('*').eq('type', 'DEPOSIT').eq('status', 'pending').order('created_at', { ascending: true })
  const { data: pendingWithdrawals } = await supabase.from('withdrawal_requests').select('*').eq('status', 'pending').order('requested_at', { ascending: true })
  const { data: rates } = await supabase.from('earnings_rates').select('*').order('effective_from', { ascending: false })

  return { pendingUsers: pendingUsers ?? [], pendingDeposits: pendingDeposits ?? [], pendingWithdrawals: pendingWithdrawals ?? [], rates: rates ?? [] }
}

export default async function AdminPage() {
  const res = await getAdminData()
  if ('redirect' in res) redirect('/login')

  const { pendingUsers, pendingDeposits, pendingWithdrawals, rates } = res

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
        {/* quick sign out */}
        <SignOutInline />
      </div>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
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

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-white font-semibold">Pending Deposits (Wires)</h2>
          <div className="space-y-2">
            {pendingDeposits.map((t: any) => (
              <form key={t.id} action={approveDeposit} className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 p-2">
                <input type="hidden" name="tx_id" defaultValue={t.id} />
                <div className="text-sm text-gray-300">Acct {t.account_id} • ${Number(t.amount).toFixed(2)} • {new Date(t.created_at).toLocaleString()}</div>
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
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
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

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-white font-semibold">Earnings Rates</h2>
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
      </section>
      {/* Management sections from screenshots */}
      {/* Users Manager */}
      <UsersManagerSection />

      {/* Stream Management - Investment Tiers */}
      <TiersManagerSection />
    </div>
  )
}

// Small server wrappers that render client components (keeps admin auth guard on server)
import SignOutButton from '@/components/SignOutButton'
import UsersManager from '@/components/admin/UsersManager'
import TiersManager from '@/components/admin/TiersManager'

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

function TiersManagerSection() {
  return (
    <div className="mt-8">
      <TiersManager />
    </div>
  )
}

export async function approveUser(formData: FormData) {
  'use server'
  const supabase = getSupabaseServer()
  const userId = String(formData.get('user_id'))
  const decision = String(formData.get('decision'))
  if (decision === 'approve') {
    await supabase.from('profiles').update({ role: 'user' }).eq('id', userId)
  } else if (decision === 'reject') {
    await supabase.from('profiles').delete().eq('id', userId)
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

function nextReleaseDate(requestedAt: Date): string {
  const d = new Date(requestedAt)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()
  // if in by 1st -> by 10th of same month; else 10th of next month
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

