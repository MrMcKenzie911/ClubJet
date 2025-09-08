"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import UserDrawer from './UserDrawer'

function ActionIcon({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} className="inline-flex items-center justify-center rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200 w-8 h-8">
      {children}
    </button>
  )
}

export default function VerifiedUsersCards() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [drawerUser, setDrawerUser] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users/list', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load users')
      const j = await res.json()
      const arr: any[] = j.users || []
      setUsers(arr.filter(u => u.role === 'user'))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load users'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function saveUser() {
    if (!editing) return
    const { id, first_name, last_name, email, role } = editing
    try {
      const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, first_name, last_name, email, role }) })
      if (!res.ok) {
        const j = await res.json().catch(()=>({}))
        setError(j.error ?? 'Failed to save user')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save user')
    }
    setEditing(null)
    await load()
  }

  return (
    <div className="space-y-3">
      <h2 className="text-white font-semibold">Verified Users</h2>
      {error && <div className="text-sm text-red-400">{error}</div>}
      {loading && <div className="text-sm text-gray-400">Loading...</div>}
      {!loading && users.length === 0 && <div className="text-sm text-gray-400">No verified users found.</div>}
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border border-gray-800 bg-[#0F141B] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-white font-semibold">{u.first_name} {u.last_name}</div>
                <div className="text-xs text-gray-400">{u.email}</div>
                <div className="mt-2 text-sm text-gray-300">Accounts: {(u.accounts || []).map((a:any)=> a.type).join(', ') || '—'}</div>
                <div className="text-xs text-gray-500">Total Balance: ${((u.accounts||[]).reduce((s:number,a:any)=>s+Number(a.balance||0),0)).toLocaleString()}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1 text-sm"
                    onClick={() => {
                      const evt = new CustomEvent('open-referral-detailed', { detail: { userId: u.id } })
                      document.dispatchEvent(evt)
                    }}
                  >
                    Detailed Referral Tree
                  </button>
                  <button
                    className="rounded bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 text-sm"
                    onClick={() => setDrawerUser(u.id)}
                  >
                    Details
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <ActionIcon title="Edit" onClick={() => setEditing({ ...u })}>
                  <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
                </ActionIcon>
                <ActionIcon title="Delete" onClick={async () => {
                  if (!confirm('Delete this user?')) return
                  const res = await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' })
                  if (res.ok) await load()
                  else {
                    const j = await res.json().catch(()=>({}))
                    setError(j.error ?? 'Failed to delete user')
                  }
                }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
                </ActionIcon>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
            <h3 className="text-white font-semibold">Edit User</h3>
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
              <button onClick={saveUser} className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1">Save</button>
            </div>
          </div>
        </div>
      )}

      {drawerUser && (
        <UserDrawer userId={drawerUser} onClose={() => setDrawerUser(null)} />
      )}
    </div>
  )
}

