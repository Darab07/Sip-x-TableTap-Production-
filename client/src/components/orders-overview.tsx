import * as React from "react"
import { SearchIcon } from "lucide-react"

import { fetchOwnerOrdersTable } from "@/lib/tabletap-supabase-api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

type OrderStatus = "Confirmed" | "Preparing" | "Served"
type DateRangeFilter = "today" | "this-week" | "this-month"

type OrderRow = {
  id: string
  tableNumber: string
  itemsCount: number
  totalBill: number
  status: OrderStatus
  dateTime: string
  completionPrepTime: string
}

const formatCurrency = (value: number) =>
  `Rs. ${value.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

const getStatusClass = (status: OrderStatus) => {
  if (status === "Served") {
    return "border-green-200 bg-green-50 text-green-700"
  }

  if (status === "Preparing") {
    return "border-blue-200 bg-blue-50 text-blue-700"
  }

  return "border-slate-200 bg-slate-50 text-slate-700"
}

const startOfDay = (value: Date) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const getStartOfWeek = (value: Date) => {
  const date = startOfDay(value)
  const day = date.getDay()
  const diffToMonday = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - diffToMonday)
  return date
}

export function OrdersOverview() {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [dateRangeFilter, setDateRangeFilter] =
    React.useState<DateRangeFilter>("today")
  const [orders, setOrders] = React.useState<OrderRow[]>([])

  React.useEffect(() => {
    let cancelled = false
    let inFlight = false
    const load = async () => {
      if (cancelled || inFlight) return
      if (typeof document !== "undefined" && document.hidden) return
      inFlight = true
      try {
        const response = await fetchOwnerOrdersTable("f7-islamabad", 31)
        if (!cancelled) {
          setOrders(response.rows)
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to fetch owner orders table", error)
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
  }, [])

  const filteredOrders = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const now = new Date()
    const todayStart = startOfDay(now)
    const weekStart = getStartOfWeek(now)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)

    return orders
      .filter((order) => {
        const orderDate = new Date(order.dateTime)

        const matchesSearch =
          normalizedSearch.length === 0 ||
          order.id.toLowerCase().includes(normalizedSearch) ||
          order.tableNumber.toLowerCase().includes(normalizedSearch)

        const matchesStatus =
          statusFilter === "all" ||
          order.status.toLowerCase() === statusFilter.toLowerCase()

        const matchesDateRange =
          (dateRangeFilter === "today" && orderDate >= todayStart) ||
          (dateRangeFilter === "this-week" && orderDate >= weekStart) ||
          (dateRangeFilter === "this-month" && orderDate >= monthStart)

        return matchesSearch && matchesStatus && matchesDateRange
      })
      .sort(
        (a, b) =>
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      )
  }, [search, statusFilter, dateRangeFilter])

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Orders</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track live and recent orders across all active tables.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-80">
            <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8"
              placeholder="Search by order ID or table"
            />
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Select value={dateRangeFilter} onValueChange={(value) => setDateRangeFilter(value as DateRangeFilter)}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Today" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="served">Served</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No orders found for the selected filters.
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filteredOrders.map((order) => (
                <div key={order.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.tableNumber}</p>
                  </div>
                    <Badge variant="outline" className={getStatusClass(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Items count</p>
                      <p className="text-sm font-medium">{order.itemsCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date & time</p>
                      <p className="text-sm font-medium">{formatDateTime(order.dateTime)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Total bill</p>
                      <p className="text-sm font-medium">
                        {formatCurrency(order.totalBill)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">
                        Completion/prep time
                      </p>
                      <p className="text-sm font-medium">{order.completionPrepTime}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Table number</TableHead>
                    <TableHead className="text-right">Date &amp; time</TableHead>
                    <TableHead className="text-right">Items count</TableHead>
                    <TableHead className="text-right">Total amount</TableHead>
                    <TableHead>Order status</TableHead>
                    <TableHead>Completion/prep time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.tableNumber}</TableCell>
                      <TableCell className="text-right">{formatDateTime(order.dateTime)}</TableCell>
                      <TableCell className="text-right">{order.itemsCount}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(order.totalBill)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusClass(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.completionPrepTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
