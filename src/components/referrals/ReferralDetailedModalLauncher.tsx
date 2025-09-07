"use client";
import React from 'react'
import ReferralDetailedModal from './ReferralDetailedModal'

export default function ReferralDetailedModalLauncher() {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const root = document.getElementById('dashboard-root')
    const handler = () => setOpen(true)
    const add = (el: EventTarget|null) => el && (el as any).addEventListener('open-referral-detailed', handler as any)
    const remove = (el: EventTarget|null) => el && (el as any).removeEventListener('open-referral-detailed', handler as any)
    add(document)
    add(root)
    return () => { remove(document); remove(root) }
  }, [])
  return <ReferralDetailedModal open={open} onClose={() => setOpen(false)} />
}

