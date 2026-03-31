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
import { fetchOwnerCards } from "@/lib/tabletap-supabase-api"

export function SectionCards() {
  const [cards, setCards] = React.useState({
    totalSales: 1250000,
    totalOrders: 1234,
    averageOrderValue: 1013,
    inProgressOrders: 18,
  })

  React.useEffect(() => {
    let mounted = true
    fetchOwnerCards()
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

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="*:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 px-4 md:grid-cols-3 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Total sales through TableTap</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            Rs. {cards.totalSales.toLocaleString("en-PK")}
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
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="flex gap-2 font-medium text-green-700">
            Trending up this month <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Sales are up over the previous period.
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Total orders</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {cards.totalOrders.toLocaleString("en-US")}
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
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="flex gap-2 font-medium text-red-700">
            Orders dipped this week <TrendingDownIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Consider running a short-term promo to recover demand.
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Average order value</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            Rs. {Math.round(cards.averageOrderValue).toLocaleString("en-PK")}
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
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="flex gap-2 font-medium text-green-700">
            Basket size is improving <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Guests are spending more per order.</div>
        </CardFooter>
      </Card>
    </div>
  )
}
