import { supabaseBrowser } from "./supabase";
import {
  getActiveBranchCode,
  setActiveBranchCode as persistActiveBranchCode,
} from "./active-branch";

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
  "/api";

const ENV_DEFAULT_BRANCH_CODE =
  String(import.meta.env.VITE_DEFAULT_BRANCH_CODE ?? "").trim() || "f7-islamabad";
let DEFAULT_BRANCH_CODE = getActiveBranchCode(ENV_DEFAULT_BRANCH_CODE);

export const getApiDefaultBranchCode = () => DEFAULT_BRANCH_CODE;

export const setApiDefaultBranchCode = (branchCode: string) => {
  const normalized = String(branchCode ?? "").trim().toLowerCase();
  if (!normalized) return;
  DEFAULT_BRANCH_CODE = normalized;
  persistActiveBranchCode(normalized);
};

type ApiFetchInit = RequestInit & {
  authToken?: string;
};

const apiFetch = async (input: RequestInfo | URL, init?: ApiFetchInit) => {
  const { authToken, ...requestInit } = init ?? {};
  const headers = new Headers(requestInit.headers ?? undefined);

  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  if (!headers.has("Authorization") && supabaseBrowser) {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(input, {
    cache: "no-store",
    ...requestInit,
    headers,
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

export const fetchMenuCatalog = async (branchCode = DEFAULT_BRANCH_CODE) => {
  const cacheBust = Date.now();
  const res = await apiFetch(
    `${API_BASE}/menu/catalog?branchCode=${encodeURIComponent(branchCode)}&ts=${cacheBust}`,
  );
  return readJson<MenuCatalogApiResponse>(res);
};

export const fetchTablePublicAccess = async (
  tableNumber: number,
  branchCode = DEFAULT_BRANCH_CODE,
) => {
  const res = await apiFetch(
    `${API_BASE}/tables/public-access?branchCode=${encodeURIComponent(
      branchCode,
    )}&tableNumber=${tableNumber}`,
  );
  return readJson<{
    tableNumber: number;
    tableLabel: string;
    accessType: "table" | "takeaway";
    tableStatus: string;
    hasQrCode: boolean;
    orderingEnabled: boolean;
    message: string;
    serviceStartTime: string;
    serviceEndTime: string;
    lastTakeawayTime: string;
    timezone: string;
    serviceHoursLabel: string;
    lastTakeawayLabel: string;
  }>(res);
};

export const checkInTableFromQrApi = async (
  tableNumber: number,
  branchCode = DEFAULT_BRANCH_CODE,
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
      branchCode: input.branchCode ?? DEFAULT_BRANCH_CODE,
    }),
  });
  return readJson<{ event: WaiterCallEventApi }>(res);
};

export const fetchManagerWaiterCallsApi = async (
  since = 0,
  branchCode = DEFAULT_BRANCH_CODE,
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
  customerName?: string;
  customerEmail?: string;
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
    status: "placed" | "confirmed" | "preparing" | "ready" | "served";
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

export const placeOrder = async (
  payload: PlaceOrderPayload,
  options?: { accessToken?: string },
) => {
  const res = await apiFetch(`${API_BASE}/orders/place`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    authToken: options?.accessToken,
  });
  return readJson<PlacedOrderApiResponse>(res);
};

export type CustomerOrderHistoryApiItem = {
  orderNumber: string;
  tableLabel: string;
  status: "placed" | "confirmed" | "preparing" | "ready" | "served";
  notes: string;
  subtotal: number;
  tipAmount: number;
  serviceFee: number;
  gstAmount: number;
  total: number;
  placedAt: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    details: string;
  }>;
};

export const fetchCustomerOrderHistory = async (input: {
  authUserId?: string;
  deviceFingerprint?: string;
  customerEmail?: string;
  branchCode?: string;
  limit?: number;
}) => {
  const params = new URLSearchParams({
    branchCode: input.branchCode ?? DEFAULT_BRANCH_CODE,
    limit: String(input.limit ?? 200),
  });

  if (input.authUserId) {
    params.set("authUserId", input.authUserId.trim());
  }

  if (input.deviceFingerprint) {
    params.set("deviceFingerprint", input.deviceFingerprint);
  }

  if (input.customerEmail) {
    params.set("customerEmail", input.customerEmail.trim().toLowerCase());
  }

  const res = await apiFetch(`${API_BASE}/orders/history?${params.toString()}`);
  return readJson<{ orders: CustomerOrderHistoryApiItem[] }>(res);
};
export type CustomerLoyaltySummaryApi = {
  stampsInCycle: number;
  stampTarget: number;
  totalCoffeeDays: number;
  rewardsUnlocked: number;
  daysRemaining: number;
  freeCoffeeAvailable: boolean;
};

