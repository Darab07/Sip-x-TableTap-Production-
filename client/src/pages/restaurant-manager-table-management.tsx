import * as React from "react"
import { SearchIcon } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { ManagerWaiterAlertOverlay } from "@/components/manager-waiter-alert-overlay"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLocation } from "wouter"
import {
  fetchManagerTableManagement,
  updateManagerTableAvailabilityApi,
} from "@/lib/tabletap-supabase-api"

type TableStatus = "Available" | "Occupied" | "Served" | "Unavailable"

type TableSession = {
  id: string
  tableNumber: string
  status: TableStatus
  qrGenerated: boolean
  currentSession: string
  orderId: string | null
  orderStatus: string
  billTotal: number
  participantsCount: number
  startedAt: string | null
  orderItems: string[]
}

const formatCurrency = (value: number) =>
  `Rs. ${value.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`

const getTimeActive = (startedAt: string | null) => {
  if (!startedAt) {
    return "N/A"
  }

  const started = new Date(startedAt).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - started)
  const totalMinutes = Math.floor(diff / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes} min`
  }

  return `${hours}h ${minutes}m`
}

const getStatusClass = (status: TableStatus) => {
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

type RestaurantManagerTableManagementProps = {
  dashboardRole?: "owner" | "manager" | "admin"
}

export default function RestaurantManagerTableManagement({
  dashboardRole = "manager",
}: RestaurantManagerTableManagementProps) {
  const [, setLocation] = useLocation()
  const [tables, setTables] = React.useState<TableSession[]>([])
  const [search, setSearch] = React.useState("")
  const [sessionDialogTableId, setSessionDialogTableId] = React.useState<
    string | null
  >(null)
  const [orderDialogTableId, setOrderDialogTableId] = React.useState<
    string | null
  >(null)

  const syncTables = React.useCallback(async () => {
    try {
      const response = await fetchManagerTableManagement("f7-islamabad")
      setTables(
        response.rows.map((row) => ({
          id: row.id,
          tableNumber: row.tableNumber,
          status: row.status,
          qrGenerated: row.qrGenerated,
          currentSession: row.currentSession,
          orderId: row.orderId,
          orderStatus: row.orderStatus,
          billTotal: row.billTotal,
          participantsCount: row.participantsCount,
          startedAt: row.startedAt,
          orderItems: row.orderItems,
        })),
      )
    } catch (error) {
      console.warn("Manager table management sync failed:", error)
    }
  }, [])

  React.useEffect(() => {
    void syncTables()
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        void syncTables()
      }
    }, 15000)
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void syncTables()
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [syncTables])

  const filteredTables = React.useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return tables
      .filter((table) => {
        if (normalized.length === 0) {
          return true
        }

        return table.tableNumber.toLowerCase().includes(normalized)
      })
      .sort((a, b) => a.tableNumber.localeCompare(b.tableNumber))
  }, [search, tables])

  const totals = React.useMemo(() => {
    return {
      totalTables: tables.length,
      available: tables.filter((table) => table.status === "Available").length,
      occupied: tables.filter((table) => table.status === "Occupied").length,
      served: tables.filter((table) => table.status === "Served").length,
    }
  }, [tables])

  const sessionTable =
    sessionDialogTableId !== null
      ? tables.find((table) => table.id === sessionDialogTableId) ?? null
      : null
  const orderTable =
    orderDialogTableId !== null
      ? tables.find((table) => table.id === orderDialogTableId) ?? null
      : null

  const markUnavailable = async (tableId: string) => {
    setTables((current) =>
      current.map((table) =>
        table.id === tableId
          ? {
              ...table,
              status: "Unavailable",
              currentSession: "Maintenance hold",
              orderId: null,
              orderStatus: "Unavailable",
              billTotal: 0,
              participantsCount: 0,
              startedAt: null,
              orderItems: [],
            }
          : table
      )
    )
    try {
      await updateManagerTableAvailabilityApi(tableId, "unavailable")
      await syncTables()
    } catch (error) {
      console.warn("Failed to mark table unavailable:", error)
    }
  }

  const markAvailable = async (tableId: string) => {
    setTables((current) =>
      current.map((table) =>
        table.id === tableId
          ? {
              ...table,
              status: "Available",
              currentSession: "No active session",
              orderId: null,
              orderStatus: "No active order",
              billTotal: 0,
              participantsCount: 0,
              startedAt: null,
              orderItems: [],
            }
          : table
      )
    )
    try {
      await updateManagerTableAvailabilityApi(tableId, "available")
      await syncTables()
    } catch (error) {
      console.warn("Failed to mark table available:", error)
    }
  }

  const hasLinkedOrder = (table: TableSession) => table.orderId !== null

  const openLinkedOrder = (table: TableSession) => {
    if (!table.orderId) {
      return
    }

    setLocation(
      `/restaurant/manager/live-orders?orderId=${encodeURIComponent(table.orderId)}`
    )
  }

  return (
    <SidebarProvider
      style={
        {
          ["--sidebar-width" as string]: "16rem",
          ["--header-height" as string]: "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" dashboardRole={dashboardRole} />
      <SidebarInset>
        <SiteHeader title="Table Management" />
        <ManagerWaiterAlertOverlay />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="*:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 px-4 md:grid-cols-2 xl:grid-cols-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card lg:px-6">
                <Card className="@container/card">
                  <CardHeader className="relative">
                    <p className="text-sm text-muted-foreground">Total Tables</p>
                    <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                      {totals.totalTables}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="@container/card">
                  <CardHeader className="relative">
                    <p className="text-sm text-muted-foreground">Available</p>
                    <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                      {totals.available}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="@container/card">
                  <CardHeader className="relative">
                    <p className="text-sm text-muted-foreground">Occupied</p>
                    <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                      {totals.occupied}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="@container/card">
                  <CardHeader className="relative">
                    <p className="text-sm text-muted-foreground">Served</p>
                    <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                      {totals.served}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card className="mx-4 lg:mx-6">
                <CardHeader className="space-y-4">
                  <div>
                    <CardTitle>Restaurant Floor</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Live overview of floor availability and active table sessions.
                    </p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="pl-8"
                      placeholder="Search by table number"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {filteredTables.map((table) => (
                      <div
                        key={`floor-${table.id}`}
                        className="rounded-lg border bg-background p-3"
                      >
                        <p className="text-sm font-semibold">{table.tableNumber}</p>
                        <Badge
                          variant="outline"
                          className={`mt-2 ${getStatusClass(table.status)}`}
                        >
                          {table.status}
                        </Badge>
                        <p className="mt-2 text-xs text-muted-foreground">
                          QR: {table.qrGenerated ? "Generated" : "Missing"}
                        </p>
                      </div>
                    ))}
                  </div>

                  {filteredTables.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No tables found.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 md:hidden">
                        {filteredTables.map((table) => (
                          <div
                            key={table.id}
                            className={`rounded-lg border p-3 ${
                              hasLinkedOrder(table)
                                ? "cursor-pointer hover:bg-muted/40"
                                : ""
                            }`}
                            onClick={() => openLinkedOrder(table)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">
                                  {table.tableNumber}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={getStatusClass(table.status)}
                              >
                                {table.status}
                              </Badge>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Order status
                                </p>
                                <p className="text-sm font-medium">
                                  {table.orderStatus}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Bill total
                                </p>
                                <p className="text-sm font-medium">
                                  {formatCurrency(table.billTotal)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Time active
                                </p>
                                <p className="text-sm font-medium">
                                  {getTimeActive(table.startedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSessionDialogTableId(table.id)
                                }}
                              >
                                View session
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setOrderDialogTableId(table.id)
                                }}
                              >
                                View current order
                              </Button>
                              {table.status === "Unavailable" ? (
                                <Button
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    markAvailable(table.id)
                                  }}
                                >
                                  Mark table available
                                </Button>
                              ) : table.status === "Available" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    markUnavailable(table.id)
                                  }}
                                >
                                  Mark table unavailable
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                >
                                  Cannot mark unavailable
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Table number</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Order status</TableHead>
                              <TableHead className="text-right">Bill total</TableHead>
                              <TableHead>Time active</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTables.map((table) => (
                              <TableRow
                                key={table.id}
                                className={hasLinkedOrder(table) ? "cursor-pointer" : ""}
                                onClick={() => openLinkedOrder(table)}
                              >
                                <TableCell className="font-medium">
                                  {table.tableNumber}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={getStatusClass(table.status)}
                                  >
                                    {table.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{table.orderStatus}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(table.billTotal)}
                                </TableCell>
                                <TableCell>{getTimeActive(table.startedAt)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setSessionDialogTableId(table.id)
                                      }}
                                    >
                                      View session
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setOrderDialogTableId(table.id)
                                      }}
                                    >
                                      View current order
                                    </Button>
                                    {table.status === "Unavailable" ? (
                                      <Button
                                        size="sm"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          markAvailable(table.id)
                                        }}
                                      >
                                        Mark table available
                                      </Button>
                                    ) : table.status === "Available" ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          markUnavailable(table.id)
                                        }}
                                      >
                                        Mark table unavailable
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled
                                      >
                                        Cannot mark unavailable
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>

      <Dialog
        open={sessionTable !== null}
        onOpenChange={(open) => !open && setSessionDialogTableId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session details</DialogTitle>
            <DialogDescription>
              Active session information for this table.
            </DialogDescription>
          </DialogHeader>
          {sessionTable ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-muted-foreground">Table number</p>
              <p className="font-medium">{sessionTable.tableNumber}</p>
              <p className="text-muted-foreground">Current session</p>
              <p className="font-medium">{sessionTable.currentSession}</p>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{sessionTable.status}</p>
              <p className="text-muted-foreground">Participants count</p>
              <p className="font-medium">{sessionTable.participantsCount}</p>
              <p className="text-muted-foreground">Time active</p>
              <p className="font-medium">{getTimeActive(sessionTable.startedAt)}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={orderTable !== null}
        onOpenChange={(open) => !open && setOrderDialogTableId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Current order</DialogTitle>
            <DialogDescription>
              Current order summary for this table.
            </DialogDescription>
          </DialogHeader>
          {orderTable ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <p className="text-muted-foreground">Table number</p>
                <p className="font-medium">{orderTable.tableNumber}</p>
                <p className="text-muted-foreground">Order status</p>
                <p className="font-medium">{orderTable.orderStatus}</p>
                <p className="text-muted-foreground">Bill total</p>
                <p className="font-medium">{formatCurrency(orderTable.billTotal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Items</p>
                {orderTable.orderItems.length > 0 ? (
                  <ul className="mt-1 space-y-1 rounded-md border bg-muted/30 p-3">
                    {orderTable.orderItems.map((item) => (
                      <li key={item} className="text-sm font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 rounded-md border bg-muted/30 p-3">
                    No active order items.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
