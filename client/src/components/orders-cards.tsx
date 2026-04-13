import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchOwnerOrdersSummary } from "@/lib/tabletap-supabase-api"

const formatSignedPercent = (value: number) => {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value}%`
}

export function OrdersCards() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [summary, setSummary] = React.useState<{
    totalOrdersToday: number
    totalOrdersDeltaPercent: number
    inProgressCount: number
    completedCount: number
    completedRatePercent: number
    averageOrderValue: number
    averageOrderValueDeltaPercent: number
    averageCompletionMinutes: number
    averageCompletionDeltaMinutes: number
  } | null>(null)

  React.useEffect(() => {
    let cancelled = false
    let inFlight = false
    const load = async () => {
      if (cancelled || inFlight) return
      if (typeof document !== "undefined" && document.hidden) return
      inFlight = true
      try {
        const data = await fetchOwnerOrdersSummary()
        if (!cancelled) {
          setSummary(data)
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to fetch owner orders summary", error)
        }
      } finally {
        inFlight = false
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 15000)
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void load()
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  const totalOrders = summary?.totalOrdersToday ?? 0
  const totalOrdersDelta = summary?.totalOrdersDeltaPercent ?? 0
  const inProgress = summary?.inProgressCount ?? 0
  const completed = summary?.completedCount ?? 0
  const completedRate = summary?.completedRatePercent ?? 0
  const averageOrderValue = summary?.averageOrderValue ?? 0
  const averageOrderValueDelta = summary?.averageOrderValueDeltaPercent ?? 0
  const averageCompletion = summary?.averageCompletionMinutes ?? 0
  const averageCompletionDelta = summary?.averageCompletionDeltaMinutes ?? 0

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="*:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 md:grid-cols-3 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card">
        <Card className="@container/card">
          <CardHeader className="relative">
            <p className="text-sm text-muted-foreground">Total Orders (Today)</p>
            <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
              {isLoading ? <Skeleton className="h-9 w-20" /> : totalOrders}
            </CardTitle>
            <div className="absolute right-4 top-4">
              <Badge
                variant="outline"
                className="rounded-lg border-green-200 bg-green-50 text-xs text-green-700"
              >
                {isLoading ? "--" : formatSignedPercent(totalOrdersDelta)}
              </Badge>
            </div>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            Compared to the same time yesterday.
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="relative">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
              {isLoading ? <Skeleton className="h-9 w-16" /> : inProgress}
            </CardTitle>
            <div className="absolute right-4 top-4">
              <Badge
                variant="outline"
                className="rounded-lg border-blue-200 bg-blue-50 text-xs text-blue-700"
              >
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            Orders currently in new, accepted, or preparing stages.
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="relative">
            <p className="text-sm text-muted-foreground">Completed</p>
            <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
              {isLoading ? <Skeleton className="h-9 w-16" /> : completed}
            </CardTitle>
            <div className="absolute right-4 top-4">
              <Badge
                variant="outline"
                className="rounded-lg border-emerald-200 bg-emerald-50 text-xs text-emerald-700"
              >
                {isLoading ? "--" : `${completedRate}%`}
              </Badge>
            </div>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            Orders that reached ready/completed status.
          </CardFooter>
        </Card>
      </div>

      <div className="*:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 md:grid-cols-2 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card">
        <Card className="@container/card">
          <CardHeader className="relative">
            <p className="text-sm text-muted-foreground">Average order value</p>
            <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
              {isLoading ? (
                <Skeleton className="h-9 w-28" />
              ) : (
                <>Rs. {averageOrderValue.toLocaleString("en-PK")}</>
              )}
            </CardTitle>
            <div className="absolute right-4 top-4">
              <Badge
                variant="outline"
                className="rounded-lg border-green-200 bg-green-50 text-xs text-green-700"
              >
                {isLoading ? "--" : formatSignedPercent(averageOrderValueDelta)}
              </Badge>
            </div>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            Based on completed orders today.
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="relative">
            <p className="text-sm text-muted-foreground">
              Average order completion time
            </p>
            <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
              {isLoading ? <Skeleton className="h-9 w-24" /> : `${averageCompletion} min`}
            </CardTitle>
            <div className="absolute right-4 top-4">
              <Badge
                variant="outline"
                className="rounded-lg border-blue-200 bg-blue-50 text-xs text-blue-700"
              >
                {isLoading
                  ? "--"
                  : `${averageCompletionDelta >= 0 ? "+" : ""}${averageCompletionDelta} min`}
              </Badge>
            </div>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            From placement to ready/completed status.
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