export const fetchCustomerLoyaltySummary = async (input?: {
  branchCode?: string;
}) => {
  const params = new URLSearchParams({
    branchCode: input?.branchCode ?? DEFAULT_BRANCH_CODE,
  });

  const res = await apiFetch(`${API_BASE}/orders/loyalty-summary?${params.toString()}`);
  return readJson<{ summary: CustomerLoyaltySummaryApi }>(res);
};

export const upsertCustomerProfile = async (input: {
  deviceFingerprint: string;
  name: string;
  email: string;
}) => {
  const res = await apiFetch(`${API_BASE}/customers/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<{
    profile: {
      deviceFingerprint: string;
      name: string;
      email: string;
      savedToDatabase: boolean;
      warning?: string;
    };
  }>(res);
};

export type ManagerLiveOrder = {
  id: string;
  orderNumber: string;
  tableNumber: string;
  placedAt: string;
  orderedItems: string[];
  hasOrderNotes: boolean;
  orderNotes: string;
  status: "new" | "accepted" | "preparing" | "ready";
};

export type OutletOrderingSettingsApi = {
  branchCode: string;
  serviceStartTime: string;
  serviceEndTime: string;
  lastTakeawayTime: string;
  timezone: string;
  serviceHoursLabel: string;
  lastTakeawayLabel: string;
};

export const fetchOutletOrderingSettings = async (branchCode = DEFAULT_BRANCH_CODE) => {
  const res = await apiFetch(
    `${API_BASE}/manager/outlet-ordering-settings?branchCode=${encodeURIComponent(branchCode)}`,
  );
  return readJson<{ settings: OutletOrderingSettingsApi }>(res);
};

export const updateOutletOrderingSettingsApi = async (input: {
  serviceStartTime: string;
  serviceEndTime: string;
  lastTakeawayTime: string;
  branchCode?: string;
  timezone?: string;
}) => {
  const res = await apiFetch(`${API_BASE}/manager/outlet-ordering-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      branchCode: input.branchCode ?? DEFAULT_BRANCH_CODE,
      serviceStartTime: input.serviceStartTime,
      serviceEndTime: input.serviceEndTime,
      lastTakeawayTime: input.lastTakeawayTime,
      timezone: input.timezone,
    }),
  });
  return readJson<{ settings: OutletOrderingSettingsApi }>(res);
};
export const fetchManagerLiveOrders = async (branchCode = DEFAULT_BRANCH_CODE) => {
  const res = await apiFetch(
    `${API_BASE}/manager/live-orders?branchCode=${encodeURIComponent(branchCode)}`,
  );
  return readJson<{ orders: ManagerLiveOrder[] }>(res);
};

