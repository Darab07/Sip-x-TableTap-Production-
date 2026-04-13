import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ManagerWaiterAlertOverlay } from "@/components/manager-waiter-alert-overlay";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

type OrderStatus = "new" | "accepted" | "preparing" | "ready";
const CLEARED_READY_ORDERS_KEY = "tabletap_cleared_ready_live_orders";

type LiveOrder = {
  id: string;
  orderNumber: string;
  tableNumber: string;
  placedAt: string;
  orderedItems: string[];
  hasOrderNotes: boolean;
  orderNotes: string;
  status: OrderStatus;
};

const kanbanColumns: { value: OrderStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "accepted", label: "Accepted" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
];

const getVisibleStatusLabel = (order: LiveOrder) => {
  if (order.status === "new") {
    return "New";
  }

  if (order.status === "accepted") {
    return "Accepted";
  }

  if (order.status === "preparing") {
    return "Preparing";
  }

  return "Ready";
};

const getStatusBadgeClass = (order: LiveOrder) => {
  if (order.status === "new") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (order.status === "accepted") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (order.status === "preparing") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-green-200 bg-green-50 text-green-700";
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
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [statusUpdateError, setStatusUpdateError] = React.useState<string | null>(
    null
  );
  const [updatingOrderId, setUpdatingOrderId] = React.useState<string | null>(
    null
  );
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(
    null
  );
  const [clearedReadyOrderIds, setClearedReadyOrderIds] = React.useState<
    Set<string>
  >(() => {
    if (typeof window === "undefined") {
      return new Set<string>();
    }

    try {
      const raw = window.localStorage.getItem(CLEARED_READY_ORDERS_KEY);
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
    orderNumber: order.orderNumber,
    tableNumber: order.tableNumber,
    placedAt: order.placedAt,
    orderedItems: order.orderedItems,
    hasOrderNotes: order.hasOrderNotes,
    orderNotes: order.orderNotes,
    status: order.status,
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
                  order.status === "ready" &&
                  clearedReadyOrderIds.has(order.id)
                )
            )
        );
      }
    } catch (error) {
      console.warn("Live orders sync failed.", error);
    } finally {
      setIsSyncingOrders(false);
      setIsInitialLoading(false);
    }
  }, [clearedReadyOrderIds]);

  const transitionOrderStatus = React.useCallback(
    async (
      order: LiveOrder,
      nextStatus: Extract<OrderStatus, "accepted" | "preparing" | "ready">
    ) => {
      const previousStatus = order.status;
      setStatusUpdateError(null);
      setUpdatingOrderId(order.id);
      updateOrder(order.id, { status: nextStatus });
      try {
        await updateManagerOrderStatus(order.orderNumber, nextStatus);
        await syncOrders();
      } catch (error) {
        updateOrder(order.id, { status: previousStatus });
        const reason =
          error instanceof Error ? error.message : "Unknown server error";
        setStatusUpdateError(
          `Unable to move ${order.orderNumber} to ${nextStatus}: ${reason}`
        );
        console.warn("Unable to persist order status:", error);
      } finally {
        setUpdatingOrderId((current) => (current === order.id ? null : current));
      }
    },
    [syncOrders]
  );


  const ordersByStatus = (status: OrderStatus) =>
    orders
      .filter((order) => order.status === status)
      .sort(
        (a, b) =>
          new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
      );

  const clearReadyOrders = React.useCallback(() => {
    const readyIds = orders
      .filter((order) => order.status === "ready")
      .map((order) => order.id);

    if (readyIds.length === 0) {
      return;
    }

    setOrders((current) => current.filter((order) => order.status !== "ready"));
    setSelectedOrderId((current) =>
      current !== null && readyIds.includes(current) ? null : current
    );
    setClearedReadyOrderIds((current) => {
      const next = new Set(current);
      readyIds.forEach((id) => next.add(id));
      window.localStorage.setItem(
        CLEARED_READY_ORDERS_KEY,
        JSON.stringify(Array.from(next))
      );
      return next;
    });
  }, [orders]);

  const renderPrimaryAction = (order: LiveOrder) => {
    const isUpdating = updatingOrderId === order.id;
    if (order.status === "new") {
      return (
        <Button
          size="sm"
          className="h-8 px-2 text-xs md:h-7 md:text-[11px]"
          disabled={isUpdating}
          onClick={() => {
            void transitionOrderStatus(order, "accepted");
          }}
        >
          {isUpdating ? "Saving..." : "Accept"}
        </Button>
      );
    }

    if (order.status === "accepted") {
      return (
        <Button
          size="sm"
          className="h-8 px-2 text-xs md:h-7 md:text-[11px]"
          disabled={isUpdating}
          onClick={() => {
            void transitionOrderStatus(order, "preparing");
          }}
        >
          {isUpdating ? "Saving..." : "Mark Preparing"}
        </Button>
      );
    }

    if (order.status === "preparing") {
      return (
        <Button
          size="sm"
          className="h-8 px-2 text-xs md:h-7 md:text-[11px]"
          disabled={isUpdating}
          onClick={() => {
            void transitionOrderStatus(order, "ready");
          }}
        >
          {isUpdating ? "Saving..." : "Mark Ready"}
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
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="mx-auto w-full max-w-[1600px] px-2 sm:px-3 md:px-3 lg:px-5">
                {statusUpdateError ? (
                  <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {statusUpdateError}
                  </p>
                ) : null}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-2 xl:gap-3">
                {kanbanColumns.map((column) => {
                  const columnOrders = ordersByStatus(column.value);

                  return (
                    <div
                      key={column.value}
                      className="min-w-0 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold md:text-xs xl:text-sm">{column.label}</h2>
                        <div className="flex items-center gap-1.5">
                          {column.value === "ready" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5 text-[10px] xl:px-2 xl:text-[11px]"
                              disabled={columnOrders.length === 0}
                              onClick={clearReadyOrders}
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
                      {isInitialLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-28 w-full rounded-lg" />
                          <Skeleton className="h-28 w-full rounded-lg" />
                        </div>
                      ) : columnOrders.length === 0 ? (
                        <div className="rounded-lg border border-dashed bg-muted/20 p-5 text-center text-sm text-muted-foreground">
                          No orders in this lane.
                        </div>
                      ) : (
                        columnOrders.map((order) => (
                          <div key={order.orderNumber} className="rounded-lg border bg-card p-2.5 md:p-2 xl:p-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[13px] font-semibold md:text-xs xl:text-sm">
                                  Table {order.tableNumber}
                                </p>
                                <p className="break-all text-[11px] text-muted-foreground">
                                  {order.orderNumber}
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
                                <p className="break-all text-[11px] text-muted-foreground">
                                  Items ordered
                                </p>
                                <ul className="mt-1 space-y-1">
                                  {order.orderedItems.map((item) => (
                                    <li
                                      key={item}
                                      className="break-words text-[13px] font-medium md:text-xs xl:text-sm"
                                    >
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {order.hasOrderNotes ? (
                                <div className="col-span-2">
                                  <p className="break-all text-[11px] text-muted-foreground">
                                    Order notes
                                  </p>
                                  <p className="break-words text-[13px] font-medium text-slate-700 md:text-xs xl:text-sm">
                                    {order.orderNotes}
                                  </p>
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {renderPrimaryAction(order)}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs md:h-7 md:text-[11px]"
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
                <p className="font-medium">{selectedOrder.orderNumber}</p>
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













