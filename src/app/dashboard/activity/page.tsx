import { getSupabaseServer } from '@/lib/supabaseServer'
import { ReferralTree } from '@/components/referrals/ReferralTree'
import ReferralDetailedModalLauncher from '@/components/referrals/ReferralDetailedModalLauncher'
// import CopyToClipboard from '@/components/CopyToClipboard'

export const dynamic = 'force-dynamic'

type Tx = { id: string; type: string; amount: number; created_at: string; reference: string | null; account_id: string; status: string | null }

export default async function ActivityPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return (<div className="p-6 text-white">Please log in.</div>)

  // Accounts for the user
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, type, balance, verified_at')
    .eq('user_id', user.id)

  const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/?ref=${user.id}`

  // Read filters from URL
  const from = Array.isArray(searchParams?.from) ? searchParams?.from[0] : searchParams?.from
  const to = Array.isArray(searchParams?.to) ? searchParams?.to[0] : searchParams?.to
  const type = Array.isArray(searchParams?.type) ? searchParams?.type[0] : searchParams?.type
  const limitStr = Array.isArray(searchParams?.limit) ? searchParams?.limit[0] : searchParams?.limit
  const pageStr = Array.isArray(searchParams?.page) ? searchParams?.page[0] : searchParams?.page
  const limit = Math.min(Math.max(parseInt(limitStr || '10', 10), 1), 100)
  const page = Math.max(parseInt(pageStr || '1', 10), 1)
  const offset = (page - 1) * limit

  // Query Supabase directly server-side (avoid cross-origin and cookie issues)
  const accountIds = (await supabase.from('accounts').select('id').eq('user_id', user.id)).data?.map(a=>a.id) ?? []
  let txQuery = supabase.from('transactions').select('*', { count: 'exact' })
  if (accountIds.length > 0) txQuery = txQuery.in('account_id', accountIds)
  if (from) txQuery = txQuery.gte('created_at', from)
  if (to) txQuery = txQuery.lte('created_at', to)
  if (type) txQuery = txQuery.eq('type', type)
  txQuery = txQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  const { data: items, count: total } = await txQuery
  const transactions = (items ?? []) as Tx[]
  const totalPages = Math.max(Math.ceil((total ?? 0) / limit), 1)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-white">Activity</h1>
      {/* Invite link + Copy button */}
      <div className="rounded-2xl border border-gray-800 bg-[#0B0F14] p-5">
        <h2 className="text-white font-semibold mb-3">Invite a Friend</h2>
        <div className="flex items-center gap-2">
          <input readOnly value={inviteLink} className="flex-1 rounded bg-black/40 border border-gray-700 px-3 py-2 text-gray-200" />
          <a href={inviteLink} className="rounded bg-gray-800 px-3 py-2 text-sm">Open</a>
          {/* Copy to clipboard */}
          <form action="#" onSubmit={(e)=>e.preventDefault()}>
            <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(inviteLink)}catch{}}} className="rounded bg-gray-800 px-3 py-2 text-sm">Copy</button>
          </form>
        </div>
      </div>


      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-800 bg-[#0B0F14] p-5">
          <h2 className="text-white font-semibold mb-3">Your Referrals</h2>
          <ReferralTree userId={user.id} />
        </div>

        <div className="rounded-2xl border border-gray-800 bg-[#0B0F14] p-5">
          <h2 className="text-white font-semibold mb-3">Accounts</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            {(accounts ?? []).map(a => (
              <li key={a.id} className="rounded border border-gray-800 bg-[#0F141B] px-3 py-2 flex items-center justify-between">
                <span>{a.type} • {a.verified_at ? 'Verified' : 'Pending'}</span>
                <span className="text-amber-400">${Number(a.balance || 0).toLocaleString()}</span>
              </li>
            ))}
            {(!accounts || accounts.length === 0) && (
              <li className="text-gray-400">No accounts yet.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-[#0B0F14] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Recent Transactions</h2>
          {/* Filters */}
          <form className="flex items-center gap-2 text-sm" method="get">
            <label className="text-gray-300">Date
              <input type="date" name="from" defaultValue={from ?? ''} className="ml-2 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" />
            </label>
            <label className="text-gray-300">to
              <input type="date" name="to" defaultValue={to ?? ''} className="ml-2 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" />
            </label>
            <label className="text-gray-300">Type
              <select name="type" defaultValue={type ?? ''} className="ml-2 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white">
                <option value="">All</option>
                <option>DEPOSIT</option>
                <option>WITHDRAWAL</option>
                <option>INTEREST</option>
                <option>COMMISSION</option>
              </select>
            </label>
            <input type="hidden" name="limit" value={String(limit)} />
            <button className="rounded bg-gray-800 px-3 py-1">Apply</button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Reference</th>
              </tr>
            </thead>
            <tbody className="text-gray-200">
              {transactions.map(t => (
                <tr key={t.id} className="border-t border-gray-800">
                  <td className="py-2 pr-4">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">{t.type}</td>
                  <td className="py-2 pr-4">${Number(t.amount || 0).toLocaleString()}</td>
                  <td className="py-2 pr-4">{t.status ?? '—'}</td>
                  <td className="py-2 pr-4">{t.reference ?? '—'}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2 text-gray-400">No transactions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination controls */}
        <div className="flex items-center justify-between mt-3 text-sm text-gray-300">
          <div className="flex items-center">
            <span>Rows per page</span>
            <form method="get">
              <input type="hidden" name="from" value={from ?? ''} />
              <input type="hidden" name="to" value={to ?? ''} />
      <div id="dashboard-root" />
      <ReferralDetailedModalLauncher />

              <input type="hidden" name="type" value={type ?? ''} />
              <select name="limit" defaultValue={String(limit)} className="ml-2 rounded bg-black/40 border border-gray-700 px-2 py-1 text-white" onChange={(e)=>{(e.target as HTMLSelectElement).form?.submit()}}>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </form>
          </div>
          <div className="flex items-center gap-2">
            <a className={`rounded bg-gray-800 px-2 py-1 ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`} href={`?${new URLSearchParams({ from: from ?? '', to: to ?? '', type: type ?? '', limit: String(limit), page: String(Math.max(page-1,1)) }).toString()}`}>Prev</a>
            <span className="text-gray-400">Page {page} / {totalPages}</span>
            <a className={`rounded bg-gray-800 px-2 py-1 ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`} href={`?${new URLSearchParams({ from: from ?? '', to: to ?? '', type: type ?? '', limit: String(limit), page: String(Math.min(page+1,totalPages)) }).toString()}`}>Next</a>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              const evt = new Event('open-referral-detailed')
              document.dispatchEvent(evt)
            }}
            className="rounded bg-amber-500 hover:bg-amber-400 text-black px-3 py-1"
          >
            View Detailed Referral Tree
          </button>
        </div>
      </div>
    </div>
  )
}

