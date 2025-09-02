/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Matches the UI in the screenshots: Name, Description, Min, Max, Created, with inline Edit modal
export default function TiersManager() {
  const supabase = createClientComponentClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingTable, setMissingTable] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  async function fetchRows() {
    setLoading(true);
    const { data, error } = await supabase
      .from("investment_tiers")
      .select("id, name, description, min_amount, max_amount, created_at")
      .order("created_at", { ascending: true });
    if (error) {
      setError(error.message);
      if (String(error.message).toLowerCase().includes("could not find the table") || (error as any)?.code === '42P01') {
        setMissingTable(true);
      }
    }
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchRows(); }, []);

  function openEdit(r: any) { setEditing({ ...r }); }
  function openAdd() { setEditing({ id: "", name: "", description: "", min_amount: 0, max_amount: 0 }); }

  async function save() {
    if (!editing) return;
    const { id, name, description, min_amount, max_amount } = editing;
    if (id) {
      const { error } = await supabase
        .from("investment_tiers")
        .update({ name, description, min_amount: Number(min_amount), max_amount: Number(max_amount) })
        .eq("id", id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase
        .from("investment_tiers")
        .insert({ name, description, min_amount: Number(min_amount), max_amount: Number(max_amount) });
      if (error) setError(error.message);
    }
    setEditing(null);
    await fetchRows();
  }

  async function remove(id: string) {
    if (!confirm("Delete this tier?")) return;
    const { error } = await supabase.from("investment_tiers").delete().eq("id", id);
    if (error) setError(error.message);
    await fetchRows();
  }

  return (
    <div id="tiers" className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Investment Tiers</h2>
        <div className="flex gap-2">
          {missingTable && (
            <button onClick={async () => {
              await fetch('/api/admin/init', { method: 'POST' });
              setMissingTable(false);
              await fetchRows();
            }} className="rounded bg-amber-600 hover:bg-amber-500 text-black px-3 py-1">Create Table</button>
          )}
          <button onClick={openAdd} className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1">ADD</button>
        </div>
      </div>
      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Description</th>
              <th className="text-right p-2">Minimum Amount</th>
              <th className="text-right p-2">Maximum Amount</th>
              <th className="text-left p-2">Created</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-200">
            {loading && <tr><td className="p-2" colSpan={6}>Loading...</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-800">
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.description}</td>
                <td className="p-2 text-right">{Number(r.min_amount).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</td>
                <td className="p-2 text-right">{Number(r.max_amount).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</td>
                <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={() => openEdit(r)} className="rounded bg-gray-700 hover:bg-gray-600 px-2 py-1">EDIT</button>
                  <button onClick={() => remove(r.id)} className="rounded bg-red-600 hover:bg-red-500 px-2 py-1">DELETE</button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td className="p-2" colSpan={6}>No tiers.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
            <h3 className="text-white font-semibold">{editing.id ? "Edit Tier" : "Add Tier"}</h3>
            <input className="w-full rounded bg-black/40 border border-gray-700 px-3 py-2 text-white" placeholder="Name" value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <textarea className="w-full rounded bg-black/40 border border-gray-700 px-3 py-2 text-white" placeholder="Description" value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="w-full rounded bg-black/40 border border-gray-700 px-3 py-2 text-white" placeholder="Minimum Amount" type="number" value={editing.min_amount}
                onChange={(e) => setEditing({ ...editing, min_amount: e.target.value })} />
              <input className="w-full rounded bg-black/40 border border-gray-700 px-3 py-2 text-white" placeholder="Maximum Amount" type="number" value={editing.max_amount}
                onChange={(e) => setEditing({ ...editing, max_amount: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1">Cancel</button>
              <button onClick={save} className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

