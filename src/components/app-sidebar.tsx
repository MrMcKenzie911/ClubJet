"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconDashboard,
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
  IconChevronDown,
  IconChevronRight,
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
      { title: "Network Analysis", url: "/admin?tab=network-analysis", icon: IconChartBar },
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
  const [openSections, setOpenSections] = React.useState<{[k:string]: boolean}>({
    dashboard: true,
    people: true,
    money: false,
    streams: false,
    reports: false,
    system: false,
  })

  React.useEffect(() => {
    const saved = localStorage.getItem('sidebarSections')
    if (saved) {
      try { setOpenSections(JSON.parse(saved)) } catch {}
    }
  }, [])
  React.useEffect(() => {
    localStorage.setItem('sidebarSections', JSON.stringify(openSections))
  }, [openSections])

  const toggle = (key: string) => setOpenSections(s => ({ ...s, [key]: !s[key] }))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href={role === 'admin' ? '/admin' : '/dashboard'}>
                {/* Prefer Next Image for perf; basic <img> ok for now, suppress lint in Netlify */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/icon.svg" alt="Club Aureus" className="size-5" />
                <span className="text-base font-semibold">Club Aureus</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {role === 'admin' ? (
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {/* 📊 Dashboard Overview */}
            <button onClick={() => toggle('dashboard')} className="flex items-center justify-between w-full rounded-lg px-3 py-2 hover:bg-sidebar-accent">
              <div className="flex items-center gap-3"><span>📊</span><span>Dashboard Overview</span></div>
              {openSections.dashboard ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
            </button>
            {openSections.dashboard && (
              <div className="ml-7 space-y-1">
                <Link href="/admin" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconDashboard className="h-4 w-4" /> <span>Admin Dashboard</span>
                </Link>
              </div>
            )}

            {/* 👥 User Operations */}
            <button onClick={() => toggle('people')} className="flex items-center justify-between w-full rounded-lg px-3 py-2 hover:bg-sidebar-accent mt-1">
              <div className="flex items-center gap-3"><span>👥</span><span>User Operations</span></div>
              {openSections.people ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
            </button>
            {openSections.people && (
              <div className="ml-7 space-y-1">
                <Link href="/admin?tab=verified-users" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconUsers className="h-4 w-4" /> <span>User Management</span>
                </Link>
                <Link href="/admin?tab=pending-users" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconUserPlus className="h-4 w-4" /> <span>Pending Users</span>
                </Link>
              </div>
            )}

            {/* 💰 Financial Management */}
            <button onClick={() => toggle('money')} className="flex items-center justify-between w-full rounded-lg px-3 py-2 hover:bg-sidebar-accent mt-1">
              <div className="flex items-center gap-3"><span>💰</span><span>Financial Management</span></div>
              {openSections.money ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
            </button>
            {openSections.money && (
              <div className="ml-7 space-y-1">
                <Link href="/admin?tab=account-balances" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconFileDollar className="h-4 w-4" /> <span>Account Balances</span>
                </Link>
                <Link href="/admin?tab=pending-deposits" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconCurrencyDollar className="h-4 w-4" /> <span>Pending Deposits</span>
                </Link>
                <Link href="/admin?tab=pending-withdrawals" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconCurrencyDollar className="h-4 w-4" /> <span>Pending Withdrawals</span>
                </Link>
                <Link href="/admin?tab=pending-accounts" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconFolder className="h-4 w-4" /> <span>Pending Accounts</span>
                </Link>
                <Link href="/admin?tab=transactions" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconHistory className="h-4 w-4" /> <span>Transaction Management</span>
                </Link>
                <Link href="/admin?tab=payment-methods" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconCreditCard className="h-4 w-4" /> <span>Payment Methods</span>
                </Link>
                <Link href="/admin?tab=commission" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconCurrencyDollar className="h-4 w-4" /> <span>Commission</span>
                </Link>
              </div>
            )}

            {/* 🎯 Stream Management */}
            <button onClick={() => toggle('streams')} className="flex items-center justify-between w-full rounded-lg px-3 py-2 hover:bg-sidebar-accent mt-1">
              <div className="flex items-center gap-3"><span>🎯</span><span>Stream Management</span></div>
              {openSections.streams ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
            </button>
            {openSections.streams && (
              <div className="ml-7 space-y-1">
                <Link href="/admin?tab=earnings-rate" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconSettings className="h-4 w-4" /> <span>Set Earnings Rate</span>
                </Link>
                <Link href="/admin?tab=signup-bonuses" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconReport className="h-4 w-4" /> <span>Signup Bonus Processing</span>
                </Link>
                <Link href="/admin?tab=referral-networks" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconChartBar className="h-4 w-4" /> <span>Referral Networks</span>
                </Link>
              </div>
            )}

            {/* 📈 Reports & Analytics */}
            <button onClick={() => toggle('reports')} className="flex items-center justify-between w-full rounded-lg px-3 py-2 hover:bg-sidebar-accent mt-1">
              <div className="flex items-center gap-3"><span>📈</span><span>Reports & Analytics</span></div>
              {openSections.reports ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
            </button>
            {openSections.reports && (
              <div className="ml-7 space-y-1">
                <Link href="/admin?tab=financial-reports" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconChartBar className="h-4 w-4" /> <span>Financial Reports</span>
                </Link>
                <Link href="/admin?tab=commission-reports" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconReport className="h-4 w-4" /> <span>Commission Reports</span>
                </Link>
                <Link href="/admin?tab=network-analysis" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconChartBar className="h-4 w-4" /> <span>Network Analysis</span>
                </Link>
                <Link href="/admin?tab=user-activity" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconUsers className="h-4 w-4" /> <span>User Activity</span>
                </Link>
              </div>
            )}

            {/* ⚙️ System Administration */}
            <button onClick={() => toggle('system')} className="flex items-center justify-between w-full rounded-lg px-3 py-2 hover:bg-sidebar-accent mt-1">
              <div className="flex items-center gap-3"><span>⚙️</span><span>System Administration</span></div>
              {openSections.system ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
            </button>
            {openSections.system && (
              <div className="ml-7 space-y-1">
                <Link href="/admin?tab=settings" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconTool className="h-4 w-4" /> <span>Platform Settings</span>
                </Link>
                <Link href="/admin?tab=audit-logs" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconReport className="h-4 w-4" /> <span>Audit Logs</span>
                </Link>
                <Link href="/admin?tab=notifications" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconBell className="h-4 w-4" /> <span>Notifications</span>
                </Link>
                <Link href="/admin?tab=data-export" className="block rounded-lg px-3 py-2 hover:bg-sidebar-accent flex items-center gap-3">
                  <IconDownload className="h-4 w-4" /> <span>Data Export</span>
                </Link>
              </div>
            )}
          </nav>
        ) : (
          <NavMain items={items} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
