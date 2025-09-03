"use client";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SignOutButton() {
  const supabase = createClientComponentClient();
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }
  return (
    <button onClick={signOut} className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800">
      Sign out
    </button>
  );
}
