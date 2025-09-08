import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import data from "./data.json"
import ProgressTarget from "@/components/dashboard/ProgressTarget"
import CalculatorToggle from "@/components/dashboard/CalculatorToggle"
import InvitePanel from "@/components/referrals/InvitePanel"
import ReferralDetailedModalLauncher from "@/components/referrals/ReferralDetailedModalLauncher"
import QuickActionOpenReferral from "@/components/referrals/QuickActionOpenReferral"

import { getSupabaseServer } from "@/lib/supabaseServer"
import { ensureUserReferralCode } from "@/lib/referral"

export default async function Page() {
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
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Single large container with inner components */}
              <div className="px-4 lg:px-6 space-y-4">
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
                <DataTable data={data} />
                <div className="pt-2">
                  <QuickActionOpenReferral />
                  <div id="dashboard-root" />
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
