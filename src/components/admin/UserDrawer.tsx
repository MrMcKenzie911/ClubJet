/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function UserDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
      const { data: a } = await supabase.from('accounts').select('*').eq('user_id', userId);
      const { data: t } = await supabase.from('transactions').select('*').eq('account_id', a?.[0]?.id ?? '').order('created_at', { ascending: false }).limit(10);
      if (!cancelled) {
        setProfile(p);
        setAccounts(a ?? []);
        setActivity(t ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true };
  }, [supabase, userId]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-full sm:w-[420px] h-full bg-[#0B0F15] border-l border-gray-800 p-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">User Details</h3>
          <button onClick={onClose} className="rounded bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1">✕</button>
        </div>
        {loading ? (
          <div className="mt-6 text-sm text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="rounded border border-gray-800 p-3">
              <div className="text-sm text-gray-400">Name</div>
              <div className="text-white font-medium">{profile?.first_name} {profile?.last_name}</div>
              <div className="text-xs text-gray-400">{profile?.email}</div>
              <div className="mt-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full border ${profile?.role === 'admin' ? 'border-amber-500 text-amber-400' : profile?.role === 'user' ? 'border-emerald-500 text-emerald-400' : 'border-gray-500 text-gray-300'}`}>{profile?.role}</span>
              </div>
            </div>
            <div className="rounded border border-gray-800 p-3">
              <div className="text-sm text-gray-400 mb-2">Accounts</div>
              <div className="space-y-2">
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded border border-gray-800 bg-black/20 px-3 py-2">
                    <div className="font-medium text-white">{a.account_type}</div>
                    <div className="text-amber-300 font-semibold">${Number(a.balance ?? 0).toLocaleString()}</div>
                  </div>
                ))}
                {accounts.length === 0 && <div className="text-sm text-gray-500">No accounts.</div>}
              </div>
            </div>
            <div className="rounded border border-gray-800 p-3">
              <div className="text-sm text-gray-400 mb-2">Recent Activity</div>
              <div className="space-y-2">
                {activity.map((tx) => (
                  <div key={tx.id} className="text-sm text-gray-300">{tx.type} • ${Number(tx.amount).toFixed(2)} • {new Date(tx.created_at).toLocaleString()}</div>
                ))}
                {activity.length === 0 && <div className="text-sm text-gray-500">No activity.</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

