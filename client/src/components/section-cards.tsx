import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchOwnerCards } from "@/lib/tabletap-supabase-api"
import { useActiveBranchCode } from "@/lib/active-branch"

const DEFAULT_BRANCH_CODE =
  String(import.meta.env.VITE_DEFAULT_BRANCH_CODE ?? "").trim() || "f7-islamabad"

export function SectionCards() {
  const activeBranchCode = useActiveBranchCode(DEFAULT_BRANCH_CODE)
  const [isLoading, setIsLoading] = React.useState(true)
  const [cards, setCards] = React.useState({
    totalSales: 1250000,
    totalOrders: 1234,
    averageOrderValue: 1013,
    inProgressOrders: 18,
  })

  React.useEffect(() => {
    let mounted = true
    setIsLoading(true)
    fetchOwnerCards(activeBranchCode)
      .then((data) => {
        if (!mounted) return
        setCards({
          totalSales: data.totalSales,
          totalOrders: data.totalOrders,
          averageOrderValue: data.averageOrderValue,
          inProgressOrders: data.inProgressOrders,
        })
      })
      .catch((error) => {
        console.warn("Owner cards sync failed:", error)
      })
      .finally(() => {
        if (!mounted) return
        setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [activeBranchCode])

  return (
    <div className="*:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 md:grid-cols-3 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader className="relative pr-20">
          <CardDescription>Total sales</CardDescription>
          <CardTitle className="text-2xl sm:text-3xl font-semibold tabular-nums">
            {isLoading ? (
              <Skeleton className="h-9 w-40" />
            ) : (
              <>Rs. {cards.totalSales.toLocaleString("en-PK")}</>
            )}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex gap-1 rounded-lg border-green-200 bg-green-50 text-xs text-green-700"
            >
              <TrendingUpIcon className="size-3 text-green-600" />
              +12.5%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="pt-0 flex-col items-start gap-1 text-sm">
          <div className="flex gap-2 font-medium text-green-700">
            Trending up this month <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Sales are up over the previous period.
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative pr-20">
          <CardDescription>Total orders</CardDescription>
          <CardTitle className="text-2xl sm:text-3xl font-semibold tabular-nums">
            {isLoading ? (
              <Skeleton className="h-9 w-28" />
            ) : (
              <>{cards.totalOrders.toLocaleString("en-US")}</>
            )}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex gap-1 rounded-lg border-red-200 bg-red-50 text-xs text-red-700"
            >
              <TrendingDownIcon className="size-3 text-red-600" />
              -8.2%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="pt-0 flex-col items-start gap-1 text-sm">
          <div className="flex gap-2 font-medium text-red-700">
            Orders dipped this week <TrendingDownIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Consider running a short-term promo to recover demand.
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative pr-20">
          <CardDescription>Average order value</CardDescription>
          <CardTitle className="text-2xl sm:text-3xl font-semibold tabular-nums">
            {isLoading ? (
              <Skeleton className="h-9 w-36" />
            ) : (
              <>Rs. {Math.round(cards.averageOrderValue).toLocaleString("en-PK")}</>
            )}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="flex gap-1 rounded-lg border-green-200 bg-green-50 text-xs text-green-700"
            >
              <TrendingUpIcon className="size-3 text-green-600" />
              +4.5%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="pt-0 flex-col items-start gap-1 text-sm">
          <div className="flex gap-2 font-medium text-green-700">
            Basket size is improving <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Guests are spending more per order.</div>
        </CardFooter>
      </Card>
    </div>
  )
}
