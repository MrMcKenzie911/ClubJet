"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"

function currency(n: number) {
  return `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}


// Types for admin user listing and referrals
type UserAccount = { id: string; type: 'LENDER' | 'NETWORK'; balance?: number | null; reserved_amount?: number | null }
type AdminListUser = { id: string; email: string; first_name?: string | null; last_name?: string | null; is_founding_member?: boolean | null; accounts?: UserAccount[] }
type LevelsResp = { levels?: Array<{ level: number; users: Array<{ id: string }> }> }

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
      bonus: Number((bonus * scale).toFixed(2)),
      bneAdj: Number((bneAdj * scale).toFixed(2)),
      slushAdj: Number((slushAdj * scale).toFixed(2))
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
      const dataUnknown = await res.json().catch(() => ({})) as unknown
      const data = (dataUnknown && typeof dataUnknown === 'object') ? dataUnknown as { error?: unknown } : {}
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : "Save failed")
      toast.success("Founding member allocations saved")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed'
      toast.error(msg)
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

      {/* Enhanced Verified User List for Selection */}
      <UserSelection balance={balance} setBalance={setBalance} setIsFounding={setIsFounding} setHasRef2={setHasRef2} totals={totals} grossRate={grossRate} fixedRate={fixedRate} bonusPct={bonusPct} isFoundingCurrent={isFounding} />
    </div>
  )
}



function pickPrimaryAccount(accounts: { id: string; type: string; balance: number }[]): { id: string; type: string; balance: number } | null {
  if (!accounts || accounts.length === 0) return null
  const byType = (t: string) => accounts.filter(a => a.type === t).sort((a,b)=> Number(b.balance||0)-Number(a.balance||0))[0]
  return byType('NETWORK') || byType('LENDER') || accounts.sort((a,b)=> Number(b.balance||0)-Number(a.balance||0))[0]
}

type SelectionProps = {
  balance: number
  setBalance: (n: number)=>void
  setIsFounding: (b: boolean)=>void
  setHasRef2: (b: boolean)=>void
  totals: { member: number; bonus?: number; jared?: number; ross?: number; bne?: number; bneAdj?: number; slush?: number; slushAdj?: number }
  grossRate: number
  fixedRate: number
  bonusPct: number
  isFoundingCurrent: boolean
}

function UserSelection({ balance, setBalance, setIsFounding, setHasRef2, totals, grossRate, fixedRate, bonusPct, isFoundingCurrent }: SelectionProps) {
  const [users, setUsers] = useState<AdminListUser[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<{ userId: string; firstName: string; accountId: string|null } | null>(null)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [selectedBulk, setSelectedBulk] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const r = await fetch('/api/admin/users/list', { cache: 'no-store' })
        if (!cancelled && r.ok) {
          const j = await r.json()
          console.log('Fetched users for commission tab:', j.users?.length || 0)
          setUsers(j.users || [])
        } else {
          console.error('Failed to fetch users:', r.status, r.statusText)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    // Search filter
    const searchLower = searchTerm.toLowerCase()
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase()
    const email = user.email.toLowerCase()
    const matchesSearch = !searchTerm || name.includes(searchLower) || email.includes(searchLower)

    // Type filter
    const userTypes = (user.accounts || []).map(a => a.type === 'LENDER' ? 'Fixed Memberships' : 'Variable Memberships')
    const matchesType = typeFilter === 'All Types' || userTypes.some(type =>
      (typeFilter === 'Fixed Memberships' && type === 'Fixed Memberships') ||
      (typeFilter === 'Variable Memberships' && type === 'Variable Memberships')
    )

    // Status filter (based on reserved_amount > 0 or completed set)
    const primary = pickPrimaryAccount((user.accounts||[]) as {id:string; type:string; balance:number}[])
    const hasReserved = (user.accounts || []).some((a: UserAccount) => Number(a.reserved_amount ?? 0) > 0)
    const isCompleted = completed.has(primary?.id || '') || hasReserved
    const matchesStatus = statusFilter === 'All Status' ||
      (statusFilter === 'Completed' && isCompleted) ||
      (statusFilter === 'Pending' && !isCompleted)

    return matchesSearch && matchesType && matchesStatus
  })

  async function onSelect(u: AdminListUser) {
    const primary = pickPrimaryAccount((u.accounts||[]) as {id:string; type:string; balance:number}[])
    setIsFounding(Boolean(u.is_founding_member))
    setBalance(Number(primary?.balance || 0))
    setSelected({ userId: u.id, firstName: u.first_name || 'User', accountId: primary?.id || null })
    // Determine hasRef2 via API
    try {
      const resp = await fetch(`/api/admin/referrals/all-levels?userId=${encodeURIComponent(u.id)}&maxDepth=2`)
      if (resp.ok) {
        const data = await resp.json().catch(() => ({})) as LevelsResp
        const l2 = Array.isArray(data.levels) ? (data.levels.find((x) => x.level === 2)?.users || []) : []
        setHasRef2((l2?.length || 0) > 0)
      }
    } catch {}
  }

  async function setPayoutNow() {
    if (!selected?.accountId) { toast.error('Select a user with an account'); return }
    const payout = Number(isNaN(totals.member) ? 0 : totals.member) + Number(isNaN(totals.bonus ?? 0) ? 0 : (totals.bonus ?? 0))
    try {
      const res = await fetch('/api/admin/accounts/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: selected.accountId, monthly_payout: payout })
      })
      if (!res.ok) {
        const j = await res.json().catch(()=>({}))
        throw new Error(j.error || 'Failed to set payout')
      }
      // mark completed locally for quick visual feedback
      setCompleted(prev => {
        const next = new Set(prev)
        if (selected?.accountId) next.add(selected.accountId)
        return next
      })
      toast.success(`Set ${selected.firstName}'s payout: $${payout.toLocaleString()}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to set payout'
      toast.error(msg)
    }
  }

  async function finalizeNow() {
    if (!selected?.accountId) { toast.error('Select a user with an account'); return }
    try {
      const res = await fetch('/api/admin/commissions/finalize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: selected.accountId })
      })
      const j = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(j.error || 'Finalize failed')
      toast.success(`Finalized commission: $${Number(j.amount||0).toLocaleString()}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Finalize failed'
      toast.error(msg)
    }
  }

  async function finalizeAll() {
    try {
      const res = await fetch('/api/admin/commissions/finalize-all', { method: 'POST' })
      const j = await res.json().catch(()=>({})) as { ok?: boolean; finalized?: number; error?: string }
      if (!res.ok || !j.ok) throw new Error(j.error || 'Finalize all failed')
      toast.success(`Finalized ${j.finalized ?? 0} payout(s)`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Finalize all failed'
      toast.error(msg)
    }
  }


  function computePayoutFor(bal: number, founding: boolean): number {
    const total = bal * (grossRate / 100)
    const memberFixed = bal * (fixedRate / 100)
    const remainder = Math.max(0, total - memberFixed)
    if (!founding) return Number(memberFixed.toFixed(2))
    const combined = remainder / 3 // 2 of 6 shares
    const bonus = combined * (bonusPct / 100)
    return Number((memberFixed + bonus).toFixed(2))
  }

  async function bulkSetPayoutNow() {
    if (selectedBulk.size === 0) { toast.error('Nothing selected'); return }
    try {
      const targets: Array<{ accountId: string; bal: number; founding: boolean; name: string }> = []
      for (const u of users) {
        const primary = pickPrimaryAccount((u.accounts||[]).map(a=>({ id:a.id, type:a.type, balance:Number(a.balance||0) })))
        if (primary?.id && selectedBulk.has(primary.id)) {
          const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'User'
          targets.push({ accountId: primary.id, bal: Number(primary.balance||0), founding: !!u.is_founding_member, name })
        }
      }
      const results = await Promise.all(targets.map(async t => {
        const payout = computePayoutFor(t.bal, t.founding)
        const res = await fetch('/api/admin/accounts/update', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: t.accountId, monthly_payout: payout })
        })
        return { ok: res.ok, accountId: t.accountId, payout, name: t.name }
      }))
      let okCount = 0
      const nextCompleted = new Set(completed)
      results.forEach(r => { if (r.ok) { okCount++; nextCompleted.add(r.accountId) } })
      setCompleted(nextCompleted)
      toast.success(`Set payout for ${okCount}/${results.length} selected`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Bulk set payout failed'
      toast.error(msg)
    }
  }

  async function distributeSystemNow() {
    if (!selected?.accountId) { toast.error('Select a user first'); return }
    const jared = Number(totals.jared ?? 0)
    const ross = Number(totals.ross ?? 0)
    const bne = Number((isFoundingCurrent ? totals.bneAdj : totals.bne) ?? 0)
    if (!(jared>0) && !(ross>0) && !(bne>0)) { toast.error('No system shares to distribute'); return }
    try {
      const res = await fetch('/api/admin/commissions/distribute-system', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: selected.accountId, jared, ross, bne })
      })
      const j = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(j.error || 'Distribution failed')
      toast.success(`Distributed system shares (J:${jared.toFixed(2)} R:${ross.toFixed(2)} BNE:${bne.toFixed(2)})`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Distribution failed'
      toast.error(msg)
    }
  }

  async function clearCheckmarks() {
    setCompleted(new Set())
    toast.success('Checkmarks cleared')
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-[#0B0F14] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-white font-semibold">Verified Users</h3>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400">Select a user to populate commission inputs</div>
          <Button variant="secondary" className="bg-blue-700 hover:bg-blue-600" onClick={() => {
            const ids = users.reduce<string[]>((arr,u)=>{
              const p = pickPrimaryAccount((u.accounts||[]).map(a=>({ id:a.id, type:a.type, balance:Number(a.balance||0) })))
              if (p?.id) arr.push(p.id)
              return arr
            }, [])
            setSelectedBulk(new Set(ids))
          }}>Select All</Button>
          <Button variant="secondary" className="bg-indigo-700 hover:bg-indigo-600" onClick={bulkSetPayoutNow} disabled={selectedBulk.size===0}>Set Payout for Selected</Button>
          <Button variant="secondary" className="bg-red-700 hover:bg-red-600" onClick={clearCheckmarks}>Clear Checkmarks</Button>
          <Button variant="secondary" className="bg-emerald-700 hover:bg-emerald-600" onClick={finalizeAll}>Finalize All</Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded bg-black/40 border border-gray-700 px-3 py-2 text-white placeholder-gray-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded bg-black/40 border border-gray-700 px-3 py-2 text-white"
        >
          <option value="All Types">All Types</option>
          <option value="Fixed Memberships">Fixed Memberships</option>
          <option value="Variable Memberships">Variable Memberships</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded bg-black/40 border border-gray-700 px-3 py-2 text-white"
        >
          <option value="All Status">All Status</option>
          <option value="Completed">Completed</option>
          <option value="Pending">Pending</option>
        </select>
        <div className="text-xs text-gray-400">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-[#121821] text-gray-300">
            <tr>
              <th className="px-3 py-2"><input type="checkbox" aria-label="Select all" onChange={(e)=>{
                if (e.currentTarget.checked) {
                  const ids = filteredUsers.reduce<string[]>((arr,u)=>{
                    const p = pickPrimaryAccount((u.accounts||[]).map(a=>({ id:a.id, type:a.type, balance:Number(a.balance||0) })))
                    if (p?.id) arr.push(p.id)
                    return arr
                  }, [])
                  setSelectedBulk(new Set(ids))
                } else {
                  setSelectedBulk(new Set())
                }
              }} /></th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Type(s)</th>
              <th className="text-right px-3 py-2">Balance</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading && (
              <tr><td className="px-3 py-3 text-gray-400" colSpan={7}>Loading verified users...</td></tr>
            )}
            {!loading && filteredUsers.length === 0 && (
              <tr><td className="px-3 py-3 text-gray-400" colSpan={7}>No verified users found</td></tr>
            )}
            {!loading && filteredUsers.map((u: AdminListUser) => {
              const accounts = (u.accounts || []).map(a => ({ id: a.id, type: a.type, balance: Number(a.balance || 0) }))
              const primary = pickPrimaryAccount(accounts)
              const types = (u.accounts || []).map((a: UserAccount) => a.type === 'LENDER' ? 'Fixed Memberships' : 'Variable Memberships').join(', ')
              const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || '—'
              return (
                <tr key={u.id} className="hover:bg-[#0F141B]">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={!!(primary?.id && selectedBulk.has(primary.id))} onChange={(e)=>{
                      const id = primary?.id
                      if (!id) return
                      setSelectedBulk(prev=>{
                        const next = new Set(prev)
                        if (e.currentTarget.checked) next.add(id); else next.delete(id)
                        return next
                      })
                    }} />
                  </td>
                  <td className="px-3 py-2 text-gray-200">{name}</td>
                  <td className="px-3 py-2 text-gray-400">{u.email}</td>
                  <td className="px-3 py-2 text-gray-300">{types || '—'}</td>
                  <td className="px-3 py-2 text-right text-amber-300">{`$${Number(primary?.balance||0).toLocaleString()}`}</td>
                  <td className="px-3 py-2 text-green-400">
                    {(() => {
                      const acctId = primary?.id || ''
                      const hasReserved = (u.accounts || []).some((a: UserAccount)=> Number(a.reserved_amount ?? 0) > 0)
                      return completed.has(acctId) || hasReserved ? '✓' : ''
                    })()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button className="rounded-md border border-amber-500/40 px-3 py-1 text-amber-300 hover:bg-amber-500/10" onClick={() => onSelect(u)}>Select</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-gray-300">
          {selected ? (
            <>Selected: <span className="text-white font-medium">{selected.firstName}</span> • Current Balance: <span className="text-amber-300 font-medium">{`$${balance.toLocaleString()}`}</span></>
          ) : (
            <span className="text-gray-500">No user selected</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button disabled={!selected?.accountId} onClick={setPayoutNow} className="bg-amber-600 hover:bg-amber-500">
            {selected ? `Set ${selected.firstName}'s Payout Now` : 'Set Payout Now'}
          </Button>
          <Button disabled={!selected?.accountId} onClick={finalizeNow} className="bg-emerald-600 hover:bg-emerald-500">
            {selected ? `Finalize ${selected.firstName}` : 'Finalize Commission'}
          </Button>
          <Button disabled={!selected?.accountId} onClick={distributeSystemNow} className="bg-sky-700 hover:bg-sky-600">
            Distribute System Shares Now
          </Button>
        </div>
      </div>
    </div>
  )
}
