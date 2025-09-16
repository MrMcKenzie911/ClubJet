/* eslint-disable @typescript-eslint/no-explicit-any */

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { Button } from '@/components/ui/button'

import ToastFromQuery from '@/components/ToastFromQuery'
import InvitePanel from '@/components/referrals/InvitePanel'
import ReferralNetworkTable from '@/components/referrals/ReferralNetworkTable'
import { ensureUserReferralCode } from '@/lib/referral'
import { SectionCards } from '@/components/section-cards'
import MultiLineChart, { type MultiLineDatum } from '@/components/charts/MultiLineChart'
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { revalidatePath } from 'next/cache'
import CommissionTab from '@/components/admin/CommissionTab'



async function getAdminData() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { redirect: true as const }
  const { data: me } = await supabase.from('profiles').select('role, is_founding_member').eq('id', user.id).single()
  if (me?.role !== 'admin' && me?.is_founding_member !== true) return { redirect: true as const }

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
  const pendingOwnerIds = (pendingUsers ?? []).map((u: any) => u.id)
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
    .not('verified_at','is', null)

  // This month transactions for KPI
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const end = new Date(new Date().getFullYear(), new Date().getMonth()+1, 1)
  const { data: monthTx } = await supabase
    .from('transactions')
    .select('type, amount, created_at')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())

  return { user, pendingUsers: pendingUsers ?? [], pendingDeposits: pendingDeposits ?? [], pendingWithdrawals: pendingWithdrawals ?? [], rates: rates ?? [], pendingAccounts: pendingAccounts ?? [], profilesAll: profilesAll ?? [], verifiedAccounts: verifiedAccounts ?? [], monthTx: monthTx ?? [] }
}
export default async function AdminPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const res = await getAdminData()
  if ('redirect' in res) redirect('/login')
  const tabParam = searchParams?.tab
  const tab = Array.isArray(tabParam) ? tabParam[0] : tabParam

  const { pendingUsers, pendingDeposits, pendingWithdrawals, rates, pendingAccounts, profilesAll, verifiedAccounts, monthTx } = res

  const referralCode = await ensureUserReferralCode(res.user.id)

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" role="admin" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6 space-y-4">
                <ToastFromQuery />

                {!tab && (
                  <>
                    <SectionCards totalAUM={(verifiedAccounts??[]).reduce((s:number,a:{balance?:number})=> s+Number(a.balance||0),0)} newSignups={(profilesAll??[]).filter((p:{created_at:string, role?:string|null})=>{ const d=p.created_at? new Date(p.created_at):null; const now=new Date(); return d && (p.role??'user')!=='admin' && d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); }).length} monthlyProfits={(monthTx||[]).filter((t:any)=>t.type==='INTEREST').reduce((s:number,t:any)=> s+Number(t.amount||0),0)} referralPayoutPct={(function(){ const comm=(monthTx||[]).filter((t:any)=>t.type==='COMMISSION').reduce((s:number,t:any)=> s+Number(t.amount||0),0); const int=(monthTx||[]).filter((t:any)=>t.type==='INTEREST').reduce((s:number,t:any)=> s+Number(t.amount||0),0); const denom=int+comm; return denom>0? (comm/denom)*100:0 })()} />

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="md:col-span-2 space-y-6">
                        <AdminAUMSignupsChart profiles={profilesAll} accounts={verifiedAccounts} />
                      </div>
                    </div>

                    <div className="mt-6">
                      <InvitePanel userCode={referralCode} />
                    </div>

                    <div className="mt-6">
                      <ReferralNetworkTable userId={res.user.id} />
                    </div>
                  </>
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

      {tab === 'commission' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-4">
            <h2 className="text-white font-semibold mb-3">Commission</h2>
            <CommissionTab />
          </div>
        </section>
      )}


      {tab === 'verified-users' && (
        <section className="mt-6">
          <UsersManagerSection />
        </section>
      )}

      {/* Placeholder handlers for all new Admin tabs to avoid 404s and ensure smooth navigation */}
      {tab === 'account-balances' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Account Balances</h2>
            <p className="text-sm text-gray-400">Overview of all member balances across the platform. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'referral-networks' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Referral Networks</h2>
            <p className="text-sm text-gray-400">Complete tree view with founding member tools. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'signup-bonuses' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Signup Bonus Processing</h2>
            <p className="text-sm text-gray-400">Calculate and distribute referral bonuses. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'transactions' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Transaction Management</h2>
            <p className="text-sm text-gray-400">All platform transactions. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'payment-methods' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Payment Methods</h2>
            <p className="text-sm text-gray-400">Manage platform payment options. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'financial-reports' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Financial Reports</h2>
            <p className="text-sm text-gray-400">Platform totals and growth metrics. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'network-analysis' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Network Analysis</h2>
            <p className="text-sm text-gray-400">Founding member performance and deep networks. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'commission-reports' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Commission Reports</h2>
            <p className="text-sm text-gray-400">Bonus calculations and distributions. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'user-activity' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">User Activity</h2>
            <p className="text-sm text-gray-400">Login tracking and engagement metrics. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'settings' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Platform Settings</h2>
            <p className="text-sm text-gray-400">Business rules and fee structures. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'audit-logs' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Audit Logs</h2>
            <p className="text-sm text-gray-400">Complete system activity tracking. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'notifications' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Notifications</h2>
            <p className="text-sm text-gray-400">Send alerts to users. (Coming soon)</p>
          </div>
        </section>
      )}
      {tab === 'data-export' && (
        <section className="mt-6">
          <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
            <h2 className="text-white font-semibold mb-2">Data Export</h2>
            <p className="text-sm text-gray-400">CSV exports for compliance. (Coming soon)</p>
          </div>
        </section>
      )}

                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
  )
}

