/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import ReferralTreeClient from "@/components/referrals/ReferralTreeClient";

function suggestBand(balance: number, bands: any[]): string {
  const b = Number(balance ?? 0)
  const match = (bands ?? []).find((x:any)=> b >= Number(x.min_amount) && b <= Number(x.max_amount))
  if (!match) return 'n/a'
  if (String(match.name).includes('1 1/8')) return '1 1/8'
  return String(match.name)
}

function getMatchedBand(balance: number, bands: any[]) {
  const b = Number(balance ?? 0)
  return (bands ?? []).find((x:any)=> b >= Number(x.min_amount) && b <= Number(x.max_amount))
}
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function UserDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
      const { data: a } = await supabase.from('accounts').select('*').eq('user_id', userId);
      const { data: lb } = await supabase.from('lender_bands').select('*').order('min_amount', { ascending: true });
      setBands(lb ?? []);
      // Load latest 20 transactions across all their accounts
      const accountIds = (a ?? []).map((x:any)=>x.id);
      let t: any[] = [];
      if (accountIds.length) {
        const { data } = await supabase.from('transactions')
          .select('*')
          .in('account_id', accountIds)
          .order('created_at', { ascending: false })
          .limit(20);
        t = data ?? [];
      }
      if (!cancelled) {
        setProfile(p);
        setAccounts(a ?? []);
        setActivity(t);
        setLoading(false);
      }
    })();
    return () => { cancelled = true };
  }, [supabase, userId]);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" onKeyDown={(e)=>{ if(e.key==='Escape') onClose(); }}>
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
              <div className="mt-2 text-xs flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full border ${profile?.role === 'admin' ? 'border-amber-500 text-amber-400' : profile?.role === 'user' ? 'border-emerald-500 text-emerald-400' : 'border-gray-500 text-gray-300'}`}>{profile?.role}</span>
                {profile?.role === 'user' && <span className="px-2 py-0.5 rounded-full border border-emerald-500 text-emerald-400">Verified</span>}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={async ()=>{ await supabase.from('profiles').update({ role: 'user' }).eq('id', profile.id); const { data: p2 } = await supabase.from('profiles').select('*').eq('id', userId).single(); setProfile(p2); }} className="rounded bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 text-sm">Verify</button>
                <button
                  className="rounded bg-amber-500 hover:bg-amber-400 text-black px-2 py-1 text-sm"
                  onClick={() => {
                    const evt = new CustomEvent('open-referral-detailed', { detail: { userId } })
                    document.dispatchEvent(evt)
                  }}
                >
                  View Detailed Referral Tree
                </button>

                <button onClick={async ()=>{ const res = await fetch('/api/admin/generate-reset-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: profile.email })}); const j = await res.json(); if (j.link) { window.open(j.link, '_blank'); } }} className="rounded bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 text-sm">Reset Password</button>
              </div>
            </div>
            <div className="rounded border border-gray-800 p-3">
              <div className="text-sm text-gray-400 mb-2">Accounts</div>
              <div className="space-y-2">
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded border border-gray-800 bg-black/20 px-3 py-2">
                    <div className="font-medium text-white flex items-center gap-2">
                      {a.type}
                      {a.type === 'LENDER' && <span className="text-[11px] px-2 py-0.5 rounded-full border border-amber-500 text-amber-400">Fixed: 1% / 1 1/8 / 1.25%</span>}
                      {a.type === 'NETWORK' && <span className="text-[11px] px-2 py-0.5 rounded-full border border-blue-500 text-blue-300">50% of Gross Monthly Return</span>}
                    </div>
                    <div className="text-amber-300 font-semibold">${Number(a.balance ?? 0).toLocaleString()}</div>
                    {a.type === 'LENDER' && (() => { const m = getMatchedBand(a.balance, bands); return (
                      <div className="text-xs text-gray-400">
                        Suggested Band: {suggestBand(a.balance, bands)} {m ? `• ${m.rate_percent}% • ${m.duration_months} months` : ''}
                      </div>
                    ); })()}
                  </div>
                ))}
            <div className="rounded border border-gray-800 p-3">
              <div className="text-sm text-gray-400 mb-2">Referrals</div>
              <div className="space-y-3">
                <div className="text-sm text-gray-300">Direct Referrer: {profile?.referrer_id ? profile?.referrer_id : 'None'}</div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget as HTMLFormElement;
                  const code = (form.elements.namedItem('code') as HTMLInputElement)?.value || '';
                  const email = (form.elements.namedItem('email') as HTMLInputElement)?.value || '';
                  try {
                    const res = await fetch('/api/admin/referrals/reassign', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: userId, referrerCode: code || null, referrerEmail: email || null })
                    });
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      toast.error(j.error || 'Failed to reassign referrer');
                    } else {
                      const j = await res.json().catch(() => ({}));
                      toast.success('Referrer updated');
                      // Reload profile
                      const { data: p2 } = await supabase.from('profiles').select('*').eq('id', userId).single();
                      setProfile(p2);
                    }
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Request failed'
                    toast.error(msg)
                  }
                }} className="rounded border border-gray-800 bg-black/20 p-3 grid grid-cols-3 gap-2">
                  <label className="text-xs text-gray-400">Referral Code
                    <input name="code" placeholder="e.g. A1B2C3D4" className="mt-1 w-full rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" />
                  </label>
                  <label className="text-xs text-gray-400">Referrer Email
                    <input name="email" type="email" placeholder="user@example.com" className="mt-1 w-full rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" />
                  </label>
                  <div className="flex items-end">
                    <button className="w-full rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-2 text-sm">Reassign Referrer</button>
                  </div>
                </form>
                <div>
                  <ReferralTreeClient userId={userId} isAdmin={true} />
                </div>
              </div>
            </div>

                {accounts.length === 0 && <div className="text-sm text-gray-500">No accounts.</div>}
              </div>
            </div>
            <div className="rounded border border-gray-800 p-3">
              <div className="text-sm text-gray-400 mb-2">Recent Activity (all accounts)</div>
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

