import { assertSupabaseAdmin } from "./supabase-admin.js";
import { randomUUID } from "crypto";

type MenuOptionValue = {
  label: string;
  priceDelta: number;
  priceOverride?: number | null;
  sortOrder: number;
};

type MenuOptionGroup = {
  name: string;
  inputType: "single" | "multi";
  pricingMode: "delta" | "absolute";
  required: boolean;
  minSelect: number;
  maxSelect?: number | null;
  sortOrder: number;
  values: MenuOptionValue[];
};

export type MenuItemCatalog = {
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
  optionGroups: MenuOptionGroup[];
};

export type MenuCatalogResponse = {
  outletId: string;
  branchCode: string;
  categories: Array<{ slug: string; name: string; sortOrder: number }>;
  items: MenuItemCatalog[];
};

const DEFAULT_BRANCH = "f7-islamabad";
const OUTLET_CACHE_TTL_MS = 5 * 60 * 1000;
const MENU_CATALOG_CACHE_TTL_MS = 2 * 60 * 1000;
const MENU_NAME_LOOKUP_CACHE_TTL_MS = 5 * 60 * 1000;

const OFFERED_MENU_ITEM_NAMES_BY_CATEGORY = {
  breakfast: [
    "Turkish Eggs",
    "Sunny Hummus Bowl",
    "Avocado Toast",
    "French Toast",
    "Steak & Eggs",
  ],
  salads: ["Golden Crunch", "Ceaser salad"],
  sandwiches: [
    "Grilled Chicken Pesto",
    "Mexi Beef Focaccia",
    "Sun Kissed Chicken",
    "Classic Club",
    "Focaccia Fillet",
    "Beef Melt",
  ],
  coffee: [
    "Espresso",
    "Cappuccino",
    "Macchiato",
    "Cortado",
    "Flat White",
    "Latte",
    "Spanish Latte",
    "French Vanilla Gingerbread",
    "Caramel Cinnamon",
    "Hazelnut",
    "Butter Scotch",
    "Tiramisu",
    "Coconut",
    "Mocha",
  ],
  "slow-bar": ["Tier 1", "Tier 2", "Tier 3"],
  "not-coffee": [
    "Hot/Iced Chocolate",
    "Sip Signature Chocolate",
    "Apple Mojito",
    "Raspberry Mojito",
    "Pina Coco and Green Apple Mojito",
    "Passion Fruit Mojito",
    "Lemon Iced Tea",
    "Peach Iced Tea",
  ],
  matcha: ["Matcha", "Spanish Matcha", "Stawberry Matcha", "Coconut Matcha"],
} as const;

const OFFERED_MENU_ITEM_LOOKUP = new Map<string, Set<string>>(
  Object.entries(OFFERED_MENU_ITEM_NAMES_BY_CATEGORY).map(([slug, names]) => [
    slug,
    new Set(names.map((name) => name.toLowerCase())),
  ]),
);

const isAllowedCatalogItem = (categorySlug: string, itemName: string) => {
  const allowedNames = OFFERED_MENU_ITEM_LOOKUP.get(categorySlug.toLowerCase());
  if (!allowedNames) return false;
  return allowedNames.has(itemName.toLowerCase());
};

type OutletRow = {
  id: string;
  branch_code: string;
};

const outletCache = new Map<string, { expiresAt: number; value: OutletRow }>();
const menuCatalogCache = new Map<
  string,
  { expiresAt: number; value: MenuCatalogResponse }
>();
const menuNameLookupCache = new Map<
  string,
  { expiresAt: number; value: Map<string, string> }
>();

let ordersHasCustomerAuthUserIdColumn: boolean | null = null;

const invalidateOutletDerivedCaches = (outletId: string) => {
  menuNameLookupCache.delete(outletId);
  outletCache.forEach((cachedOutlet, branchCode) => {
    if (cachedOutlet.value.id === outletId) {
      menuCatalogCache.delete(branchCode);
    }
  });
};

const hasOrdersCustomerAuthUserIdColumn = async () => {
  if (ordersHasCustomerAuthUserIdColumn !== null) {
    return ordersHasCustomerAuthUserIdColumn;
  }

  const supabase = assertSupabaseAdmin();
  const { error } = await supabase
    .from("orders")
    .select("customer_auth_user_id")
    .limit(1);

  if (error) {
    const message = String(error.message ?? "").toLowerCase();
    const isMissingColumn =
      message.includes("customer_auth_user_id") &&
      (message.includes("does not exist") || message.includes("column"));
    if (isMissingColumn) {
      ordersHasCustomerAuthUserIdColumn = false;
      return false;
    }

    console.warn(
      "Could not inspect orders.customer_auth_user_id column. Falling back to legacy identity mapping:",
      error.message,
    );
    ordersHasCustomerAuthUserIdColumn = false;
    return false;
  }

  ordersHasCustomerAuthUserIdColumn = true;
  return ordersHasCustomerAuthUserIdColumn;
};

export const getOutletByBranchCode = async (branchCode = DEFAULT_BRANCH) => {
  const now = Date.now();
  const cached = outletCache.get(branchCode);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const supabase = assertSupabaseAdmin();
  const { data, error } = await supabase
    .from("outlets")
    .select("id,branch_code")
    .eq("branch_code", branchCode)
    .single<OutletRow>();

  if (error || !data) {
    throw new Error(`Outlet not found for branch code "${branchCode}"`);
  }
  outletCache.set(branchCode, {
    expiresAt: now + OUTLET_CACHE_TTL_MS,
    value: data,
  });
  return data;
};

