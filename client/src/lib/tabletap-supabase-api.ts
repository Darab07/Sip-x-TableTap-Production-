const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
  "/api";

const apiFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return fetch(input, {
    cache: "no-store",
    ...init,
  });
};

const summarizeBody = (raw: string, max = 180) => {
  const compact = raw.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
};

const readJson = async <T>(res: Response): Promise<T> => {
  const clone = res.clone();

  if (!res.ok) {
    try {
      const body = (await res.json()) as { message?: string };
      throw new Error(body.message || `Request failed (${res.status})`);
    } catch {
      const rawBody = await clone.text().catch(() => "");
      const preview = summarizeBody(rawBody);
      const message = preview
        ? `Request failed (${res.status}): ${preview}`
        : `Request failed (${res.status})`;
      throw new Error(message);
    }
  }

  try {
    return (await res.json()) as T;
  } catch {
    const rawBody = await clone.text().catch(() => "");
    const preview = summarizeBody(rawBody);
    const detail = preview
      ? ` Response starts with: ${preview}`
      : "";
    throw new Error(
      `API returned non-JSON response (${res.status}).${detail}`,
    );
  }
};

export type MenuCatalogApiResponse = {
  outletId: string;
  branchCode: string;
  categories: Array<{ slug: string; name: string; sortOrder: number }>;
  items: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    basePrice: number;
    isPriceOnRequest: boolean;
    isAvailable: boolean;
    sortOrder: number;
    categorySlug: string;
    categoryName: string;
    optionGroups: Array<{
      name: string;
      inputType: "single" | "multi";
      pricingMode: "delta" | "absolute";
      required: boolean;
      minSelect: number;
      maxSelect?: number | null;
      sortOrder: number;
      values: Array<{
        label: string;
        priceDelta: number;
        priceOverride?: number | null;
        sortOrder: number;
      }>;
    }>;
  }>;
};

export const fetchMenuCatalog = async (branchCode = "f7-islamabad") => {
  const res = await apiFetch(
    `${API_BASE}/menu/catalog?branchCode=${encodeURIComponent(branchCode)}`,
  );
  return readJson<MenuCatalogApiResponse>(res);
};

export const fetchTablePublicAccess = async (
  tableNumber: number,
  branchCode = "f7-islamabad",
) => {
  const res = await apiFetch(
    `${API_BASE}/tables/public-access?branchCode=${encodeURIComponent(
      branchCode,
    )}&tableNumber=${tableNumber}`,
  );
  return readJson<{
    tableNumber: number;
    tableLabel: string;
    tableStatus: string;
    hasQrCode: boolean;
    orderingEnabled: boolean;
    message: string;
  }>(res);
};

export const checkInTableFromQrApi = async (
  tableNumber: number,
  branchCode = "f7-islamabad",
) => {
  const res = await apiFetch(`${API_BASE}/tables/check-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branchCode, tableNumber }),
  });
  return readJson<{
    tableId: string;
    tableLabel: string;
    tableSessionId: string;
  }>(res);
};

export type WaiterCallEventApi = {
  id: string;
  branchCode: string;
  tableNumber: number;
  tableLabel: string;
  createdAt: string;
  createdAtMs: number;
};

export const callWaiterApi = async (input: {
  tableNumber: number;
  tableLabel?: string;
  branchCode?: string;
}) => {
  const res = await apiFetch(`${API_BASE}/waiter/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableNumber: input.tableNumber,
      tableLabel: input.tableLabel,
      branchCode: input.branchCode ?? "f7-islamabad",
    }),
  });
  return readJson<{ event: WaiterCallEventApi }>(res);
};

export const fetchManagerWaiterCallsApi = async (
  since = 0,
  branchCode = "f7-islamabad",
) => {
  const params = new URLSearchParams({
    since: String(since),
    branchCode,
  });
  const res = await apiFetch(`${API_BASE}/manager/waiter-calls?${params.toString()}`);
  return readJson<{ events: WaiterCallEventApi[] }>(res);
};

export type PlaceOrderPayload = {
  branchCode?: string;
  tableNumber: number;
  deviceFingerprint?: string;
  notes?: string;
  tipAmount?: number;
  serviceFee?: number;
  gstAmount?: number;
  subtotal?: number;
  total?: number;
  items: Array<{
    menuItemId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    details?: string;
    options?: Array<{
      groupName: string;
      label: string;
      priceDelta?: number;
      priceOverride?: number | null;
    }>;
  }>;
};

export type PlacedOrderApiResponse = {
  order: {
    id: string;
    orderNumber: string;
    tableLabel: string;
    status: "placed" | "confirmed" | "preparing" | "served";
    subtotal: number;
    tipAmount: number;
    serviceFee: number;
    gstAmount: number;
    total: number;
    notes: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      details?: string;
    }>;
  };
};

