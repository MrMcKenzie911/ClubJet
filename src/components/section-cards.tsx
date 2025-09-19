import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards({ totalAUM, newSignups, monthlyProfits, referralPayoutPct, rateAppliedPct, monthlyCommission }: { totalAUM: number; newSignups: number; monthlyProfits: number; referralPayoutPct: number; rateAppliedPct?: number; monthlyCommission?: number }) {
  const pct = (n: number) => `${n.toFixed(1)}%`
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Money In (AUM)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ${Number(totalAUM || 0).toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {typeof rateAppliedPct === 'number' && isFinite(rateAppliedPct) ? `+${rateAppliedPct.toFixed(1)}%` : '+0.0%'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Trending this month <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Balances across relevant accounts</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>New Sign Ups (This month)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {Number(newSignups || 0).toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingDown />
              {/* Trend placeholder */}
              -0.0%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Enrollments this month <IconTrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">Based on profile creation date</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Monthly Profits</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ${Number(monthlyProfits || 0).toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +0.0%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Sum of INTEREST this month <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Accrued across included accounts</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{typeof monthlyCommission === 'number' ? 'Commission (This Month)' : 'Referral Payouts'}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {typeof monthlyCommission === 'number' ? `$${Number(monthlyCommission || 0).toLocaleString()}` : pct(Math.max(0, referralPayoutPct || 0))}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +0.0%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {typeof monthlyCommission === 'number' ? 'Sum of COMMISSION incl. signup bonuses' : 'Commission share this month'} <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">{typeof monthlyCommission === 'number' ? 'Posted COMMISSION + any admin-set payout this month' : 'COMMISSION / (INTEREST + COMMISSION)'}</div>
        </CardFooter>
      </Card>
    </div>
  )
}
