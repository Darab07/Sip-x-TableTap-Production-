import { Router, type Express, type RequestHandler } from "express";
import { z } from "zod";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { insertUserSchema } from "../shared/schema.js";
import { storage } from "./storage.js";
import { HttpError } from "./errors.js";
import { applyValidation, strictObject } from "./security.js";
import {
  getStaffAccessFromRequest,
  requireAuthenticatedUser,
  requireStaffRole,
} from "./auth.js";
import {
  getWebPushPublicKey,
  removePushSubscription,
  notifyTrackedOrderStatus,
  startOrderPushTracking,
  type PushSubscriptionPayload,
  upsertPushSubscription,
} from "./push.js";
import {
  createAdminQrCode,
  createAdminTakeawayQrCode,
  deleteAdminQrCode,
  getAdminEarnings,
  getAdminQrCodes,
  getManagerLiveOrders,
  getManagerMenuItems,
  getMenuCatalogForBranch,
  checkInTableFromQr,
  getOrderTrackerStatusForCustomer,
  getPublicTableAccess,
  getOutletOptionsForStaff,
  getOutletOrderingSettingsForBranch,
  updateOutletOrderingSettingsForBranch,
  getOwnerMenuInsights,
  getOwnerOrdersSummary,
  getOwnerOrdersTable,
  getOwnerOrdersTrendByDay,
  getOwnerOrdersTrendByHourToday,
  getTableSnapshot,
  getOwnerDashboardCards,
  getOwnerSalesTrend,
  getOwnerTopSellingItems,
  placeOrderInSupabase,
  getCustomerOrderHistoryForAccount,
  getCustomerLoyaltySummaryForAccount,
  upsertCustomerDeviceProfile,
  updateManagerMenuItem,
  updateManagerTableAvailability,
  updateOrderStatusFromManager,
} from "./supabase-data.js";

type AsyncRouteHandler = (
  ...args: Parameters<RequestHandler>
) => Promise<unknown> | unknown;

const asyncHandler = (handler: AsyncRouteHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

type WaiterCallEvent = {
  id: string;
  branchCode: string;
  tableNumber: number;
  tableLabel: string;
  createdAt: string;
  createdAtMs: number;
};

const WAITER_CALL_RETENTION_MS = 10 * 60 * 1000;
const waiterCallEvents: WaiterCallEvent[] = [];

const pruneWaiterCalls = (now = Date.now()) => {
  const minTs = now - WAITER_CALL_RETENTION_MS;
  let removeCount = 0;
  for (const event of waiterCallEvents) {
    if (event.createdAtMs < minTs) {
      removeCount += 1;
      continue;
    }
    break;
  }
  if (removeCount > 0) {
    waiterCallEvents.splice(0, removeCount);
  }
};


const branchCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-_]*$/i, "branchCode format is invalid");

const orderNumberSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[A-Za-z0-9-]+$/, "orderNumber format is invalid");

const tableNumberSchema = z.coerce.number().int().min(1).max(99999);

const timeValueSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "time must be HH:MM or HH:MM:SS");

const timezoneSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)*$/, "timezone format is invalid");

const menuCatalogQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  ts: z.string().trim().max(40).optional(),
});

const publicTableAccessQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  tableNumber: tableNumberSchema,
});

const checkInBodySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  tableNumber: tableNumberSchema,
});

const waiterCallBodySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  tableNumber: tableNumberSchema,
  tableLabel: z.string().trim().min(1).max(80).optional(),
});

const waiterCallsQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  since: z.coerce.number().int().min(0).optional(),
});

const placeOrderBodySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  tableNumber: tableNumberSchema,
  deviceFingerprint: z.string().trim().min(8).max(256),
  customerAuthUserId: z.string().trim().min(1).max(128).optional(),
  customerName: z.string().trim().min(1).max(80).optional(),
  customerEmail: z.string().trim().toLowerCase().email().max(254).optional(),
  notes: z.string().trim().max(500).optional(),
  tipAmount: z.coerce.number().finite().min(0).max(1_000_000).optional(),
  serviceFee: z.coerce.number().finite().min(0).max(1_000_000).optional(),
  gstAmount: z.coerce.number().finite().min(0).max(1_000_000).optional(),
  subtotal: z.coerce.number().finite().min(0).max(5_000_000).optional(),
  total: z.coerce.number().finite().min(0).max(5_000_000).optional(),
  items: z
    .array(
      strictObject({
        menuItemId: z.string().trim().uuid().optional(),
        name: z.string().trim().min(1).max(120),
        quantity: z.coerce.number().int().min(1).max(100),
        unitPrice: z.coerce.number().finite().min(0).max(1_000_000).optional(),
        details: z.string().trim().max(500).optional(),
        options: z
          .array(
            strictObject({
              groupName: z.string().trim().min(1).max(80),
              label: z.string().trim().min(1).max(80),
              priceDelta: z.coerce.number().finite().min(-1_000_000).max(1_000_000).optional(),
              priceOverride: z.union([z.coerce.number().finite().min(0).max(1_000_000), z.null()]).optional(),
            }),
          )
          .max(20)
          .optional(),
      }),
    )
    .min(1)
    .max(100),
});

const customerHistoryQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  authUserId: z.string().trim().min(1).max(128).optional(),
  deviceFingerprint: z.string().trim().min(8).max(256).optional(),
  customerEmail: z.string().trim().toLowerCase().email().max(254).optional(),
});

const loyaltySummaryQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
});

const customerProfileBodySchema = strictObject({
  deviceFingerprint: z.string().trim().min(8).max(256),
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
});

const branchCodeOnlyQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
});

const adminEarningsQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
});

const outletOrderingSettingsBodySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  serviceStartTime: timeValueSchema,
  serviceEndTime: timeValueSchema,
  lastTakeawayTime: timeValueSchema,
  timezone: timezoneSchema.optional(),
});

const managerMenuItemParamsSchema = strictObject({
  itemId: z.string().trim().uuid(),
});

const managerMenuItemPatchBodySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  price: z.coerce.number().finite().min(0).max(1_000_000).optional(),
  available: z.boolean().optional(),
}).refine((value) => value.price !== undefined || value.available !== undefined, {
  message: "Either price or available must be provided",
});

const managerTableParamsSchema = strictObject({
  tableId: z.string().trim().uuid(),
});

const managerTableAvailabilityBodySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  availability: z.enum(["available", "unavailable"]),
});

const managerOrderStatusParamsSchema = strictObject({
  orderNumber: orderNumberSchema,
});

const managerOrderStatusBodySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  status: z.enum(["accepted", "preparing", "ready"]),
});

const orderStatusParamsSchema = strictObject({
  orderNumber: orderNumberSchema,
});

const orderStatusQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  deviceFingerprint: z.string().trim().min(8).max(256).optional(),
});

const adminQrCreateBodySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  tableNumber: tableNumberSchema,
});

const adminTakeawayQrBodySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
});

const adminQrDeleteParamsSchema = strictObject({
  id: z.string().trim().uuid(),
});

const ownerSalesTrendQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  rangeDays: z.coerce.number().int().min(1).max(365).optional(),
});

const ownerRangeDaysQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  rangeDays: z.coerce.number().int().min(1).max(365).optional(),
});

const ownerOrdersTrendQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  mode: z.enum(["day", "hour"]).optional(),
  rangeDays: z.coerce.number().int().min(1).max(365).optional(),
});

const ownerMenuInsightsQuerySchema = strictObject({
  branchCode: branchCodeSchema.optional(),
  dateRange: z.enum(["today", "this-week", "this-month"]).optional(),
  category: z.string().trim().min(1).max(80).optional(),
});

const pushSubscribeBodySchema = strictObject({
  subscription: strictObject({
    endpoint: z.string().trim().url().max(2_000),
    expirationTime: z.number().nullable().optional(),
    keys: strictObject({
      auth: z.string().trim().min(8).max(500),
      p256dh: z.string().trim().min(8).max(500),
    }),
  }),
});

const pushUnsubscribeBodySchema = strictObject({
  endpoint: z.string().trim().url().max(2_000),
});

const orderTrackStartBodySchema = strictObject({
  orderNumber: orderNumberSchema,
  tableLabel: z.string().trim().min(1).max(80),
  menuUrl: z.string().trim().min(1).max(300).optional(),
});

const usersParamsSchema = strictObject({
  username: z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9_.-]+$/),
});

const tableSessionAttachBodySchema = strictObject({
  tableId: z.string().trim().uuid(),
  deviceFingerprint: z.string().trim().min(8).max(256),
});

