"use client"

import * as React from "react"
import { z } from "zod"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

type DateRange = "today" | "yesterday" | "thisWeek" | "thisMonth"

const dateRangeLabels: Record<DateRange, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This week",
  thisMonth: "This month",
}

export const schema = z.object({
  id: z.number(),
  itemName: z.string(),
  quantitySold: z.number(),
  revenueGenerated: z.number(),
  sessionsOrderedIn: z.number(),
  soldAt: z.string(),
})

const formatCurrency = (value: number) =>
  `Rs. ${value.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`

const startOfDay = (value: Date) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const isInDateRange = (dateString: string, range: DateRange) => {
  const entryDate = startOfDay(new Date(dateString))
  const now = new Date()
  const today = startOfDay(now)

  if (range === "today") {
    return entryDate.getTime() === today.getTime()
  }

  if (range === "yesterday") {
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    return entryDate.getTime() === yesterday.getTime()
  }

  if (range === "thisWeek") {
    const day = today.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - diffToMonday)
    return entryDate >= weekStart && entryDate <= today
  }

  return (
    entryDate.getMonth() === today.getMonth() &&
    entryDate.getFullYear() === today.getFullYear()
  )
}

export function DataTable({ data }: { data: z.infer<typeof schema>[] }) {
  const [dateRange, setDateRange] = React.useState<DateRange>("thisMonth")

  const filteredData = React.useMemo(
    () => data.filter((row) => isInDateRange(row.soldAt, dateRange)),
    [data, dateRange]
  )

  return (
    <Card className="">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Top-selling items</CardTitle>
            <CardDescription>
              Items ranked by performance across current service periods.
            </CardDescription>
          </div>
          <div className="w-full sm:w-48">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Date range
            </p>
            <Select
              value={dateRange}
              onValueChange={(value) => setDateRange(value as DateRange)}
            >
              <SelectTrigger className="w-full" aria-label="Select date range">
                <SelectValue placeholder="This month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="today">{dateRangeLabels.today}</SelectItem>
                <SelectItem value="yesterday">
                  {dateRangeLabels.yesterday}
                </SelectItem>
                <SelectItem value="thisWeek">{dateRangeLabels.thisWeek}</SelectItem>
                <SelectItem value="thisMonth">
                  {dateRangeLabels.thisMonth}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No top-selling item data for the selected range.
          </div>
        ) : null}

        <div className="space-y-3 md:hidden">
          {filteredData.map((row) => (
            <div key={row.id} className="rounded-lg border p-3">
              <p className="text-sm font-semibold">{row.itemName}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Quantity sold</p>
                  <p className="text-sm font-medium">
                    {row.quantitySold.toLocaleString("en-US")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue generated</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(row.revenueGenerated)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Number of sessions ordered in
                  </p>
                  <p className="text-sm font-medium">
                    {row.sessionsOrderedIn.toLocaleString("en-US")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Item name</TableHead>
                <TableHead className="text-right">Quantity sold</TableHead>
                <TableHead className="text-right">Revenue generated</TableHead>
                <TableHead className="text-right">
                  Number of sessions ordered in
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.itemName}</TableCell>
                  <TableCell className="text-right">
                    {row.quantitySold.toLocaleString("en-US")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.revenueGenerated)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.sessionsOrderedIn.toLocaleString("en-US")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