export const placeOrder = async (payload: PlaceOrderPayload) => {
  const res = await apiFetch(`${API_BASE}/orders/place`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson<PlacedOrderApiResponse>(res);
};

export type ManagerLiveOrder = {
  id: string;
  orderNumber: string;
  tableNumber: string;
  placedAt: string;
  orderedItems: string[];
  hasOrderNotes: boolean;
  orderNotes: string;
  status: "new" | "accepted" | "preparing" | "completed";
  readyToServe: boolean;
};

export const fetchManagerLiveOrders = async (branchCode = "f7-islamabad") => {
  const res = await apiFetch(
    `${API_BASE}/manager/live-orders?branchCode=${encodeURIComponent(branchCode)}`,
  );
  return readJson<{ orders: ManagerLiveOrder[] }>(res);
};

export const updateManagerOrderStatus = async (
  orderNumber: string,
  status: "accepted" | "preparing" | "ready" | "completed",
) => {
  const res = await apiFetch(
    `${API_BASE}/manager/orders/${encodeURIComponent(orderNumber)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  return readJson<{
    order: { id: string; orderNumber: string; status: string };
  }>(res);
};

export const fetchOwnerCards = async (branchCode = "f7-islamabad") => {
  const res = await apiFetch(
    `${API_BASE}/dashboard/owner/cards?branchCode=${encodeURIComponent(branchCode)}`,
  );
  return readJson<{
    totalOrders: number;
    totalSales: number;
    averageOrderValue: number;
    inProgressOrders: number;
  }>(res);
};

export const fetchAdminEarnings = async () => {
  const res = await apiFetch(`${API_BASE}/dashboard/admin/earnings`);
  return readJson<{
    summary: {
      thisMonthSales: number;
      thisMonthFee: number;
      ytdFee: number;
      pendingInvoiceCount: number;
      pendingInvoiceAmount: number;
    };
    rows: Array<{
      id: string;
      outletId: string;
      restaurantName: string;
      branchCode: string;
      branchLabel: string;
      monthKey: string;
      monthLabel: string;
      ordersCount: number;
      grossSales: number;
      tableTapFee: number;
      invoiceStatus: "Current month" | "Ready to invoice";
    }>;
  }>(res);
};

export const fetchOwnerSalesTrend = async (
  branchCode = "f7-islamabad",
  rangeDays = 30,
) => {
  const res = await apiFetch(
    `${API_BASE}/dashboard/owner/sales-trend?branchCode=${encodeURIComponent(
      branchCode,
    )}&rangeDays=${rangeDays}`,
  );
  return readJson<{ points: Array<{ date: string; sales: number }> }>(res);
};

export const fetchOwnerTopItems = async (
  branchCode = "f7-islamabad",
  rangeDays = 30,
) => {
  const res = await apiFetch(
    `${API_BASE}/dashboard/owner/top-items?branchCode=${encodeURIComponent(
      branchCode,
    )}&rangeDays=${rangeDays}`,
  );
  return readJson<{
    rows: Array<{
      itemName: string;
      quantitySold: number;
      revenueGenerated: number;
      sessionsOrderedIn: number;
      soldAt: string;
    }>;
  }>(res);
};

export const fetchOwnerOrdersSummary = async (branchCode = "f7-islamabad") => {
  const res = await apiFetch(
    `${API_BASE}/dashboard/owner/orders/summary?branchCode=${encodeURIComponent(branchCode)}`,
  );
  return readJson<{
    totalOrdersToday: number;
    totalOrdersDeltaPercent: number;
    inProgressCount: number;
    completedCount: number;
    completedRatePercent: number;
    averageOrderValue: number;
    averageOrderValueDeltaPercent: number;
    averageCompletionMinutes: number;
    averageCompletionDeltaMinutes: number;
  }>(res);
};

export const fetchOwnerOrdersTrend = async (
  mode: "day" | "hour",
  branchCode = "f7-islamabad",
  rangeDays = 7,
) => {
  const query = new URLSearchParams({
    branchCode,
    mode,
  });
  if (mode === "day") {
    query.set("rangeDays", String(rangeDays));
  }
  const res = await apiFetch(`${API_BASE}/dashboard/owner/orders/trend?${query.toString()}`);
  return readJson<{ points: Array<{ label: string; orders: number }> }>(res);
};

export const fetchOwnerOrdersTable = async (
  branchCode = "f7-islamabad",
  rangeDays = 31,
) => {
  const res = await apiFetch(
    `${API_BASE}/dashboard/owner/orders/table?branchCode=${encodeURIComponent(
      branchCode,
    )}&rangeDays=${rangeDays}`,
  );
  return readJson<{
    rows: Array<{
      id: string;
      tableNumber: string;
      itemsCount: number;
      totalBill: number;
      status: "Confirmed" | "Preparing" | "Served";
      dateTime: string;
      completionPrepTime: string;
    }>;
  }>(res);
};

export const fetchOrderStatus = async (orderNumber: string) => {
  const res = await apiFetch(
    `${API_BASE}/orders/${encodeURIComponent(orderNumber)}/status`,
  );
  return readJson<{
    order: {
      id: string;
      orderNumber: string;
      status: "placed" | "confirmed" | "preparing" | "served";
    };
  }>(res);
};

export const fetchOutlets = async () => {
  const res = await apiFetch(`${API_BASE}/outlets`);
  return readJson<{
    outlets: Array<{
      id: string;
      branchCode: string;
      branchLabel: string;
      restaurantName: string;
    }>;
  }>(res);
};

export const fetchOwnerTableManagement = async (branchCode = "f7-islamabad") => {
  const res = await apiFetch(
    `${API_BASE}/dashboard/owner/table-management?branchCode=${encodeURIComponent(branchCode)}`,
  );
  return readJson<{
    cards: {
      totalTables: number;
      available: number;
      occupied: number;
      served: number;
      unavailable: number;
    };
    rows: Array<{
      id: string;
      tableId: string;
      tableNumber: string;
      status: "Available" | "Occupied" | "Served" | "Unavailable";
      qrGenerated: boolean;
      currentSession: string;
      orderId: string | null;
      orderStatus: string;
      billTotal: number;
      participantsCount: number;
      startedAt: string | null;
      orderItems: string[];
    }>;
  }>(res);
};

export const fetchOwnerMenuInsights = async (
  branchCode = "f7-islamabad",
  dateRange: "today" | "this-week" | "this-month" = "today",
  category = "all",
) => {
  const params = new URLSearchParams({
    branchCode,
    dateRange,
    category,
  });
  const res = await apiFetch(`${API_BASE}/dashboard/owner/menu-insights?${params.toString()}`);
  return readJson<{
    categories: string[];
    totalItemsSold: number;
    bestSellingItem: { itemName: string; quantitySold: number } | null;
    highestRevenueItem: { itemName: string; revenue: number } | null;
    rows: Array<{
      itemName: string;
      quantitySold: number;
      revenue: number;
      avgOrderContribution: number;
    }>;
  }>(res);
};

export const fetchManagerMenuItems = async (branchCode = "f7-islamabad") => {
  const res = await apiFetch(
    `${API_BASE}/manager/menu-items?branchCode=${encodeURIComponent(branchCode)}`,
  );
  return readJson<{
    items: Array<{
      id: string;
      name: string;
      category: string;
      price: number;
      available: boolean;
      updatedAt: string;
    }>;
  }>(res);
};

export const updateManagerMenuItemApi = async (input: {
  itemId: string;
  price?: number;
  available?: boolean;
}) => {
  const res = await apiFetch(
    `${API_BASE}/manager/menu-items/${encodeURIComponent(input.itemId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: input.price,
        available: input.available,
      }),
    },
  );
  return readJson<{
    item: {
      id: string;
      name: string;
      price: number;
      available: boolean;
    };
  }>(res);
};

