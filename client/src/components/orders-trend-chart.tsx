import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { fetchOwnerOrdersTrend } from "@/lib/tabletap-supabase-api"
import { useActiveBranchCode } from "@/lib/active-branch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type TrendMode = "day" | "hour"

const chartConfig = {
  orders: {
    label: "Orders",
    color: "#0f766e",
  },
} satisfies ChartConfig

const DEFAULT_BRANCH_CODE =
  String(import.meta.env.VITE_DEFAULT_BRANCH_CODE ?? "").trim() || "f7-islamabad"

export function OrdersTrendChart() {
  const activeBranchCode = useActiveBranchCode(DEFAULT_BRANCH_CODE)
  const isMobile = useIsMobile()
  const [mode, setMode] = React.useState<TrendMode>("day")
  const [isLoading, setIsLoading] = React.useState(true)
  const [data, setData] = React.useState<Array<{ label: string; orders: number }>>([])

  React.useEffect(() => {
    let cancelled = false
    let inFlight = false

    const load = async () => {
      if (cancelled || inFlight) return
      if (typeof document !== "undefined" && document.hidden) return
      inFlight = true
      try {
        const response = await fetchOwnerOrdersTrend(mode, activeBranchCode, 7)
        if (!cancelled) {
          setData(response.points)
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to fetch orders trend", error)
          setData([])
        }
      } finally {
        inFlight = false
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    setIsLoading(true)
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
  }, [activeBranchCode, mode])

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Order trend chart</CardTitle>
            <p className="text-sm text-muted-foreground">
              View orders by day or by hour for today.
            </p>
          </div>
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as TrendMode)}
            className="w-full md:w-auto"
          >
            <TabsList className="grid h-10 w-full grid-cols-2 md:w-[320px]">
              <TabsTrigger
                value="day"
                className="h-8 whitespace-nowrap px-2 text-center text-[11px] sm:text-sm"
              >
                Orders by day
              </TabsTrigger>
              <TabsTrigger
                value="hour"
                className="h-8 whitespace-nowrap px-2 text-center text-[11px] sm:text-sm"
              >
                Orders by hour (today)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
            <LineChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={isMobile ? 20 : 28}
                interval={mode === "day" && isMobile ? 1 : 0}
                tickFormatter={(value) => {
                  const text = String(value)
                  if (mode !== "day") return text
                  if (!isMobile) return text
                  const parts = text.split(" ")
                  return parts.length > 1 ? parts[1] : text
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value) => `${value} orders`}
                  />
                }
              />
              <Line
                dataKey="orders"
                type="monotone"
                stroke="var(--color-orders, #0f766e)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
