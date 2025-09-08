"use client"
import { useState } from 'react'

export default function CopyToClipboard({ text, children }: { text: string, children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {}
      }}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${copied ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-100 hover:bg-gray-700'}`}
    >
      {copied ? 'Copied!' : (children ?? 'Copy')}
    </button>
  )
}

