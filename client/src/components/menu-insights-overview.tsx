import * as React from "react"

import { fetchOwnerMenuInsights } from "@/lib/tabletap-supabase-api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type DateRangeFilter = "today" | "this-week" | "this-month"

const formatCurrency = (value: number) =>
  `Rs. ${value.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`

export function MenuInsightsOverview() {
  const [dateRange, setDateRange] = React.useState<DateRangeFilter>("today")
  const [category, setCategory] = React.useState("all")
  const [categories, setCategories] = React.useState<string[]>([])
  const [payload, setPayload] = React.useState<{
    totalItemsSold: number
    bestSellingItem: { itemName: string; quantitySold: number } | null
    highestRevenueItem: { itemName: string; revenue: number } | null
    rows: Array<{
      itemName: string
      quantitySold: number
      revenue: number
      avgOrderContribution: number
    }>
  }>({
    totalItemsSold: 0,
    bestSellingItem: null,
    highestRevenueItem: null,
    rows: [],
  })

  React.useEffect(() => {
    let cancelled = false
    let inFlight = false
    const load = async () => {
      if (cancelled || inFlight) return
      if (typeof document !== "undefined" && document.hidden) return
      inFlight = true
      try {
        const response = await fetchOwnerMenuInsights("f7-islamabad", dateRange, category)
        if (!cancelled) {
          setCategories(response.categories)
          setPayload({
            totalItemsSold: response.totalItemsSold,
            bestSellingItem: response.bestSellingItem,
            highestRevenueItem: response.highestRevenueItem,
            rows: response.rows,
          })
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Menu insights sync failed:", error)
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
  }, [dateRange, category])

  return (
    <div className="space-y-4">
      <div className="*:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 px-4 md:grid-cols-3 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
        <Card className="@container/card">
          <CardHeader className="relative">
            <p className="text-sm text-muted-foreground">Total Items Sold</p>
            <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
              {payload.totalItemsSold.toLocaleString("en-US")}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            Units sold in selected filter range.
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="relative">
            <p className="text-sm text-muted-foreground">Best-Selling Item</p>
            <CardTitle className="text-xl font-semibold">
              {payload.bestSellingItem?.itemName ?? "No data"}
            </CardTitle>
            {payload.bestSellingItem ? (
              <div className="absolute right-4 top-4">
                <Badge
                  variant="outline"
                  className="rounded-lg border-blue-200 bg-blue-50 text-xs text-blue-700"
                >
                  {payload.bestSellingItem.quantitySold} sold
                </Badge>
              </div>
            ) : null}
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            Highest quantity sold in selected period.
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader className="relative">
            <p className="text-sm text-muted-foreground">Highest Revenue Item</p>
            <CardTitle className="text-xl font-semibold">
              {payload.highestRevenueItem?.itemName ?? "No data"}
            </CardTitle>
            {payload.highestRevenueItem ? (
              <div className="absolute right-4 top-4">
                <Badge
                  variant="outline"
                  className="rounded-lg border-green-200 bg-green-50 text-xs text-green-700"
                >
                  {formatCurrency(payload.highestRevenueItem.revenue)}
                </Badge>
              </div>
            ) : null}
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            Top revenue contributor for selected range.
          </CardFooter>
        </Card>
      </div>

      <Card className="mx-4 lg:mx-6">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Overview Table</CardTitle>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Select
                value={dateRange}
                onValueChange={(value) => setDateRange(value as DateRangeFilter)}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Today" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {entry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Avg Order Contribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payload.rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No menu insights data for selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  payload.rows.map((item) => (
                    <TableRow key={item.itemName}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-right">
                        {item.quantitySold.toLocaleString("en-US")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.avgOrderContribution.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