export const fetchManagerTableManagement = async (branchCode = "f7-islamabad") => {
  const res = await apiFetch(
    `${API_BASE}/manager/table-management?branchCode=${encodeURIComponent(branchCode)}`,
  );
  return readJson<{
    cards: {
      totalTables: number;
      available: number;
      occupied: number;
      served: number;
      unavailable: number;
    };
    rows: Array<{
      id: string;
      tableId: string;
      tableNumber: string;
      status: "Available" | "Occupied" | "Served" | "Unavailable";
      qrGenerated: boolean;
      currentSession: string;
      orderId: string | null;
      orderStatus: string;
      billTotal: number;
      participantsCount: number;
      startedAt: string | null;
      orderItems: string[];
    }>;
  }>(res);
};

export const updateManagerTableAvailabilityApi = async (
  tableId: string,
  availability: "available" | "unavailable",
) => {
  const res = await apiFetch(
    `${API_BASE}/manager/tables/${encodeURIComponent(tableId)}/availability`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability }),
    },
  );
  return readJson<{ table: { id: string; status: string } }>(res);
};

export const fetchAdminQrCodes = async (branchCode = "f7-islamabad") => {
  const res = await apiFetch(
    `${API_BASE}/admin/qr-codes?branchCode=${encodeURIComponent(branchCode)}`,
  );
  return readJson<{
    rows: Array<{
      id: string;
      tableNumber: number;
      tableLabel: string;
      createdAt: string;
    }>;
  }>(res);
};

export const createAdminQrCodeApi = async (
  tableNumber: number,
  branchCode = "f7-islamabad",
) => {
  const res = await apiFetch(`${API_BASE}/admin/qr-codes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableNumber, branchCode }),
  });
  return readJson<{
    rows: Array<{
      id: string;
      tableNumber: number;
      tableLabel: string;
      createdAt: string;
    }>;
  }>(res);
};

export const deleteAdminQrCodeApi = async (id: string) => {
  const res = await apiFetch(`${API_BASE}/admin/qr-codes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return readJson<{ ok: true }>(res);
};

