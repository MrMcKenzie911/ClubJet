"use client"
import { useEffect, useState } from 'react'

export default function ReferralsAllLevels({ userId }: { userId: string }) {
  const [levels, setLevels] = useState<{ level: number, users: { id: string, first_name: string|null, last_name: string|null, email?: string|null }[] }[]>([])
  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/admin/referrals/all-levels?userId=${userId}`)
      if (res.ok) {
        const json = await res.json()
        setLevels(json.levels || [])
      }
    })()
  }, [userId])
  return (
    <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-4">
      <h3 className="text-white font-semibold">Referral Network (All Levels)</h3>
      <div className="mt-2 space-y-3">
        {levels.map(l => (
          <div key={l.level}>
            <div className="text-amber-400">Level {l.level} ({l.users.length})</div>
            <div className="mt-1 grid gap-2 md:grid-cols-2">
              {l.users.map(u => (
                <div key={u.id} className="rounded border border-gray-800 bg-[#0F141B] px-3 py-2 text-gray-200">
                  {u.first_name} {u.last_name?.slice(0,1)}. <span className="text-xs text-gray-500">{u.email}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {levels.length === 0 && <div className="text-sm text-gray-400">No referrals.</div>}
      </div>
    </div>
  )
}

