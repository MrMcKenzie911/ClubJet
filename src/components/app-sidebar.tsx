"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconDashboard,
  IconDatabase,
  IconFolder,
  IconSettings,
  IconUsers,
  IconChartBar,
  IconReport,
  IconCurrencyDollar,
  IconMessage,
  IconDownload,
  IconTool,
  IconBell,
  IconUser,
  IconFileDollar,
  IconHistory,
  IconCreditCard,
  IconUserPlus,
} from "@tabler/icons-react"
import type { Icon } from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type SidebarRole = "user" | "admin"

type NavItem = { title: string; url: string; icon: Icon }

// New grouped nav according to requested IA

function getNavItems(role: SidebarRole): NavItem[] {
  if (role === "admin") {
    return [
      // Core Management
      { title: "Admin Dashboard", url: "/admin", icon: IconDashboard },
      { title: "User Management", url: "/admin?tab=verified-users", icon: IconUsers },
      { title: "Account Balances", url: "/admin?tab=account-balances", icon: IconFileDollar },
      { title: "Referral Networks", url: "/admin?tab=referral-networks", icon: IconChartBar },

      // Pending Approvals
      { title: "Pending Users", url: "/admin?tab=pending-users", icon: IconUserPlus },
      { title: "Pending Deposits", url: "/admin?tab=pending-deposits", icon: IconCurrencyDollar },
      { title: "Pending Withdrawals", url: "/admin?tab=pending-withdrawals", icon: IconCurrencyDollar },
      { title: "Pending Accounts", url: "/admin?tab=pending-accounts", icon: IconFolder },

      // Financial Operations
      { title: "Set Earnings Rate", url: "/admin?tab=earnings-rate", icon: IconSettings },
      { title: "Signup Bonus Processing", url: "/admin?tab=signup-bonuses", icon: IconReport },
      { title: "Transaction Management", url: "/admin?tab=transactions", icon: IconHistory },
      { title: "Payment Methods", url: "/admin?tab=payment-methods", icon: IconCreditCard },

      // Analytics & Reports
      { title: "Financial Reports", url: "/admin?tab=financial-reports", icon: IconChartBar },
      { title: "Network Analysis", url: "/admin?tab=network-analysis", icon: IconChartInfographic },
      { title: "Commission Reports", url: "/admin?tab=commission-reports", icon: IconReport },
      { title: "User Activity", url: "/admin?tab=user-activity", icon: IconUsers },

      // System Administration
      { title: "Platform Settings", url: "/admin?tab=settings", icon: IconTool },
      { title: "Audit Logs", url: "/admin?tab=audit-logs", icon: IconReport },
      { title: "Notifications", url: "/admin?tab=notifications", icon: IconBell },
      { title: "Data Export", url: "/admin?tab=data-export", icon: IconDownload },
    ]
  }
  // user
  return [
    // Personal Overview
    { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
    { title: "My Profile", url: "/dashboard/activity", icon: IconUser },

    // Account Management
    { title: "Account Balance", url: "/dashboard?tab=account-balance", icon: IconFileDollar },
    { title: "Investment History", url: "/dashboard?tab=investment-history", icon: IconHistory },
    { title: "Earnings Summary", url: "/dashboard?tab=earnings-summary", icon: IconReport },
    { title: "Transaction History", url: "/dashboard?tab=transactions", icon: IconHistory },

    // Financial Actions
    { title: "Make Contribution", url: "/dashboard?tab=contribute", icon: IconCurrencyDollar },
    { title: "Request Withdrawal", url: "/dashboard?tab=withdrawal", icon: IconCurrencyDollar },
    { title: "SmartContributions", url: "/dashboard?tab=smart", icon: IconReport },
    { title: "Payment Methods", url: "/dashboard?tab=payment-methods", icon: IconCreditCard },

    // Referral Network
    { title: "My Network", url: "/dashboard?tab=my-network", icon: IconChartBar },
    { title: "Invite New Members", url: "/dashboard?tab=invite", icon: IconUserPlus },
    { title: "Network Performance", url: "/dashboard?tab=network-performance", icon: IconChartBar },

    // Support & Documents
    { title: "Support Center", url: "/dashboard?tab=support", icon: IconMessage },
    { title: "Messages", url: "/dashboard?tab=messages", icon: IconMessage },
    { title: "Documents", url: "/dashboard?tab=documents", icon: IconFolder },
  ]
}

export function AppSidebar({ role = "user", ...props }: { role?: SidebarRole } & React.ComponentProps<typeof Sidebar>) {
  const items = React.useMemo(() => getNavItems(role), [role])
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href={role === 'admin' ? '/admin' : '/dashboard'}>
                <img src="/brand/icon.svg" alt="Club Aureus" className="size-5" />
                <span className="text-base font-semibold">Club Aureus</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