export const getMenuCatalogForBranch = async (
  branchCode = DEFAULT_BRANCH,
): Promise<MenuCatalogResponse> => {
  const now = Date.now();
  const cached = menuCatalogCache.get(branchCode);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);

  const { data: categories, error: categoriesError } = await supabase
    .from("menu_categories")
    .select("id,slug,name,sort_order,is_active")
    .eq("outlet_id", outlet.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }

  const categoryMap = new Map(
    (categories ?? []).map((row) => [
      row.id as string,
      {
        slug: row.slug as string,
        name: row.name as string,
        sortOrder: Number(row.sort_order ?? 0),
      },
    ]),
  );

  const { data: items, error: itemsError } = await supabase
    .from("menu_items")
    .select(
      "id,name,slug,description,image_url,base_price,is_price_on_request,is_available,sort_order,category_id",
    )
    .eq("outlet_id", outlet.id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const itemIds = (items ?? []).map((item) => item.id as string);
  const { data: groups, error: groupsError } = await supabase
    .from("menu_option_groups")
    .select(
      "id,menu_item_id,name,input_type,pricing_mode,required,min_select,max_select,sort_order,is_active",
    )
    .in("menu_item_id", itemIds.length ? itemIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (groupsError) {
    throw new Error(groupsError.message);
  }

  const groupIds = (groups ?? []).map((group) => group.id as string);
  const { data: values, error: valuesError } = await supabase
    .from("menu_option_values")
    .select(
      "option_group_id,label,price_delta,price_override,sort_order,is_active",
    )
    .in("option_group_id", groupIds.length ? groupIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (valuesError) {
    throw new Error(valuesError.message);
  }

  const valuesByGroup = new Map<string, MenuOptionValue[]>();
  for (const row of values ?? []) {
    const groupId = row.option_group_id as string;
    const current = valuesByGroup.get(groupId) ?? [];
    current.push({
      label: row.label as string,
      priceDelta: Number(row.price_delta ?? 0),
      priceOverride:
        row.price_override === null || row.price_override === undefined
          ? null
          : Number(row.price_override),
      sortOrder: Number(row.sort_order ?? 0),
    });
    valuesByGroup.set(groupId, current);
  }

  const groupsByItem = new Map<string, MenuOptionGroup[]>();
  for (const row of groups ?? []) {
    const itemId = row.menu_item_id as string;
    const current = groupsByItem.get(itemId) ?? [];
    current.push({
      name: row.name as string,
      inputType: (row.input_type as "single" | "multi") ?? "single",
      pricingMode: (row.pricing_mode as "delta" | "absolute") ?? "delta",
      required: Boolean(row.required),
      minSelect: Number(row.min_select ?? 0),
      maxSelect:
        row.max_select === null || row.max_select === undefined
          ? null
          : Number(row.max_select),
      sortOrder: Number(row.sort_order ?? 0),
      values: valuesByGroup.get(row.id as string) ?? [],
    });
    groupsByItem.set(itemId, current);
  }

  const catalogItems: MenuItemCatalog[] = [];
  for (const item of items ?? []) {
    const category = categoryMap.get(item.category_id as string);
    if (!category) continue;
    if (!isAllowedCatalogItem(category.slug, item.name as string)) continue;
    catalogItems.push({
      id: item.id as string,
      name: item.name as string,
      slug: item.slug as string,
      description: (item.description as string | null) ?? null,
      imageUrl: (item.image_url as string | null) ?? null,
      basePrice: Number(item.base_price ?? 0),
      isPriceOnRequest: Boolean(item.is_price_on_request),
      isAvailable: Boolean(item.is_available),
      sortOrder: Number(item.sort_order ?? 0),
      categorySlug: category.slug,
      categoryName: category.name,
      optionGroups: groupsByItem.get(item.id as string) ?? [],
    });
  }

  const activeCategorySlugs = new Set(
    catalogItems.map((item) => item.categorySlug),
  );

  const response = {
    outletId: outlet.id,
    branchCode: outlet.branch_code,
    categories: Array.from(categoryMap.values())
      .filter((category) => activeCategorySlugs.has(category.slug))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    items: catalogItems,
  };
  menuCatalogCache.set(branchCode, {
    expiresAt: now + MENU_CATALOG_CACHE_TTL_MS,
    value: response,
  });
  return response;
};

type PlaceOrderItemInput = {
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
};

export type PlaceOrderInput = {
  branchCode?: string;
  tableNumber: number;
  deviceFingerprint?: string;
  customerAuthUserId?: string;
  customerName?: string;
  customerEmail?: string;
  notes?: string;
  tipAmount?: number;
  serviceFee?: number;
  gstAmount?: number;
  subtotal?: number;
  total?: number;
  items: PlaceOrderItemInput[];
};

export type PlacedOrderResponse = {
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

const sanitizeMoney = (value: number | undefined) =>
  Math.max(0, Math.round(Number(value || 0)));
const ORDER_DEDUP_WINDOW_MS = 10_000;

const normalizeOrderNotes = (value?: string | null) =>
  String(value ?? "").trim();

const toOrderItemsSignature = (
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    details?: string | null;
  }>,
) =>
  items
    .map((item) => {
      const name = String(item.name ?? "").trim().toLowerCase();
      const quantity = Math.max(1, Math.round(Number(item.quantity || 1)));
      const price = sanitizeMoney(Number(item.price || 0));
      const details = String(item.details ?? "").trim().toLowerCase();
      return `${name}|${quantity}|${price}|${details}`;
    })
    .sort()
    .join("||");

const normalizeMenuLookupKey = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  const base = trimmed.split(/\s\(|\s\+/)[0] ?? trimmed;
  return { trimmed, base: base.trim() };
};

const toCustomerTrackerStatus = (status: string) => {
  if (status === "confirmed" || status === "accepted") return "confirmed";
  if (status === "preparing") return "preparing";
  if (status === "ready") return "ready";
  if (status === "served" || status === "completed") return "served";
  return "placed";
};

const ensureDevice = async (deviceFingerprint?: string) => {
  if (!deviceFingerprint) return null;
  const supabase = assertSupabaseAdmin();

  const upsertBase = {
    device_fingerprint: deviceFingerprint,
    last_seen_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("customer_devices")
    .upsert(upsertBase, { onConflict: "device_fingerprint" })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }
  return data?.id ?? null;
};

const saveDeviceProfile = async (
  deviceFingerprint: string,
  input: { name?: string; email?: string },
) => {
  const supabase = assertSupabaseAdmin();
  const normalizedName = String(input.name ?? "").trim().slice(0, 64);
  const normalizedEmail = String(input.email ?? "").trim().toLowerCase().slice(0, 255);

  const fullPayload = {
    device_fingerprint: deviceFingerprint,
    display_name: normalizedName || null,
    email: normalizedEmail || null,
    last_seen_at: new Date().toISOString(),
  };

  const firstTry = await supabase
    .from("customer_devices")
    .upsert(fullPayload, { onConflict: "device_fingerprint" });
  if (!firstTry.error) {
    return { saved: true };
  }

  // Backward-compatible fallback if display_name/email columns are not present yet.
  const fallback = await supabase
    .from("customer_devices")
    .upsert(
      {
        device_fingerprint: deviceFingerprint,
        last_seen_at: fullPayload.last_seen_at,
      },
      { onConflict: "device_fingerprint" },
    );
  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return {
    saved: false,
    warning: "Profile columns are missing on customer_devices. Run supabase/04_customer_profile_columns.sql.",
  };
};

export const upsertCustomerDeviceProfile = async (input: {
  deviceFingerprint: string;
  name: string;
  email: string;
}) => {
  if (!input.deviceFingerprint) {
    throw new Error("deviceFingerprint is required");
  }
  const name = String(input.name ?? "").trim().slice(0, 64);
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!name) {
    throw new Error("name is required");
  }
  if (!email) {
    throw new Error("email is required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("email is invalid");
  }

  const result = await saveDeviceProfile(input.deviceFingerprint, { name, email });
  return {
    deviceFingerprint: input.deviceFingerprint,
    name,
    email,
    savedToDatabase: result.saved,
    warning: "warning" in result ? result.warning : undefined,
  };
};

const ensureTableAndSession = async (
  outletId: string,
  tableNumber: number,
  options?: { autoCreateTable?: boolean },
) => {
  const supabase = assertSupabaseAdmin();
  const autoCreateTable = Boolean(options?.autoCreateTable);
  let { data: table, error: tableError } = await supabase
    .from("restaurant_tables")
    .select("id,table_label,status")
    .eq("outlet_id", outletId)
    .eq("table_number", tableNumber)
    .single<{ id: string; table_label: string; status: string }>();

  if (autoCreateTable && tableError && tableError.code === "PGRST116") {
    const inserted = await supabase
      .from("restaurant_tables")
      .insert({
        outlet_id: outletId,
        table_number: tableNumber,
        status: "available",
        seats: 4,
      })
      .select("id,table_label,status")
      .single<{ id: string; table_label: string; status: string }>();
    table = inserted.data ?? null;
    tableError = inserted.error ?? null;
  }

  if (tableError || !table) {
    throw new Error(tableError?.message ?? "Unable to resolve table");
  }

  let { data: session, error: sessionError } = await supabase
    .from("table_sessions")
    .select("id")
    .eq("table_id", table.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    const insertedSession = await supabase
      .from("table_sessions")
      .insert({
        outlet_id: outletId,
        table_id: table.id,
        status: "active",
      })
      .select("id")
      .single<{ id: string }>();
    if (insertedSession.error || !insertedSession.data) {
      throw new Error(insertedSession.error?.message ?? "Unable to create table session");
    }
    session = insertedSession.data;
  }

  return {
    tableId: table.id,
    tableLabel: table.table_label,
    tableStatus: table.status,
    tableSessionId: session.id,
  };
};

export type PublicTableAccess = {
  tableNumber: number;
  tableLabel: string;
  tableStatus: string;
  hasQrCode: boolean;
  orderingEnabled: boolean;
  message: string;
};

export const getPublicTableAccess = async (
  branchCode = DEFAULT_BRANCH,
  tableNumber: number,
): Promise<PublicTableAccess> => {
  if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
    throw new Error("tableNumber must be a positive number.");
  }
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);

  const tableResult = await supabase
    .from("restaurant_tables")
    .select("id,table_label,status")
    .eq("outlet_id", outlet.id)
    .eq("table_number", Math.round(tableNumber))
    .maybeSingle<{ id: string; table_label: string; status: string }>();

  if (tableResult.error) {
    throw new Error(tableResult.error.message);
  }
  if (!tableResult.data) {
    return {
      tableNumber: Math.round(tableNumber),
      tableLabel: `Table${Math.round(tableNumber)}`,
      tableStatus: "unknown",
      hasQrCode: false,
      orderingEnabled: false,
      message: "This table is not configured in the restaurant.",
    };
  }

  const table = tableResult.data;
  const qrResult = await supabase
    .from("table_qr_codes")
    .select("id")
    .eq("outlet_id", outlet.id)
    .eq("table_id", table.id)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (qrResult.error) {
    throw new Error(qrResult.error.message);
  }

  const hasQrCode = Boolean(qrResult.data?.id);
  const normalizedStatus = String(table.status ?? "available").toLowerCase();

  if (!hasQrCode) {
    return {
      tableNumber: Math.round(tableNumber),
      tableLabel: table.table_label,
      tableStatus: normalizedStatus,
      hasQrCode: false,
      orderingEnabled: false,
      message: "QR for this table is not active. Please contact staff.",
    };
  }

  if (normalizedStatus === "unavailable") {
    return {
      tableNumber: Math.round(tableNumber),
      tableLabel: table.table_label,
      tableStatus: normalizedStatus,
      hasQrCode: true,
      orderingEnabled: false,
      message:
        "This table has been marked unavailable and cannot be used to place an order.",
    };
  }

  return {
    tableNumber: Math.round(tableNumber),
    tableLabel: table.table_label,
    tableStatus: normalizedStatus,
    hasQrCode: true,
    orderingEnabled: true,
    message: "Table is active for ordering.",
  };
};

export const checkInTableFromQr = async (
  branchCode = DEFAULT_BRANCH,
  tableNumber: number,
) => {
  const access = await getPublicTableAccess(branchCode, tableNumber);
  if (!access.orderingEnabled) {
    throw new Error(access.message);
  }

  const outlet = await getOutletByBranchCode(branchCode);
  const session = await ensureTableAndSession(
    outlet.id,
    Math.round(tableNumber),
    { autoCreateTable: false },
  );

  return {
    tableId: session.tableId,
    tableLabel: session.tableLabel,
    tableSessionId: session.tableSessionId,
  };
};

