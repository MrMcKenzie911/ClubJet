"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconDashboard,
  IconDatabase,
  IconFolder,
  IconSettings,
  IconUsers,
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

function getNavItems(role: SidebarRole): NavItem[] {
  if (role === "admin") {
    return [
      { title: "Admin Dashboard", url: "/admin", icon: IconDashboard },
      { title: "Verified Users", url: "/admin?tab=verified-users", icon: IconUsers },
      { title: "Pending Users", url: "/admin?tab=pending-users", icon: IconUsers },
      { title: "Pending Deposits", url: "/admin?tab=pending-deposits", icon: IconDatabase },
      { title: "Pending Withdrawals", url: "/admin?tab=pending-withdrawals", icon: IconDatabase },
      { title: "Pending Accounts", url: "/admin?tab=pending-accounts", icon: IconFolder },
      { title: "Set Earnings Rate", url: "/admin?tab=earnings-rate", icon: IconSettings },
    ]
  }
  // user
  return [
    { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
    { title: "Activity", url: "/dashboard/activity", icon: IconDatabase },
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
