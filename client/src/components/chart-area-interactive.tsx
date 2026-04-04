import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchOwnerSalesTrend } from "@/lib/tabletap-supabase-api"

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  `Rs. ${value.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`

export function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = React.useState("30d")
  const [remoteTrend, setRemoteTrend] = React.useState<Array<{ date: string; sales: number }>>([])

  React.useEffect(() => {
    let cancelled = false
    let inFlight = false
    const rangeDays = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30

    const load = async () => {
      if (cancelled || inFlight) return
      if (typeof document !== "undefined" && document.hidden) return
      inFlight = true
      try {
        const response = await fetchOwnerSalesTrend("f7-islamabad", rangeDays)
        if (cancelled) return
        setRemoteTrend(
          response.points.map((point) => ({
            date: point.date,
            sales: point.sales,
          }))
        )
      } catch (error) {
        if (!cancelled) {
          console.warn("Sales trend sync failed:", error)
        }
      } finally {
        inFlight = false
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
  }, [timeRange])

  const filteredData = React.useMemo(() => {
    const source = remoteTrend
    if (!source.length) return []
    const referenceDate = new Date(source[source.length - 1]?.date ?? new Date().toISOString())
    const daysToSubtract = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract + 1)

    return source.filter((item) => new Date(item.date) >= startDate)
  }, [timeRange, remoteTrend])

  const periodSales = filteredData.reduce((sum, point) => sum + point.sales, 0)
  const averageDailySales =
    filteredData.length > 0 ? periodSales / filteredData.length : 0
  const peakSalesPoint = filteredData.reduce(
    (peak, point) => (point.sales > peak.sales ? point : peak),
    filteredData[0] ?? { date: "", sales: 0 }
  )
  const trendPercentage =
    filteredData.length > 1 && filteredData[0].sales > 0
      ? ((filteredData[filteredData.length - 1].sales - filteredData[0].sales) /
          filteredData[0].sales) *
        100
      : 0

  return (
    <Card className="@container/card">
      <CardHeader className="gap-3 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Single-series trend for mobile sales.</CardDescription>
          </div>
          <div className="w-full sm:w-auto">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="w-full sm:w-40"
                aria-label="Select period"
              >
                <SelectValue placeholder="Last 30 days" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="30d" className="rounded-lg">
                  Last 30 days
                </SelectItem>
                <SelectItem value="14d" className="rounded-lg">
                  Last 14 days
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg">
                  Last 7 days
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-1 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide">Period Sales</p>
            <p className="text-base font-semibold text-foreground">
              {formatCurrency(periodSales)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide">Avg / Day</p>
            <p className="text-base font-semibold text-foreground">
              {formatCurrency(averageDailySales)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide">Trend</p>
            <p
              className={`text-base font-semibold ${
                trendPercentage >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              {trendPercentage >= 0 ? "+" : ""}
              {trendPercentage.toFixed(1)}%
            </p>
            <p className="text-xs">
              Peak:{" "}
              {peakSalesPoint.date
                ? `${new Date(peakSalesPoint.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })} (${formatCurrency(peakSalesPoint.sales)})`
                : "N/A"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-1 pt-2 sm:px-6 sm:pt-4">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[260px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  formatter={(value) => formatCurrency(Number(value))}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="sales"
              type="monotone"
              fill="url(#fillSales)"
              stroke="var(--color-sales)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
