import { redirect } from 'next/navigation'
/* eslint-disable @typescript-eslint/no-explicit-any */
type StatCardProps = { label: string; value: string; subtle?: boolean; accent?: boolean; positive?: boolean }
function StatCard({ label, value, subtle, accent, positive }: StatCardProps) {
  return (
    <div className={`rounded-xl border ${accent? 'border-amber-500/60' : 'border-gray-800'} bg-[#0B0F14] p-4`}>
      <div className={`text-[11px] uppercase tracking-wide ${subtle? 'text-gray-400' : 'text-gray-300'}`}>{label}</div>
      <div className={`mt-1 text-lg font-semibold ${positive? 'text-emerald-400' : 'text-white'}`}>{value}</div>
    </div>
  )
}

type QuickButtonProps = { label: string; href?: string; external?: boolean; onClickHint?: string }
function QuickButton({ label, href, external, onClickHint }: QuickButtonProps) {
  const base = 'rounded-lg border border-gray-800 bg-[#0F141B] text-gray-200 hover:border-amber-600 hover:text-amber-400 px-3 py-2 text-sm text-center';
  if (href) return <a className={base} href={href} {...(external? { target: '_blank' } : {})}>{label}</a>
  return <button className={base} data-action={onClickHint}>{label}</button>
}


import { getSupabaseServer } from '@/lib/supabaseServer'
import ProgressTarget from '@/components/dashboard/ProgressTarget'
import BalanceChart from '@/components/dashboard/BalanceChart'
import SignOutButton from '@/components/auth/SignOutButton'

async function getData() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { redirect: true as const }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', user.id)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .in('account_id', (accounts?.map(a => a.id) ?? ['00000000-0000-0000-0000-000000000000']))
    .order('created_at', { ascending: false })

  return { user, profile, accounts: accounts ?? [], transactions: transactions ?? [] }
}

