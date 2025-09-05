"use client"
import { useEffect, useState } from 'react'

export function ReferralTree({ userId, isAdmin }: { userId: string, isAdmin?: boolean }) {
  const [tree, setTree] = useState<{ level1: { id: string, first_name: string|null, last_name: string|null }[], level2: { id: string, first_name: string|null, last_name: string|null }[] }>({ level1: [], level2: [] })

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/referrals/tree?userId=${userId}&isAdmin=${isAdmin? '1':'0'}`)
      if (res.ok) setTree(await res.json())
    })()
  }, [userId, isAdmin])

  return (
    <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-4">
      <h3 className="text-white font-semibold">Your Referral Network</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <h4 className="text-amber-400">Level 1 ({tree.level1.length})</h4>
          {tree.level1.map((u) => (
            <div key={u.id} className="mt-1 rounded border border-gray-800 bg-[#0F141B] px-3 py-2 text-gray-200">
              {u.first_name} {u.last_name?.slice(0,1)}.
            </div>
          ))}
        </div>
        <div>
          <h4 className="text-amber-400">Level 2 ({tree.level2.length})</h4>
          {tree.level2.map((u) => (
            <div key={u.id} className="mt-1 rounded border border-gray-800 bg-[#0F141B] px-3 py-2 text-gray-200">
              {u.first_name} {u.last_name?.slice(0,1)}.
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

