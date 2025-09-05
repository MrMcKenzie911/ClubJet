"use client"
import { useState } from 'react'
import { toast } from 'react-hot-toast'

export default function InvitePanel({ userId, userCode }: { userId: string, userCode: string }) {
  const [email, setEmail] = useState('')
  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${encodeURIComponent(userCode)}`

  const copy = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    toast.success('Invite link copied')
  }

  const send = async () => {
    if (!email) return
    const res = await fetch('/api/send-invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientEmail: email, inviteUrl, senderName: '' })
    })
    if (res.ok) toast.success('Invite sent'); else toast.error('Failed to send invite')
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-4">
      <h3 className="text-white font-semibold">Invite a Friend</h3>
      <p className="mt-1 text-gray-400 text-sm">Your invite link</p>
      <div className="mt-2 flex items-center gap-2">
        <input readOnly value={inviteUrl} className="flex-1 rounded-md bg-black/60 border border-white/10 px-3 py-2 text-white" />
        <button onClick={copy} className="rounded-md bg-amber-400 px-3 py-2 text-black font-semibold">Copy</button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input type="email" placeholder="Recipient email" value={email} onChange={e=>setEmail(e.target.value)} className="flex-1 rounded-md bg-black/60 border border-white/10 px-3 py-2 text-white" />
        <button onClick={send} className="rounded-md border border-amber-400/25 px-3 py-2 text-gray-200 hover:bg-white/5">Send</button>
      </div>
    </div>
  )
}

