/* eslint-disable @typescript-eslint/no-explicit-any */

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import MultiLineChart from '@/components/charts/MultiLineChart'
import { Button } from '@/components/ui/button'

import ToastFromQuery from '@/components/ToastFromQuery'


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

  // Admin trends data sources
  const { data: profilesAll } = await supabase.from('profiles').select('id, created_at, role').order('created_at', { ascending: true })
  const { data: verifiedAccounts } = await supabase
    .from('accounts')
    .select('id, balance, verified_at')
    .not('verified_at', 'is', null)

  return { user, pendingUsers: pendingUsers ?? [], pendingDeposits: pendingDeposits ?? [], pendingWithdrawals: pendingWithdrawals ?? [], rates: rates ?? [], pendingAccounts: pendingAccounts ?? [], profilesAll: profilesAll ?? [], verifiedAccounts: verifiedAccounts ?? [] }
}
export default async function AdminPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const res = await getAdminData()
  if ('redirect' in res) redirect('/login')
  const tabParam = searchParams?.tab
  const tab = Array.isArray(tabParam) ? tabParam[0] : tabParam

  const { pendingUsers, pendingDeposits, pendingWithdrawals, rates, pendingAccounts, profilesAll, verifiedAccounts } = res

  return (
    <div className="w-full px-4 md:px-8 py-8">
      <ToastFromQuery />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
        {/* quick sign out */}
        <SignOutInline />
      </div>

      {/* Overview stats */}
      {!tab && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <OverviewCard label="Pending Users" value={String(pendingUsers.length)} />
          <OverviewCard label="Pending Deposits" value={String(pendingDeposits.length)} />
          <OverviewCard label="Pending Withdrawals" value={String(pendingWithdrawals.length)} />
          <OverviewCard label="Pending Accounts" value={String(pendingAccounts.length)} />
          <OverviewCard label="Current Earnings %" value={`${rates[0]?.fixed_rate_monthly ?? '—'}%`} />
        </div>
      )}

      {/* Tabbed view: default dashboard shows all; specific tabs show focused lists */}
      {!tab && (
        <section className="mt-6">
          <div className="rounded-3xl border border-gray-800 bg-[#0B0F14] p-6 shadow-inner">
            {/* Combined container: Verified Users + Client Requests + Pending Users */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border border-gray-800 bg-[#0B0F14] p-6 shadow-lg">
                  <h2 className="mb-3 text-white font-semibold">Admin Monthly Trends</h2>
                  <AdminMonthlyChart profiles={profilesAll} accounts={verifiedAccounts} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl border border-gray-700 bg-[#1e1e1e] p-6 shadow">
                  <h2 className="mb-3 text-white font-semibold">Client Requests</h2>
                  {pendingDeposits.map((t: any) => (
                    <form key={`dep-${t.id}`} action="/api/admin/approve-deposit" method="post" className="rounded-lg border border-gray-700 bg-[#0f141b] p-4 shadow">
                      <input type="hidden" name="tx_id" defaultValue={t.id} />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-white font-medium">{t.account?.user?.first_name} {t.account?.user?.last_name}</div>
                          <div className="text-xs text-gray-400">{t.account?.user?.email} • {t.account?.user?.phone ?? 'n/a'}</div>
                          <div className="mt-1 text-sm text-gray-300">Deposit • ${Number(t.amount).toLocaleString()} • {new Date(t.created_at).toLocaleString()}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button name="decision" value="approve" className="bg-emerald-600 hover:bg-emerald-500 text-white">Approve</Button>
                          <Button name="decision" value="deny" className="bg-red-600 hover:bg-red-500 text-white">Deny</Button>
                        </div>
                      </div>
                    </form>
                  ))}
                  {pendingWithdrawals.map((w: any) => (
                    <form key={`wr-${w.id}`} action="/api/admin/decide-withdrawal" method="post" className="rounded-lg border border-gray-700 bg-[#0f141b] p-4 shadow">
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
                          <Button name="decision" value="approve" className="bg-emerald-600 hover:bg-emerald-500 text-white">Approve</Button>
                          <Button name="decision" value="deny" className="bg-red-600 hover:bg-red-500 text-white">Deny</Button>
                        </div>
                      </div>
                    </form>
                  ))}
                  {pendingDeposits.length + pendingWithdrawals.length === 0 && (
                    <div className="text-sm text-gray-400">No client requests.</div>
                  )}
                </div>

                {/* Pending Users only visible via tab now */}
                {false && (
                  <div className="rounded-xl border border-gray-700 bg-[#1e1e1e] p-6 shadow">
                  <h2 className="mb-3 text-white font-semibold">Pending Users</h2>
                  <div className="space-y-2">
                    {pendingUsers.map((u: any) => (
                      <form key={u.id} action="/api/admin/approve-user" method="post" className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 p-2">
                        <input type="hidden" name="user_id" defaultValue={u.id} />
                        <div className="text-sm text-gray-300">{u.email} • {u.first_name} {u.last_name}</div>
                        <div className="flex gap-2">
                          <Button name="decision" value="approve" className="bg-emerald-600 text-white">Approve</Button>
                          <Button name="decision" value="reject" className="bg-red-600 text-white">Reject</Button>
                        </div>
                      </form>
                    ))}
                    {pendingUsers.length === 0 && <div className="text-sm text-gray-400">No pending users.</div>}
                  </div>
                </div>
                )}

              </div>
                </div>
              </div>
            </section>
          )}



      {tab === 'pending-users' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-700 bg-[#1e1e1e] p-6 shadow">
            <h2 className="mb-3 text-white font-semibold">Pending Users</h2>
            <div className="space-y-2">
              {pendingUsers.map((u: any) => (
                <form key={u.id} action={approveUser} className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 p-2">
                  <input type="hidden" name="user_id" defaultValue={u.id} />
                  <div className="text-sm text-gray-300">{u.email} • {u.first_name} {u.last_name}</div>
                  <div className="flex gap-2">
                    <Button name="decision" value="approve" className="bg-emerald-600 text-white">Approve</Button>
                    <Button name="decision" value="reject" className="bg-red-600 text-white">Reject</Button>
                  </div>
                </form>
              ))}
              {pendingUsers.length === 0 && <div className="text-sm text-gray-400">No pending users.</div>}
            </div>
          </div>
        </section>
      )}

      {tab === 'pending-deposits' && (
        <section className="mt-6 space-y-2">
          {pendingDeposits.map((t: any) => (
            <form key={`dep-${t.id}`} action={approveDeposit} className="rounded-lg border border-gray-700 bg-[#1e1e1e] p-4 shadow">
              <input type="hidden" name="tx_id" defaultValue={t.id} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-white font-medium">{t.account?.user?.first_name} {t.account?.user?.last_name}</div>
                  <div className="text-xs text-gray-400">{t.account?.user?.email} • {t.account?.user?.phone ?? 'n/a'}</div>
                  <div className="mt-1 text-sm text-gray-300">Deposit • ${Number(t.amount).toLocaleString()} • {new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button name="decision" value="approve" className="bg-emerald-600 text-white">Approve</Button>
                  <Button name="decision" value="deny" className="bg-red-600 text-white">Deny</Button>
                </div>
              </div>
            </form>
          ))}
          {pendingDeposits.length === 0 && <div className="text-sm text-gray-400">No pending deposits.</div>}
        </section>
      )}

      {tab === 'pending-withdrawals' && (
        <section className="mt-6 space-y-2">
          {pendingWithdrawals.map((w: any) => (
            <form key={`wr-${w.id}`} action={decideWithdrawal} className="rounded-lg border border-gray-700 bg-[#1e1e1e] p-4 shadow">
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
                  <Button name="decision" value="approve" className="bg-emerald-600 text-white">Approve</Button>
                  <Button name="decision" value="deny" className="bg-red-600 text-white">Deny</Button>
                </div>
              </div>
            </form>
          ))}
          {pendingWithdrawals.length === 0 && <div className="text-sm text-gray-400">No pending withdrawals.</div>}
        </section>
      )}

      {tab === 'pending-accounts' && (
        <section className="mt-6 space-y-2">
          <div className="rounded-xl border border-gray-700 bg-[#1e1e1e] p-6 shadow">
            <h2 className="mb-3 text-white font-semibold">Pending Accounts</h2>
            <div className="space-y-2">
              {pendingAccounts.map((a: any) => (
                <form key={a.id} action="/api/admin/verify-account" method="post" className="rounded border border-gray-800 bg-[#0E141C] p-3">
                  <input type="hidden" name="account_id" defaultValue={a.id} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-white font-medium">{a.user?.first_name} {a.user?.last_name}</div>
                      <div className="text-xs text-gray-400">{a.user?.email} • {a.user?.phone ?? 'n/a'}</div>
                      <div className="mt-2 text-sm text-gray-300">Type: <span className="text-amber-400">{a.type}</span> • Balance: ${Number(a.balance).toLocaleString()} • Min: ${Number(a.minimum_balance).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Start: {a.start_date ?? '—'}</div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <button formAction="/api/admin/update-account" formMethod="post" name="action" value="edit" className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1">Save</button>
                      <button formAction="/api/admin/delete-account" formMethod="post" name="action" value="delete" className="rounded bg-red-600 hover:bg-red-500 px-3 py-1">Delete</button>
                      <button className="rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-white">Verify</button>
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
        </section>
      )}

      {tab === 'earnings-rate' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-3 text-white font-semibold">Set Earnings Rate</h2>
            <form action={setRate} className="flex flex-wrap gap-2 items-end">
              <label className="text-xs text-gray-400">Account Type
                <select name="account_type" className="mt-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white">
                  <option value="LENDER">LENDER</option>
                  <option value="NETWORK">NETWORK</option>
                </select>
              </label>
              <label className="text-xs text-gray-400">Monthly %
                <input name="fixed_rate_monthly" type="number" step="0.001" placeholder="e.g., 1.25" className="mt-1 w-48 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white" />
              </label>
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
      )}

      {!tab && (
        <section className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:col-span-2">
            <h2 className="mb-3 text-white font-semibold">Set Earnings Rate</h2>
            <form action={setRate} className="flex flex-wrap gap-2 items-end">
              <label className="text-xs text-gray-400">Account Type
                <select name="account_type" className="mt-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white">
                  <option value="LENDER">LENDER</option>
                  <option value="NETWORK">NETWORK</option>
                </select>
              </label>
              <label className="text-xs text-gray-400">Monthly %
                <input name="fixed_rate_monthly" type="number" step="0.001" placeholder='e.g., 1.25' className="mt-1 w-48 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white" />
              </label>
              <button className="rounded bg-emerald-600 px-3 py-1 text-white">Set</button>
            </form>
            <div className="mt-3 text-sm text-gray-300">Recent:</div>
          {/* Verified Users Cards inline when tab is active */}

            <ul className="text-sm text-gray-400">
              {rates.map((r: any) => (
                <li key={r.id}>{r.account_type} • {r.fixed_rate_monthly ?? 'n/a'}% • from {r.effective_from}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === 'verified-users' && (
        <section className="mt-6">
          <VerifiedUsersCards />
        </section>
      )}
    </div>
  )
}

function AdminMonthlyChart({ profiles, accounts }: { profiles: { created_at: string; role?: string }[]; accounts: { balance?: number; verified_at?: string | null }[] }) {
  const now = new Date()
  const months: string[] = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-').map(Number)
    return `${new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short' })}`
  }
  const series = months.map((ym) => {
    const [y, m] = ym.split('-').map(Number)
    const newMembers = (profiles || []).filter(p => p.created_at && new Date(p.created_at).getFullYear() === y && new Date(p.created_at).getMonth() + 1 === m).length
    const aum = (accounts || [])
      .filter(a => a.verified_at)
      .filter(a => new Date(a.verified_at as string).getFullYear() <= y && (new Date(a.verified_at as string).getFullYear() < y || new Date(a.verified_at as string).getMonth() + 1 <= m))
      .reduce((s, a) => s + Number(a.balance || 0), 0)
    return { label: monthLabel(ym), newMembers, aum }
  })
  return <MultiLineChart data={series as any} series={[{ key: 'newMembers', label: 'New Members' }, { key: 'aum', label: 'AUM' }]} />
}

// Small server wrappers that render client components (keeps admin auth guard on server)
import SignOutButton from '@/components/SignOutButton'
import UsersManager from '@/components/admin/UsersManager'
import ReferralsAllLevels from '@/components/admin/ReferralsAllLevels'
import VerifiedUsersCards from '@/components/admin/VerifiedUsersCards'

function SignOutInline() {
  return <SignOutButton />
}


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function OverviewCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-[#0B0F14] border-gray-800 transition hover:border-amber-600/60">
      <CardHeader>
        <CardTitle className="text-xs text-gray-400 font-normal">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-extrabold text-[color:var(--gold-400,#FFD700)]">{value}</div>
      </CardContent>
    </Card>
  )
}

function UsersManagerSection() {
  return (
    <div className="mt-8">
      <UsersManager />
    </div>
  )
}

function ReferralsAllLevelsSection({ userId }: { userId: string }) {
  return <ReferralsAllLevels userId={userId} />
}


export async function approveUser(formData: FormData) {
  'use server'
  const userId = String(formData.get('user_id'))
  const decision = String(formData.get('decision'))
  try {
    if (decision === 'approve') {
      const { error: upErr } = await supabaseAdmin.from('profiles').update({ role: 'user' }).eq('id', userId)
      if (upErr) throw upErr
      const { data: acct } = await supabaseAdmin.from('accounts').select('id').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (acct?.id) {
        const { error: vErr } = await supabaseAdmin.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', acct.id)
        if (vErr) throw vErr
      }
      redirect('/admin?toast=user_approved')
    } else if (decision === 'reject') {
      const { error: delErr } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
      if (delErr) throw delErr
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
      const { data: tx, error: txErr } = await supabaseAdmin.from('transactions').select('*').eq('id', txId).maybeSingle()
      if (txErr) throw txErr
      if (tx) {
        await supabaseAdmin.from('transactions').update({ status: 'posted' }).eq('id', txId)
        const { data: acct, error: acctErr } = await supabaseAdmin.from('accounts').select('*').eq('id', tx.account_id).maybeSingle()
        if (acctErr) throw acctErr
        if (acct) {
          const newBal = Number(acct.balance) + Number(tx.amount)
          await supabaseAdmin.from('accounts').update({ balance: newBal }).eq('id', acct.id)
        }
      }
      redirect('/admin?toast=deposit_approved')
    } else if (decision === 'deny') {
      await supabaseAdmin.from('transactions').update({ status: 'denied' }).eq('id', txId)
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
      const schedule = nextReleaseDate(new Date())
      await supabaseAdmin.from('withdrawal_requests').update({ status: 'approved', scheduled_release_at: schedule }).eq('id', wrId)
      redirect('/admin?toast=withdrawal_approved')
    } else if (decision === 'deny') {
      await supabaseAdmin.from('withdrawal_requests').update({ status: 'denied' }).eq('id', wrId)
      redirect('/admin?toast=withdrawal_denied')
    }
  } catch (e) {
    console.error('decideWithdrawal failed', e)
    redirect('/admin?toast=error')
  }
}

export async function setRate(formData: FormData) {
  'use server'
  const account_type = String(formData.get('account_type'))
  const fixed_rate_monthly = Number(formData.get('fixed_rate_monthly')) || null
  try {
    await supabaseAdmin.from('earnings_rates').insert({ account_type, fixed_rate_monthly, effective_from: new Date().toISOString().slice(0, 10) })
    redirect('/admin?toast=rate_set')
  } catch (e) {
    console.error('setRate failed', e)
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
  const patch: any = { type, minimum_balance, balance }
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