function AdminAUMSignupsChart({ profiles, accounts }: { profiles: { created_at: string; role?: string|null }[]; accounts: { balance?: number; verified_at?: string|null }[] }) {
  const now = new Date()
  const months: string[] = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-').map(Number)
    return `${new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short' })}`
  }
  const series: MultiLineDatum[] = months.map((ym) => {
    const [y, m] = ym.split('-').map(Number)
    const newSignups = (profiles || []).filter(p => p.created_at && (p.role ?? 'user') !== 'admin' && new Date(p.created_at).getFullYear() === y && new Date(p.created_at).getMonth() + 1 === m).length
    const aum = (accounts || [])
      .filter(a => a.verified_at)
      .filter(a => new Date(a.verified_at as string).getFullYear() < y || (new Date(a.verified_at as string).getFullYear() === y && new Date(a.verified_at as string).getMonth() + 1 <= m))
      .reduce((s, a) => s + Number(a.balance || 0), 0)
    return { label: monthLabel(ym), aum, newSignups }
  })
  return <MultiLineChart data={series} series={[{ key: 'aum', label: 'Total AUM' }, { key: 'newSignups', label: 'New Signups' }]} />
}

// Small server wrappers that render client components (keeps admin auth guard on server)
import UsersManager from '@/components/admin/UsersManager'

function UsersManagerSection() {
  return (
    <div className="mt-8">
      <UsersManager />
    </div>
  )
}


export async function approveUser(formData: FormData) {
  'use server'
  const userId = String(formData.get('user_id'))
  const decision = String(formData.get('decision'))
  try {
    if (decision === 'approve') {
      const { error: upErr } = await supabaseAdmin.from('profiles').update({ role: 'user', approval_status: 'approved', approved_at: new Date().toISOString() }).eq('id', userId)
      if (upErr) throw upErr
      const { data: acct } = await supabaseAdmin.from('accounts').select('id').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (acct?.id) {
        const { error: vErr } = await supabaseAdmin.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', acct.id)
        if (vErr) throw vErr
      }
      // Credit referrer $25 commission upon approval
      const { data: prof } = await supabaseAdmin.from('profiles').select('referrer_id').eq('id', userId).maybeSingle()
      const refId = (prof?.referrer_id as string | null) ?? null
      if (refId) {
        const { data: refAcct } = await supabaseAdmin.from('accounts').select('id, balance').eq('user_id', refId).order('created_at', { ascending: true }).limit(1).maybeSingle()
        if (refAcct?.id) {
          const amt = 25
          await supabaseAdmin.from('transactions').insert({ account_id: refAcct.id, type: 'COMMISSION', amount: amt, status: 'posted', created_at: new Date().toISOString(), memo: 'Referral approval bonus' })
          await supabaseAdmin.from('accounts').update({ balance: Number(refAcct.balance || 0) + amt }).eq('id', refAcct.id)
        }
      }
      try { revalidatePath('/admin'); revalidatePath('/dashboard') } catch {}
      redirect('/admin?toast=user_approved')
    } else if (decision === 'reject') {
      const { error: delErr } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
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
      const { data: wr, error: wrErr } = await supabaseAdmin.from('withdrawal_requests').select('*').eq('id', wrId).maybeSingle()
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
