/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function UsersManager() {
  const supabase = createClientComponentClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role")
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
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Manage Users</h2>
        <button onClick={addUser} className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1">ADD</button>
      </div>

      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400">
            <tr>
              <th className="text-left p-2">First Name</th>
              <th className="text-left p-2">Last Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Role</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-200">
            {loading && <tr><td className="p-2" colSpan={5}>Loading...</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-800">
                <td className="p-2">{r.first_name}</td>
                <td className="p-2">{r.last_name}</td>
                <td className="p-2">{r.email}</td>
                <td className="p-2">{r.role}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={() => setEditing(r)} className="rounded bg-gray-700 hover:bg-gray-600 px-2 py-1">EDIT</button>
                  <button onClick={() => removeUser(r.id)} className="rounded bg-red-600 hover:bg-red-500 px-2 py-1">DELETE</button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td className="p-2" colSpan={5}>No users.</td></tr>}
          </tbody>
        </table>
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
    </div>
  );
}