const getMenuNameLookupForOutlet = async (outletId: string) => {
  const now = Date.now();
  const cached = menuNameLookupCache.get(outletId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const supabase = assertSupabaseAdmin();
  const { data, error } = await supabase
    .from("menu_items")
    .select("id,name")
    .eq("outlet_id", outletId);

  if (error) {
    throw new Error(error.message);
  }

  const lookup = new Map<string, string>();
  for (const row of data ?? []) {
    const key = String(row.name ?? "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    lookup.set(key, String(row.id));
  }

  menuNameLookupCache.set(outletId, {
    expiresAt: now + MENU_NAME_LOOKUP_CACHE_TTL_MS,
    value: lookup,
  });

  return lookup;
};

export const placeOrderInSupabase = async (
  input: PlaceOrderInput,
): Promise<PlacedOrderResponse> => {
  const supabase = assertSupabaseAdmin();
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("At least one item is required.");
  }
  if (!Number.isFinite(input.tableNumber) || input.tableNumber <= 0) {
    throw new Error("tableNumber must be a positive number.");
  }

  const branchCode = input.branchCode || DEFAULT_BRANCH;
  const outlet = await getOutletByBranchCode(branchCode);
  const tableNumber = Math.round(input.tableNumber);
  const tableAccess = await getPublicTableAccess(branchCode, tableNumber);
  const normalizedCustomerAuthUserId =
    String(input.customerAuthUserId ?? "").trim() || null;
  const hasAuthUserColumn = await hasOrdersCustomerAuthUserIdColumn();
  if (!tableAccess.orderingEnabled) {
    throw new Error(tableAccess.message);
  }
  const deviceId = await ensureDevice(input.deviceFingerprint);
  if (input.deviceFingerprint) {
    try {
      await saveDeviceProfile(input.deviceFingerprint, {
        name: input.customerName,
        email: input.customerEmail,
      });
    } catch (error) {
      console.warn("Customer profile save skipped:", error);
    }
  }
  const table = await ensureTableAndSession(outlet.id, tableNumber, {
    autoCreateTable: false,
  });
  const menuNameLookup = await getMenuNameLookupForOutlet(outlet.id);
  const menuRows = input.items.map((row) => {
    const normalizedName = normalizeMenuLookupKey(row.name);
    const menuItemId =
      row.menuItemId ??
      menuNameLookup.get(normalizedName.trimmed) ??
      menuNameLookup.get(normalizedName.base) ??
      null;
    return {
      row,
      menuItemId,
    };
  });

  if (menuRows.some((entry) => !entry.menuItemId)) {
    const firstUnknown = menuRows.find((entry) => !entry.menuItemId);
    throw new Error(
      `Item "${firstUnknown?.row.name ?? "Unknown"}" is not available on the menu anymore.`,
    );
  }

  const menuItemIds = menuRows.map((entry) => entry.menuItemId as string);
  const availabilityResult = await supabase
    .from("menu_items")
    .select("id,name,base_price,is_available")
    .eq("outlet_id", outlet.id)
    .in("id", menuItemIds);

  if (availabilityResult.error) {
    throw new Error(availabilityResult.error.message);
  }

  const availabilityById = new Map<
    string,
    { name: string; basePrice: number; isAvailable: boolean }
  >();
  for (const row of availabilityResult.data ?? []) {
    availabilityById.set(String(row.id), {
      name: String(row.name ?? ""),
      basePrice: sanitizeMoney(Number(row.base_price ?? 0)),
      isAvailable: Boolean(row.is_available),
    });
  }

  const tipAmount = sanitizeMoney(input.tipAmount);
  const serviceFee = sanitizeMoney(input.serviceFee);
  const gstAmount = sanitizeMoney(input.gstAmount);
  const preparedItems = menuRows.map(({ row, menuItemId }) => {
    const menuItemMeta = availabilityById.get(menuItemId as string);
    if (!menuItemMeta) {
      throw new Error(`Item "${row.name}" could not be verified.`);
    }
    if (!menuItemMeta.isAvailable) {
      throw new Error(`Item "${menuItemMeta.name || row.name}" is currently unavailable.`);
    }

    const quantity = Math.max(1, Math.round(Number(row.quantity || 1)));
    const unitPrice = sanitizeMoney(menuItemMeta.basePrice);
    const options = Array.isArray(row.options) ? row.options : [];
    const optionsTotal = options.reduce((sum, option) => {
      const delta =
        option.priceOverride !== null && option.priceOverride !== undefined
          ? sanitizeMoney(option.priceOverride)
          : sanitizeMoney(option.priceDelta);
      return sum + delta;
    }, 0);

    return {
      row,
      menuItemId: menuItemId as string,
      quantity,
      unitPrice,
      options,
      optionsTotal,
      lineTotal: (unitPrice + optionsTotal) * quantity,
    };
  });

  const subtotalCalculated = preparedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );
  const subtotal =
    input.subtotal !== undefined
      ? sanitizeMoney(input.subtotal)
      : subtotalCalculated;
  const total =
    input.total !== undefined
      ? sanitizeMoney(input.total)
      : subtotal + tipAmount + serviceFee + gstAmount;

  const requestedItemsSignature = toOrderItemsSignature(
    preparedItems.map((item) => ({
      name: item.row.name,
      quantity: item.quantity,
      price: item.unitPrice,
      details: item.row.details || "",
    })),
  );

  const duplicateGuardQuery = await supabase
    .from("orders")
    .select(
      "id,order_number,status,subtotal,tip_amount,service_fee,tax_amount,total_amount,notes,placed_at,customer_device_id,customer_auth_user_id,order_items(item_name_snapshot,quantity,unit_price,special_instructions)",
    )
    .eq("outlet_id", outlet.id)
    .eq("table_id", table.tableId)
    .eq("table_session_id", table.tableSessionId)
    .order("placed_at", { ascending: false })
    .limit(8);

  if (duplicateGuardQuery.error) {
    throw new Error(duplicateGuardQuery.error.message);
  }

  type DuplicateGuardOrderItemRow = {
    item_name_snapshot: string | null;
    quantity: number | null;
    unit_price: number | null;
    special_instructions: string | null;
  };

  type DuplicateGuardOrderRow = {
    id: string;
    order_number: string;
    status: string;
    subtotal: number | null;
    tip_amount: number | null;
    service_fee: number | null;
    tax_amount: number | null;
    total_amount: number | null;
    notes: string | null;
    placed_at: string;
    customer_device_id: string | null;
    customer_auth_user_id: string | null;
    order_items: DuplicateGuardOrderItemRow[] | null;
  };

  const nowMs = Date.now();
  const requestedNotes = normalizeOrderNotes(input.notes);

  const existingDuplicate = (duplicateGuardQuery.data ?? [])
    .map((row) => row as unknown as DuplicateGuardOrderRow)
    .find((row) => {
      const placedAtMs = new Date(row.placed_at).getTime();
      if (!Number.isFinite(placedAtMs)) return false;
      if (nowMs - placedAtMs > ORDER_DEDUP_WINDOW_MS) return false;
      if (hasAuthUserColumn && normalizedCustomerAuthUserId) {
        if (
          String(row.customer_auth_user_id ?? "").trim() !==
          normalizedCustomerAuthUserId
        ) {
          return false;
        }
      } else if (deviceId && row.customer_device_id !== deviceId) return false;

      if (sanitizeMoney(Number(row.subtotal ?? 0)) !== subtotal) return false;
      if (sanitizeMoney(Number(row.tip_amount ?? 0)) !== tipAmount) return false;
      if (sanitizeMoney(Number(row.service_fee ?? 0)) !== serviceFee) return false;
      if (sanitizeMoney(Number(row.tax_amount ?? 0)) !== gstAmount) return false;
      if (sanitizeMoney(Number(row.total_amount ?? 0)) !== total) return false;
      if (normalizeOrderNotes(row.notes) !== requestedNotes) return false;

      const existingItemsSignature = toOrderItemsSignature(
        (row.order_items ?? []).map((item) => ({
          name: String(item.item_name_snapshot ?? ""),
          quantity: Math.max(1, Math.round(Number(item.quantity || 1))),
          price: sanitizeMoney(Number(item.unit_price ?? 0)),
          details: item.special_instructions ?? "",
        })),
      );

      return existingItemsSignature === requestedItemsSignature;
    });

  if (existingDuplicate) {
    return {
      id: existingDuplicate.id,
      orderNumber: existingDuplicate.order_number,
      tableLabel: table.tableLabel.replace("Table", "Table "),
      status: toCustomerTrackerStatus(existingDuplicate.status),
      subtotal: sanitizeMoney(Number(existingDuplicate.subtotal ?? subtotal)),
      tipAmount: sanitizeMoney(Number(existingDuplicate.tip_amount ?? tipAmount)),
      serviceFee: sanitizeMoney(Number(existingDuplicate.service_fee ?? serviceFee)),
      gstAmount: sanitizeMoney(Number(existingDuplicate.tax_amount ?? gstAmount)),
      total: sanitizeMoney(Number(existingDuplicate.total_amount ?? total)),
      notes: existingDuplicate.notes || "",
      items: (existingDuplicate.order_items ?? []).map((item) => ({
        name: String(item.item_name_snapshot ?? "Item"),
        quantity: Math.max(1, Math.round(Number(item.quantity || 1))),
        price: sanitizeMoney(Number(item.unit_price ?? 0)),
        details: String(item.special_instructions ?? ""),
      })),
    };
  }
  const insertOrder = await supabase
    .from("orders")
    .insert({
      ...(hasAuthUserColumn && normalizedCustomerAuthUserId
        ? { customer_auth_user_id: normalizedCustomerAuthUserId }
        : {}),
      outlet_id: outlet.id,
      table_id: table.tableId,
      table_session_id: table.tableSessionId,
      customer_device_id: deviceId,
      notes: input.notes || "",
      status: "placed",
      tip_amount: tipAmount,
      service_fee: serviceFee,
      tax_amount: gstAmount,
      subtotal,
      total_amount: total,
    })
    .select("id,order_number,status,subtotal,tip_amount,service_fee,tax_amount,total_amount,notes")
    .single<{
      id: string;
      order_number: string;
      status: string;
      subtotal: number;
      tip_amount: number;
      service_fee: number;
      tax_amount: number;
      total_amount: number;
      notes: string;
    }>();

  if (insertOrder.error || !insertOrder.data) {
    throw new Error(insertOrder.error?.message ?? "Unable to create order");
  }

  const orderId = insertOrder.data.id;
  const insertedItems: PlacedOrderResponse["items"] = [];
  for (const item of preparedItems) {
    const { row, quantity, unitPrice, options, optionsTotal, menuItemId } = item;

    const insertOrderItem = await supabase
      .from("order_items")
      .insert({
        order_id: orderId,
        menu_item_id: menuItemId,
        item_name_snapshot: row.name,
        unit_price: unitPrice,
        options_total: optionsTotal,
        quantity,
        special_instructions: row.details || "",
      })
      .select("id,line_total")
      .single<{ id: string; line_total: number }>();

    if (insertOrderItem.error || !insertOrderItem.data) {
      throw new Error(insertOrderItem.error?.message ?? "Unable to insert order item");
    }

    if (options.length) {
      const optionRows = options.map((option) => ({
        order_item_id: insertOrderItem.data!.id,
        option_group_name: option.groupName,
        option_label: option.label,
        price_delta: sanitizeMoney(option.priceDelta),
        price_override:
          option.priceOverride === null || option.priceOverride === undefined
            ? null
            : sanitizeMoney(option.priceOverride),
      }));

      const insertedOptions = await supabase
        .from("order_item_options")
        .insert(optionRows);
      if (insertedOptions.error) {
        throw new Error(insertedOptions.error.message);
      }
    }

    insertedItems.push({
      name: row.name,
      quantity,
      price: unitPrice,
      details: row.details || "",
    });
  }

  return {
    id: insertOrder.data.id,
    orderNumber: insertOrder.data.order_number,
    tableLabel: table.tableLabel.replace("Table", "Table "),
    status: toCustomerTrackerStatus(insertOrder.data.status),
    subtotal: Number(insertOrder.data.subtotal ?? subtotal),
    tipAmount: Number(insertOrder.data.tip_amount ?? tipAmount),
    serviceFee: Number(insertOrder.data.service_fee ?? serviceFee),
    gstAmount: Number(insertOrder.data.tax_amount ?? gstAmount),
    total: Number(insertOrder.data.total_amount ?? total),
    notes: insertOrder.data.notes || "",
    items: insertedItems,
  };
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

const toManagerStatus = (status: string): ManagerLiveOrder["status"] => {
  if (status === "accepted" || status === "confirmed") return "accepted";
  if (status === "preparing") return "preparing";
  if (status === "ready" || status === "served" || status === "completed") return "ready";
  return "new";
};

export const getManagerLiveOrders = async (branchCode = DEFAULT_BRANCH) => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);

  const { data: orderRows, error } = await supabase
    .from("orders")
    .select(
      "id,order_number,status,placed_at,notes,table_id,restaurant_tables(table_number),order_items(quantity,item_name_snapshot)",
    )
    .eq("outlet_id", outlet.id)
    .in("status", ["placed", "confirmed", "accepted", "preparing", "ready", "served", "completed"])
    .order("placed_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  type ManagerLiveOrderItemRow = {
    quantity: number | null;
    item_name_snapshot: string | null;
  };
  type ManagerLiveOrderTableRelation = { table_number: number | null } | null;
  type ManagerLiveOrderRow = {
    id: string;
    order_number: string;
    status: string;
    placed_at: string;
    notes: string | null;
    restaurant_tables: ManagerLiveOrderTableRelation | ManagerLiveOrderTableRelation[];
    order_items: ManagerLiveOrderItemRow[] | null;
  };

  const list: ManagerLiveOrder[] = (orderRows ?? []).map((row) => {
    const typedRow = row as unknown as ManagerLiveOrderRow;
    const itemRows = Array.isArray(typedRow.order_items) ? typedRow.order_items : [];
    const orderedItems = itemRows.map(
      (item) => `${Number(item.quantity ?? 1)}x ${String(item.item_name_snapshot ?? "Item")}`,
    );
    const orderNotes = String(typedRow.notes ?? "").trim();

    const tableRelation = Array.isArray(typedRow.restaurant_tables)
      ? typedRow.restaurant_tables[0]
      : typedRow.restaurant_tables;

    return {
      id: typedRow.id,
      orderNumber: typedRow.order_number,
      tableNumber: `T-${String(tableRelation?.table_number ?? 0).padStart(2, "0")}`,
      placedAt: typedRow.placed_at,
      orderedItems,
      hasOrderNotes: Boolean(orderNotes),
      orderNotes,
      status: toManagerStatus(typedRow.status),
    };
  });

  return list;
};

