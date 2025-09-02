/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function UsersManager() {
  const supabase = createClientComponentClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [balanceEditing, setBalanceEditing] = useState<{ account_id: string; balance: number } | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, accounts(id, account_type, balance)")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const [editing, setEditing] = useState<any | null>(null);
  const isAdmin = useMemo(() => rows.some(Boolean), [rows]);

  async function saveUser() {
    if (!editing) return;
    const { id, first_name, last_name, email, role } = editing;
    const { error } = await supabase
      .from("profiles")
      .update({ first_name, last_name, email, role, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) setError(error.message);
    setEditing(null);
    await fetchRows();
  }

  async function removeUser(id: string) {
    if (!confirm("Delete this user?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) setError(error.message);
    await fetchRows();
  }

  async function addUser() {
    setEditing({ id: "", first_name: "", last_name: "", email: "", role: "user" });
  }

  async function createUser() {
    if (!editing) return;
    const { first_name, last_name, email, role } = editing;
    const { error } = await supabase.from("profiles").insert({
      id: crypto.randomUUID(),
      first_name, last_name, email, role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) setError(error.message);
    setEditing(null);
    await fetchRows();
  }

  return (
    <div id="users" className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Manage Users</h2>
        <button onClick={addUser} className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1">ADD</button>
      </div>

      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

      {/* CRM-style User Cards with quick preview */}
      <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {loading && <div className="text-sm text-gray-400">Loading...</div>}
        {!loading && rows.map((u) => (
          <div key={u.id} className="rounded-xl border border-gray-800 bg-[#0E141C] hover:border-amber-600 transition p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-white">{u.first_name} {u.last_name}</div>
                <div className="text-xs text-gray-400">{u.email}</div>
                <div className="mt-2 flex gap-2">
                  {u.accounts?.map((a: any) => (
                    <span key={a.id} className={`text-[11px] px-2 py-0.5 rounded-full border ${a.account_type === 'LENDER' ? 'border-amber-500 text-amber-400' : 'border-emerald-500 text-emerald-400'}`}>
                      {a.account_type === 'LENDER' ? 'Lender • Fixed' : 'Network • Variable'}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button title="Edit" onClick={() => setEditing(u)} className="rounded bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1">✏️</button>
                <button title="Delete" onClick={() => removeUser(u.id)} className="rounded bg-red-600 hover:bg-red-500 text-white px-2 py-1">🗑️</button>
              </div>
            </div>

            {/* Quick preview */}
            {u.accounts?.length > 0 && (
              <div className="mt-3 text-sm text-gray-300 space-y-1">
                {u.accounts.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between rounded border border-gray-800 bg-black/20 px-3 py-2">
                    <div>
                      <div className="text-xs text-gray-400">Account</div>
                      <div className="font-medium">{a.account_type}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Balance</div>
                      <div className="font-semibold">${Number(a.balance ?? 0).toLocaleString()}</div>
                    </div>
                    <button onClick={() => setBalanceEditing({ account_id: a.id, balance: Number(a.balance ?? 0) })}
                      className="rounded bg-amber-500 hover:bg-amber-400 text-black px-2 py-1">Set Balance</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
            <h3 className="text-white font-semibold">{editing.id ? "Edit User" : "Add User"}</h3>
            <input className="w-full rounded bg-black/40 border border-gray-700 px-3 py-2 text-white" placeholder="First Name" value={editing.first_name}
              onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} />
            <input className="w-full rounded bg-black/40 border border-gray-700 px-3 py-2 text-white" placeholder="Last Name" value={editing.last_name}
              onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} />
            <input className="w-full rounded bg-black/40 border border-gray-700 px-3 py-2 text-white" placeholder="Email" type="email" value={editing.email}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <select className="w-full rounded bg-black/40 border border-gray-700 px-3 py-2 text-white" value={editing.role}
              onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
              <option value="pending">pending</option>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1">Cancel</button>
              {editing.id ? (
                <button onClick={saveUser} className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1">Save</button>
              ) : (
                <button onClick={createUser} className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1">Create</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Set Balance modal */}
      {balanceEditing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
            <h3 className="text-white font-semibold">Set Account Balance</h3>
            <input type="number" className="w-full rounded bg-black/40 border border-gray-700 px-3 py-2 text-white"
              value={balanceEditing.balance} onChange={(e) => setBalanceEditing({ ...balanceEditing, balance: Number(e.target.value) })} />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setBalanceEditing(null)} className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1">Cancel</button>
              <button onClick={async () => {
                const { error } = await supabase.from('accounts').update({ balance: balanceEditing.balance }).eq('id', balanceEditing.account_id)
                if (error) setError(error.message)
                setBalanceEditing(null)
                await fetchRows()
              }} className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

