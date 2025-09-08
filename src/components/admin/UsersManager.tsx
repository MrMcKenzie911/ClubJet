/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import dynamic from "next/dynamic";
const UserDrawer = dynamic(() => import('./UserDrawer'), { ssr: false });

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} className="inline-flex items-center justify-center rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200 w-8 h-8">
      {children}
    </button>
  )
}

export default function UsersManager() {
  const supabase = createClientComponentClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerUser, setDrawerUser] = useState<string | null>(null);
  const [balanceEditing, setBalanceEditing] = useState<{ account_id: string; balance: number } | null>(null);

  // Search/sort/filters
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [minBal, setMinBal] = useState<string>("");
  const [maxBal, setMaxBal] = useState<string>("");

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users/list', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load users');
      const j = await res.json();
      setRows(j.users || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { fetchRows(); }, []);

  const [editing, setEditing] = useState<any | null>(null);

  async function saveUser() {
    if (!editing) return;
    const { id, first_name, last_name, email, role } = editing;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, first_name, last_name, email, role })
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        setError(j.error ?? 'Failed to save user');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to save user');
    }
    setEditing(null);
    await fetchRows();
  }


  async function addUser() {
    setEditing({ id: "", first_name: "", last_name: "", email: "", role: "user" });
  }

  async function createUser() {
    if (!editing) return;
    const { first_name, last_name, email, role } = editing;
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name, last_name, email, role })
    })
    if (!res.ok) {
      const j = await res.json().catch(()=>({}));
      setError(j.error ?? 'Failed to create user')
      return
    }
    setEditing(null);
    await fetchRows();
  }

  return (
    <div id="users" className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Verified Users</h2>
        <div className="flex gap-2">
          <button onClick={addUser} className="rounded-md border border-amber-500/40 hover:bg-amber-500/10 text-amber-300 px-3 py-1 text-sm">Add User</button>
        </div>
      </div>

      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

      {/* Filters/Search */}
      <div className="mt-4 flex flex-wrap gap-2 items-center text-sm">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name/email" className="rounded bg-black/40 border border-gray-700 px-3 py-2 text-white" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded bg-black/40 border border-gray-700 px-2 py-2 text-white">
          <option value="all">Role: All</option>
          <option value="pending">Pending</option>
          <option value="user">Verified</option>
          <option value="admin">Admin</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded bg-black/40 border border-gray-700 px-2 py-2 text-white">
          <option value="all">Account: All</option>
          <option value="LENDER">Lender</option>
          <option value="NETWORK">Network</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded bg-black/40 border border-gray-700 px-2 py-2 text-white">
          <option value="name">Sort: Name</option>
          <option value="email">Email</option>
          <option value="role">Role</option>
          <option value="balance">Total Balance</option>
        </select>
        <input value={minBal} onChange={(e)=>setMinBal(e.target.value)} placeholder="Min Balance" className="w-32 rounded bg-black/40 border border-gray-700 px-3 py-2 text-white" />
        <input value={maxBal} onChange={(e)=>setMaxBal(e.target.value)} placeholder="Max Balance" className="w-32 rounded bg-black/40 border border-gray-700 px-3 py-2 text-white" />
      </div>

      <div className="mt-2 text-xs text-gray-500">Click edit to adjust user details, or delete to remove a user permanently.</div>

      {/* Verified Users Table */}
      <div className="mt-4 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="bg-[#121821] px-4 py-3 text-gray-300 font-medium grid grid-cols-4">
          <div>First Name</div>
          <div>Last Name</div>
          <div>Email</div>
          <div>Account Type</div>
        </div>
        <div className="divide-y divide-gray-800">
          {loading && <div className="p-4 text-sm text-gray-400">Loading...</div>}
          {!loading && rows
          .filter(u => {
            const q = query.trim().toLowerCase();
            const matchesQ = !q || `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
            const matchesRole = roleFilter === 'all' || u.role === (roleFilter === 'user' ? 'user' : roleFilter)
            const totalBalance = (u.accounts ?? []).reduce((s:number,a:any)=>s+Number(a.balance??0),0)
            const matchesBalMin = !minBal || totalBalance >= Number(minBal)
            const matchesBalMax = !maxBal || totalBalance <= Number(maxBal)
            const matchesType = typeFilter === 'all' || (u.accounts ?? []).some((a:any) => a.type === typeFilter)
            return matchesQ && matchesRole && matchesType && matchesBalMin && matchesBalMax
          })
          .sort((a,b) => {
            if (sortBy === 'email') return a.email.localeCompare(b.email)
            if (sortBy === 'role') return String(a.role).localeCompare(String(b.role))
            if (sortBy === 'balance') {
              const ab = (a.accounts ?? []).reduce((s:number,x:any)=>s+Number(x.balance??0),0)
              const bb = (b.accounts ?? []).reduce((s:number,x:any)=>s+Number(x.balance??0),0)
              return bb - ab
            }
            const an = `${a.first_name} ${a.last_name}`.trim()
            const bn = `${b.first_name} ${b.last_name}`.trim()
            return an.localeCompare(bn)
          })
          .map((u) => (
            <div key={u.id} className="grid grid-cols-5 items-center px-4 py-4 hover:bg-[#0F141B] gap-2">
              <div className="text-gray-200">{u.first_name || '—'}</div>
              <div className="text-gray-200">{u.last_name || '—'}</div>
              <div className="text-gray-400">{u.email}</div>
              <div className="text-gray-300">{(u.accounts?.map((a:any)=> a.type === 'LENDER' ? 'Lender' : 'Network').join(', ')) || '—'}</div>
              <div className="flex justify-end gap-2">
                <IconButton title="Edit" onClick={() => setEditing({ ...u })}>
                  <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
                </IconButton>
                <IconButton title="Delete" onClick={async () => {
                  if (!confirm('Delete this user?')) return
                  const res = await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' })
                  if (res.ok) {
                    await fetchRows()
                  } else {
                    const j = await res.json().catch(()=>({}))
                    setError(j.error ?? 'Failed to delete user')
                  }
                }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
                </IconButton>
              </div>
            </div>
        ))}
      </div>
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

      {/* Drawer */}
      {drawerUser && (
        <UserDrawer userId={drawerUser} onClose={() => setDrawerUser(null)} />
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

