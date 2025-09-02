"use client";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  return (
    <button
      className={`rounded bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 ${className}`}
      onClick={async () => {
        await supabase.auth.signOut();
        await fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "SIGNED_OUT" })
        });
        router.replace("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

