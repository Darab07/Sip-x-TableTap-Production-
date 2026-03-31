import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ManagerWaiterAlertOverlay } from "@/components/manager-waiter-alert-overlay";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import {
  fetchManagerLiveOrders,
  type ManagerLiveOrder,
  updateManagerOrderStatus,
} from "@/lib/tabletap-supabase-api";

type OrderStatus = "new" | "accepted" | "preparing" | "completed";
const CLEARED_COMPLETED_ORDERS_KEY = "tabletap_cleared_completed_live_orders";

type LiveOrder = {
  id: string;
  tableNumber: string;
  placedAt: string;
  orderedItems: string[];
  hasOrderNotes: boolean;
  orderNotes: string;
  status: OrderStatus;
  readyToServe: boolean;
};

const kanbanColumns: { value: OrderStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "accepted", label: "Accepted" },
  { value: "preparing", label: "Preparing" },
  { value: "completed", label: "Completed" },
];

const getVisibleStatusLabel = (order: LiveOrder) => {
  if (order.status === "preparing" && order.readyToServe) {
    return "Ready";
  }

  if (order.status === "new") {
    return "New";
  }

  if (order.status === "accepted") {
    return "Accepted";
  }

  if (order.status === "preparing") {
    return "Preparing";
  }

  return "Completed";
};

const getStatusBadgeClass = (order: LiveOrder) => {
  if (order.status === "new") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (order.status === "accepted") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (order.status === "preparing" && order.readyToServe) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (order.status === "preparing") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
};

type RestaurantManagerDashboardProps = {
  dashboardRole?: "owner" | "manager" | "admin";
};

