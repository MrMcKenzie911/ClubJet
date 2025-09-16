"use client";
import React from 'react'
import ReferralTreeClient from '@/components/referrals/ReferralTreeClient'

export default function ReferralDetailedModalLauncher() {
  const [open, setOpen] = React.useState(false)
  const [targetUserId, setTargetUserId] = React.useState<string | null>(null)
  React.useEffect(() => {
    const root = document.getElementById('dashboard-root')
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<{ userId?: string }>
      const uid = ce?.detail?.userId ?? null
      setTargetUserId(uid)
      setOpen(true)
    }
    const add = (el: Document | HTMLElement | null) => { if (el) el.addEventListener('open-referral-detailed', handler as EventListener) }
    const remove = (el: Document | HTMLElement | null) => { if (el) el.removeEventListener('open-referral-detailed', handler as EventListener) }
    add(document)
    add(root)
    return () => { remove(document); remove(root) }
  }, [])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-amber-700/40 bg-[#0B0F14] shadow-2xl">
        <div className="bg-gradient-to-r from-[#0E1116] via-[#0B0F14] to-[#0E1116] border-b border-amber-800/40 px-5 py-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-amber-400">Detailed Referral Tree</h2>
          <button onClick={() => setOpen(false)} className="rounded-md border border-amber-700/40 bg-[#0F141B] px-3 py-1 text-amber-300 hover:text-amber-100">Close</button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto p-5">
          {targetUserId ? (
            <ReferralTreeClient userId={targetUserId} isAdmin={true} />
          ) : (
            <div className="text-sm text-amber-200/80">No user selected. Please open from a specific user context.</div>
          )}
        </div>
      </div>
    </div>
  )
}

