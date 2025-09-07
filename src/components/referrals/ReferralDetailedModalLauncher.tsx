"use client";
import React from 'react'
import ReferralDetailedModal from './ReferralDetailedModal'

export default function ReferralDetailedModalLauncher() {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const root = document.getElementById('dashboard-root')
    const handler: EventListener = () => setOpen(true)
    const add = (el: Document | HTMLElement | null) => { if (el) el.addEventListener('open-referral-detailed', handler) }
    const remove = (el: Document | HTMLElement | null) => { if (el) el.removeEventListener('open-referral-detailed', handler) }
    add(document)
    add(root)
    return () => { remove(document); remove(root) }
  }, [])
  return <ReferralDetailedModal open={open} onClose={() => setOpen(false)} />
}