export default function RestaurantManagerDashboard({
  dashboardRole = "manager",
}: RestaurantManagerDashboardProps) {
  const [location] = useLocation();
  const [orders, setOrders] = React.useState<LiveOrder[]>([]);
  const [isSyncingOrders, setIsSyncingOrders] = React.useState(false);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(
    null
  );
  const [clearedCompletedOrderIds, setClearedCompletedOrderIds] = React.useState<
    Set<string>
  >(() => {
    if (typeof window === "undefined") {
      return new Set<string>();
    }

    try {
      const raw = window.localStorage.getItem(CLEARED_COMPLETED_ORDERS_KEY);
      if (!raw) {
        return new Set<string>();
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return new Set<string>();
      }
      return new Set<string>(parsed.filter((value) => typeof value === "string"));
    } catch {
      return new Set<string>();
    }
  });

  const selectedOrder =
    selectedOrderId !== null
      ? orders.find((order) => order.id === selectedOrderId) ?? null
      : null;

  const updateOrder = (orderId: string, updates: Partial<LiveOrder>) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      )
    );
  };

  const mapApiOrder = (order: ManagerLiveOrder): LiveOrder => ({
    id: order.orderNumber,
    tableNumber: order.tableNumber,
    placedAt: order.placedAt,
    orderedItems: order.orderedItems,
    hasOrderNotes: order.hasOrderNotes,
    orderNotes: order.orderNotes,
    status: order.status,
    readyToServe: order.readyToServe,
  });

  const syncOrders = React.useCallback(async () => {
    try {
      setIsSyncingOrders(true);
      const response = await fetchManagerLiveOrders();
      if (Array.isArray(response.orders)) {
        setOrders(
          response.orders
            .map(mapApiOrder)
            .filter(
              (order) =>
                !(
                  order.status === "completed" &&
                  clearedCompletedOrderIds.has(order.id)
                )
            )
        );
      }
    } catch (error) {
      console.warn("Live orders sync failed.", error);
    } finally {
      setIsSyncingOrders(false);
    }
  }, [clearedCompletedOrderIds]);

  const ordersByStatus = (status: OrderStatus) =>
    orders
      .filter((order) => order.status === status)
      .sort(
        (a, b) =>
          new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
      );

  const clearCompletedOrders = React.useCallback(() => {
    const completedIds = orders
      .filter((order) => order.status === "completed")
      .map((order) => order.id);

    if (completedIds.length === 0) {
      return;
    }

    setOrders((current) => current.filter((order) => order.status !== "completed"));
    setSelectedOrderId((current) =>
      current !== null && completedIds.includes(current) ? null : current
    );
    setClearedCompletedOrderIds((current) => {
      const next = new Set(current);
      completedIds.forEach((id) => next.add(id));
      window.localStorage.setItem(
        CLEARED_COMPLETED_ORDERS_KEY,
        JSON.stringify(Array.from(next))
      );
      return next;
    });
  }, [orders]);

  const renderPrimaryAction = (order: LiveOrder) => {
    if (order.status === "new") {
      return (
        <Button
          size="sm"
          onClick={async () => {
            updateOrder(order.id, { status: "accepted", readyToServe: false });
            try {
              await updateManagerOrderStatus(order.id, "accepted");
            } catch (error) {
              console.warn("Unable to persist order status:", error);
            }
          }}
        >
          Accept
        </Button>
      );
    }

    if (order.status === "accepted") {
      return (
        <Button
          size="sm"
          onClick={async () => {
            updateOrder(order.id, { status: "preparing", readyToServe: false });
            try {
              await updateManagerOrderStatus(order.id, "preparing");
            } catch (error) {
              console.warn("Unable to persist order status:", error);
            }
          }}
        >
          Mark Preparing
        </Button>
      );
    }

    if (order.status === "preparing" && !order.readyToServe) {
      return (
        <Button
          size="sm"
          onClick={async () => {
            updateOrder(order.id, { readyToServe: true });
            try {
              await updateManagerOrderStatus(order.id, "ready");
            } catch (error) {
              console.warn("Unable to persist order status:", error);
            }
          }}
        >
          Mark Ready
        </Button>
      );
    }

    if (order.status === "preparing" && order.readyToServe) {
      return (
        <Button
          size="sm"
          onClick={async () => {
            updateOrder(order.id, { status: "completed", readyToServe: false });
            try {
              await updateManagerOrderStatus(order.id, "completed");
            } catch (error) {
              console.warn("Unable to persist order status:", error);
            }
          }}
        >
          Mark Served / Completed
        </Button>
      );
    }

    return null;
  };

  React.useEffect(() => {
    void syncOrders();
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void syncOrders();
      }
    }, 10000);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void syncOrders();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [syncOrders]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId");
    if (!orderId) {
      return;
    }

    const hasMatchingOrder = orders.some((order) => order.id === orderId);
    if (hasMatchingOrder) {
      setSelectedOrderId(orderId);
    }

    window.history.replaceState({}, "", "/restaurant/manager/live-orders");
  }, [location, orders]);

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
        <SiteHeader
          title="Live Orders"
          actions={
            isSyncingOrders ? (
              <span className="text-xs text-muted-foreground">Syncing...</span>
            ) : null
          }
        />
        <ManagerWaiterAlertOverlay />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex gap-4 overflow-x-auto pb-2">
                {kanbanColumns.map((column) => {
                  const columnOrders = ordersByStatus(column.value);

                  return (
                    <div
                      key={column.value}
                      className="w-64 min-w-64 flex-shrink-0 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold">{column.label}</h2>
                        <div className="flex items-center gap-1.5">
                          {column.value === "completed" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px]"
                              disabled={columnOrders.length === 0}
                              onClick={clearCompletedOrders}
                            >
                              Clear
                            </Button>
                          ) : null}
                          <Badge
                            variant="outline"
                            className="rounded-lg border-slate-200 bg-slate-50 text-slate-700"
                          >
                            {columnOrders.length}
                          </Badge>
                        </div>
                      </div>
                      {columnOrders.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                          No orders in this lane.
                        </div>
                      ) : (
                        columnOrders.map((order) => (
                          <div key={order.id} className="rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">
                                  Table {order.tableNumber}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {order.id}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={getStatusBadgeClass(order)}
                              >
                                {getVisibleStatusLabel(order)}
                              </Badge>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground">
                                  Items ordered
                                </p>
                                <ul className="mt-1 space-y-1">
                                  {order.orderedItems.map((item) => (
                                    <li
                                      key={item}
                                      className="text-sm font-medium"
                                    >
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {order.hasOrderNotes ? (
                                <div className="col-span-2">
                                  <p className="text-xs text-muted-foreground">
                                    Order notes
                                  </p>
                                  <p className="text-sm font-medium text-slate-700">
                                    {order.orderNotes}
                                  </p>
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {renderPrimaryAction(order)}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOrderId(order.id)}
                              >
                                View full details
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      <Dialog
        open={selectedOrder !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrderId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order details</DialogTitle>
            <DialogDescription>
              Full details and order notes for this order.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <p className="text-muted-foreground">Order ID</p>
                <p className="font-medium">{selectedOrder.id}</p>
                <p className="text-muted-foreground">Table number</p>
                <p className="font-medium">{selectedOrder.tableNumber}</p>
                <p className="text-muted-foreground">Current status</p>
                <p className="font-medium">{getVisibleStatusLabel(selectedOrder)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Items ordered</p>
                <ul className="mt-1 space-y-1 rounded-md border bg-muted/30 p-3">
                  {selectedOrder.orderedItems.map((item) => (
                    <li key={item} className="text-sm font-medium">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {selectedOrder.hasOrderNotes ? (
                <div>
                  <p className="text-muted-foreground">Order notes</p>
                  <p className="mt-1 rounded-md border bg-muted/30 p-3">
                    {selectedOrder.orderNotes}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