const managerToDbStatus: Record<string, string> = {
  new: "placed",
  accepted: "accepted",
  preparing: "preparing",
  ready: "ready",
};

export const updateOrderStatusFromManager = async (input: {
  orderNumber: string;
  status: "accepted" | "preparing" | "ready";
  branchCode?: string;
}) => {
  const supabase = assertSupabaseAdmin();
  const dbStatus = managerToDbStatus[input.status];
  if (!dbStatus) {
    throw new Error("Invalid status update");
  }

  const normalizedLookup = input.orderNumber.trim();
  if (!normalizedLookup) {
    throw new Error("Order number is required");
  }

  const outlet = await getOutletByBranchCode(input.branchCode || DEFAULT_BRANCH);
  const selectCols = "id,order_number,status,placed_at";

  const byOrderNumber = await supabase
    .from("orders")
    .update({ status: dbStatus })
    .eq("outlet_id", outlet.id)
    .eq("order_number", normalizedLookup)
    .select(selectCols)
    .order("placed_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      order_number: string;
      status: string;
      placed_at: string;
    }>();

  if (byOrderNumber.error) {
    throw new Error(byOrderNumber.error.message);
  }

  let data = byOrderNumber.data;

  if (!data && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedLookup)) {
    const byId = await supabase
      .from("orders")
      .update({ status: dbStatus })
      .eq("outlet_id", outlet.id)
      .eq("id", normalizedLookup)
      .select(selectCols)
      .order("placed_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        order_number: string;
        status: string;
        placed_at: string;
      }>();

    if (byId.error) {
      throw new Error(byId.error.message);
    }

    data = byId.data;
  }

  if (!data) {
    throw new Error("Unable to update order status");
  }

  return {
    id: data.id,
    orderNumber: data.order_number,
    status: toCustomerTrackerStatus(data.status),
  };
};
export const getOrderTrackerStatus = async (orderNumber: string) => {
  const supabase = assertSupabaseAdmin();
  const normalizedLookup = orderNumber.trim();
  if (!normalizedLookup) {
    throw new Error("Order number is required");
  }

  const selectCols = "id,order_number,status,placed_at";

  const byOrderNumber = await supabase
    .from("orders")
    .select(selectCols)
    .eq("order_number", normalizedLookup)
    .order("placed_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      order_number: string;
      status: string;
      placed_at: string;
    }>();

  if (byOrderNumber.error) {
    throw new Error(byOrderNumber.error.message);
  }

  let data = byOrderNumber.data;

  if (!data && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedLookup)) {
    const byId = await supabase
      .from("orders")
      .select(selectCols)
      .eq("id", normalizedLookup)
      .order("placed_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        order_number: string;
        status: string;
        placed_at: string;
      }>();

    if (byId.error) {
      throw new Error(byId.error.message);
    }

    data = byId.data;
  }

  if (!data) {
    throw new Error("Order not found");
  }

  return {
    id: data.id,
    orderNumber: data.order_number,
    status: toCustomerTrackerStatus(data.status),
  };
};

export const getOrderTrackerStatusForCustomer = async (input: {
  orderNumber: string;
  customerAuthUserId: string;
  customerEmail?: string;
  deviceFingerprint?: string;
  branchCode?: string;
}) => {
  const supabase = assertSupabaseAdmin();
  const normalizedLookup = input.orderNumber.trim();
  const normalizedAuthUserId = String(input.customerAuthUserId ?? "").trim();
  const normalizedEmail = String(input.customerEmail ?? "").trim().toLowerCase();

  if (!normalizedLookup) {
    throw new Error("Order number is required");
  }
  if (!normalizedAuthUserId && !normalizedEmail) {
    throw new Error("customerAuthUserId or customerEmail is required");
  }

  const outlet = await getOutletByBranchCode(input.branchCode || DEFAULT_BRANCH);
  const selectCols = "id,order_number,status,placed_at";

  const hasAuthUserColumn = await hasOrdersCustomerAuthUserIdColumn();
  if (hasAuthUserColumn && normalizedAuthUserId) {
    const byUserAndOrderNumber = await supabase
      .from("orders")
      .select(selectCols)
      .eq("outlet_id", outlet.id)
      .eq("customer_auth_user_id", normalizedAuthUserId)
      .eq("order_number", normalizedLookup)
      .order("placed_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        order_number: string;
        status: string;
        placed_at: string;
      }>();

    if (byUserAndOrderNumber.error) {
      throw new Error(byUserAndOrderNumber.error.message);
    }

    let userData = byUserAndOrderNumber.data;

    if (!userData && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedLookup)) {
      const byUserAndOrderId = await supabase
        .from("orders")
        .select(selectCols)
        .eq("outlet_id", outlet.id)
        .eq("customer_auth_user_id", normalizedAuthUserId)
        .eq("id", normalizedLookup)
        .order("placed_at", { ascending: false })
        .limit(1)
        .maybeSingle<{
          id: string;
          order_number: string;
          status: string;
          placed_at: string;
        }>();

      if (byUserAndOrderId.error) {
        throw new Error(byUserAndOrderId.error.message);
      }
      userData = byUserAndOrderId.data;
    }

    if (userData) {
      return {
        id: userData.id,
        orderNumber: userData.order_number,
        status: toCustomerTrackerStatus(userData.status),
      };
    }
  }

  const deviceIds = new Set<string>();

  if (normalizedEmail) {
    const byEmail = await supabase
      .from("customer_devices")
      .select("id")
      .eq("email", normalizedEmail);
    if (byEmail.error) {
      throw new Error(byEmail.error.message);
    }
    for (const row of byEmail.data ?? []) {
      const id = String(row.id ?? "").trim();
      if (id) {
        deviceIds.add(id);
      }
    }
  }

  const normalizedFingerprint = String(input.deviceFingerprint ?? "").trim();
  if (normalizedFingerprint) {
    const byFingerprint = await supabase
      .from("customer_devices")
      .select("id")
      .eq("device_fingerprint", normalizedFingerprint)
      .maybeSingle<{ id: string }>();

    if (byFingerprint.error) {
      throw new Error(byFingerprint.error.message);
    }
    if (byFingerprint.data?.id) {
      deviceIds.add(String(byFingerprint.data.id));
    }
  }

  if (!deviceIds.size) {
    throw new Error("Order not found");
  }

  const byOrderNumber = await supabase
    .from("orders")
    .select(selectCols)
    .eq("outlet_id", outlet.id)
    .eq("order_number", normalizedLookup)
    .in("customer_device_id", Array.from(deviceIds))
    .order("placed_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      order_number: string;
      status: string;
      placed_at: string;
    }>();

  if (byOrderNumber.error) {
    throw new Error(byOrderNumber.error.message);
  }

  let data = byOrderNumber.data;

  if (!data && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedLookup)) {
    const byId = await supabase
      .from("orders")
      .select(selectCols)
      .eq("outlet_id", outlet.id)
      .eq("id", normalizedLookup)
      .in("customer_device_id", Array.from(deviceIds))
      .order("placed_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        order_number: string;
        status: string;
        placed_at: string;
      }>();

    if (byId.error) {
      throw new Error(byId.error.message);
    }

    data = byId.data;
  }

  if (!data) {
    throw new Error("Order not found");
  }

  return {
    id: data.id,
    orderNumber: data.order_number,
    status: toCustomerTrackerStatus(data.status),
  };
};
export type CustomerOrderHistoryItem = {
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

type HistoryOrderItemRow = {
  item_name_snapshot: string | null;
  quantity: number | null;
  unit_price: number | null;
  special_instructions: string | null;
};

type HistoryTableRelation = { table_label: string | null } | null;

type HistoryOrderRow = {
  order_number: string;
  status: string;
  notes: string | null;
  subtotal: number | null;
  tip_amount: number | null;
  service_fee: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  placed_at: string;
  restaurant_tables: HistoryTableRelation | HistoryTableRelation[];
  order_items: HistoryOrderItemRow[] | null;
};

const mapHistoryRowsToCustomerOrders = (
  rows: HistoryOrderRow[],
): CustomerOrderHistoryItem[] =>
  rows.map((row) => {
    const tableRelation = Array.isArray(row.restaurant_tables)
      ? row.restaurant_tables[0]
      : row.restaurant_tables;
    const itemRows = Array.isArray(row.order_items) ? row.order_items : [];

    return {
      orderNumber: String(row.order_number),
      tableLabel: String(tableRelation?.table_label ?? "Table"),
      status: toCustomerTrackerStatus(String(row.status)) as
        | "placed"
        | "confirmed"
        | "preparing"
        | "ready"
        | "served",
      notes: String(row.notes ?? ""),
      subtotal: Number(row.subtotal ?? 0),
      tipAmount: Number(row.tip_amount ?? 0),
      serviceFee: Number(row.service_fee ?? 0),
      gstAmount: Number(row.tax_amount ?? 0),
      total: Number(row.total_amount ?? 0),
      placedAt: String(row.placed_at),
      items: itemRows.map((item) => ({
        name: String(item.item_name_snapshot ?? "Item"),
        quantity: Number(item.quantity ?? 1),
        price: Number(item.unit_price ?? 0),
        details: String(item.special_instructions ?? ""),
      })),
    };
  });

const getCustomerOrderHistoryByDeviceIds = async (input: {
  outletId: string;
  deviceIds: string[];
  limit?: number;
}): Promise<CustomerOrderHistoryItem[]> => {
  const deviceIds = Array.from(
    new Set(
      input.deviceIds
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );
  if (!deviceIds.length) {
    return [];
  }

  const supabase = assertSupabaseAdmin();
  const safeLimit = Math.min(Math.max(Math.round(Number(input.limit ?? 200)), 1), 1000);

  const { data, error } = await supabase
    .from("orders")
    .select(
      "order_number,status,notes,subtotal,tip_amount,service_fee,tax_amount,total_amount,placed_at,restaurant_tables(table_label),order_items(item_name_snapshot,quantity,unit_price,special_instructions)",
    )
    .eq("outlet_id", input.outletId)
    .in("customer_device_id", deviceIds)
    .order("placed_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(error.message);
  }

  return mapHistoryRowsToCustomerOrders((data ?? []) as unknown as HistoryOrderRow[]);
};

export const getCustomerOrderHistoryByDevice = async (input: {
  deviceFingerprint: string;
  branchCode?: string;
  limit?: number;
}): Promise<CustomerOrderHistoryItem[]> => {
  if (!input.deviceFingerprint) {
    throw new Error("deviceFingerprint is required");
  }
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(input.branchCode || DEFAULT_BRANCH);

  const deviceLookup = await supabase
    .from("customer_devices")
    .select("id")
    .eq("device_fingerprint", input.deviceFingerprint)
    .maybeSingle<{ id: string }>();
  if (deviceLookup.error) {
    throw new Error(deviceLookup.error.message);
  }
  if (!deviceLookup.data?.id) {
    return [];
  }

  return getCustomerOrderHistoryByDeviceIds({
    outletId: outlet.id,
    deviceIds: [deviceLookup.data.id],
    limit: input.limit,
  });
};

const getCustomerOrderHistoryByAuthUserId = async (input: {
  outletId: string;
  customerAuthUserId: string;
  limit?: number;
}): Promise<CustomerOrderHistoryItem[]> => {
  const normalizedAuthUserId = String(input.customerAuthUserId || "").trim();
  if (!normalizedAuthUserId) {
    return [];
  }

  if (!(await hasOrdersCustomerAuthUserIdColumn())) {
    return [];
  }

  const supabase = assertSupabaseAdmin();
  const safeLimit = Math.min(Math.max(Math.round(Number(input.limit ?? 200)), 1), 1000);

  const { data, error } = await supabase
    .from("orders")
    .select(
      "order_number,status,notes,subtotal,tip_amount,service_fee,tax_amount,total_amount,placed_at,restaurant_tables(table_label),order_items(item_name_snapshot,quantity,unit_price,special_instructions)",
    )
    .eq("outlet_id", input.outletId)
    .eq("customer_auth_user_id", normalizedAuthUserId)
    .order("placed_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(error.message);
  }

  return mapHistoryRowsToCustomerOrders((data ?? []) as unknown as HistoryOrderRow[]);
};

export const getCustomerOrderHistoryForAccount = async (input: {
  customerAuthUserId: string;
  customerEmail?: string;
  branchCode?: string;
  limit?: number;
}): Promise<CustomerOrderHistoryItem[]> => {
  const normalizedAuthUserId = String(input.customerAuthUserId ?? "").trim();
  if (!normalizedAuthUserId) {
    throw new Error("customerAuthUserId is required");
  }

  const outlet = await getOutletByBranchCode(input.branchCode || DEFAULT_BRANCH);
  const safeLimit = Math.min(Math.max(Math.round(Number(input.limit ?? 200)), 1), 1000);

  const byAuthId = await getCustomerOrderHistoryByAuthUserId({
    outletId: outlet.id,
    customerAuthUserId: normalizedAuthUserId,
    limit: safeLimit,
  });

  const byEmail = input.customerEmail
    ? await getCustomerOrderHistoryByCustomerEmail({
        customerEmail: input.customerEmail,
        branchCode: input.branchCode,
        limit: safeLimit,
      })
    : [];

  const merged = [...byAuthId, ...byEmail].sort(
    (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime(),
  );

  const seen = new Set<string>();
  return merged
    .filter((order) => {
      if (seen.has(order.orderNumber)) return false;
      seen.add(order.orderNumber);
      return true;
    })
    .slice(0, safeLimit);
};

export const getCustomerOrderHistoryByCustomerEmail = async (input: {
  customerEmail: string;
  branchCode?: string;
  limit?: number;
}): Promise<CustomerOrderHistoryItem[]> => {
  const normalizedEmail = String(input.customerEmail ?? "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("customerEmail is required");
  }

  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(input.branchCode || DEFAULT_BRANCH);

  const deviceLookup = await supabase
    .from("customer_devices")
    .select("id")
    .eq("email", normalizedEmail);

  if (deviceLookup.error) {
    throw new Error(deviceLookup.error.message);
  }

  const deviceIds = (deviceLookup.data ?? [])
    .map((row) => String(row.id ?? "").trim())
    .filter(Boolean);

  return getCustomerOrderHistoryByDeviceIds({
    outletId: outlet.id,
    deviceIds,
    limit: input.limit,
  });
};
export const getOwnerDashboardCards = async (branchCode = DEFAULT_BRANCH) => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);

  const { data, error } = await supabase
    .from("v_owner_cards")
    .select(
      "total_orders,total_sales,average_order_value,in_progress_orders",
    )
    .eq("outlet_id", outlet.id)
    .maybeSingle<{
      total_orders: number;
      total_sales: number;
      average_order_value: number;
      in_progress_orders: number;
    }>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    totalOrders: Number(data?.total_orders ?? 0),
    totalSales: Number(data?.total_sales ?? 0),
    averageOrderValue: Number(data?.average_order_value ?? 0),
    inProgressOrders: Number(data?.in_progress_orders ?? 0),
  };
};

