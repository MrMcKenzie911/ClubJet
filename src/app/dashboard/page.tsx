import { redirect } from 'next/navigation'
import ToastFromQueryDashboard from '@/components/ToastFromQueryDashboard'


type QuickButtonProps = { label: string; href?: string; external?: boolean; onClickHint?: string }
function QuickButton({ label, href, external, onClickHint }: QuickButtonProps) {
  const base = 'rounded-lg border border-gray-800 bg-[#0F141B] text-gray-200 hover:border-amber-600 hover:text-amber-400 px-3 py-2 text-sm text-center';
  if (href) return <a className={base} href={href} {...(external? { target: '_blank' } : {})}>{label}</a>
  return <button className={base} data-action={onClickHint}>{label}</button>
}




// Large stat card used for the hero row
function BigStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0B0F14] p-6 shadow-lg">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="mt-2 text-3xl md:text-4xl font-extrabold text-amber-400">{value}</div>
    </div>
  )
}

import ReferralDetailedModalLauncher from '@/components/referrals/ReferralDetailedModalLauncher'


import { getSupabaseServer } from '@/lib/supabaseServer'
import BalanceChart from '@/components/dashboard/BalanceChart'
import SignOutButton from '@/components/auth/SignOutButton'
import CalculatorToggle from '@/components/dashboard/CalculatorToggle'
import ReferralTreeClient from '@/components/referrals/ReferralTreeClient'


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

function ReferralTreeWrapper({ userId }: { userId: string }) {
  return <ReferralTreeClient userId={userId} />
}

function InvitePanelWrapper() {
  // placeholder for future server-side invite panel integration
  return null
}

export default async function DashboardPage() {
  const res = await getData()
  if ('redirect' in res) redirect('/login')

  const { accounts, transactions } = res
  const first = accounts[0]

  // Derived metrics for stat cards (black + gold theme)
  type AccountRow = { balance?: number; start_date?: string; id: string }
  type TxnRow = { id: string; created_at: string; type: string; amount: number; status?: string; account_id: string }
  const totalBalance = accounts.reduce((s: number, a: AccountRow) => s + Number(a.balance || 0), 0)
  const pendingDeposits = transactions
    .filter((t: TxnRow) => t.type === 'DEPOSIT' && t.status === 'pending')
    .reduce((s: number, t: TxnRow) => s + Number(t.amount || 0), 0)
  const projectedMonthlyIncome = totalBalance * 0.015 // 1.5% monthly target
  const startISO = first?.start_date ? new Date(first.start_date).toISOString() : ''

  return (
    <>
      <ToastFromQueryDashboard />
      {/* Mount client modal controller */}
      <ReferralDetailedModalLauncher />
      <div className="mx-auto max-w-7xl px-6 py-8" id="dashboard-root">
      {/* Single large container: hero + stats + chart + quick actions + forms */}
      <div className="rounded-3xl bg-gradient-to-b from-[#0E1116] to-[#0B0F14] border border-gray-800 p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-amber-400">Club Aureus</h1>
            <p className="mt-1 text-sm text-gray-400">Account Holder Dashboard</p>
          </div>
          <SignOutButton />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <BigStatCard label="Current Portfolio" value={`$${totalBalance.toLocaleString()}`} />
          <BigStatCard label="Pending Loan" value={`$${pendingDeposits.toLocaleString()}`} />
          <BigStatCard label="Projected Monthly Income" value={`$${projectedMonthlyIncome.toLocaleString(undefined,{maximumFractionDigits:0})}+`} />
        </div>

        {first && (
          <div className="mt-6 rounded-2xl border border-gray-800 bg-[#0B0F14] p-6 shadow-lg">
            <h2 className="mb-3 text-white font-semibold">Performance Overview</h2>
            <BalanceChart initialBalance={Number(first.balance) || 0} startDateISO={startISO} monthlyTargetPct={1.5} transactions={transactions as { created_at: string; type: string; amount: number; status?: string }[]} />
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* Referral Tree (2 levels only for users) */}
            <ReferralTreeWrapper userId={res.user.id} />
          </div>
          <div>
            <div className="rounded-2xl border border-gray-800 bg-[#0B0F14] p-6 shadow-lg">
              <h2 className="mb-3 text-white font-semibold">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <QuickButton label="Request Withdrawal" href="#withdraw" />
                <QuickButton label="Make a Deposit" href="#deposit" />
                <QuickButton label="View History" href="#history" />
                <CalculatorToggle />
                <QuickButton label="View Detailed Referral Tree" onClickHint="open-referral-detailed" />
                <QuickButton label="Support" href="/support" external />
              </div>
              {/* Inline client script to open our modal using a data-action hook */}
              <script dangerouslySetInnerHTML={{__html:`(function(){
                const root=document.getElementById('dashboard-root');
                if(!root) return;
                root.addEventListener('click',function(e){
                  const t=e.target; if(!t) return;
                  const btn=t.closest('[data-action]');
                  if(btn && btn.getAttribute('data-action')==='open-referral-detailed'){
                    const ev=new CustomEvent('open-referral-detailed',{bubbles:true});
                    root.dispatchEvent(ev);
                  }
                },{passive:true});
              })();`}} />
            </div>
            <div className="mt-6">
              {/* Invite Panel (coming soon) */}
              <InvitePanelWrapper />
            </div>
          </div>
        </div>

        {/* Forms inside the same container */}
        <div className="mt-8 grid gap-6 md:grid-cols-2" id="actions">
          <div id="withdraw"><WithdrawalRequest accountId={first?.id} /></div>
          <div id="deposit"><PaymentForm accountId={first?.id} /></div>
        </div>
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
              {transactions.map((t: { id: string; created_at: string; type: string; amount: number; status?: string }) => (
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
    </>
  )
}

function WithdrawalRequest({ accountId }: { accountId?: string }) {
  return <form action="/api/user/withdrawal" method="post" className="rounded-xl border border-gray-800 bg-gray-900 p-4">
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


function PaymentForm({ accountId }: { accountId?: string }) {
  return <form action="/api/user/deposit" method="post" className="rounded-xl border border-gray-800 bg-gray-900 p-4">
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



