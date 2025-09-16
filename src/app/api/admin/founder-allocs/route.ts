import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

// GET latest saved default founding allocations (from audit_log fallback)
export async function GET() {
  try {
    // Prefer dedicated table if exists
    try {
      const { data, error } = await supabaseAdmin.from("founder_commission_allocations").select("bonus_pct, bne_pct, slush_pct").order("created_at", { ascending: false }).limit(1)
      if (!error && Array.isArray(data) && data.length > 0) {
        const row: { bonus_pct?: number|string; bne_pct?: number|string; slush_pct?: number|string } = data[0] as { bonus_pct?: number|string; bne_pct?: number|string; slush_pct?: number|string }
        return NextResponse.json({ alloc: { bonusPct: Number(row.bonus_pct ?? 33.3333), bnePct: Number(row.bne_pct ?? 33.3333), slushPct: Number(row.slush_pct ?? 33.3334), source: "table" } })
      }
    } catch {}

    // Fallback: read from audit_log
    const { data: logs } = await supabaseAdmin
      .from("audit_log")
      .select("details, created_at")
      .eq("event", "founding_split_default")
      .order("created_at", { ascending: false })
      .limit(1)
    if (Array.isArray(logs) && logs.length > 0) {
      const raw = (logs[0] as { details?: unknown }).details
      const d = (raw && typeof raw === 'object') ? raw as { bonusPct?: unknown; bnePct?: unknown; slushPct?: unknown } : {}
      return NextResponse.json({ alloc: { bonusPct: Number(d.bonusPct ?? 33.3333), bnePct: Number(d.bnePct ?? 33.3333), slushPct: Number(d.slushPct ?? 33.3334), source: "audit_log" } })
    }
    return NextResponse.json({ alloc: { bonusPct: 33.3333, bnePct: 33.3333, slushPct: 33.3334, source: "default" } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST upserts default founding allocations
export async function POST(req: Request) {
  try {
    const bodyUnknown = await req.json().catch(() => ({})) as unknown
    const body = (bodyUnknown && typeof bodyUnknown === 'object') ? bodyUnknown as Record<string, unknown> : {}
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
    const { error: tErr } = await supabaseAdmin.from("founder_commission_allocations").insert(upRow)
    if (!tErr) {
      return NextResponse.json({ ok: true, source: "table" })
    }

    // Fallback to audit_log
    await supabaseAdmin.from("audit_log").insert({ event: "founding_split_default", details: { bonusPct, bnePct, slushPct } })
    return NextResponse.json({ ok: true, source: "audit_log" })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

