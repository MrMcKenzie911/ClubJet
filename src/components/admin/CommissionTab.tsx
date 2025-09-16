"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"

function currency(n: number) {
  return `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function CommissionTab() {
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<number>(100000)
  const [grossRate, setGrossRate] = useState<number>(3) // % per month
  const [fixedRate, setFixedRate] = useState<number>(1) // % member fixed
  const [hasRef2, setHasRef2] = useState(true)
  const [isFounding, setIsFounding] = useState(true)

  // Editable 3-way split for combined BNE+Slush (percentages must total 100)
  const [bonusPct, setBonusPct] = useState<number>(33.3333)
  const [bnePct, setBnePct] = useState<number>(33.3333)
  const [slushPct, setSlushPct] = useState<number>(33.3334)

  // Load saved defaults (if any)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/admin/founder-allocs")
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data?.alloc) {
          setBonusPct(Number(data.alloc.bonusPct) || 33.3333)
          setBnePct(Number(data.alloc.bnePct) || 33.3333)
          setSlushPct(Number(data.alloc.slushPct) || 33.3334)
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  const totals = useMemo(() => {
    const total = balance * (grossRate / 100)
    const memberFixed = balance * (fixedRate / 100)
    const remainder = Math.max(0, total - memberFixed)

    const share = remainder / 6 // standard 6-way share
    const standard = {
      member: memberFixed,
      ref1: share,
      ref2: hasRef2 ? share : 0,
      slush: share,
      jared: share,
      ross: share,
      bne: hasRef2 ? share : share * 2, // fallback of unclaimed share to BNE
      total,
      remainder,
    }

    if (!isFounding) return { ...standard, bonus: 0, bneAdj: standard.bne, slushAdj: standard.slush }

    // Founding: combine BNE + Slush (2 shares) and split by editable percentages
    const combined = standard.bne + standard.slush
    const bonus = +(combined * (bonusPct / 100))
    const bneAdj = +(combined * (bnePct / 100))
    const slushAdj = +(combined * (slushPct / 100))
    const sum = bonus + bneAdj + slushAdj
    // Numerical stability correction to keep totals consistent
    const scale = sum > 0 ? (combined / sum) : 1

    return {
      ...standard,
      bonus: +(bonus * scale).toFixed(2),
      bneAdj: +(bneAdj * scale).toFixed(2),
      slushAdj: +(slushAdj * scale).toFixed(2),
    }
  }, [balance, grossRate, fixedRate, hasRef2, isFounding, bonusPct, bnePct, slushPct])

  async function saveAllocations() {
    // Validate 100%
    const sum = +(bonusPct + bnePct + slushPct).toFixed(4)
    if (sum !== 100) {
      toast.error("Percentages must sum to 100%")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/founder-allocs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusPct, bnePct, slushPct })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Save failed")
      toast.success("Founding member allocations saved")
    } catch (e: any) {
      toast.error(e?.message || "Save failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-purple-500/30 bg-[#1a1024] p-4">
          <div className="text-xs text-purple-300/70">Total Monthly Commission</div>
          <div className="mt-1 text-2xl font-semibold text-purple-200">{currency(totals.total)}</div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-[#221a0a] p-4">
          <div className="text-xs text-amber-300/80">Member Fixed Amount</div>
          <div className="mt-1 text-2xl font-semibold text-amber-200">{currency(totals.member)}</div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-[#0c1f19] p-4">
          <div className="text-xs text-emerald-300/80">Available for Distribution</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-200">{currency(totals.remainder)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-xs text-gray-400">Account Balance
            <input type="number" value={balance} onChange={(e)=>setBalance(Number(e.target.value||0))} className="mt-1 w-40 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" />
          </label>
          <label className="text-xs text-gray-400">Gross Rate %
            <input type="number" step="0.01" value={grossRate} onChange={(e)=>setGrossRate(Number(e.target.value||0))} className="mt-1 w-32 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" />
          </label>
          <label className="text-xs text-gray-400">Member Fixed %
            <input type="number" step="0.01" value={fixedRate} onChange={(e)=>setFixedRate(Number(e.target.value||0))} className="mt-1 w-32 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" />
          </label>
          <label className="text-xs text-gray-400 flex items-center gap-2">
            <input type="checkbox" checked={hasRef2} onChange={(e)=>setHasRef2(e.target.checked)} /> Has Referrer 2
          </label>
          <label className="text-xs text-gray-400 flex items-center gap-2">
            <input type="checkbox" checked={isFounding} onChange={(e)=>setIsFounding(e.target.checked)} /> Founding Member (special split)
          </label>
        </div>
      </div>

      {isFounding && (
        <div className="rounded-xl border border-purple-500/30 bg-[#140d1a] p-4">
          <div className="mb-2 text-purple-200 font-semibold">Founding Member Special 3-Way Split (of BNE + Slush)</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-purple-500/30 bg-[#1a1024] p-3">
              <div className="text-xs text-purple-300">Founding Member Bonus ✏️</div>
              <div className="text-lg font-semibold text-white">{currency(totals.bonus)}</div>
              <div className="mt-2 text-xs text-purple-200/80">Percentage
                <input type="number" step="0.01" value={bonusPct} onChange={(e)=>setBonusPct(Number(e.target.value||0))} className="mt-1 w-full rounded bg-black/40 border border-purple-800 px-2 py-1 text-white" />
              </div>
            </div>
            <div className="rounded-lg border border-purple-500/30 bg-[#1a1024] p-3">
              <div className="text-xs text-purple-300">BNE Inc ✏️</div>
              <div className="text-lg font-semibold text-white">{currency(totals.bneAdj)}</div>
              <div className="mt-2 text-xs text-purple-200/80">Percentage
                <input type="number" step="0.01" value={bnePct} onChange={(e)=>setBnePct(Number(e.target.value||0))} className="mt-1 w-full rounded bg-black/40 border border-purple-800 px-2 py-1 text-white" />
              </div>
            </div>
            <div className="rounded-lg border border-purple-500/30 bg-[#1a1024] p-3">
              <div className="text-xs text-purple-300">Slush Fund ✏️</div>
              <div className="text-lg font-semibold text-white">{currency(totals.slushAdj)}</div>
              <div className="mt-2 text-xs text-purple-200/80">Percentage
                <input type="number" step="0.01" value={slushPct} onChange={(e)=>setSlushPct(Number(e.target.value||0))} className="mt-1 w-full rounded bg-black/40 border border-purple-800 px-2 py-1 text-white" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-purple-200/80">Must total 100%. Current total: {(bonusPct + bnePct + slushPct).toFixed(2)}%</div>
            <Button disabled={loading} onClick={saveAllocations} className="bg-purple-600 hover:bg-purple-500">{loading ? "Saving..." : "Save Allocations"}</Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-lg border border-amber-500/30 bg-[#221a0a] p-3">
          <div className="text-xs text-amber-300">Member (Fixed)</div>
          <div className="text-xl font-semibold text-amber-100">{currency(totals.member)}</div>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-[#0c1f19] p-3">
          <div className="text-xs text-emerald-300">Jared (Fixed share)</div>
          <div className="text-xl font-semibold text-emerald-100">{currency(totals.jared)}</div>
        </div>
        <div className="rounded-lg border border-teal-500/30 bg-[#0a1f22] p-3">
          <div className="text-xs text-teal-300">Ross (Fixed share)</div>
          <div className="text-xl font-semibold text-teal-100">{currency(totals.ross)}</div>
        </div>
        <div className="rounded-lg border border-blue-500/30 bg-[#0a1a24] p-3">
          <div className="text-xs text-blue-300">Referrer 1 (Fixed share)</div>
          <div className="text-xl font-semibold text-blue-100">{currency(totals.ref1)}</div>
        </div>
        <div className="rounded-lg border border-blue-500/30 bg-[#0a1a24] p-3">
          <div className="text-xs text-blue-300">Referrer 2 (Fixed share)</div>
          <div className="text-xl font-semibold text-blue-100">{currency(totals.ref2)}</div>
        </div>
      </div>

      {isFounding ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-purple-500/30 bg-[#1a1024] p-3">
            <div className="text-xs text-purple-300">Founding Member Bonus</div>
            <div className="text-xl font-semibold text-white">{currency(totals.bonus)}</div>
          </div>
          <div className="rounded-lg border border-purple-500/30 bg-[#1a1024] p-3">
            <div className="text-xs text-purple-300">BNE Inc (Adjusted)</div>
            <div className="text-xl font-semibold text-white">{currency(totals.bneAdj)}</div>
          </div>
          <div className="rounded-lg border border-purple-500/30 bg-[#1a1024] p-3">
            <div className="text-xs text-purple-300">Slush Fund (Adjusted)</div>
            <div className="text-xl font-semibold text-white">{currency(totals.slushAdj)}</div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-sky-500/30 bg-[#0a1a24] p-3">
            <div className="text-xs text-sky-300">BNE Inc</div>
            <div className="text-xl font-semibold text-sky-100">{currency(totals.bne)}</div>
          </div>
          <div className="rounded-lg border border-cyan-500/30 bg-[#0a1f22] p-3">
            <div className="text-xs text-cyan-300">Slush Fund</div>
            <div className="text-xl font-semibold text-cyan-100">{currency(totals.slush)}</div>
          </div>
          <div className="rounded-lg border border-gray-700 bg-[#0B0F14] p-3">
            <div className="text-xs text-gray-300">Summary</div>
            <div className="text-sm text-gray-400">Standard 6-way split of the remainder after member fixed amount.</div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-4">
        <div className="text-sm text-gray-300">Summary: Member take-home</div>
        <div className="text-2xl font-semibold text-white">
          {isFounding ? currency(totals.member + totals.bonus) : currency(totals.member)}
        </div>
      </div>
    </div>
  )
}