export const updateManagerOrderStatus = async (
  orderNumber: string,
  status: "accepted" | "preparing" | "ready",
  branchCode = DEFAULT_BRANCH_CODE,
) => {
  const res = await apiFetch(
    `${API_BASE}/manager/orders/${encodeURIComponent(orderNumber)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, branchCode }),
    },
  );
  return readJson<{
    order: { id: string; orderNumber: string; status: string };
  }>(res);
};

export const fetchOwnerCards = async (branchCode = DEFAULT_BRANCH_CODE) => {
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

export const fetchAdminEarnings = async (branchCode = DEFAULT_BRANCH_CODE) => {
  const params = new URLSearchParams({
    branchCode,
  });
  const res = await apiFetch(`${API_BASE}/dashboard/admin/earnings?${params.toString()}`);
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
  branchCode = DEFAULT_BRANCH_CODE,
  rangeDays = 30,
) => {
  const res = await apiFetch(
    `${API_BASE}/dashboard/owner/sales-trend?branchCode=${encodeURIComponent(
      branchCode,
    )}&rangeDays=${rangeDays}`,
  );
  return readJson<{ points: Array<{ date: string; sales: number; orders: number }> }>(res);
};

export const fetchOwnerTopItems = async (
  branchCode = DEFAULT_BRANCH_CODE,
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

export const fetchOwnerOrdersSummary = async (branchCode = DEFAULT_BRANCH_CODE) => {
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
  branchCode = DEFAULT_BRANCH_CODE,
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
  branchCode = DEFAULT_BRANCH_CODE,
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
      status: "Confirmed" | "Preparing" | "Completed";
      dateTime: string;
      completionPrepTime: string;
    }>;
  }>(res);
};

export const fetchOrderStatus = async (
  orderNumber: string,
  options?: { branchCode?: string; deviceFingerprint?: string },
) => {
  const params = new URLSearchParams();
  if (options?.branchCode) {
    params.set("branchCode", options.branchCode);
  }
  if (options?.deviceFingerprint) {
    params.set("deviceFingerprint", options.deviceFingerprint);
  }
  const query = params.toString();
  const res = await apiFetch(
    `${API_BASE}/orders/${encodeURIComponent(orderNumber)}/status${query ? `?${query}` : ""}`,
  );
  return readJson<{
    order: {
      id: string;
      orderNumber: string;
      status: "placed" | "confirmed" | "preparing" | "ready" | "served";
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

export const fetchOwnerTableManagement = async (branchCode = DEFAULT_BRANCH_CODE) => {
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
  branchCode = DEFAULT_BRANCH_CODE,
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

export const fetchManagerMenuItems = async (branchCode = DEFAULT_BRANCH_CODE) => {
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
  branchCode?: string;
}) => {
  const res = await apiFetch(
    `${API_BASE}/manager/menu-items/${encodeURIComponent(input.itemId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: input.price,
        available: input.available,
        branchCode: input.branchCode ?? DEFAULT_BRANCH_CODE,
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

export const fetchManagerTableManagement = async (branchCode = DEFAULT_BRANCH_CODE) => {
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
  branchCode = DEFAULT_BRANCH_CODE,
) => {
  const res = await apiFetch(
    `${API_BASE}/manager/tables/${encodeURIComponent(tableId)}/availability`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability, branchCode }),
    },
  );
  return readJson<{ table: { id: string; status: string } }>(res);
};

export const fetchAdminQrCodes = async (branchCode = DEFAULT_BRANCH_CODE) => {
  const res = await apiFetch(
    `${API_BASE}/admin/qr-codes?branchCode=${encodeURIComponent(branchCode)}`,
  );
  return readJson<{
    rows: Array<{
      id: string;
      tableNumber: number;
      tableLabel: string;
      qrType: "table" | "takeaway";
      targetUrl: string;
      createdAt: string;
    }>;
  }>(res);
};

export const createAdminQrCodeApi = async (
  tableNumber: number,
  branchCode = DEFAULT_BRANCH_CODE,
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
      qrType: "table" | "takeaway";
      targetUrl: string;
      createdAt: string;
    }>;
  }>(res);
};
export const createAdminTakeawayQrCodeApi = async (
  branchCode = DEFAULT_BRANCH_CODE,
) => {
  const res = await apiFetch(`${API_BASE}/admin/qr-codes/takeaway`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branchCode }),
  });
  return readJson<{
    rows: Array<{
      id: string;
      tableNumber: number;
      tableLabel: string;
      qrType: "table" | "takeaway";
      targetUrl: string;
      createdAt: string;
    }>;
    created: {
      id: string;
      tableNumber: number;
      tableLabel: string;
      qrType: "table" | "takeaway";
      targetUrl: string;
      createdAt: string;
    } | null;
  }>(res);
};
export const deleteAdminQrCodeApi = async (id: string) => {
  const res = await apiFetch(`${API_BASE}/admin/qr-codes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return readJson<{ ok: true }>(res);
};



export const fetchStaffSession = async () => {
  const res = await apiFetch(`${API_BASE}/auth/staff-session`);
  return readJson<{
    user: {
      id: string;
      email: string;
      displayName: string;
    };
    highestRole: "manager" | "owner" | "admin" | null;
    roles: Array<"manager" | "owner" | "admin">;
    outlets: Array<{
      outletId: string;
      branchCode: string;
      outletName: string;
      role: "manager" | "owner" | "admin";
    }>;
  }>(res);
};



