"use client";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

export type SidebarItem = { label: string; href: string };
export type SidebarSection = { label?: string; items: SidebarItem[] };

export default function AppSidebar({ brandTitle, sections }: { brandTitle: string; sections: SidebarSection[] }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const activeKey = sp.get("tab");
  const isActive = (href: string) => {
    // Active if exact path matches or if tab key matches
    if (href.includes("tab=")) {
      const key = href.split("tab=")[1] || "";
      return activeKey === key;
    }
    return pathname === href;
  };

  return (
    <aside className="w-64 hidden md:flex flex-col bg-[#0C0F14] border-r border-gray-800 rounded-r-2xl shadow-xl">
      <div className="h-16 flex items-center px-4 border-b border-gray-800 text-amber-400 font-semibold tracking-wide">
        <span className="text-lg">{brandTitle}</span>
      </div>
      <nav className="p-3 space-y-4 text-sm">
        {sections.map((section, idx) => (
          <div key={idx}>
            {section.label ? (
              <div className="px-2 pb-1 text-[11px] uppercase tracking-wider text-gray-500">{section.label}</div>
            ) : null}
            <div className="space-y-1">
              {section.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  data-active={isActive(it.href) ? true : undefined}
                  className="block rounded px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 data-[active=true]:text-white data-[active=true]:bg-white/10"
                >
                  {it.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto p-3">
        <SignOutButton className="w-full" />
      </div>
    </aside>
  );
}

