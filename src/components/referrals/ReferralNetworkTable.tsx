"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import QuickActionOpenReferral from "./QuickActionOpenReferral"

const rows = [
  { name: "Sarah Chen", level: "Level 1", stream: "Lender Stream", investment: 8500, join: "Feb 1, 2024", status: "Active", bonus: 25.0 },
  { name: "Mike Rodriguez", level: "Level 2", stream: "Network Stream", investment: 6200, join: "Feb 15, 2024", status: "Active", bonus: 25.0 },
  { name: "Lisa Park", level: "Level 3", stream: "Pilot Stream", investment: 3400, join: "Mar 2, 2024", status: "Active", bonus: 16.67 },
]

export default function ReferralNetworkTable({ defaultTab = "table" }: { defaultTab?: "table" | "analytics" }) {
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
            <QuickActionOpenReferral />
          </div>
        </div>
        <TabsContent value="table" className="px-4 pb-4 lg:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Stream Type</TableHead>
                  <TableHead>Investment</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bonuses Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="text-gray-200">{r.name}</TableCell>
                    <TableCell className="text-gray-300">{r.level}</TableCell>
                    <TableCell className="text-gray-300">{r.stream}</TableCell>
                    <TableCell className="text-gray-200">${Number(r.investment).toLocaleString()}</TableCell>
                    <TableCell className="text-gray-300">{r.join}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-emerald-400 border-emerald-700/40">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-amber-400 font-medium">${r.bonus.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="px-4 pb-4 lg:px-6">
          <div className="rounded-xl border border-gray-800 bg-[#0F141B] p-4 text-gray-200">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Direct Referrals" value="1" />
              <Metric label="Second Level" value="1" />
              <Metric label="Total Bonuses" value="$66.67" accent />
              <Metric label="Avg. Investment" value="$6,033" />
            </div>
            <p className="mt-3 text-sm text-gray-400">This is a lightweight placeholder view for Network Performance. We will wire this to live data in a follow-up step.</p>
          </div>
        </TabsContent>
      </Tabs>
      <div id="dashboard-root" />
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

