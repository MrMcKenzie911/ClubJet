import { AppSidebar } from "@/components/app-sidebar"
import MultiLineChart, { type MultiLineDatum } from "@/components/charts/MultiLineChart"
// import { DataTable } from "@/components/data-table"
import ReferralNetworkTable from "@/components/referrals/ReferralNetworkTable"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import ProgressTarget from "@/components/dashboard/ProgressTarget"
import CalculatorToggle from "@/components/dashboard/CalculatorToggle"
import InvitePanel from "@/components/referrals/InvitePanel"
import ReferralDetailedModalLauncher from "@/components/referrals/ReferralDetailedModalLauncher"

import { getSupabaseServer } from "@/lib/supabaseServer"
import { ensureUserReferralCode } from "@/lib/referral"

import ToastFromQuery from '@/components/ToastFromQuery'

import { redirect } from "next/navigation"

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // fallback for unauthenticated
    return (
      <div className="p-6 text-white">Please log in.</div>
    )
  }
  // If admin, route to admin dashboard
  const { data: me } = await supabase.from('profiles').select('role, is_founding_member').eq('id', user.id).maybeSingle()
  if (me?.role === 'admin' || me?.is_founding_member === true) redirect('/admin')
  // Load all accounts for the user
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, balance, start_date, verified_at, initial_balance, type, reserved_amount')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  // Latest applied earnings rate for user's primary account type (for KPI badge)
  const primaryType = (accounts ?? [])[0]?.type as string | undefined
  let rateAppliedPct = 0
  if (primaryType) {
    const { data: latestRate } = await supabase
      .from('earnings_rates')
      .select('fixed_rate_monthly, account_type, effective_from')
      .eq('account_type', primaryType)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()
    rateAppliedPct = Number(latestRate?.fixed_rate_monthly || 0)
  }

  // Direct referrals (for new signups line)
  const { data: l1 } = await supabase
    .from('profiles')
    .select('id, created_at')
    .eq('referrer_id', user.id)

  // Posted transactions across all accounts (for portfolio line)
  const accountIds = (accounts ?? []).map(a => a.id)
  let txs: { type: string; amount: number; created_at: string; status?: string | null }[] = []
  if (accountIds.length) {
    const { data: txData } = await supabase
      .from('transactions')
      .select('type, amount, created_at, account_id')
      .in('account_id', accountIds)
    txs = txData ?? []
  }
  const userAccounts = (accounts ?? []) as { initial_balance?: number; verified_at?: string|null; start_date?: string|null }[]
  const initialBalance = userAccounts.reduce((s, a) => s + Number(a.initial_balance ?? 0), 0)
  const startDateISO = (userAccounts[0]?.verified_at as string) || (userAccounts[0]?.start_date as string) || new Date().toISOString().slice(0,10)
  const referralCode = await ensureUserReferralCode(user.id)
  const sp = searchParams ? await searchParams : undefined
  const tabParam = sp?.tab
  const tab = Array.isArray(tabParam) ? tabParam[0] : tabParam
  if (tab === 'transactions') redirect('/dashboard/activity')

  async function UserPortfolioPayoutChart({ startDateISO, initialBalance, txs }: { startDateISO: string; initialBalance: number; txs: { type: string; amount: number; created_at: string; status?: string|null }[] }) {
    const now = new Date()
    const months: string[] = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    const monthLabel = (ym: string) => {
      const [y, m] = ym.split('-').map(Number)
      return `${new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short' })}`
    }

    const endOfMonth = (y: number, m: number) => new Date(y, m, 0)
    const start = new Date(startDateISO)
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
    const postedTxs = (txs || [])

    // Prepare referral deposits by Level 1 network (your direct signups)
    const supabase = getSupabaseServer()
    const firstMonthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    firstMonthStart.setHours(0,0,0,0)

    let l1AcctIds: string[] = []
    try {
      const { data: l1Accts } = await supabase
        .from('accounts')
        .select('id, user_id')
        .in('user_id', (l1 || []).map(r => r.id))
      l1AcctIds = (l1Accts || []).map(a => a.id)
    } catch {}

    let l1Tx: { type: string; amount: number; created_at: string; account_id: string }[] = []
    if (l1AcctIds.length) {
      const { data: txL1 } = await supabase
        .from('transactions')
        .select('type, amount, created_at, account_id')
        .in('account_id', l1AcctIds)
        .gte('created_at', firstMonthStart.toISOString())
      l1Tx = txL1 || []
    }

    const data: MultiLineDatum[] = months.map((ym) => {
      const [y, m] = ym.split('-').map(Number)
      const monthEnd = endOfMonth(y, m)

      // Cumulative + baseline initial balance from account open (previous month shows $0)
      const cumulative = postedTxs
        .filter(t => new Date(t.created_at) <= monthEnd)
        .reduce((sum, t) => {
          const amt = Number(t.amount || 0)
          if (t.type === 'WITHDRAWAL') return sum - amt
          return sum + amt
        }, 0)
      const base = monthEnd < startMonth ? 0 : Number(initialBalance || 0)
      const portfolio = base + cumulative

      // Your referrals' deposits this month
      const referralDeposits = l1Tx
        .filter(t => t.type === 'DEPOSIT')
        .filter(t => new Date(t.created_at).getFullYear() === y && new Date(t.created_at).getMonth() + 1 === m)
        .reduce((s, t) => s + Number(t.amount || 0), 0)

      return { label: monthLabel(ym), portfolio, referralDeposits }
    })

    return <MultiLineChart data={data} series={[{ key: 'portfolio', label: 'Portfolio Balance' }, { key: 'referralDeposits', label: 'Your Referrals Deposits' }]} />
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" role="user" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Single large container with inner components */}
              <div className="px-4 lg:px-6 space-y-4">
                <ToastFromQuery />

                {(!tab || tab === 'dashboard') && (
                  <>
                    <SectionCards totalAUM={(accounts ?? []).reduce((s,a:{balance?: number|null})=>s+Number(a.balance||0),0)} newSignups={(l1 ?? []).filter(s=>{ const d=s.created_at? new Date(s.created_at):null; const now=new Date(); return d && d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); }).length} monthlyProfits={(function(){ const now=new Date(); const int=(txs||[]).filter(t=>{ const d=new Date(t.created_at); return t.type==='INTEREST' && d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); }).reduce((s,t)=> s+Number(t.amount||0),0); return int; })()} referralPayoutPct={(function(){ const monthTx=(txs||[]).filter(t=>{ const d=new Date(t.created_at); const now=new Date(); return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); }); const comm=monthTx.filter(t=>t.type==='COMMISSION').reduce((s,t)=> s+Number(t.amount||0),0); const int=monthTx.filter(t=>t.type==='INTEREST').reduce((s,t)=> s+Number(t.amount||0),0); const denom=int+comm; return denom>0? (comm/denom)*100 : 0; })()} rateAppliedPct={rateAppliedPct} monthlyCommission={(function(){ const now=new Date(); const comm=(txs||[]).filter(t=>{ const d=new Date(t.created_at); return t.type==='COMMISSION' && d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); }).reduce((s,t)=> s+Number(t.amount||0),0); return comm; })()} routes={{ aum: '/dashboard?tab=account-balance', signups: '/dashboard?tab=my-network', monthly: '/dashboard?tab=investment-history', commission: '/dashboard?tab=my-network' }} />
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <UserPortfolioPayoutChart startDateISO={startDateISO} initialBalance={initialBalance} txs={txs} />
                      </div>
                      <div className="space-y-3">
                        <ProgressTarget initialBalance={initialBalance} startDateISO={startDateISO} monthlyTargetPct={1.5} />
                        <CalculatorToggle />
                      </div>
                    </div>
                    <InvitePanel userCode={referralCode} />
                    <ReferralNetworkTable userId={user.id} />
                  </>
                )}

                {tab === 'my-network' && (
                  <>
                    <InvitePanel userCode={referralCode} />
                    <ReferralNetworkTable defaultTab="analytics" />
                  </>
                )}

                {tab === 'invite' && (
                  <InvitePanel userCode={referralCode} />
                )}

                {tab === 'account-balance' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
                    <h2 className="text-white font-semibold mb-3">Account Balance</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-gray-400">
                            <th className="text-left py-1 pr-4">Type</th>
                            <th className="text-left py-1 pr-4">Verified</th>
                            <th className="text-left py-1 pr-4">Balance</th>
                            <th className="text-left py-1 pr-4">Initial</th>
                            <th className="text-left py-1 pr-4">Start</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(accounts ?? []).map((a: { id: string; type: string; verified_at: string | null; balance: number | null; initial_balance: number | null; start_date: string | null }) => (
                            <tr key={a.id} className="border-t border-gray-800">
                              <td className="py-1 pr-4 text-amber-300">{a.type === 'LENDER' ? 'Fixed Memberships' : a.type === 'NETWORK' ? 'Variable Memberships' : a.type}</td>
                              <td className="py-1 pr-4">{a.verified_at ? new Date(a.verified_at).toLocaleDateString() : 'Pending'}</td>
                              <td className="py-1 pr-4">${Number(a.balance||0).toLocaleString()}</td>
                              <td className="py-1 pr-4">${Number(a.initial_balance||0).toLocaleString()}</td>
                              <td className="py-1 pr-4">{a.start_date ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4">
                      <ProgressTarget initialBalance={initialBalance} startDateISO={startDateISO} monthlyTargetPct={1.5} />
                    </div>
                  </div>
                )}

                {tab === 'investment-history' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
                    <h2 className="text-white font-semibold mb-3">Investment History</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-gray-400">
                            <th className="text-left py-1 pr-4">Date</th>
                            <th className="text-left py-1 pr-4">Type</th>
                            <th className="text-left py-1 pr-4">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...(txs || [])].sort((a,b)=> new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).map((t: { created_at: string; type: string; amount: number }, i: number) => (
                            <tr key={`${t.created_at}-${i}`} className="border-t border-gray-800">
                              <td className="py-1 pr-4">{new Date(t.created_at).toLocaleString()}</td>
                              <td className="py-1 pr-4">{t.type}</td>
                              <td className="py-1 pr-4">${Number(t.amount||0).toLocaleString()}</td>
                            </tr>
                          ))}
                          {(txs||[]).length===0 && (
                            <tr><td colSpan={3} className="py-2 text-gray-400">No transactions yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {tab === 'earnings-summary' && (
                  <div className="space-y-6">
                    {/* Enhanced Earnings Summary Header */}
                    <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
                      <h2 className="text-white font-semibold mb-6 text-xl">Comprehensive Earnings Summary</h2>

                      {/* Account Overview Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-lg border border-emerald-500/30 bg-[#0c1f19] p-4">
                          <div className="text-xs text-emerald-300/80 uppercase tracking-wide">Initial Investment</div>
                          <div className="mt-1 text-2xl font-bold text-emerald-200">${initialBalance.toLocaleString()}</div>
                          <div className="text-xs text-emerald-400/70 mt-1">Your starting balance</div>
                        </div>
                        {(() => {
                          const currentBalance = (accounts ?? []).reduce((s,a:{balance?: number|null})=>s+Number(a.balance||0),0)
                          return (
                            <>
                              <div className="rounded-lg border border-amber-500/30 bg-[#221a0a] p-4">
                                <div className="text-xs text-amber-300/80 uppercase tracking-wide">Current Balance</div>
                                <div className="mt-1 text-2xl font-bold text-amber-200">${currentBalance.toLocaleString()}</div>
                                <div className="text-xs text-amber-400/70 mt-1">Your total portfolio value</div>
                              </div>
                              <div className="rounded-lg border border-purple-500/30 bg-[#1a1024] p-4">
                                <div className="text-xs text-purple-300/80 uppercase tracking-wide">Total Growth</div>
                                <div className="mt-1 text-2xl font-bold text-purple-200">
                                  ${(currentBalance - initialBalance).toLocaleString()}
                                </div>
                                <div className="text-xs text-purple-400/70 mt-1">
                                  {initialBalance > 0 ? `+${(((currentBalance - initialBalance) / initialBalance) * 100).toFixed(2)}%` : '0%'} total return
                                </div>
                              </div>
                            </>
                          )
                        })()}
                      </div>

                      {/* Monthly Performance */}
                      {(() => {
                        const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
                        const monthTx=(txs||[]).filter(t=>{ const d=new Date(t.created_at); return d.getFullYear()===y && d.getMonth()===m })
                        const interest=monthTx.filter(t=>t.type==='INTEREST').reduce((s,t)=>s+Number(t.amount||0),0)
                        const commissions=monthTx.filter(t=>t.type==='COMMISSION').reduce((s,t)=>s+Number(t.amount||0),0)
                        const totalEarnings = interest + commissions
                        const monthlyReturn = initialBalance > 0 ? (totalEarnings / initialBalance) * 100 : 0

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="rounded-lg border border-blue-500/30 bg-[#0a1a24] p-4">
                              <div className="text-xs text-blue-300/80 uppercase tracking-wide">Interest Earned</div>
                              <div className="mt-1 text-xl font-bold text-blue-200">${interest.toLocaleString()}</div>
                              <div className="text-xs text-blue-400/70 mt-1">This month</div>
                            </div>
                            <div className="rounded-lg border border-cyan-500/30 bg-[#0a1f22] p-4">
                              <div className="text-xs text-cyan-300/80 uppercase tracking-wide">Referral Bonuses</div>
                              <div className="mt-1 text-xl font-bold text-cyan-200">${commissions.toLocaleString()}</div>
                              <div className="text-xs text-cyan-400/70 mt-1">This month</div>
                            </div>
                            <div className="rounded-lg border border-green-500/30 bg-[#0c1f14] p-4">
                              <div className="text-xs text-green-300/80 uppercase tracking-wide">Total Monthly</div>
                              <div className="mt-1 text-xl font-bold text-green-200">${totalEarnings.toLocaleString()}</div>
                              <div className="text-xs text-green-400/70 mt-1">Combined earnings</div>
                            </div>
                            <div className="rounded-lg border border-yellow-500/30 bg-[#1f1a0a] p-4">
                              <div className="text-xs text-yellow-300/80 uppercase tracking-wide">Monthly Return</div>
                              <div className="mt-1 text-xl font-bold text-yellow-200">{monthlyReturn.toFixed(2)}%</div>
                              <div className="text-xs text-yellow-400/70 mt-1">Performance rate</div>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Market Comparison */}
                      <div className="rounded-lg border border-gray-700 bg-[#0F141B] p-4">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                          <span className="text-lg">📈</span>
                          Market Performance Comparison
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {(() => {
                            const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
                            const monthTx=(txs||[]).filter(t=>{ const d=new Date(t.created_at); return d.getFullYear()===y && d.getMonth()===m })
                            const totalEarnings=monthTx.filter(t=>t.type==='INTEREST'||t.type==='COMMISSION').reduce((s,t)=>s+Number(t.amount||0),0)
                            const monthlyReturn = initialBalance > 0 ? (totalEarnings / initialBalance) * 100 : 0
                            const annualizedReturn = monthlyReturn * 12
                            const sp500Monthly = 0.83 // ~10% annually / 12
                            const sp500Annual = 10.0
                            const marketBondMonthly = 0.33 // ~4% annually / 12
                            const marketBondAnnual = 4.0

                            return (
                              <>
                                <div className="text-center p-3 rounded border border-emerald-500/30 bg-emerald-500/5">
                                  <div className="text-emerald-300 font-semibold">Club Aureus</div>
                                  <div className="text-2xl font-bold text-emerald-200 mt-1">{monthlyReturn.toFixed(2)}%</div>
                                  <div className="text-xs text-emerald-400/70">Monthly</div>
                                  <div className="text-lg font-semibold text-emerald-200 mt-2">{annualizedReturn.toFixed(1)}%</div>
                                  <div className="text-xs text-emerald-400/70">Annualized</div>
                                </div>
                                <div className="text-center p-3 rounded border border-gray-600 bg-gray-600/5">
                                  <div className="text-gray-300 font-semibold">S&P 500</div>
                                  <div className="text-2xl font-bold text-gray-200 mt-1">{sp500Monthly.toFixed(2)}%</div>
                                  <div className="text-xs text-gray-400/70">Monthly Avg</div>
                                  <div className="text-lg font-semibold text-gray-200 mt-2">{sp500Annual.toFixed(1)}%</div>
                                  <div className="text-xs text-gray-400/70">Historical Avg</div>
                                </div>
                                <div className="text-center p-3 rounded border border-gray-600 bg-gray-600/5">
                                  <div className="text-gray-300 font-semibold">Market Bonds</div>
                                  <div className="text-2xl font-bold text-gray-200 mt-1">{marketBondMonthly.toFixed(2)}%</div>
                                  <div className="text-xs text-gray-400/70">Monthly Avg</div>
                                  <div className="text-lg font-semibold text-gray-200 mt-2">{marketBondAnnual.toFixed(1)}%</div>
                                  <div className="text-xs text-gray-400/70">Historical Avg</div>
                                </div>
                              </>
                            )
                          })()}
                        </div>

                        {/* Performance Indicators */}
                        {(() => {
                          const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
                          const monthTx=(txs||[]).filter(t=>{ const d=new Date(t.created_at); return d.getFullYear()===y && d.getMonth()===m })
                          const totalEarnings=monthTx.filter(t=>t.type==='INTEREST'||t.type==='COMMISSION').reduce((s,t)=>s+Number(t.amount||0),0)
                          const monthlyReturn = initialBalance > 0 ? (totalEarnings / initialBalance) * 100 : 0
                          const sp500Monthly = 0.83
                          const outperformingSP500 = monthlyReturn > sp500Monthly
                          const outperformanceVsSP500 = monthlyReturn - sp500Monthly

                          return (
                            <div className="mt-4 p-3 rounded border border-amber-500/30 bg-amber-500/5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{outperformingSP500 ? '🚀' : '📊'}</span>
                                  <div>
                                    <div className="text-amber-300 font-semibold">
                                      {outperformingSP500 ? 'Outperforming Market!' : 'Market Comparison'}
                                    </div>
                                    <div className="text-xs text-amber-400/70">
                                      {outperformingSP500
                                        ? `+${outperformanceVsSP500.toFixed(2)}% above S&P 500 this month`
                                        : `${Math.abs(outperformanceVsSP500).toFixed(2)}% below S&P 500 this month`
                                      }
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-lg font-bold ${outperformingSP500 ? 'text-emerald-300' : 'text-amber-300'}`}>
                                    {outperformingSP500 ? '+' : ''}{outperformanceVsSP500.toFixed(2)}%
                                  </div>
                                  <div className="text-xs text-gray-400">vs S&P 500</div>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'contribute' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
                    <h2 className="text-white font-semibold mb-3">Make a Contribution</h2>
                    <form action="/api/user/deposit" method="post" className="flex flex-wrap gap-2 items-end">
                      <label className="text-xs text-gray-400">Amount
                        <input name="amount" type="number" min="1" step="0.01" required className="mt-1 w-40 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white" />
                      </label>
                      <label className="text-xs text-gray-400">Account Type
                        <select name="account_type" className="mt-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white">
                          <option value="LENDER">Fixed Memberships</option>
                          <option value="NETWORK">Variable Memberships</option>
                        </select>
                      </label>
                      <button className="rounded bg-emerald-600 px-3 py-1 text-white">Submit</button>
                    </form>
                    <p className="text-xs text-gray-400 mt-2">Admin will review and approve your deposit.</p>
                  </div>
                )}
                {tab === 'withdrawal' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
                    <h2 className="text-white font-semibold mb-3">Request a Withdrawal</h2>
                    <form action="/api/user/withdrawal" method="post" className="flex flex-wrap gap-2 items-end">
                      <label className="text-xs text-gray-400">Amount
                        <input name="amount" type="number" min="1" step="0.01" required className="mt-1 w-40 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white" />
                      </label>
                      <label className="text-xs text-gray-400">Method
                        <select name="method" className="mt-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white">
                          <option value="ACH">ACH</option>
                          <option value="WIRE">Wire</option>
                          <option value="CRYPTO">Crypto</option>
                        </select>
                      </label>
                      <button className="rounded bg-emerald-600 px-3 py-1 text-white">Submit</button>
                    </form>
                    <p className="text-xs text-gray-400 mt-2">Withdrawals are scheduled for the next release date per policy.</p>
                  </div>
                )}
                {tab === 'smart' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
                    <h2 className="text-white font-semibold mb-3">Smart Contributions</h2>
                    <form action="/api/send-to-n8n" method="post" className="flex flex-wrap gap-2 items-end">
                      <input type="hidden" name="event" value="smart_contribution" />
                      <label className="text-xs text-gray-400">Monthly Amount
                        <input name="amount" type="number" min="1" step="0.01" required className="mt-1 w-40 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white" />
                      </label>
                      <label className="text-xs text-gray-400">Day of Month
                        <input name="day" type="number" min="1" max="28" required className="mt-1 w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white" />
                      </label>
                      <button className="rounded bg-emerald-600 px-3 py-1 text-white">Save</button>
                    </form>
                    <p className="text-xs text-gray-400 mt-2">We’ll notify you when scheduling is confirmed.</p>
                  </div>
                )}
                {tab === 'payment-methods' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
                    <h2 className="text-white font-semibold mb-3">Payment Methods</h2>
                    <form action="/api/send-to-n8n" method="post" className="flex flex-wrap gap-2 items-end">
                      <input type="hidden" name="event" value="payment_method_update" />
                      <label className="text-xs text-gray-400">Preferred Method
                        <select name="method" className="mt-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white">
                          <option value="ACH">ACH</option>
                          <option value="WIRE">Wire</option>
                          <option value="CRYPTO">Crypto</option>
                        </select>
                      </label>
                      <label className="text-xs text-gray-400">Details
                        <input name="details" placeholder="Last 4 / wallet / notes" className="mt-1 w-64 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white" />
                      </label>
                      <button className="rounded bg-emerald-600 px-3 py-1 text-white">Save</button>
                    </form>
                  </div>
                )}
                {tab === 'support' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
                    <h2 className="text-white font-semibold mb-3">Support</h2>
                    <form action="/api/send-to-n8n" method="post" className="flex flex-wrap gap-2 items-end">
                      <input type="hidden" name="event" value="support_message" />
                      <label className="text-xs text-gray-400">Subject
                        <input name="subject" required className="mt-1 w-64 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white" />
                      </label>
                      <label className="text-xs text-gray-400">Message
                        <input name="message" required className="mt-1 w-[32rem] rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white" />
                      </label>
                      <button className="rounded bg-emerald-600 px-3 py-1 text-white">Send</button>
                    </form>
                  </div>
                )}
                {tab === 'messages' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
                    <h2 className="text-white font-semibold mb-3">Messages</h2>
                    <p className="text-sm text-gray-300">At this time, account messages are delivered via email and phone. Your referrals’ updates appear in the dashboard KPIs.</p>
                  </div>
                )}
                {tab === 'documents' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6">
                    <h2 className="text-white font-semibold mb-3">Documents</h2>
                    <p className="text-sm text-gray-300">Statements and tax documents are issued monthly/annually. We will email you when ready.</p>
                  </div>
                )}

                <div className="pt-2">
                  <ReferralDetailedModalLauncher />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
