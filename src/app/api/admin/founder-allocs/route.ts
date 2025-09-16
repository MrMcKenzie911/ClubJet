import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

// GET latest saved default founding allocations (from audit_log fallback)
export async function GET() {
  try {
    // Prefer dedicated table if exists
    try {
      const { data, error } = await supabaseAdmin.from("founder_commission_allocations").select("bonus_pct, bne_pct, slush_pct").order("created_at", { ascending: false }).limit(1)
      if (!error && data && data.length > 0) {
        const row = data[0] as any
        return NextResponse.json({ alloc: { bonusPct: Number(row.bonus_pct), bnePct: Number(row.bne_pct), slushPct: Number(row.slush_pct), source: "table" } })
      }
    } catch {}

    // Fallback: read from audit_log
    const { data: logs } = await supabaseAdmin
      .from("audit_log")
      .select("details, created_at")
      .eq("event", "founding_split_default")
      .order("created_at", { ascending: false })
      .limit(1)
    if (logs && logs.length > 0) {
      const d = (logs[0] as any).details || {}
      return NextResponse.json({ alloc: { bonusPct: Number(d.bonusPct) || 33.3333, bnePct: Number(d.bnePct) || 33.3333, slushPct: Number(d.slushPct) || 33.3334, source: "audit_log" } })
    }
    return NextResponse.json({ alloc: { bonusPct: 33.3333, bnePct: 33.3333, slushPct: 33.3334, source: "default" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 })
  }
}

// POST upserts default founding allocations
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const bonusPct = Number(body.bonusPct)
    const bnePct = Number(body.bnePct)
    const slushPct = Number(body.slushPct)

    if ([bonusPct, bnePct, slushPct].some((v) => isNaN(v) || v < 0)) {
      return NextResponse.json({ error: "Invalid percentages" }, { status: 400 })
    }
    const sum = +(bonusPct + bnePct + slushPct).toFixed(4)
    if (sum !== 100) {
      return NextResponse.json({ error: "Percentages must sum to 100" }, { status: 400 })
    }

    // Try dedicated table first
    const upRow = { bonus_pct: bonusPct, bne_pct: bnePct, slush_pct: slushPct, created_at: new Date().toISOString() }
    const { error: tErr } = await supabaseAdmin.from("founder_commission_allocations").insert(upRow as any)
    if (!tErr) {
      return NextResponse.json({ ok: true, source: "table" })
    }

    // Fallback to audit_log
    await supabaseAdmin.from("audit_log").insert({ event: "founding_split_default", details: { bonusPct, bnePct, slushPct } })
    return NextResponse.json({ ok: true, source: "audit_log" })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 })
  }
}

