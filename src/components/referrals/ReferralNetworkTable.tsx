"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import QuickActionOpenReferral from "./QuickActionOpenReferral"

export type ReferralRow = {
  id: string
  name: string
  level: string
  stream: string
  investment: number
  joinDate: string
  status: string
  bonus: number
}

export default function ReferralNetworkTable({ defaultTab = "table", userId }: { defaultTab?: "table" | "analytics"; userId?: string }) {
  const onExport = () => {
    const url = userId ? `/api/referrals/table/csv?userId=${encodeURIComponent(userId)}` : '#'
    if (userId) window.open(url, '_blank')
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0B0F14]">
      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="flex items-center justify-between gap-2 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="table">Generate Referral Report</TabsTrigger>
              <TabsTrigger value="analytics">Network Performance</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onExport} className="rounded-lg border border-gray-700 bg-[#0F141B] px-3 py-1.5 text-sm text-gray-200 hover:border-amber-600 hover:text-amber-400">Export CSV</button>
            <QuickActionOpenReferral />
          </div>
        </div>
        <TabsContent value="table" className="px-4 pb-4 lg:px-6">
          <ReferralTableContent userId={userId} />
        </TabsContent>
        <TabsContent value="analytics" className="px-4 pb-4 lg:px-6">
          <ReferralAnalyticsContent userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
function useReferralData(userId?: string) {
  const [rows, setRows] = React.useState<ReferralRow[]>([])
  const [analytics, setAnalytics] = React.useState<{ l1: number; l2: number; totalBonus: number; avgInvestment: number } | null>(null)
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!userId) return
      const r = await fetch(`/api/referrals/table?userId=${encodeURIComponent(userId)}`)
      if (!cancelled && r.ok) {
        const json = await r.json()
        setRows(json.rows || [])
        setAnalytics(json.analytics || null)
      }
    })()
    return () => { cancelled = true }
  }, [userId])
  return { rows, analytics }
}

function ReferralTableContent({ userId }: { userId?: string }) {
  const { rows } = useReferralData(userId)
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted sticky top-0 z-10">
          <TableRow>
            <TableHead>Member Name</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Account Type</TableHead>
            <TableHead>Investment</TableHead>
            <TableHead>Join Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Bonuses Earned</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-gray-200">{r.name}</TableCell>
              <TableCell className="text-gray-300">{r.level}</TableCell>
              <TableCell className="text-gray-300">{r.stream}</TableCell>
              <TableCell className="text-gray-200">${Number(r.investment).toLocaleString()}</TableCell>
              <TableCell className="text-gray-300">{new Date(r.joinDate).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-emerald-400 border-emerald-700/40">
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-amber-400 font-medium">${r.bonus.toFixed(2)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-gray-400">No referral data available yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function ReferralAnalyticsContent({ userId }: { userId?: string }) {
  const { analytics } = useReferralData(userId)
  return (
    <div className="rounded-xl border border-gray-800 bg-[#0F141B] p-4 text-gray-200">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Direct Referrals" value={String(analytics?.l1 ?? 0)} />
        <Metric label="Second Level" value={String(analytics?.l2 ?? 0)} />
        <Metric label="Total Bonuses" value={`$${(analytics?.totalBonus ?? 0).toFixed(2)}`} accent />
        <Metric label="Avg. Investment" value={`$${Number(analytics?.avgInvestment ?? 0).toLocaleString()}`} />
      </div>
    </div>
  )
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-black/20 p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={"text-xl font-semibold " + (accent ? "text-amber-400" : "text-white")}>{value}</div>
    </div>
  )
}

