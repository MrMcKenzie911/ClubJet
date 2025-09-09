import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
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
    .select('balance, start_date')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  const initialBalance = Number(acct?.balance ?? 0)
  const startDateISO = (acct?.start_date as string) || new Date().toISOString().slice(0,10)
  const referralCode = await ensureUserReferralCode(user.id)
  const tabParam = searchParams?.tab
  const tab = Array.isArray(tabParam) ? tabParam[0] : tabParam
  if (tab === 'transactions') redirect('/dashboard/activity')

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
                        <ChartAreaInteractive />
                      </div>
                      <div className="space-y-3">
                        <ProgressTarget initialBalance={initialBalance} startDateISO={startDateISO} monthlyTargetPct={1.5} />
                        <CalculatorToggle />
                      </div>
                    </div>
                    <InvitePanel userCode={referralCode} />
                    <ReferralNetworkTable />
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
