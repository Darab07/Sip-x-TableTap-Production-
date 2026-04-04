import * as React from "react"
import { SearchIcon } from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type TableStatus = "Available" | "Occupied" | "Served" | "Unavailable"
type TableFilter = "all" | "available" | "occupied" | "unavailable"
type ViewMode = "grid" | "list"
type SortMode = "newest" | "oldest"

type TableSession = {
  id: string
  tableName: string
  currentStatus: TableStatus
  totalBill: number
  sessionStartedAt: string | null
  orderStatus: string
}

const formatCurrency = (value: number) =>
  `Rs. ${value.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`

const getTimeSinceSessionStarted = (value: string | null) => {
  if (!value) {
    return "N/A"
  }

  const startedAt = new Date(value)
  const now = new Date()
  const diffMs = Math.max(0, now.getTime() - startedAt.getTime())
  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes} min`
  }

  return `${hours}h ${minutes}m`
}

const getStatusBadgeClass = (status: TableStatus) => {
  if (status === "Available") {
    return "border-green-200 bg-green-50 text-green-700"
  }

  if (status === "Occupied") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  if (status === "Served") {
    return "border-blue-200 bg-blue-50 text-blue-700"
  }

  return "border-red-200 bg-red-50 text-red-700"
}

const getOrderBadgeClass = (status: string) => {
  if (status === "Served" || status === "Ready") {
    return "border-green-200 bg-green-50 text-green-700"
  }

  if (status === "Preparing" || status === "Confirmed") {
    return "border-blue-200 bg-blue-50 text-blue-700"
  }

  if (status === "Unavailable") {
    return "border-red-200 bg-red-50 text-red-700"
  }

  return "border-slate-200 bg-slate-50 text-slate-700"
}

const getTimestamp = (value: string | null) =>
  value ? new Date(value).getTime() : null

type TableManagementOverviewProps = {
  tables: Array<{
    id: string
    tableNumber: string
    status: "Available" | "Occupied" | "Served" | "Unavailable"
    qrGenerated: boolean
    currentSession: string
    orderStatus: string
    billTotal: number
    participantsCount: number
    startedAt: string | null
  }>
}

export function TableManagementOverview({ tables }: TableManagementOverviewProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid")
  const [statusFilter, setStatusFilter] = React.useState<TableFilter>("all")
  const [sortMode, setSortMode] = React.useState<SortMode>("newest")
  const [search, setSearch] = React.useState("")

  const normalizedTables = React.useMemo<TableSession[]>(
    () =>
      tables.map((table) => ({
        id: table.id,
        tableName: table.tableNumber.replace("T-", "Table "),
        currentStatus: table.status as TableStatus,
        totalBill: table.billTotal,
        sessionStartedAt: table.startedAt,
        orderStatus: table.orderStatus,
      })),
    [tables],
  )

  const filteredAndSortedTables = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const filtered = normalizedTables.filter((table) => {
      const matchesFilter =
        statusFilter === "all" ||
        (statusFilter === "available" && table.currentStatus === "Available") ||
        (statusFilter === "occupied" && table.currentStatus === "Occupied") ||
        (statusFilter === "unavailable" && table.currentStatus === "Unavailable")

      const matchesSearch =
        normalizedSearch.length === 0 ||
        table.tableName.toLowerCase().includes(normalizedSearch)

      return matchesFilter && matchesSearch
    })

    return filtered.sort((a, b) => {
      const aTime = getTimestamp(a.sessionStartedAt)
      const bTime = getTimestamp(b.sessionStartedAt)

      if (aTime === null && bTime === null) {
        return a.tableName.localeCompare(b.tableName)
      }

      if (aTime === null) {
        return 1
      }

      if (bTime === null) {
        return -1
      }

      return sortMode === "newest" ? bTime - aTime : aTime - bTime
    })
  }, [search, sortMode, statusFilter, normalizedTables])

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <div>
          <CardTitle>Table Status</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track live table availability, occupancy, and session details in
            grid or list view.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="grid w-full grid-cols-2 lg:w-[240px]">
              <TabsTrigger value="grid">Grid view</TabsTrigger>
              <TabsTrigger value="list">List view</TabsTrigger>
            </TabsList>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-8"
                  placeholder="Search by table number"
                />
              </div>
              <Select
                value={sortMode}
                onValueChange={(value) => setSortMode(value as SortMode)}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Sort by newest session" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="newest">Sort by newest session</SelectItem>
                  <SelectItem value="oldest">Sort by oldest session</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(value) =>
              value && setStatusFilter(value as TableFilter)
            }
            variant="outline"
            className="flex w-full flex-wrap justify-start gap-2"
          >
            <ToggleGroupItem value="all">All tables</ToggleGroupItem>
            <ToggleGroupItem value="available">Available</ToggleGroupItem>
            <ToggleGroupItem value="occupied">Occupied</ToggleGroupItem>
            <ToggleGroupItem value="unavailable">Unavailable</ToggleGroupItem>
          </ToggleGroup>

          <TabsContent value="grid" className="mt-0">
            {filteredAndSortedTables.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No tables match the current filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredAndSortedTables.map((table) => (
                  <Card key={table.id}>
                    <CardHeader className="space-y-3 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{table.tableName}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClass(table.currentStatus)}
                          >
                            {table.currentStatus}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-muted-foreground">Total bill</p>
                        <p className="font-medium">{formatCurrency(table.totalBill)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-muted-foreground">Time since started</p>
                        <p className="font-medium">
                          {getTimeSinceSessionStarted(table.sessionStartedAt)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-muted-foreground">Order status</p>
                        <Badge
                          variant="outline"
                          className={getOrderBadgeClass(table.orderStatus)}
                        >
                          {table.orderStatus}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-0">
            {filteredAndSortedTables.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No tables match the current filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table number / name</TableHead>
                    <TableHead>Current status</TableHead>
                    <TableHead className="text-right">Total bill</TableHead>
                    <TableHead>Time since session started</TableHead>
                    <TableHead>Order status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTables.map((table) => (
                    <TableRow key={table.id}>
                      <TableCell className="font-medium">{table.tableName}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClass(table.currentStatus)}
                        >
                          {table.currentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(table.totalBill)}
                      </TableCell>
                      <TableCell>
                        {getTimeSinceSessionStarted(table.sessionStartedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getOrderBadgeClass(table.orderStatus)}
                        >
                          {table.orderStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

