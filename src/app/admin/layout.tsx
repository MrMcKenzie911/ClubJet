import { ReactNode } from "react";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0F15] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 hidden md:flex flex-col bg-[#1a1a1a] border-r border-gray-800 rounded-r-2xl shadow-lg animate-[fadeIn_0.3s_ease]">
        <div className="h-16 flex items-center px-4 border-b border-gray-800 text-amber-400 font-semibold tracking-wide">
          <span className="text-lg">Club Aureus Portal</span>
        </div>
        <nav className="p-3 space-y-1 text-sm">
          <Section label="Dashboard" href="/admin" />
          <Divider label="User Management" />
          <Item label="Registered Users" href="#users" />
          <Divider label="Accounts" />
          <Item label="Lender (Fixed)" href="#lender-bands" />
          <Item label="Network (Variable)" href="#users" />
        </nav>
        <div className="mt-auto p-3">
          <SignOutButton className="w-full" />
        </div>
      </aside>

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

function Divider({ label }: { label: string }) {
  return <div className="pt-4 pb-1 px-2 text-xs uppercase tracking-wider text-gray-400">{label}</div>
}
function Section({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="block rounded px-3 py-2 hover:bg-white/5">
      <span className="text-amber-400">{label}</span>
    </Link>
  );
}
function Item({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} className="block rounded px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5">
      {label}
    </a>
  );
}

