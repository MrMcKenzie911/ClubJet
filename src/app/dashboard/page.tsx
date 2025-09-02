import { redirect } from 'next/navigation'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseServer } from '@/lib/supabaseServer'
import ProgressTarget from '@/components/dashboard/ProgressTarget'
import BalanceChart from '@/components/dashboard/BalanceChart'
import SignOutButton from '@/components/auth/SignOutButton'

async function getData() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { redirect: true as const }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', user.id)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .in('account_id', (accounts?.map(a => a.id) ?? ['00000000-0000-0000-0000-000000000000']))
    .order('created_at', { ascending: false })

  return { user, profile, accounts: accounts ?? [], transactions: transactions ?? [] }
}

export default async function DashboardPage() {
  const res = await getData()
  if ('redirect' in res) redirect('/login')

  const { accounts, transactions } = res
  const first = accounts[0]

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <SignOutButton />
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-2 text-white font-semibold">Account Summary</h2>
            <div className="text-sm text-gray-300">Accounts: {accounts.length}</div>
            {first && (
              <div className="mt-2 text-sm text-gray-400">Type: {first.type} • Balance: ${Number(first.balance).toFixed(2)}</div>
            )}
          </div>
        </div>
        <div>
          {first && (
            <ProgressTarget initialBalance={Number(first.balance) || 0} startDateISO={new Date(first.start_date).toISOString()} monthlyTargetPct={1.5} />
          )}
        </div>
      </div>
      <div className="mt-6">
        {first && (
          <BalanceChart initialBalance={Number(first.balance) || 0} startDateISO={new Date(first.start_date).toISOString()} monthlyTargetPct={1.5} />
        )}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <WithdrawalRequest accountId={first?.id} />
        <PaymentForm accountId={first?.id} />
      </div>

      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-white font-semibold">Transactions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="p-2">Date</th>
                <th className="p-2">Type</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t: any) => (
                <tr key={t.id} className="border-t border-gray-800">
                  <td className="p-2 text-gray-300">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="p-2 text-gray-300">{t.type}</td>
                  <td className="p-2 text-gray-300">${Number(t.amount).toFixed(2)}</td>
                  <td className="p-2 text-gray-300">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function WithdrawalRequest({ accountId }: { accountId?: string }) {
  return <form action={submitWithdrawal} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
    <h3 className="mb-2 font-semibold text-white">Withdrawal Request</h3>
    <input type="hidden" name="account_id" defaultValue={accountId} />
    <label className="block text-sm text-gray-300">Amount</label>
    <input name="amount" required step="0.01" className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
    <label className="mt-3 block text-sm text-gray-300">Method</label>
    <select name="method" className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white">
      <option value="STRIPE">Stripe</option>
      <option value="ACH">ACH</option>
      <option value="WIRE">Wire</option>
    </select>
    <button className="mt-3 rounded-md bg-emerald-500 px-4 py-2 text-white">Submit</button>
  </form>
}

async function submitWithdrawal(formData: FormData) {
  'use server'
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')
  const account_id = formData.get('account_id') as string
  const amount = parseFloat(String(formData.get('amount')))
  const method = String(formData.get('method'))
  if (!account_id || !amount || amount <= 0) return
  await supabase.from('withdrawal_requests').insert({ account_id, amount, method })
}

function PaymentForm({ accountId }: { accountId?: string }) {
  return <form action={submitPayment} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
    <h3 className="mb-2 font-semibold text-white">Payment / Deposit</h3>
    <input type="hidden" name="account_id" defaultValue={accountId} />
    <label className="block text-sm text-gray-300">Amount</label>
    <input name="amount" required step="0.01" className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
    <label className="mt-3 block text-sm text-gray-300">Method</label>
    <select name="method" className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white">
      <option value="WIRE">Wire</option>
      <option value="ACH">ACH</option>
      <option value="STRIPE">Stripe</option>
    </select>
    <label className="mt-3 block text-sm text-gray-300">Reference (optional)</label>
    <input name="reference" className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
    <button className="mt-3 rounded-md bg-emerald-500 px-4 py-2 text-white">Submit</button>
    <p className="mt-2 text-xs text-amber-400">COMPLETE TRANSFER AT YOUR BANK, WE ARE AWAITING FUNDS</p>
  </form>
}

async function submitPayment(formData: FormData) {
  'use server'
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')
  const account_id = formData.get('account_id') as string
  const amount = parseFloat(String(formData.get('amount')))
  const reference = String(formData.get('reference') || '')
  if (!account_id || !amount || amount <= 0) return
  await supabase.from('transactions').insert({ account_id, type: 'DEPOSIT', amount, status: 'pending', metadata: { reference } })
}