export const getOwnerSalesTrend = async (
  branchCode = DEFAULT_BRANCH,
  rangeDays = 30,
) => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);
  const safeRange = Math.max(1, Math.min(rangeDays, 90));

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - safeRange + 1);
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("orders")
    .select("placed_at,total_amount,status")
    .eq("outlet_id", outlet.id)
    .gte("placed_at", startDate.toISOString())
    .in("status", ["ready", "served", "completed"]);

  if (error) {
    throw new Error(error.message);
  }

  const salesByDay = new Map<string, number>();
  for (let i = 0; i < safeRange; i += 1) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    salesByDay.set(key, 0);
  }

  for (const row of data ?? []) {
    const dayKey = String(row.placed_at ?? "").slice(0, 10);
    if (!salesByDay.has(dayKey)) continue;
    salesByDay.set(dayKey, (salesByDay.get(dayKey) ?? 0) + Number(row.total_amount ?? 0));
  }

  return Array.from(salesByDay.entries()).map(([date, sales]) => ({
    date,
    sales: Math.round(sales),
  }));
};

export const getOwnerTopSellingItems = async (
  branchCode = DEFAULT_BRANCH,
  rangeDays = 30,
) => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Math.max(1, rangeDays) + 1);
  const yyyy = startDate.getFullYear();
  const mm = String(startDate.getMonth() + 1).padStart(2, "0");
  const dd = String(startDate.getDate()).padStart(2, "0");
  const isoDate = `${yyyy}-${mm}-${dd}`;

  const { data, error } = await supabase
    .from("v_top_selling_items")
    .select("item_name,quantity_sold,revenue_generated,sessions_ordered_in,sold_date")
    .eq("outlet_id", outlet.id)
    .gte("sold_date", isoDate);

  if (error) {
    throw new Error(error.message);
  }

  const aggregate = new Map<
    string,
    {
      itemName: string;
      quantitySold: number;
      revenueGenerated: number;
      sessionsOrderedIn: number;
      soldAt: string;
    }
  >();

  for (const row of data ?? []) {
    const key = row.item_name as string;
    const current =
      aggregate.get(key) ??
      ({
        itemName: key,
        quantitySold: 0,
        revenueGenerated: 0,
        sessionsOrderedIn: 0,
        soldAt: row.sold_date as string,
      } as const);

    aggregate.set(key, {
      itemName: key,
      quantitySold: current.quantitySold + Number(row.quantity_sold ?? 0),
      revenueGenerated:
        current.revenueGenerated + Number(row.revenue_generated ?? 0),
      sessionsOrderedIn:
        current.sessionsOrderedIn + Number(row.sessions_ordered_in ?? 0),
      soldAt: row.sold_date as string,
    });
  }

  return Array.from(aggregate.values())
    .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
    .slice(0, 20);
};

const inProgressStatuses = new Set(["placed", "confirmed", "accepted", "preparing"]);
const completedStatuses = new Set(["ready", "served", "completed"]);

const minutesBetween = (fromIso: string, toDate = new Date()) => {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return 0;
  const diffMs = Math.max(0, toDate.getTime() - from.getTime());
  return Math.round(diffMs / 60000);
};

const resolveCompletionDate = (updatedAtIso: unknown, fallback: Date) => {
  const value = typeof updatedAtIso === "string" ? updatedAtIso : "";
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const toOwnerOrderStatus = (status: string) => {
  if (status === "preparing") return "Preparing";
  if (status === "ready" || status === "served" || status === "completed") return "Completed";
  return "Confirmed";
};

export type OwnerOrdersSummary = {
  totalOrdersToday: number;
  totalOrdersDeltaPercent: number;
  inProgressCount: number;
  completedCount: number;
  completedRatePercent: number;
  averageOrderValue: number;
  averageOrderValueDeltaPercent: number;
  averageCompletionMinutes: number;
  averageCompletionDeltaMinutes: number;
};

export const getOwnerOrdersSummary = async (
  branchCode = DEFAULT_BRANCH,
): Promise<OwnerOrdersSummary> => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const twoDaysAgoStart = new Date(yesterdayStart);
  twoDaysAgoStart.setDate(twoDaysAgoStart.getDate() - 1);

  const { data, error } = await supabase
    .from("orders")
    .select("status,placed_at,updated_at,total_amount")
    .eq("outlet_id", outlet.id)
    .gte("placed_at", twoDaysAgoStart.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  let totalToday = 0;
  let totalYesterday = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let todaySales = 0;
  let yesterdaySales = 0;
  let todayCompletionMinutes = 0;
  let todayCompletionCount = 0;
  let yesterdayCompletionMinutes = 0;
  let yesterdayCompletionCount = 0;

  for (const row of data ?? []) {
    const status = String(row.status ?? "");
    const placedAt = String(row.placed_at ?? "");
    const placedDate = new Date(placedAt);
    if (Number.isNaN(placedDate.getTime())) continue;

    const isToday = placedDate >= todayStart;
    const isYesterday = placedDate >= yesterdayStart && placedDate < todayStart;
    const amount = Number(row.total_amount ?? 0);

    if (isToday) {
      totalToday += 1;
      if (inProgressStatuses.has(status)) inProgressCount += 1;
      if (completedStatuses.has(status)) completedCount += 1;
      todaySales += amount;
      if (completedStatuses.has(status)) {
        const completionDate = resolveCompletionDate(row.updated_at, now);
        todayCompletionMinutes += minutesBetween(placedAt, completionDate);
        todayCompletionCount += 1;
      }
    } else if (isYesterday) {
      totalYesterday += 1;
      yesterdaySales += amount;
      if (completedStatuses.has(status)) {
        const completionDate = resolveCompletionDate(row.updated_at, now);
        yesterdayCompletionMinutes += minutesBetween(placedAt, completionDate);
        yesterdayCompletionCount += 1;
      }
    }
  }

  const avgToday = totalToday > 0 ? todaySales / totalToday : 0;
  const avgYesterday = totalYesterday > 0 ? yesterdaySales / totalYesterday : 0;
  const avgCompletionToday =
    todayCompletionCount > 0
      ? Math.round(todayCompletionMinutes / todayCompletionCount)
      : 0;
  const avgCompletionYesterday =
    yesterdayCompletionCount > 0
      ? Math.round(yesterdayCompletionMinutes / yesterdayCompletionCount)
      : 0;

  const totalOrdersDeltaPercent =
    totalYesterday > 0
      ? Math.round(((totalToday - totalYesterday) / totalYesterday) * 100)
      : totalToday > 0
        ? 100
        : 0;

  const averageOrderValueDeltaPercent =
    avgYesterday > 0
      ? Number((((avgToday - avgYesterday) / avgYesterday) * 100).toFixed(1))
      : avgToday > 0
        ? 100
        : 0;

  return {
    totalOrdersToday: totalToday,
    totalOrdersDeltaPercent,
    inProgressCount,
    completedCount,
    completedRatePercent:
      totalToday > 0 ? Math.round((completedCount / totalToday) * 100) : 0,
    averageOrderValue: Math.round(avgToday),
    averageOrderValueDeltaPercent,
    averageCompletionMinutes: avgCompletionToday,
    averageCompletionDeltaMinutes: avgCompletionYesterday - avgCompletionToday,
  };
};

export type OwnerOrderTrendPoint = {
  label: string;
  orders: number;
};

export const getOwnerOrdersTrendByDay = async (
  branchCode = DEFAULT_BRANCH,
  rangeDays = 7,
) => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);
  const safeRange = Math.max(1, Math.min(rangeDays, 31));
  const start = new Date();
  start.setDate(start.getDate() - safeRange + 1);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("orders")
    .select("placed_at")
    .eq("outlet_id", outlet.id)
    .gte("placed_at", start.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map<string, number>();
  for (let i = 0; i < safeRange; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    counts.set(key, 0);
  }

  for (const row of data ?? []) {
    const key = String(row.placed_at ?? "").slice(0, 10);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries()).map(([key, value]) => {
    const date = new Date(`${key}T00:00:00`);
    return {
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      orders: value,
    };
  });
};