export default async function DashboardPage() {
  const res = await getData()
  if ('redirect' in res) redirect('/login')

  const { accounts, transactions } = res
  const first = accounts[0]

  // Derived metrics for stat cards (black + gold theme)
  const totalBalance = accounts.reduce((s: number, a: any) => s + Number(a.balance || 0), 0)
  const pendingDeposits = transactions.filter((t: any) => t.type === 'DEPOSIT' && t.status === 'pending').reduce((s: number, t: any) => s + Number(t.amount || 0), 0)
  const totalProfit = transactions.filter((t: any) => (t.type === 'INTEREST' || t.type === 'COMMISSION') && (t.status === 'posted' || t.status === 'completed' || !t.status)).reduce((s: number, t: any) => s + Number(t.amount || 0), 0)
  const projectedMonthlyIncome = totalBalance * 0.015 // 1.5% monthly target
  const startISO = first ? new Date(first.start_date).toISOString() : new Date().toISOString()

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 main-container rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Portfolio Manager</h1>
          <p className="text-xs text-gray-400">Account Holder Dashboard</p>
        </div>
        <SignOutButton />
      </div>

      {/* Stat cards row */}
      <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Current Portfolio" value={`$${totalBalance.toLocaleString()}`} />
        <StatCard label="Pending Deposits" value={`$${pendingDeposits.toLocaleString()}`} subtle />
        <StatCard label="Timeframe Projection" value={`30 Days`} />
        <StatCard label="Projected Monthly Income" value={`$${projectedMonthlyIncome.toLocaleString(undefined,{maximumFractionDigits:0})}+`} accent />
        <StatCard label="Total Profit" value={`$${totalProfit.toLocaleString()}`} positive />
        {first && <StatCard label="Primary Account" value={first.type} />}
      </div>

      {/* Chart + Quick Actions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {first && (
            <div className="rounded-xl border border-gray-700 bg-[#1e1e1e] p-6 shadow">
              <h2 className="mb-3 text-white font-semibold">Performance Overview</h2>
              <BalanceChart initialBalance={Number(first.balance) || 0} startDateISO={startISO} monthlyTargetPct={1.5} />
            </div>
          )}
        </div>
        <div>
          <div className="rounded-xl border border-gray-700 bg-[#1e1e1e] p-6 shadow">
            <h2 className="mb-3 text-white font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickButton label="Withdraw" href="#withdraw" />
              <QuickButton label="Deposit" href="#deposit" />
              <QuickButton label="History" href="#history" />
              <QuickButton label="Calculator" onClickHint="open-calculator" />
              <QuickButton label="Strategy" onClickHint="open-strategy" />
              <QuickButton label="Support" href="/support" external />
            </div>
          </div>
        </div>
      </div>

      {/* Forms */}
      <div className="mt-8 grid gap-6 md:grid-cols-2" id="actions">
        <div id="withdraw"><WithdrawalRequest accountId={first?.id} /></div>
        <div id="deposit"><PaymentForm accountId={first?.id} /></div>
      </div>

      {/* History */}
      <div className="mt-8 rounded-xl border border-gray-800 bg-[#0B0F14] p-4" id="history">
        <h2 className="mb-3 text-white font-semibold">Activity History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="p-2">Date</th>
                <th className="p-2">Type</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t: any) => (
                <tr key={t.id} className="border-t border-gray-800">
                  <td className="p-2 text-gray-300">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="p-2 text-gray-300">{t.type}</td>
                  <td className="p-2 text-gray-300">${Number(t.amount).toFixed(2)}</td>
                  <td className="p-2 text-gray-300">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function WithdrawalRequest({ accountId }: { accountId?: string }) {
  return <form action={submitWithdrawal} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
    <h3 className="mb-2 font-semibold text-white">Withdrawal Request</h3>
    <input type="hidden" name="account_id" defaultValue={accountId} />
    <label className="block text-sm text-gray-300">Amount</label>
    <input name="amount" required step="0.01" className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
    <label className="mt-3 block text-sm text-gray-300">Method</label>
    <select name="method" className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white">
      <option value="STRIPE">Stripe</option>
      <option value="ACH">ACH</option>
      <option value="WIRE">Wire</option>
    </select>
    <button className="mt-3 rounded-md bg-emerald-500 px-4 py-2 text-white">Submit</button>
  </form>
}

async function submitWithdrawal(formData: FormData) {
  'use server'
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')
  const account_id = formData.get('account_id') as string
  const amount = parseFloat(String(formData.get('amount')))
  const method = String(formData.get('method'))
  if (!account_id || !amount || amount <= 0) return
  await supabase.from('withdrawal_requests').insert({ account_id, amount, method })
}

function PaymentForm({ accountId }: { accountId?: string }) {
  return <form action={submitPayment} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
    <h3 className="mb-2 font-semibold text-white">Payment / Deposit</h3>
    <input type="hidden" name="account_id" defaultValue={accountId} />
    <label className="block text-sm text-gray-300">Amount</label>
    <input name="amount" required step="0.01" className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
    <label className="mt-3 block text-sm text-gray-300">Method</label>
    <select name="method" className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white">
      <option value="WIRE">Wire</option>
      <option value="ACH">ACH</option>
      <option value="STRIPE">Stripe</option>
    </select>
    <label className="mt-3 block text-sm text-gray-300">Reference (optional)</label>
    <input name="reference" className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
    <button className="mt-3 rounded-md bg-emerald-500 px-4 py-2 text-white">Submit</button>
    <p className="mt-2 text-xs text-amber-400">COMPLETE TRANSFER AT YOUR BANK, WE ARE AWAITING FUNDS</p>
  </form>
}

async function submitPayment(formData: FormData) {
  'use server'
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')
  const account_id = formData.get('account_id') as string
  const amount = parseFloat(String(formData.get('amount')))
  const reference = String(formData.get('reference') || '')
  if (!account_id || !amount || amount <= 0) return
  await supabase.from('transactions').insert({ account_id, type: 'DEPOSIT', amount, status: 'pending', metadata: { reference } })
}

