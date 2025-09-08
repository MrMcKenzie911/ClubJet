import { ReactNode, Suspense } from "react";
import SignOutButton from "@/components/SignOutButton";

import AppSidebar from '@/components/app-sidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const sections = [
    { items: [{ label: 'Admin Dashboard', href: '/admin' }] },
    { label: 'Queues', items: [
      { label: 'Pending Users', href: '/admin?tab=pending-users' },
      { label: 'Pending Deposits', href: '/admin?tab=pending-deposits' },
      { label: 'Pending Withdrawals', href: '/admin?tab=pending-withdrawals' },
      { label: 'Pending Accounts', href: '/admin?tab=pending-accounts' },
    ]},
    { label: 'Settings', items: [ { label: 'Set Earnings Rate', href: '/admin?tab=earnings-rate' } ] }
  ]
  return (
    <div className="min-h-screen bg-[#0B0F15] text-white flex">
      <Suspense fallback={<div className="w-64" />}>
        <AppSidebar brandTitle="Club Aureus Portal" sections={sections} />
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