export const getOwnerOrdersTrendByHourToday = async (
  branchCode = DEFAULT_BRANCH,
) => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { data, error } = await supabase
    .from("orders")
    .select("placed_at")
    .eq("outlet_id", outlet.id)
    .gte("placed_at", todayStart.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map<number, number>();
  for (let hour = 0; hour < 24; hour += 1) {
    counts.set(hour, 0);
  }

  for (const row of data ?? []) {
    const placedAt = new Date(String(row.placed_at ?? ""));
    if (Number.isNaN(placedAt.getTime())) continue;
    const hour = placedAt.getHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([hour]) => hour >= 9 && hour <= 23)
    .map(([hour, count]) => ({
      label: new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", {
        hour: "numeric",
      }),
      orders: count,
    }));
};

export type OwnerOrderRow = {
  id: string;
  tableNumber: string;
  itemsCount: number;
  totalBill: number;
  status: "Confirmed" | "Preparing" | "Completed";
  dateTime: string;
  completionPrepTime: string;
};

export const getOwnerOrdersTable = async (
  branchCode = DEFAULT_BRANCH,
  rangeDays = 31,
) => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);
  const safeRange = Math.max(1, Math.min(rangeDays, 90));
  const start = new Date();
  start.setDate(start.getDate() - safeRange + 1);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("orders")
    .select(
      "order_number,status,placed_at,updated_at,total_amount,restaurant_tables(table_number),order_items(quantity)",
    )
    .eq("outlet_id", outlet.id)
    .gte("placed_at", start.toISOString())
    .order("placed_at", { ascending: false })
    .limit(250);

  if (error) {
    throw new Error(error.message);
  }

  const now = new Date();
  type OwnerOrdersTableItemRow = { quantity: number | null };
  type OwnerOrdersTableTableRelation = { table_number: number | null } | null;
  type OwnerOrdersTableRow = {
    order_number: string | null;
    status: string | null;
    placed_at: string | null;
    updated_at: string | null;
    total_amount: number | null;
    restaurant_tables: OwnerOrdersTableTableRelation | OwnerOrdersTableTableRelation[];
    order_items: OwnerOrdersTableItemRow[] | null;
  };

  return (data ?? []).map((row) => {
    const typedRow = row as unknown as OwnerOrdersTableRow;
    const items = Array.isArray(typedRow.order_items) ? typedRow.order_items : [];
    const itemsCount = items.reduce(
      (sum: number, item) => sum + Number(item.quantity ?? 0),
      0,
    );
    const tableRelation = Array.isArray(typedRow.restaurant_tables)
      ? typedRow.restaurant_tables[0]
      : typedRow.restaurant_tables;
    const tableNumber = Number(tableRelation?.table_number ?? 0);
    const placedAt = String(typedRow.placed_at ?? new Date().toISOString());
    const statusRaw = String(typedRow.status ?? "placed");
    const completionReference = completedStatuses.has(statusRaw)
      ? resolveCompletionDate(typedRow.updated_at, now)
      : now;
    const minutes = minutesBetween(placedAt, completionReference);
    const prepLabel = completedStatuses.has(statusRaw)
      ? `${minutes} min (completed)`
      : `${minutes} min (prep)`;

    return {
      id: String(typedRow.order_number ?? ""),
      tableNumber: `Table ${String(tableNumber).padStart(2, "0")}`,
      itemsCount,
      totalBill: Number(typedRow.total_amount ?? 0),
      status: toOwnerOrderStatus(statusRaw),
      dateTime: placedAt,
      completionPrepTime: prepLabel,
    } satisfies OwnerOrderRow;
  });
};

export type OutletOption = {
  id: string;
  branchCode: string;
  branchLabel: string;
  restaurantName: string;
};

const toTitleCaseBranch = (value: string) =>
  value
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(", ");

export const getOutletOptions = async (): Promise<OutletOption[]> => {
  const supabase = assertSupabaseAdmin();
  const { data, error } = await supabase
    .from("outlets")
    .select("id,branch_code,restaurants(name)")
    .order("branch_code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  type OutletOptionRow = {
    id: string | null;
    branch_code: string | null;
    restaurants: { name?: string | null } | Array<{ name?: string | null }> | null;
  };

  return (data ?? []).map((row) => {
    const typedRow = row as unknown as OutletOptionRow;
    const restaurantRelation = Array.isArray(typedRow.restaurants)
      ? typedRow.restaurants[0]
      : typedRow.restaurants;
    const branchCode = String(typedRow.branch_code ?? DEFAULT_BRANCH);
    return {
      id: String(typedRow.id),
      branchCode,
      branchLabel: toTitleCaseBranch(branchCode),
      restaurantName: String(restaurantRelation?.name ?? "Sip"),
    };
  });
};

export type AdminEarningsRow = {
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
};

export type AdminEarningsResponse = {
  summary: {
    thisMonthSales: number;
    thisMonthFee: number;
    ytdFee: number;
    pendingInvoiceCount: number;
    pendingInvoiceAmount: number;
  };
  rows: AdminEarningsRow[];
};

const toMonthKeyUtc = (isoDate: string) => {
  const date = new Date(isoDate);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const toMonthLabel = (monthKey: string) =>
  new Date(`${monthKey}-01T00:00:00.000Z`).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const roundMoney = (value: number) => Number(value.toFixed(2));

export const getAdminEarnings = async (): Promise<AdminEarningsResponse> => {
  const supabase = assertSupabaseAdmin();

  const now = new Date();
  const currentMonthStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const currentMonthKey = toMonthKeyUtc(currentMonthStartUtc.toISOString());

  const sinceDateUtc = new Date(currentMonthStartUtc);
  sinceDateUtc.setUTCMonth(sinceDateUtc.getUTCMonth() - 11);
  const sinceIso = sinceDateUtc.toISOString();

  const { data: outletRows, error: outletsError } = await supabase
    .from("outlets")
    .select("id,branch_code,restaurants(name)")
    .order("branch_code", { ascending: true });

  if (outletsError) {
    throw new Error(outletsError.message);
  }

  type AdminOutletRow = {
    id: string | null;
    branch_code: string | null;
    restaurants: { name?: string | null } | Array<{ name?: string | null }> | null;
  };

  const outletLookup = new Map<
    string,
    {
      restaurantName: string;
      branchCode: string;
      branchLabel: string;
    }
  >();

  for (const row of outletRows ?? []) {
    const typedRow = row as unknown as AdminOutletRow;
    const outletId = String(typedRow.id ?? "");
    if (!outletId) continue;
    const restaurantRelation = Array.isArray(typedRow.restaurants)
      ? typedRow.restaurants[0]
      : typedRow.restaurants;
    const branchCode = String(typedRow.branch_code ?? DEFAULT_BRANCH);
    outletLookup.set(outletId, {
      restaurantName: String(restaurantRelation?.name ?? "Sip"),
      branchCode,
      branchLabel: toTitleCaseBranch(branchCode),
    });
  }

  const outletIds = Array.from(outletLookup.keys());
  if (!outletIds.length) {
    return {
      summary: {
        thisMonthSales: 0,
        thisMonthFee: 0,
        ytdFee: 0,
        pendingInvoiceCount: 0,
        pendingInvoiceAmount: 0,
      },
      rows: [],
    };
  }

  const { data: orderRows, error: ordersError } = await supabase
    .from("orders")
    .select("outlet_id,placed_at,total_amount,status")
    .in("outlet_id", outletIds)
    .in("status", ["ready", "served", "completed"])
    .gte("placed_at", sinceIso);

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  type AdminEarningOrderRow = {
    outlet_id: string | null;
    placed_at: string | null;
    total_amount: number | null;
    status: string | null;
  };

  const aggregate = new Map<
    string,
    {
      outletId: string;
      monthKey: string;
      ordersCount: number;
      grossSales: number;
    }
  >();

  for (const row of orderRows ?? []) {
    const typedRow = row as unknown as AdminEarningOrderRow;
    const outletId = String(typedRow.outlet_id ?? "");
    const placedAt = String(typedRow.placed_at ?? "");
    if (!outletId || !placedAt || !outletLookup.has(outletId)) {
      continue;
    }

    const monthKey = toMonthKeyUtc(placedAt);
    const key = `${outletId}::${monthKey}`;
    const existing = aggregate.get(key) ?? {
      outletId,
      monthKey,
      ordersCount: 0,
      grossSales: 0,
    };
    existing.ordersCount += 1;
    existing.grossSales += Number(typedRow.total_amount ?? 0);
    aggregate.set(key, existing);
  }

  const rows: AdminEarningsRow[] = Array.from(aggregate.values())
    .map((entry) => {
      const outletMeta = outletLookup.get(entry.outletId);
      if (!outletMeta) return null;
      const tableTapFee = roundMoney(entry.grossSales * 0.01);
      const invoiceStatus: AdminEarningsRow["invoiceStatus"] =
        entry.monthKey === currentMonthKey ? "Current month" : "Ready to invoice";

      return {
        id: `${entry.outletId}-${entry.monthKey}`,
        outletId: entry.outletId,
        restaurantName: outletMeta.restaurantName,
        branchCode: outletMeta.branchCode,
        branchLabel: outletMeta.branchLabel,
        monthKey: entry.monthKey,
        monthLabel: toMonthLabel(entry.monthKey),
        ordersCount: entry.ordersCount,
        grossSales: roundMoney(entry.grossSales),
        tableTapFee,
        invoiceStatus,
      } satisfies AdminEarningsRow;
    })
    .filter((row): row is AdminEarningsRow => row !== null)
    .sort((a, b) => {
      if (a.monthKey !== b.monthKey) {
        return a.monthKey < b.monthKey ? 1 : -1;
      }
      if (a.restaurantName !== b.restaurantName) {
        return a.restaurantName.localeCompare(b.restaurantName);
      }
      return a.branchLabel.localeCompare(b.branchLabel);
    });

  const thisMonthSales = rows
    .filter((row) => row.monthKey === currentMonthKey)
    .reduce((sum, row) => sum + row.grossSales, 0);

  const currentYearPrefix = `${now.getUTCFullYear()}-`;
  const ytdFee = rows
    .filter((row) => row.monthKey.startsWith(currentYearPrefix))
    .reduce((sum, row) => sum + row.tableTapFee, 0);

  const pendingRows = rows.filter((row) => row.invoiceStatus === "Ready to invoice");
  const pendingInvoiceAmount = pendingRows.reduce(
    (sum, row) => sum + row.tableTapFee,
    0,
  );

  return {
    summary: {
      thisMonthSales: roundMoney(thisMonthSales),
      thisMonthFee: roundMoney(thisMonthSales * 0.01),
      ytdFee: roundMoney(ytdFee),
      pendingInvoiceCount: pendingRows.length,
      pendingInvoiceAmount: roundMoney(pendingInvoiceAmount),
    },
    rows,
  };
};

type DateRangeFilter = "today" | "this-week" | "this-month";

const getRangeStart = (range: DateRangeFilter) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today") {
    return todayStart;
  }
  if (range === "this-week") {
    const day = todayStart.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(todayStart);
    monday.setDate(monday.getDate() - diffToMonday);
    return monday;
  }
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
};