const addItemBodySchema = strictObject({
  tableSessionId: z.string().trim().uuid(),
  personId: z.string().trim().uuid(),
  items: z
    .array(
      strictObject({
        menuItemId: z.string().trim().uuid(),
        qty: z.coerce.number().int().min(1).max(100),
        price: z.coerce.number().finite().min(0).max(1_000_000),
        notes: z.string().trim().max(300).optional(),
      }),
    )
    .min(1)
    .max(100),
});

const removeItemBodySchema = strictObject({
  tableSessionId: z.string().trim().uuid(),
  personId: z.string().trim().uuid(),
  menuItemId: z.string().trim().uuid(),
});

const groupOrderCreateBodySchema = strictObject({
  tableSessionId: z.string().trim().uuid(),
  personId: z.string().trim().uuid(),
});

const groupOrderParamsSchema = strictObject({
  groupOrderId: z.string().trim().uuid(),
});

const groupOrderJoinBodySchema = strictObject({
  personId: z.string().trim().uuid(),
});

const tableSessionParamsSchema = strictObject({
  tableSessionId: z.string().trim().uuid(),
});

const tableSessionStateQuerySchema = strictObject({
  personId: z.string().trim().uuid(),
});

const legacyCreateUserBodySchema = strictObject({
  username: z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9_.-]+$/),
  password: z.string().min(8).max(128),
});
export const buildApiRouter = (): Router => {
  const router = Router();
  const DEFAULT_BRANCH_CODE = String(process.env.DEFAULT_BRANCH_CODE ?? "").trim() || "f7-islamabad";

  const requireCustomerAuth = requireAuthenticatedUser();
  const requireStaffAccess = requireStaffRole("manager", { skipBranchCheck: true });
  const requireManagerAccess = requireStaffRole("manager");
  const requireOwnerAccess = requireStaffRole("owner");
  const requireAdminAccess = requireStaffRole("admin", { skipBranchCheck: true });
  const enableLegacyCustomerApis = process.env.ENABLE_LEGACY_TABLE_SESSION_APIS === "true";

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    next();
  });

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  router.get("/test", (_req, res) => {
    res.json({ message: "Server is working!" });
  });

  router.get(
    "/auth/staff-session",
    requireStaffAccess,
    asyncHandler(async (req, res) => {
      const staff = getStaffAccessFromRequest(req);
      if (!staff) {
        throw new HttpError(401, "Not authenticated");
      }

      res.json({
        user: staff.user,
        highestRole: staff.highestRole,
        roles: staff.roles,
        outlets: staff.outlets,
      });
    }),
  );

  router.get(
    "/outlets",
    requireStaffAccess,
    asyncHandler(async (req, res) => {
      const staff = getStaffAccessFromRequest(req);
      if (!staff) {
        throw new HttpError(401, "Not authenticated");
      }
      const outlets = await getOutletOptionsForStaff(staff);
      res.json({ outlets });
    }),
  );

  router.get(
    "/menu/catalog",
    applyValidation({ query: menuCatalogQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode } = req.query as z.infer<typeof menuCatalogQuerySchema>;
      const catalog = await getMenuCatalogForBranch(branchCode || DEFAULT_BRANCH_CODE);
      res.json(catalog);
    }),
  );

  router.get(
    "/tables/public-access",
    applyValidation({ query: publicTableAccessQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode, tableNumber } = req.query as unknown as z.infer<
        typeof publicTableAccessQuerySchema
      >;
      const access = await getPublicTableAccess(branchCode || DEFAULT_BRANCH_CODE, tableNumber);
      res.json(access);
    }),
  );

  router.post(
    "/tables/check-in",
    applyValidation({ body: checkInBodySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode, tableNumber } = req.body as z.infer<typeof checkInBodySchema>;
      const payload = await checkInTableFromQr(
        branchCode || DEFAULT_BRANCH_CODE,
        tableNumber,
      );
      res.status(201).json(payload);
    }),
  );

  router.get("/push/public-key", (_req, res) => {
    res.json({ publicKey: getWebPushPublicKey() });
  });

  router.post(
    "/waiter/call",
    applyValidation({ body: waiterCallBodySchema }),
    asyncHandler(async (req, res) => {
      const { tableNumber, tableLabel, branchCode } = req.body as z.infer<
        typeof waiterCallBodySchema
      >;

      const normalizedBranchCode =
        typeof branchCode === "string" && branchCode.trim()
          ? branchCode.trim()
          : DEFAULT_BRANCH_CODE;
      const normalizedTableNumber = Math.round(Number(tableNumber));
      const normalizedTableLabel =
        typeof tableLabel === "string" && tableLabel.trim()
          ? tableLabel.trim()
          : `Table ${normalizedTableNumber}`;

      const createdAtMs = Date.now();
      const event: WaiterCallEvent = {
        id: randomUUID(),
        branchCode: normalizedBranchCode,
        tableNumber: normalizedTableNumber,
        tableLabel: normalizedTableLabel,
        createdAt: new Date(createdAtMs).toISOString(),
        createdAtMs,
      };

      waiterCallEvents.push(event);
      pruneWaiterCalls(createdAtMs);

      res.status(201).json({ event });
    }),
  );

  router.get(
    "/manager/waiter-calls",
    requireManagerAccess,
    applyValidation({ query: waiterCallsQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode, since = 0 } = req.query as z.infer<typeof waiterCallsQuerySchema>;

      pruneWaiterCalls();

      const events = waiterCallEvents.filter(
        (event) =>
          event.branchCode === (branchCode || DEFAULT_BRANCH_CODE) && event.createdAtMs > since,
      );

      res.json({ events });
    }),
  );

  router.post(
    "/orders/place",
    requireCustomerAuth,
    applyValidation({ body: placeOrderBodySchema }),
    asyncHandler(async (req, res) => {
      let order;
      try {
        const authenticatedUser = req.authenticatedUser;
        if (!authenticatedUser) {
          throw new HttpError(401, "You must be logged in to place an order");
        }

        const rawBody = req.body as z.infer<typeof placeOrderBodySchema>;
        const incomingName =
          typeof rawBody.customerName === "string"
            ? rawBody.customerName.trim()
            : "";
        const deviceFingerprint =
          typeof rawBody.deviceFingerprint === "string"
            ? rawBody.deviceFingerprint.trim()
            : "";

        if (!deviceFingerprint) {
          throw new HttpError(400, "deviceFingerprint is required to place an order");
        }

        order = await placeOrderInSupabase({
          ...rawBody,
          customerEmail: authenticatedUser.email,
          customerName: incomingName || authenticatedUser.displayName,
          customerAuthUserId: authenticatedUser.id,
        } as Parameters<typeof placeOrderInSupabase>[0]);
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }
        const message =
          error instanceof Error ? error.message : "Unable to place order";
        throw new HttpError(400, message);
      }
      res.status(201).json({ order });
    }),
  );

  router.get(
    "/orders/history",
    requireCustomerAuth,
    applyValidation({ query: customerHistoryQuerySchema }),
    asyncHandler(async (req, res) => {
      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.email) {
        throw new HttpError(401, "You must be logged in to view order history");
      }

      const { branchCode, limit = 200 } = req.query as z.infer<
        typeof customerHistoryQuerySchema
      >;

      const orders = await getCustomerOrderHistoryForAccount({
        customerAuthUserId: authenticatedUser.id,
        customerEmail: authenticatedUser.email,
        branchCode: branchCode || DEFAULT_BRANCH_CODE,
        limit,
      });

      res.json({ orders });
    }),
  );

  router.get(
    "/orders/loyalty-summary",
    requireCustomerAuth,
    applyValidation({ query: loyaltySummaryQuerySchema }),
    asyncHandler(async (req, res) => {
      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.email) {
        throw new HttpError(401, "You must be logged in to view loyalty summary");
      }

      const { branchCode } = req.query as z.infer<typeof loyaltySummaryQuerySchema>;

      const summary = await getCustomerLoyaltySummaryForAccount({
        customerAuthUserId: authenticatedUser.id,
        customerEmail: authenticatedUser.email,
        branchCode: branchCode || DEFAULT_BRANCH_CODE,
      });

      res.json({ summary });
    }),
  );

  router.post(
    "/customers/profile",
    requireCustomerAuth,
    applyValidation({ body: customerProfileBodySchema }),
    asyncHandler(async (req, res) => {
      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.email) {
        throw new HttpError(401, "You must be logged in to update your profile");
      }

      const { deviceFingerprint, name, email } = req.body as z.infer<
        typeof customerProfileBodySchema
      >;

      const normalizedEmail = String(email ?? "").trim().toLowerCase();
      if (normalizedEmail && normalizedEmail !== authenticatedUser.email) {
        throw new HttpError(403, "Profile email must match your authenticated account");
      }

      const profile = await upsertCustomerDeviceProfile({
        deviceFingerprint,
        name,
        email: authenticatedUser.email,
      });
      res.json({ profile });
    }),
  );

  router.get(
    "/manager/live-orders",
    requireManagerAccess,
    applyValidation({ query: branchCodeOnlyQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode } = req.query as z.infer<typeof branchCodeOnlyQuerySchema>;
      const orders = await getManagerLiveOrders(branchCode || DEFAULT_BRANCH_CODE);
      res.json({ orders });
    }),
  );

  router.get(
    "/manager/menu-items",
    requireManagerAccess,
    applyValidation({ query: branchCodeOnlyQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode } = req.query as z.infer<typeof branchCodeOnlyQuerySchema>;
      const items = await getManagerMenuItems(branchCode || DEFAULT_BRANCH_CODE);
      res.json({ items });
    }),
  );

  router.get(
    "/manager/outlet-ordering-settings",
    requireManagerAccess,
    applyValidation({ query: branchCodeOnlyQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode } = req.query as z.infer<typeof branchCodeOnlyQuerySchema>;
      const settings = await getOutletOrderingSettingsForBranch(branchCode || DEFAULT_BRANCH_CODE);
      res.json({ settings });
    }),
  );

  router.patch(
    "/manager/outlet-ordering-settings",
    requireManagerAccess,
    applyValidation({ body: outletOrderingSettingsBodySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode, serviceStartTime, serviceEndTime, lastTakeawayTime, timezone } =
        req.body as z.infer<typeof outletOrderingSettingsBodySchema>;

      const settings = await updateOutletOrderingSettingsForBranch({
        branchCode: typeof branchCode === "string" ? branchCode : DEFAULT_BRANCH_CODE,
        serviceStartTime,
        serviceEndTime,
        lastTakeawayTime,
        timezone,
      });
      res.json({ settings });
    }),
  );

  router.patch(
    "/manager/menu-items/:itemId",
    requireManagerAccess,
    applyValidation({
      params: managerMenuItemParamsSchema,
      body: managerMenuItemPatchBodySchema,
    }),
    asyncHandler(async (req, res) => {
      const { itemId } = req.params as z.infer<typeof managerMenuItemParamsSchema>;
      const { price, available, branchCode } = req.body as z.infer<
        typeof managerMenuItemPatchBodySchema
      >;
      const item = await updateManagerMenuItem({ id: itemId, price, available, branchCode });
      res.json({ item });
    }),
  );

  router.get(
    "/manager/table-management",
    requireManagerAccess,
    applyValidation({ query: branchCodeOnlyQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode } = req.query as z.infer<typeof branchCodeOnlyQuerySchema>;
      const snapshot = await getTableSnapshot(branchCode || DEFAULT_BRANCH_CODE);
      res.json(snapshot);
    }),
  );

  router.patch(
    "/manager/tables/:tableId/availability",
    requireManagerAccess,
    applyValidation({
      params: managerTableParamsSchema,
      body: managerTableAvailabilityBodySchema,
    }),
    asyncHandler(async (req, res) => {
      const { tableId } = req.params as z.infer<typeof managerTableParamsSchema>;
      const { availability, branchCode } = req.body as z.infer<
        typeof managerTableAvailabilityBodySchema
      >;
      const table = await updateManagerTableAvailability({ tableId, availability, branchCode });
      res.json({ table });
    }),
  );

  router.patch(
    "/manager/orders/:orderNumber/status",
    requireManagerAccess,
    applyValidation({
      params: managerOrderStatusParamsSchema,
      body: managerOrderStatusBodySchema,
    }),
    asyncHandler(async (req, res) => {
      const { orderNumber } = req.params as z.infer<typeof managerOrderStatusParamsSchema>;
      const { status, branchCode } = req.body as z.infer<typeof managerOrderStatusBodySchema>;
      const updated = await updateOrderStatusFromManager({ orderNumber, status, branchCode });
      await notifyTrackedOrderStatus(orderNumber, updated.status);
      res.json({ order: updated });
    }),
  );

  router.get(
    "/orders/:orderNumber/status",
    requireCustomerAuth,
    applyValidation({
      params: orderStatusParamsSchema,
      query: orderStatusQuerySchema,
    }),
    asyncHandler(async (req, res) => {
      const { orderNumber } = req.params as z.infer<typeof orderStatusParamsSchema>;

      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.email) {
        throw new HttpError(401, "You must be logged in to track this order");
      }

      const { deviceFingerprint, branchCode } = req.query as z.infer<
        typeof orderStatusQuerySchema
      >;

      const order = await getOrderTrackerStatusForCustomer({
        orderNumber,
        customerAuthUserId: authenticatedUser.id,
        customerEmail: authenticatedUser.email,
        deviceFingerprint,
        branchCode,
      });
      res.json({ order });
    }),
  );

  router.get(
    "/admin/qr-codes",
    requireAdminAccess,
    applyValidation({ query: branchCodeOnlyQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode } = req.query as z.infer<typeof branchCodeOnlyQuerySchema>;
      const rows = await getAdminQrCodes(branchCode || DEFAULT_BRANCH_CODE);
      res.json({ rows });
    }),
  );

  router.post(
    "/admin/qr-codes",
    requireAdminAccess,
    applyValidation({ body: adminQrCreateBodySchema }),
    asyncHandler(async (req, res) => {
      const { tableNumber, branchCode } = req.body as z.infer<typeof adminQrCreateBodySchema>;
      await createAdminQrCode(
        branchCode || DEFAULT_BRANCH_CODE,
        tableNumber,
      );
      const rows = await getAdminQrCodes(branchCode || DEFAULT_BRANCH_CODE);
      res.status(201).json({ rows });
    }),
  );

  router.post(
    "/admin/qr-codes/takeaway",
    requireAdminAccess,
    applyValidation({ body: adminTakeawayQrBodySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode } = req.body as z.infer<typeof adminTakeawayQrBodySchema>;
      const targetBranchCode = branchCode || DEFAULT_BRANCH_CODE;
      const created = await createAdminTakeawayQrCode(targetBranchCode);
      const rows = await getAdminQrCodes(targetBranchCode);
      const createdRow = rows.find((row) => row.tableNumber === created.tableNumber);
      res.status(201).json({ rows, created: createdRow ?? null });
    }),
  );
  router.delete(
    "/admin/qr-codes/:id",
    requireAdminAccess,
    applyValidation({ params: adminQrDeleteParamsSchema }),
    asyncHandler(async (req, res) => {
      const { id } = req.params as z.infer<typeof adminQrDeleteParamsSchema>;
      await deleteAdminQrCode(id);
      res.json({ ok: true });
    }),
  );

  router.get(
    "/dashboard/admin/earnings",
    requireAdminAccess,
    applyValidation({ query: adminEarningsQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode } = req.query as z.infer<typeof adminEarningsQuerySchema>;
      const payload = await getAdminEarnings(branchCode);
      res.json(payload);
    }),
  );

  router.get(
    "/dashboard/owner/cards",
    requireOwnerAccess,
    applyValidation({ query: branchCodeOnlyQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode } = req.query as z.infer<typeof branchCodeOnlyQuerySchema>;
      const cards = await getOwnerDashboardCards(branchCode || DEFAULT_BRANCH_CODE);
      res.json(cards);
    }),
  );

  router.get(
    "/dashboard/owner/sales-trend",
    requireOwnerAccess,
    applyValidation({ query: ownerSalesTrendQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode, rangeDays = 30 } = req.query as z.infer<typeof ownerSalesTrendQuerySchema>;
      const trend = await getOwnerSalesTrend(branchCode || DEFAULT_BRANCH_CODE, rangeDays);
      res.json({ points: trend });
    }),
  );

  router.get(
    "/dashboard/owner/top-items",
    requireOwnerAccess,
    applyValidation({ query: ownerRangeDaysQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode, rangeDays = 30 } = req.query as z.infer<typeof ownerRangeDaysQuerySchema>;
      const rows = await getOwnerTopSellingItems(branchCode || DEFAULT_BRANCH_CODE, rangeDays);
      res.json({ rows });
    }),
  );

  router.get(
    "/dashboard/owner/table-management",
    requireOwnerAccess,
    applyValidation({ query: branchCodeOnlyQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode } = req.query as z.infer<typeof branchCodeOnlyQuerySchema>;
      const snapshot = await getTableSnapshot(branchCode || DEFAULT_BRANCH_CODE);
      res.json(snapshot);
    }),
  );

  router.get(
    "/dashboard/owner/menu-insights",
    requireOwnerAccess,
    applyValidation({ query: ownerMenuInsightsQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode, dateRange = "today", category = "all" } = req.query as z.infer<
        typeof ownerMenuInsightsQuerySchema
      >;
      const payload = await getOwnerMenuInsights(
        branchCode || DEFAULT_BRANCH_CODE,
        dateRange,
        category,
      );
      res.json(payload);
    }),
  );

  router.get(
    "/dashboard/owner/orders/summary",
    requireOwnerAccess,
    applyValidation({ query: branchCodeOnlyQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode } = req.query as z.infer<typeof branchCodeOnlyQuerySchema>;
      const summary = await getOwnerOrdersSummary(branchCode || DEFAULT_BRANCH_CODE);
      res.json(summary);
    }),
  );

  router.get(
    "/dashboard/owner/orders/trend",
    requireOwnerAccess,
    applyValidation({ query: ownerOrdersTrendQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode, mode = "day", rangeDays = 7 } = req.query as z.infer<
        typeof ownerOrdersTrendQuerySchema
      >;
      const targetBranchCode = branchCode || DEFAULT_BRANCH_CODE;
      if (mode === "hour") {
        const points = await getOwnerOrdersTrendByHourToday(targetBranchCode);
        res.json({ points });
        return;
      }
      const points = await getOwnerOrdersTrendByDay(targetBranchCode, rangeDays);
      res.json({ points });
    }),
  );

  router.get(
    "/dashboard/owner/orders/table",
    requireOwnerAccess,
    applyValidation({ query: ownerRangeDaysQuerySchema }),
    asyncHandler(async (req, res) => {
      const { branchCode, rangeDays = 31 } = req.query as z.infer<typeof ownerRangeDaysQuerySchema>;
      const rows = await getOwnerOrdersTable(branchCode || DEFAULT_BRANCH_CODE, rangeDays);
      res.json({ rows });
    }),
  );

  router.post(
    "/push/subscribe",
    requireCustomerAuth,
    applyValidation({ body: pushSubscribeBodySchema }),
    asyncHandler(async (req, res) => {
      const { subscription } = req.body as z.infer<typeof pushSubscribeBodySchema>;

      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.id) {
        throw new HttpError(401, "You must be logged in to subscribe for notifications");
      }

      upsertPushSubscription(authenticatedUser.id, subscription as PushSubscriptionPayload);
      res.status(201).json({ ok: true });
    }),
  );

  router.post(
    "/push/unsubscribe",
    requireCustomerAuth,
    applyValidation({ body: pushUnsubscribeBodySchema }),
    asyncHandler(async (req, res) => {
      const { endpoint } = req.body as z.infer<typeof pushUnsubscribeBodySchema>;
      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.id) {
        throw new HttpError(401, "You must be logged in to unsubscribe notifications");
      }

      removePushSubscription(authenticatedUser.id, endpoint);
      res.json({ ok: true });
    }),
  );

  router.post(
    "/orders/track/start",
    requireCustomerAuth,
    applyValidation({ body: orderTrackStartBodySchema }),
    asyncHandler(async (req, res) => {
      const { orderNumber, tableLabel, menuUrl } = req.body as z.infer<typeof orderTrackStartBodySchema>;
      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.id) {
        throw new HttpError(401, "You must be logged in to start order tracking");
      }

      await startOrderPushTracking({
        userId: authenticatedUser.id,
        orderNumber,
        tableLabel,
        menuUrl,
      });
      res.status(202).json({ ok: true });
    }),
  );

  if (enableLegacyCustomerApis) {
  router.get(
    "/users/:username",
    applyValidation({ params: usersParamsSchema }),
    asyncHandler(async (req, res) => {
      const { username } = req.params as z.infer<typeof usersParamsSchema>;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        throw new HttpError(404, "User not found");
      }
      res.json({ user });
    }),
  );

  router.post(
    "/users",
    applyValidation({ body: legacyCreateUserBodySchema }),
    asyncHandler(async (req, res) => {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        const message =
          parsed.error.issues.map((issue) => issue.message).join(", ") ||
          "Invalid payload";
        throw new HttpError(400, message);
      }

      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        throw new HttpError(409, "Username already in use");
      }

      const user = await storage.createUser(parsed.data);
      res.status(201).json({ user });
    }),
  );

  // --- TableTap multi-user session + cart APIs ---
  router.post(
    "/table-session/attach",
    applyValidation({ body: tableSessionAttachBodySchema }),
    asyncHandler(async (req, res) => {
      const { tableId, deviceFingerprint } = req.body as z.infer<
        typeof tableSessionAttachBodySchema
      >;

      const tableSession = await storage.getOrCreateActiveTableSession(tableId);
      const { person, cart } = await storage.attachPerson(tableSession.id, deviceFingerprint);
      const state = await storage.getStateForSession(tableSession.id, person.id);

      res.json({
        tableSession,
        person,
        personalCart: cart ?? state.personalCart,
        personalCartItems: state.personalCartItems,
        activeGroupOrder: state.activeGroupOrder,
        groupOrderItems: state.groupOrderItems,
        groupOrderMembers: state.groupOrderMembers,
      });
    }),
  );

  router.post(
    "/orders/add-item",
    applyValidation({ body: addItemBodySchema }),
    asyncHandler(async (req, res) => {
      const { tableSessionId, personId, items } = req.body as z.infer<typeof addItemBodySchema>;

      const result = await storage.addItemsForPerson({
        tableSessionId,
        personId,
        items,
      });

      res.json(result);
    }),
  );

  router.post(
    "/orders/remove-item",
    applyValidation({ body: removeItemBodySchema }),
    asyncHandler(async (req, res) => {
      const { tableSessionId, personId, menuItemId } = req.body as z.infer<
        typeof removeItemBodySchema
      >;

      const removed = await storage.removePersonalItem({ tableSessionId, personId, menuItemId });
      res.json({ removed });
    }),
  );

  router.post(
    "/group-orders",
    applyValidation({ body: groupOrderCreateBodySchema }),
    asyncHandler(async (req, res) => {
      const { tableSessionId, personId } = req.body as z.infer<typeof groupOrderCreateBodySchema>;

      const result = await storage.createGroupOrder(tableSessionId, personId);
      res.status(201).json(result);
    }),
  );

  router.post(
    "/group-orders/:groupOrderId/join",
    applyValidation({
      params: groupOrderParamsSchema,
      body: groupOrderJoinBodySchema,
    }),
    asyncHandler(async (req, res) => {
      const { groupOrderId } = req.params as z.infer<typeof groupOrderParamsSchema>;
      const { personId } = req.body as z.infer<typeof groupOrderJoinBodySchema>;

      const result = await storage.joinGroupOrder(groupOrderId, personId);
      res.json(result);
    }),
  );

  router.post(
    "/group-orders/:groupOrderId/close",
    applyValidation({ params: groupOrderParamsSchema }),
    asyncHandler(async (req, res) => {
      const { groupOrderId } = req.params as z.infer<typeof groupOrderParamsSchema>;

      const groupOrder = await storage.closeGroupOrder(groupOrderId);
      res.json({ groupOrder });
    }),
  );

  router.post(
    "/table-session/:tableSessionId/finish",
    applyValidation({ params: tableSessionParamsSchema }),
    asyncHandler(async (req, res) => {
      const { tableSessionId } = req.params as z.infer<typeof tableSessionParamsSchema>;

      const tableSession = await storage.finishTableSession(tableSessionId);
      res.json({ tableSession });
    }),
  );

  router.get(
    "/table-session/:tableSessionId/state",
    applyValidation({
      params: tableSessionParamsSchema,
      query: tableSessionStateQuerySchema,
    }),
    asyncHandler(async (req, res) => {
      const { tableSessionId } = req.params as z.infer<typeof tableSessionParamsSchema>;
      const { personId } = req.query as z.infer<typeof tableSessionStateQuerySchema>;

      const state = await storage.getStateForSession(tableSessionId, personId);
      res.json(state);
    }),
  );
  }

  return router;
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", buildApiRouter());
  app.use("/api/*", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });

  const httpServer = createServer(app);
  return httpServer;
}














