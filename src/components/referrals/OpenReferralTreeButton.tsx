"use client"

export default function OpenReferralTreeButton() {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          const evt = new Event('open-referral-detailed')
          document.dispatchEvent(evt)
        } catch {}
      }}
      className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1"
    >
      View Detailed Referral Tree
    </button>
  )
}