export type MenuInsightsRow = {
  itemName: string;
  quantitySold: number;
  revenue: number;
  avgOrderContribution: number;
};

export type MenuInsightsResponse = {
  categories: string[];
  totalItemsSold: number;
  bestSellingItem: { itemName: string; quantitySold: number } | null;
  highestRevenueItem: { itemName: string; revenue: number } | null;
  rows: MenuInsightsRow[];
};

export const getOwnerMenuInsights = async (
  branchCode = DEFAULT_BRANCH,
  dateRange: DateRangeFilter = "today",
  category = "all",
): Promise<MenuInsightsResponse> => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);
  const start = getRangeStart(dateRange).toISOString();

  const { data: orderRows, error: ordersError } = await supabase
    .from("orders")
    .select("id")
    .eq("outlet_id", outlet.id)
    .gte("placed_at", start);

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  const orderIds = (orderRows ?? []).map((row) => String(row.id));
  if (!orderIds.length) {
    return {
      categories: [],
      totalItemsSold: 0,
      bestSellingItem: null,
      highestRevenueItem: null,
      rows: [],
    };
  }

  const { data: rawItems, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id,menu_item_id,item_name_snapshot,quantity,line_total")
    .in("order_id", orderIds);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const menuIds = Array.from(
    new Set(
      (rawItems ?? [])
        .map((row) =>
          row.menu_item_id === null || row.menu_item_id === undefined
            ? null
            : String(row.menu_item_id),
        )
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const { data: menuRows, error: menuError } = await supabase
    .from("menu_items")
    .select("id,name,category_id,menu_categories(name)")
    .in("id", menuIds.length ? menuIds : ["00000000-0000-0000-0000-000000000000"]);

  if (menuError) {
    throw new Error(menuError.message);
  }

  const menuLookup = new Map<
    string,
    {
      name: string;
      category: string;
    }
  >();
  type MenuLookupRow = {
    id: string | null;
    name: string | null;
    menu_categories: { name?: string | null } | Array<{ name?: string | null }> | null;
  };
  for (const row of menuRows ?? []) {
    const typedRow = row as unknown as MenuLookupRow;
    const categoryRelation = Array.isArray(typedRow.menu_categories)
      ? typedRow.menu_categories[0]
      : typedRow.menu_categories;
    menuLookup.set(String(typedRow.id), {
      name: String(typedRow.name ?? ""),
      category: String(categoryRelation?.name ?? "Uncategorized"),
    });
  }

  const aggregate = new Map<
    string,
    {
      itemName: string;
      category: string;
      quantitySold: number;
      revenue: number;
      orderIds: Set<string>;
    }
  >();

  for (const row of rawItems ?? []) {
    const menuMeta =
      row.menu_item_id !== null && row.menu_item_id !== undefined
        ? menuLookup.get(String(row.menu_item_id))
        : undefined;
    const itemName = String(
      menuMeta?.name || row.item_name_snapshot || "Unknown Item",
    );
    const categoryName = String(menuMeta?.category || "Uncategorized");

    if (category !== "all" && categoryName !== category) {
      continue;
    }

    const key = `${categoryName}::${itemName}`;
    const existing = aggregate.get(key) ?? {
      itemName,
      category: categoryName,
      quantitySold: 0,
      revenue: 0,
      orderIds: new Set<string>(),
    };
    existing.quantitySold += Number(row.quantity ?? 0);
    existing.revenue += Number(row.line_total ?? 0);
    existing.orderIds.add(String(row.order_id));
    aggregate.set(key, existing);
  }

  const rows = Array.from(aggregate.values());
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const formattedRows: MenuInsightsRow[] = rows
    .map((row) => ({
      itemName: row.itemName,
      quantitySold: row.quantitySold,
      revenue: Math.round(row.revenue),
      avgOrderContribution:
        totalRevenue > 0 ? Number(((row.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const bestSellingItem = formattedRows.reduce<{
    itemName: string;
    quantitySold: number;
  } | null>((best, row) => {
    if (!best || row.quantitySold > best.quantitySold) {
      return { itemName: row.itemName, quantitySold: row.quantitySold };
    }
    return best;
  }, null);

  const highestRevenueItem = formattedRows.reduce<{
    itemName: string;
    revenue: number;
  } | null>((best, row) => {
    if (!best || row.revenue > best.revenue) {
      return { itemName: row.itemName, revenue: row.revenue };
    }
    return best;
  }, null);

  const categories = Array.from(new Set(rows.map((row) => row.category))).sort();
  return {
    categories,
    totalItemsSold: formattedRows.reduce((sum, row) => sum + row.quantitySold, 0),
    bestSellingItem,
    highestRevenueItem,
    rows: formattedRows,
  };
};

const toOrderStatusLabel = (status: string) => {
  if (status === "placed") return "New";
  if (status === "confirmed" || status === "accepted") return "Accepted";
  if (status === "preparing") return "Preparing";
  if (status === "ready") return "Ready";
  if (status === "served" || status === "completed") return "Served";
  return "No active order";
};

const toTableStatusLabel = (
  tableStatusRaw: string,
  hasActiveSession: boolean,
  latestOrderStatusRaw: string | null,
) => {
  const normalized = tableStatusRaw.toLowerCase();
  if (normalized === "unavailable") return "Unavailable";
  if (latestOrderStatusRaw && (latestOrderStatusRaw === "served" || latestOrderStatusRaw === "completed")) {
    return "Served";
  }
  if (
    hasActiveSession ||
    (latestOrderStatusRaw !== null &&
      ["placed", "confirmed", "accepted", "preparing", "ready"].includes(
        latestOrderStatusRaw,
      ))
  ) {
    return "Occupied";
  }
  return "Available";
};

export type TableSnapshotRow = {
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
};

export type TableSnapshotResponse = {
  cards: {
    totalTables: number;
    available: number;
    occupied: number;
    served: number;
    unavailable: number;
  };
  rows: TableSnapshotRow[];
};

export const getTableSnapshot = async (
  branchCode = DEFAULT_BRANCH,
): Promise<TableSnapshotResponse> => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);

  const { data: tableRows, error: tablesError } = await supabase
    .from("restaurant_tables")
    .select("id,table_number,table_label,status")
    .eq("outlet_id", outlet.id)
    .order("table_number", { ascending: true });
  if (tablesError) {
    throw new Error(tablesError.message);
  }

  const tableIds = (tableRows ?? []).map((row) => String(row.id));
  const { data: qrRows, error: qrError } = await supabase
    .from("table_qr_codes")
    .select("id,table_id")
    .eq("outlet_id", outlet.id)
    .in(
      "table_id",
      tableIds.length ? tableIds : ["00000000-0000-0000-0000-000000000000"],
    );
  if (qrError) {
    throw new Error(qrError.message);
  }
  const { data: activeSessions, error: sessionsError } = await supabase
    .from("table_sessions")
    .select("id,table_id,started_at,status")
    .eq("outlet_id", outlet.id)
    .eq("status", "active")
    .in("table_id", tableIds.length ? tableIds : ["00000000-0000-0000-0000-000000000000"]);
  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  const sessionIds = (activeSessions ?? []).map((row) => String(row.id));
  const { data: participantRows, error: participantsError } = await supabase
    .from("session_participants")
    .select("table_session_id")
    .in(
      "table_session_id",
      sessionIds.length ? sessionIds : ["00000000-0000-0000-0000-000000000000"],
    );
  if (participantsError) {
    throw new Error(participantsError.message);
  }

  const { data: orderRows, error: ordersError } = await supabase
    .from("orders")
    .select("id,order_number,table_id,table_session_id,status,total_amount,placed_at")
    .eq("outlet_id", outlet.id)
    .order("placed_at", { ascending: false })
    .limit(500);
  if (ordersError) {
    throw new Error(ordersError.message);
  }

  const orderIds = (orderRows ?? []).map((row) => String(row.id));
  const { data: orderItemRows, error: orderItemsError } = await supabase
    .from("order_items")
    .select("order_id,quantity,item_name_snapshot")
    .in("order_id", orderIds.length ? orderIds : ["00000000-0000-0000-0000-000000000000"]);
  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  type ActiveSessionRow = {
    id: string;
    table_id: string;
    started_at: string | null;
    status: string | null;
  };
  type LatestOrderRow = {
    id: string;
    order_number: string | null;
    table_id: string | null;
    table_session_id: string | null;
    status: string | null;
    total_amount: number | null;
    placed_at: string | null;
  };

  const activeSessionByTable = new Map<string, ActiveSessionRow>();
  for (const session of activeSessions ?? []) {
    const typedSession = session as unknown as ActiveSessionRow;
    const tableId = String(typedSession.table_id);
    const current = activeSessionByTable.get(tableId);
    if (!current) {
      activeSessionByTable.set(tableId, typedSession);
      continue;
    }
    const currentStarted = new Date(String(current.started_at ?? 0)).getTime();
    const nextStarted = new Date(String(typedSession.started_at ?? 0)).getTime();
    if (nextStarted > currentStarted) {
      activeSessionByTable.set(tableId, typedSession);
    }
  }

  const participantCountBySession = new Map<string, number>();
  for (const row of participantRows ?? []) {
    const key = String(row.table_session_id);
    participantCountBySession.set(key, (participantCountBySession.get(key) ?? 0) + 1);
  }

  const latestOrderByTable = new Map<string, LatestOrderRow>();
  for (const row of orderRows ?? []) {
    const typedOrder = row as unknown as LatestOrderRow;
    const tableId = String(typedOrder.table_id ?? "");
    if (!tableId) continue;
    if (!latestOrderByTable.has(tableId)) {
      latestOrderByTable.set(tableId, typedOrder);
    }
  }

  const itemsByOrder = new Map<string, string[]>();
  for (const row of orderItemRows ?? []) {
    const orderId = String(row.order_id);
    const list = itemsByOrder.get(orderId) ?? [];
    const qty = Math.max(1, Number(row.quantity ?? 1));
    const name = String(row.item_name_snapshot ?? "Item");
    list.push(`${qty}x ${name}`);
    itemsByOrder.set(orderId, list);
  }

  const qrByTable = new Set<string>();
  for (const row of qrRows ?? []) {
    qrByTable.add(String((row as { table_id?: string | null }).table_id ?? ""));
  }

  const rows: TableSnapshotRow[] = (tableRows ?? []).map((table) => {
    const tableId = String(table.id);
    const activeSession = activeSessionByTable.get(tableId);
    const latestOrder = latestOrderByTable.get(tableId);
    const latestOrderStatus = latestOrder ? String(latestOrder.status ?? "") : null;
    const status = toTableStatusLabel(
      String(table.status ?? "available"),
      Boolean(activeSession),
      latestOrderStatus,
    ) as TableSnapshotRow["status"];

    const sessionId = activeSession ? String(activeSession.id) : null;
    const sessionCode = sessionId
      ? `S-${sessionId.replace(/-/g, "").slice(0, 4).toUpperCase()}`
      : "No active session";

    return {
      id: tableId,
      tableId,
      tableNumber: `T-${String(table.table_number ?? 0).padStart(2, "0")}`,
      status,
      qrGenerated: qrByTable.has(tableId),
      currentSession:
        status === "Unavailable" ? "Maintenance hold" : sessionCode,
      orderId: latestOrder ? String(latestOrder.order_number) : null,
      orderStatus: latestOrderStatus ? toOrderStatusLabel(latestOrderStatus) : "No active order",
      billTotal: Number(latestOrder?.total_amount ?? 0),
      participantsCount:
        sessionId !== null ? Number(participantCountBySession.get(sessionId) ?? 0) : 0,
      startedAt: activeSession ? String(activeSession.started_at ?? null) : null,
      orderItems: latestOrder ? itemsByOrder.get(String(latestOrder.id)) ?? [] : [],
    };
  });

  return {
    cards: {
      totalTables: rows.length,
      available: rows.filter((row) => row.status === "Available").length,
      occupied: rows.filter((row) => row.status === "Occupied").length,
      served: rows.filter((row) => row.status === "Served").length,
      unavailable: rows.filter((row) => row.status === "Unavailable").length,
    },
    rows,
  };
};

export type ManagerMenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  updatedAt: string;
};

export const getManagerMenuItems = async (branchCode = DEFAULT_BRANCH) => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);
  const { data, error } = await supabase
    .from("menu_items")
    .select("*,menu_categories(name)")
    .eq("outlet_id", outlet.id)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  type ManagerMenuItemRow = {
    id: string | null;
    name: string | null;
    base_price: number | null;
    is_available: boolean | null;
    updated_at: string | null;
    created_at: string | null;
    menu_categories: { name?: string | null } | Array<{ name?: string | null }> | null;
  };

  return (data ?? []).map((row) => {
    const typedRow = row as unknown as ManagerMenuItemRow;
    const categoryRelation = Array.isArray(typedRow.menu_categories)
      ? typedRow.menu_categories[0]
      : typedRow.menu_categories;
    return {
      id: String(typedRow.id),
      name: String(typedRow.name ?? "Unnamed Item"),
      category: String(categoryRelation?.name ?? "Uncategorized"),
      price: Math.round(Number(typedRow.base_price ?? 0)),
      available: Boolean(typedRow.is_available),
      updatedAt: String(typedRow.updated_at ?? typedRow.created_at ?? new Date().toISOString()),
    } satisfies ManagerMenuItem;
  });
};

export const updateManagerMenuItem = async (input: {
  id: string;
  price?: number;
  available?: boolean;
  branchCode?: string;
}) => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(input.branchCode || DEFAULT_BRANCH);
  const payload: Record<string, unknown> = {};
  if (typeof input.price === "number" && Number.isFinite(input.price)) {
    payload.base_price = Math.max(0, Math.round(input.price));
  }
  if (typeof input.available === "boolean") {
    payload.is_available = input.available;
  }
  if (!Object.keys(payload).length) {
    throw new Error("No updates provided");
  }

  const { data, error } = await supabase
    .from("menu_items")
    .update(payload)
    .eq("id", input.id)
    .eq("outlet_id", outlet.id)
    .select("id,name,base_price,is_available,outlet_id")
    .single<{
      id: string;
      name: string;
      base_price: number;
      is_available: boolean;
      outlet_id: string;
    }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update menu item");
  }

  invalidateOutletDerivedCaches(String(data.outlet_id));

  return {
    id: data.id,
    name: data.name,
    price: Number(data.base_price ?? 0),
    available: Boolean(data.is_available),
  };
};

export const updateManagerTableAvailability = async (input: {
  tableId: string;
  availability: "available" | "unavailable";
  branchCode?: string;
}) => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(input.branchCode || DEFAULT_BRANCH);
  const currentResult = await supabase
    .from("restaurant_tables")
    .select("id,status")
    .eq("id", input.tableId)
    .eq("outlet_id", outlet.id)
    .single<{ id: string; status: string }>();
  if (currentResult.error || !currentResult.data) {
    throw new Error(currentResult.error?.message ?? "Table not found");
  }

  const currentStatus = String(currentResult.data.status ?? "available").toLowerCase();
  if (input.availability === "unavailable" && currentStatus !== "available") {
    throw new Error("Only available tables can be marked unavailable");
  }

  const { data, error } = await supabase
    .from("restaurant_tables")
    .update({ status: input.availability })
    .eq("id", input.tableId)
    .eq("outlet_id", outlet.id)
    .select("id,status")
    .single<{ id: string; status: string }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update table status");
  }

  return {
    id: data.id,
    status: String(data.status ?? input.availability),
  };
};

