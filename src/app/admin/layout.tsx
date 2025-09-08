import { ReactNode, Suspense } from "react";
import SignOutButton from "@/components/SignOutButton";

import { AppSidebar } from '@/components/app-sidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0F15] text-white flex">
      <Suspense fallback={<div className="w-64" />}>
        <AppSidebar variant="inset" />
      </Suspense>
      {/* Main */}
      <main className="flex-1">
        <div className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-gray-800 bg-black/20">
          <div className="flex items-center gap-3">
            <span className="md:hidden text-amber-400 font-semibold">Club Aureus</span>
            <span className="text-sm text-gray-400">Admin Dashboard</span>
          </div>
          <SignOutButton />
        </div>
        <div className="px-4 md:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}


