"use client";
import { supabase } from "@/lib/supabaseClient";

export default function SignOutButton() {
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

