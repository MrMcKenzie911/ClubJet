import { AppSidebar } from "@/components/app-sidebar"
import MultiLineChart from "@/components/charts/MultiLineChart"
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

import { redirect } from "next/navigation"

export default async function Page({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // fallback for unauthenticated
    return (
      <div className="p-6 text-white">Please log in.</div>
    )
  }
  // Load first account and referral code
  const { data: acct } = await supabase
    .from('accounts')
    .select('id, balance, start_date')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Direct referrals (for new signups line)
  const { data: l1 } = await supabase
    .from('profiles')
    .select('id, created_at')
    .eq('referrer_id', user.id)

  // Posted transactions for the first account (for portfolio line)
  const firstAccountId = acct?.id as string | undefined
  const { data: txs } = firstAccountId ? await supabase
    .from('transactions')
    .select('type, amount, created_at, status')
    .eq('account_id', firstAccountId)
    .eq('status', 'posted') : { data: [] } as any
  const initialBalance = Number(acct?.balance ?? 0)
  const startDateISO = (acct?.start_date as string) || new Date().toISOString().slice(0,10)
  const referralCode = await ensureUserReferralCode(user.id)
  const tabParam = searchParams?.tab
  const tab = Array.isArray(tabParam) ? tabParam[0] : tabParam
  if (tab === 'transactions') redirect('/dashboard/activity')

  function UserPortfolioSignupsChart({ initialBalance, startDateISO, signups, txs }: { initialBalance: number; startDateISO: string; signups: { id: string; created_at: string|null }[]; txs: { type: string; amount: number; created_at: string; status?: string|null }[] }) {
    const now = new Date()
    const months: string[] = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    const monthLabel = (ym: string) => {
      const [y, m] = ym.split('-').map(Number)
      return `${new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short' })}`
    }
    const start = new Date(startDateISO)
    const endOfMonth = (y: number, m: number) => new Date(y, m, 0) // day 0 of next month = last day of month
    const postedTxs = (txs || [])
    const hasTx = postedTxs.length > 0
    const hasSignups = (signups || []).length > 0

    const data = months.map((ym) => {
      const [y, m] = ym.split('-').map(Number)
      const monthDate = new Date(y, m - 1, 1)
      const monthEnd = endOfMonth(y, m)
      const newSignups = (signups || []).filter(s => s.created_at && new Date(s.created_at).getFullYear() === y && new Date(s.created_at).getMonth() + 1 === m).length

      let portfolio = 0
      if (!hasTx && !hasSignups) {
        // Fallback baseline: initialBalance + (days since start * 0.0005)
        const daysSinceStart = Math.max(0, Math.floor((monthEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
        portfolio = initialBalance + daysSinceStart * 0.0005
      } else {
        // Cumulative posted transactions up to monthEnd
        const cumulative = postedTxs
          .filter(t => new Date(t.created_at) <= monthEnd)
          .reduce((sum, t) => {
            const amt = Number(t.amount || 0)
            if (t.type === 'WITHDRAWAL') return sum - amt
            // DEPOSIT, INTEREST, COMMISSION, others add to balance
            return sum + amt
          }, 0)
        portfolio = initialBalance + cumulative
      }

      return { label: monthLabel(ym), newSignups, portfolio }
    })
    return <MultiLineChart data={data as any} series={[{ key: 'newSignups', label: 'New Signups' }, { key: 'portfolio', label: 'Portfolio Balance' }]} />
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
                {(!tab || tab === 'dashboard') && (
                  <>
                    <SectionCards />
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <UserPortfolioSignupsChart initialBalance={initialBalance} startDateISO={startDateISO} signups={l1 ?? []} txs={txs ?? []} />
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
                    <h2 className="text-white font-semibold mb-2">Account Balance</h2>
                    <p className="text-sm text-gray-400">Overview of your balance, stream type, status, and locked amounts. (Coming soon)</p>
                    <div className="mt-4">
                      <ProgressTarget initialBalance={initialBalance} startDateISO={startDateISO} monthlyTargetPct={1.5} />
                    </div>
                  </div>
                )}

                {tab === 'investment-history' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6 text-gray-300">Investment history is available under Activity. (Enhanced view coming soon)</div>
                )}

                {tab === 'earnings-summary' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6 text-gray-300">Monthly earnings and bonuses breakdown. (Coming soon)</div>
                )}

                {tab === 'contribute' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6 text-gray-300">Make Contribution form. (Coming soon)</div>
                )}
                {tab === 'withdrawal' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6 text-gray-300">Request Withdrawal form. (Coming soon)</div>
                )}
                {tab === 'smart' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6 text-gray-300">SmartContributions setup. (Coming soon)</div>
                )}
                {tab === 'payment-methods' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6 text-gray-300">Manage payment options. (Coming soon)</div>
                )}
                {tab === 'support' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6 text-gray-300">Support Center placeholder. (Coming soon)</div>
                )}
                {tab === 'messages' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6 text-gray-300">Messages placeholder. (Coming soon)</div>
                )}
                {tab === 'documents' && (
                  <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-6 text-gray-300">Documents: statements, agreements, tax docs. (Coming soon)</div>
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