export type AdminQrCodeRecord = {
  id: string;
  tableNumber: number;
  tableLabel: string;
  createdAt: string;
};

const ensureTableForOutlet = async (outletId: string, tableNumber: number) => {
  const supabase = assertSupabaseAdmin();
  let lookup = await supabase
    .from("restaurant_tables")
    .select("id,table_number,table_label")
    .eq("outlet_id", outletId)
    .eq("table_number", tableNumber)
    .maybeSingle<{ id: string; table_number: number; table_label: string }>();

  if (lookup.error) {
    throw new Error(lookup.error.message);
  }
  if (lookup.data) {
    return lookup.data;
  }

  const inserted = await supabase
    .from("restaurant_tables")
    .insert({
      outlet_id: outletId,
      table_number: tableNumber,
      status: "available",
      seats: 4,
    })
    .select("id,table_number,table_label")
    .single<{ id: string; table_number: number; table_label: string }>();

  if (inserted.error || !inserted.data) {
    throw new Error(inserted.error?.message ?? "Unable to create table");
  }
  return inserted.data;
};

const tryInsertQrRow = async (payload: Record<string, unknown>) => {
  const supabase = assertSupabaseAdmin();
  return supabase
    .from("table_qr_codes")
    .insert(payload)
    .select("*")
    .single<Record<string, unknown>>();
};

export const createAdminQrCode = async (
  branchCode: string,
  tableNumber: number,
) => {
  const outlet = await getOutletByBranchCode(branchCode);
  const table = await ensureTableForOutlet(outlet.id, tableNumber);

  const supabase = assertSupabaseAdmin();
  const existing = await supabase
    .from("table_qr_codes")
    .select("*")
    .eq("outlet_id", outlet.id)
    .eq("table_id", table.id)
    .limit(1)
    .maybeSingle<Record<string, unknown>>();
  if (!existing.error && existing.data) {
    return existing.data;
  }

  const candidates: Array<Record<string, unknown>> = [
    { outlet_id: outlet.id, table_id: table.id },
    { outlet_id: outlet.id, table_id: table.id, is_active: true },
    { outlet_id: outlet.id, table_id: table.id, qr_token: randomUUID() },
  ];

  let lastError: string | null = null;
  for (const candidate of candidates) {
    const inserted = await tryInsertQrRow(candidate);
    if (!inserted.error && inserted.data) {
      return inserted.data;
    }
    lastError = inserted.error?.message ?? "Unknown QR insert error";
  }

  throw new Error(lastError ?? "Unable to create QR code");
};

export const deleteAdminQrCode = async (id: string) => {
  const supabase = assertSupabaseAdmin();
  const { error } = await supabase.from("table_qr_codes").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  return { id };
};

export const getAdminQrCodes = async (
  branchCode = DEFAULT_BRANCH,
): Promise<AdminQrCodeRecord[]> => {
  const supabase = assertSupabaseAdmin();
  const outlet = await getOutletByBranchCode(branchCode);

  const { data: tables, error: tablesError } = await supabase
    .from("restaurant_tables")
    .select("id,table_number,table_label")
    .eq("outlet_id", outlet.id);
  if (tablesError) {
    throw new Error(tablesError.message);
  }
  const tableLookup = new Map<string, { tableNumber: number; tableLabel: string }>();
  for (const row of tables ?? []) {
    tableLookup.set(String(row.id), {
      tableNumber: Number(row.table_number ?? 0),
      tableLabel: String(row.table_label ?? `Table${row.table_number}`),
    });
  }

  const { data, error } = await supabase
    .from("table_qr_codes")
    .select("*")
    .eq("outlet_id", outlet.id)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => {
      const typedRow = row as {
        id?: string | null;
        table_id?: string | null;
        table_number?: number | null;
        created_at?: string | null;
        updated_at?: string | null;
      };
      const tableId = String(typedRow.table_id ?? "");
      const table = tableLookup.get(tableId);
      const tableNumber = Number(typedRow.table_number ?? table?.tableNumber ?? 0);
      return {
        id: String(typedRow.id ?? ""),
        tableNumber,
        tableLabel: table?.tableLabel ?? `Table${tableNumber}`,
        createdAt: String(
          typedRow.created_at ?? typedRow.updated_at ?? new Date().toISOString(),
        ),
      } satisfies AdminQrCodeRecord;
    })
    .filter((row) => row.tableNumber > 0)
    .sort((a, b) => a.tableNumber - b.tableNumber);
};


