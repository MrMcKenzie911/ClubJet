import { ReactNode, Suspense } from "react";
import SignOutButton from "@/components/SignOutButton";

import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <div className="min-h-screen bg-[#0B0F15] text-white flex">
        <Suspense fallback={<div className="w-64" />}>
          <AppSidebar variant="inset" role="admin" />
        </Suspense>
        <SidebarInset className="md:!m-0 md:!ml-0 !rounded-none !shadow-none w-full">
          {/* Main header */}
          <div className="h-(--header-height) flex items-center justify-between px-4 md:px-8 border-b border-gray-800 bg-black/20">
            <div className="flex items-center gap-3">
              <span className="md:hidden text-amber-400 font-semibold">Club Aureus</span>
              <span className="text-sm text-gray-400">Admin Dashboard</span>
            </div>
            <SignOutButton />
          </div>
          {/* Main content */}
          <div className="px-2 md:px-8 py-8 w-full">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


