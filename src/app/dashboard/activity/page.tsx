import { getSupabaseServer } from '@/lib/supabaseServer'
import { ReferralTree } from '@/components/referrals/ReferralTree'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return (<div className="p-6 text-white">Please log in.</div>)

  // Accounts for the user
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, type, balance, verified_at')
    .eq('user_id', user.id)

  const accountIds = (accounts ?? []).map(a => a.id)
  type Tx = { id: string; type: string; amount: number; created_at: string; reference: string | null; account_id: string; status: string | null }
  let transactions: Tx[] = []
  if (accountIds.length) {
    const { data } = await supabase
      .from('transactions')
      .select('id, type, amount, created_at, reference, account_id, status')
      .in('account_id', accountIds)
      .order('created_at', { ascending: false })
      .limit(50)
    transactions = data ?? []
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-white">Activity</h1>

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
        <h2 className="text-white font-semibold mb-3">Recent Transactions</h2>
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
      </div>
    </div>
  )
}

