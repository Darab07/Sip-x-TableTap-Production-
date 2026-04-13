import { Router, type Express, type RequestHandler } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { insertUserSchema } from "../shared/schema.js";
import { storage } from "./storage.js";
import { HttpError } from "./errors.js";
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
  getOutletOptions,
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
    asyncHandler(async (_req, res) => {
      const outlets = await getOutletOptions();
      res.json({ outlets });
    }),
  );

  router.get(
    "/menu/catalog",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const catalog = await getMenuCatalogForBranch(branchCode);
      res.json(catalog);
    }),
  );

  router.get(
    "/tables/public-access",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const tableNumber = Number(req.query.tableNumber);
      if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
        throw new HttpError(400, "Valid tableNumber is required");
      }
      const access = await getPublicTableAccess(branchCode, tableNumber);
      res.json(access);
    }),
  );

  router.post(
    "/tables/check-in",
    asyncHandler(async (req, res) => {
      const { branchCode, tableNumber } = req.body as {
        branchCode?: string;
        tableNumber?: number;
      };
      if (!Number.isFinite(tableNumber) || Number(tableNumber) <= 0) {
        throw new HttpError(400, "Valid tableNumber is required");
      }
      const payload = await checkInTableFromQr(
        branchCode || DEFAULT_BRANCH_CODE,
        Math.round(Number(tableNumber)),
      );
      res.status(201).json(payload);
    }),
  );

  router.get("/push/public-key", (_req, res) => {
    res.json({ publicKey: getWebPushPublicKey() });
  });

  router.post(
    "/waiter/call",
    asyncHandler(async (req, res) => {
      const { tableNumber, tableLabel, branchCode } = req.body as {
        tableNumber?: number;
        tableLabel?: string;
        branchCode?: string;
      };
      if (!Number.isFinite(tableNumber) || Number(tableNumber) <= 0) {
        throw new HttpError(400, "Valid tableNumber is required");
      }

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
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const sinceRaw =
        typeof req.query.since === "string" ? Number(req.query.since) : 0;
      const since = Number.isFinite(sinceRaw) ? Math.max(0, sinceRaw) : 0;

      pruneWaiterCalls();

      const events = waiterCallEvents.filter(
        (event) => event.branchCode === branchCode && event.createdAtMs > since,
      );

      res.json({ events });
    }),
  );

  router.post(
    "/orders/place",
    requireCustomerAuth,
    asyncHandler(async (req, res) => {
      let order;
      try {
        const authenticatedUser = req.authenticatedUser;
        if (!authenticatedUser) {
          throw new HttpError(401, "You must be logged in to place an order");
        }

        const rawBody = (req.body ?? {}) as Record<string, unknown>;
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
    asyncHandler(async (req, res) => {
      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.email) {
        throw new HttpError(401, "You must be logged in to view order history");
      }

      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const limitRaw =
        typeof req.query.limit === "string" ? Number(req.query.limit) : 200;
      const safeLimit = Number.isFinite(limitRaw) ? limitRaw : 200;

      const orders = await getCustomerOrderHistoryForAccount({
        customerAuthUserId: authenticatedUser.id,
        customerEmail: authenticatedUser.email,
        branchCode,
        limit: safeLimit,
      });

      res.json({ orders });
    }),
  );

  router.get(
    "/orders/loyalty-summary",
    requireCustomerAuth,
    asyncHandler(async (req, res) => {
      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.email) {
        throw new HttpError(401, "You must be logged in to view loyalty summary");
      }

      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;

      const summary = await getCustomerLoyaltySummaryForAccount({
        customerAuthUserId: authenticatedUser.id,
        customerEmail: authenticatedUser.email,
        branchCode,
      });

      res.json({ summary });
    }),
  );

  router.post(
    "/customers/profile",
    requireCustomerAuth,
    asyncHandler(async (req, res) => {
      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.email) {
        throw new HttpError(401, "You must be logged in to update your profile");
      }

      const { deviceFingerprint, name, email } = req.body as {
        deviceFingerprint?: string;
        name?: string;
        email?: string;
      };
      if (!deviceFingerprint || !name) {
        throw new HttpError(400, "deviceFingerprint and name are required");
      }

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
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const orders = await getManagerLiveOrders(branchCode);
      res.json({ orders });
    }),
  );

  router.get(
    "/manager/menu-items",
    requireManagerAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const items = await getManagerMenuItems(branchCode);
      res.json({ items });
    }),
  );

  router.get(
    "/manager/outlet-ordering-settings",
    requireManagerAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const settings = await getOutletOrderingSettingsForBranch(branchCode);
      res.json({ settings });
    }),
  );

  router.patch(
    "/manager/outlet-ordering-settings",
    requireManagerAccess,
    asyncHandler(async (req, res) => {
      const {
        branchCode,
        serviceStartTime,
        serviceEndTime,
        lastTakeawayTime,
        timezone,
      } = req.body as {
        branchCode?: string;
        serviceStartTime?: string;
        serviceEndTime?: string;
        lastTakeawayTime?: string;
        timezone?: string;
      };

      if (!serviceStartTime || !serviceEndTime || !lastTakeawayTime) {
        throw new HttpError(
          400,
          "serviceStartTime, serviceEndTime, and lastTakeawayTime are required",
        );
      }

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
    asyncHandler(async (req, res) => {
      const { itemId } = req.params;
      const { price, available } = req.body as {
        price?: number;
        available?: boolean;
      };
      if (!itemId) {
        throw new HttpError(400, "itemId is required");
      }
      const branchCode =
        typeof req.body.branchCode === "string" ? req.body.branchCode : DEFAULT_BRANCH_CODE;
      const item = await updateManagerMenuItem({ id: itemId, price, available, branchCode });
      res.json({ item });
    }),
  );

  router.get(
    "/manager/table-management",
    requireManagerAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const snapshot = await getTableSnapshot(branchCode);
      res.json(snapshot);
    }),
  );

  router.patch(
    "/manager/tables/:tableId/availability",
    requireManagerAccess,
    asyncHandler(async (req, res) => {
      const { tableId } = req.params;
      const { availability } = req.body as {
        availability?: "available" | "unavailable";
      };
      if (!tableId || !availability) {
        throw new HttpError(400, "tableId and availability are required");
      }
      const branchCode =
        typeof req.body.branchCode === "string" ? req.body.branchCode : DEFAULT_BRANCH_CODE;
      const table = await updateManagerTableAvailability({ tableId, availability, branchCode });
      res.json({ table });
    }),
  );

  router.patch(
    "/manager/orders/:orderNumber/status",
    requireManagerAccess,
    asyncHandler(async (req, res) => {
      const { orderNumber } = req.params;
      const { status } = req.body as {
        status?: "accepted" | "preparing" | "ready";
      };
      if (!orderNumber || !status) {
        throw new HttpError(400, "orderNumber and status are required");
      }
      const branchCode =
        typeof req.body.branchCode === "string" ? req.body.branchCode : DEFAULT_BRANCH_CODE;
      const updated = await updateOrderStatusFromManager({ orderNumber, status, branchCode });
      await notifyTrackedOrderStatus(orderNumber, updated.status);
      res.json({ order: updated });
    }),
  );

  router.get(
    "/orders/:orderNumber/status",
    requireCustomerAuth,
    asyncHandler(async (req, res) => {
      const { orderNumber } = req.params;
      if (!orderNumber) {
        throw new HttpError(400, "orderNumber is required");
      }

      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.email) {
        throw new HttpError(401, "You must be logged in to track this order");
      }

      const deviceFingerprint =
        typeof req.query.deviceFingerprint === "string"
          ? req.query.deviceFingerprint.trim()
          : undefined;
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;

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
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const rows = await getAdminQrCodes(branchCode);
      res.json({ rows });
    }),
  );

  router.post(
    "/admin/qr-codes",
    requireAdminAccess,
    asyncHandler(async (req, res) => {
      const { tableNumber, branchCode } = req.body as {
        tableNumber?: number;
        branchCode?: string;
      };
      if (!Number.isFinite(tableNumber) || Number(tableNumber) <= 0) {
        throw new HttpError(400, "Valid tableNumber is required");
      }
      await createAdminQrCode(
        branchCode || DEFAULT_BRANCH_CODE,
        Math.round(Number(tableNumber)),
      );
      const rows = await getAdminQrCodes(branchCode || DEFAULT_BRANCH_CODE);
      res.status(201).json({ rows });
    }),
  );

  router.post(
    "/admin/qr-codes/takeaway",
    requireAdminAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.body.branchCode === "string" ? req.body.branchCode : DEFAULT_BRANCH_CODE;
      const created = await createAdminTakeawayQrCode(branchCode);
      const rows = await getAdminQrCodes(branchCode);
      const createdRow = rows.find((row) => row.tableNumber === created.tableNumber);
      res.status(201).json({ rows, created: createdRow ?? null });
    }),
  );
  router.delete(
    "/admin/qr-codes/:id",
    requireAdminAccess,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      if (!id) {
        throw new HttpError(400, "id is required");
      }
      await deleteAdminQrCode(id);
      res.json({ ok: true });
    }),
  );

  router.get(
    "/dashboard/admin/earnings",
    requireAdminAccess,
    asyncHandler(async (_req, res) => {
      const payload = await getAdminEarnings();
      res.json(payload);
    }),
  );

  router.get(
    "/dashboard/owner/cards",
    requireOwnerAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const cards = await getOwnerDashboardCards(branchCode);
      res.json(cards);
    }),
  );

  router.get(
    "/dashboard/owner/sales-trend",
    requireOwnerAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const rangeDays = Number(req.query.rangeDays ?? 30) || 30;
      const trend = await getOwnerSalesTrend(branchCode, rangeDays);
      res.json({ points: trend });
    }),
  );

  router.get(
    "/dashboard/owner/top-items",
    requireOwnerAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const rangeDays = Number(req.query.rangeDays ?? 30) || 30;
      const rows = await getOwnerTopSellingItems(branchCode, rangeDays);
      res.json({ rows });
    }),
  );

  router.get(
    "/dashboard/owner/table-management",
    requireOwnerAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const snapshot = await getTableSnapshot(branchCode);
      res.json(snapshot);
    }),
  );

  router.get(
    "/dashboard/owner/menu-insights",
    requireOwnerAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const dateRange =
        typeof req.query.dateRange === "string"
          ? (req.query.dateRange as "today" | "this-week" | "this-month")
          : "today";
      const category =
        typeof req.query.category === "string" ? req.query.category : "all";
      const payload = await getOwnerMenuInsights(branchCode, dateRange, category);
      res.json(payload);
    }),
  );

  router.get(
    "/dashboard/owner/orders/summary",
    requireOwnerAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const summary = await getOwnerOrdersSummary(branchCode);
      res.json(summary);
    }),
  );

  router.get(
    "/dashboard/owner/orders/trend",
    requireOwnerAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const mode = typeof req.query.mode === "string" ? req.query.mode : "day";
      if (mode === "hour") {
        const points = await getOwnerOrdersTrendByHourToday(branchCode);
        res.json({ points });
        return;
      }
      const rangeDays = Number(req.query.rangeDays ?? 7) || 7;
      const points = await getOwnerOrdersTrendByDay(branchCode, rangeDays);
      res.json({ points });
    }),
  );

  router.get(
    "/dashboard/owner/orders/table",
    requireOwnerAccess,
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : DEFAULT_BRANCH_CODE;
      const rangeDays = Number(req.query.rangeDays ?? 31) || 31;
      const rows = await getOwnerOrdersTable(branchCode, rangeDays);
      res.json({ rows });
    }),
  );

  router.post(
    "/push/subscribe",
    requireCustomerAuth,
    asyncHandler(async (req, res) => {
      const { subscription } = req.body as {
        subscription?: PushSubscriptionPayload;
      };

      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.id) {
        throw new HttpError(401, "You must be logged in to subscribe for notifications");
      }

      if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
        throw new HttpError(400, "Valid PushSubscription is required");
      }

      upsertPushSubscription(authenticatedUser.id, subscription);
      res.status(201).json({ ok: true });
    }),
  );

  router.post(
    "/push/unsubscribe",
    requireCustomerAuth,
    asyncHandler(async (req, res) => {
      const { endpoint } = req.body as { endpoint?: string };
      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.id) {
        throw new HttpError(401, "You must be logged in to unsubscribe notifications");
      }
      if (!endpoint) {
        throw new HttpError(400, "endpoint is required");
      }

      removePushSubscription(authenticatedUser.id, endpoint);
      res.json({ ok: true });
    }),
  );

  router.post(
    "/orders/track/start",
    requireCustomerAuth,
    asyncHandler(async (req, res) => {
      const { orderNumber, tableLabel } = req.body as {
        orderNumber?: string;
        tableLabel?: string;
      };
      const authenticatedUser = req.authenticatedUser;
      if (!authenticatedUser?.id) {
        throw new HttpError(401, "You must be logged in to start order tracking");
      }

      if (!orderNumber || !tableLabel) {
        throw new HttpError(400, "orderNumber and tableLabel are required");
      }

      await startOrderPushTracking({ userId: authenticatedUser.id, orderNumber, tableLabel });
      res.status(202).json({ ok: true });
    }),
  );

  if (enableLegacyCustomerApis) {
  router.get(
    "/users/:username",
    asyncHandler(async (req, res) => {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        throw new HttpError(404, "User not found");
      }
      res.json({ user });
    }),
  );

  router.post(
    "/users",
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
    asyncHandler(async (req, res) => {
      const { tableId, deviceFingerprint } = req.body as { tableId?: string; deviceFingerprint?: string };
      if (!tableId || !deviceFingerprint) {
        throw new HttpError(400, "tableId and deviceFingerprint are required");
      }

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
    asyncHandler(async (req, res) => {
      const { tableSessionId, personId, items } = req.body as {
        tableSessionId?: string;
        personId?: string;
        items?: Array<{ menuItemId: string; qty: number; price: number; notes?: string }>;
      };

      if (!tableSessionId || !personId || !Array.isArray(items) || items.length === 0) {
        throw new HttpError(400, "tableSessionId, personId and items are required");
      }

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
    asyncHandler(async (req, res) => {
      const { tableSessionId, personId, menuItemId } = req.body as {
        tableSessionId?: string;
        personId?: string;
        menuItemId?: string;
      };

      if (!tableSessionId || !personId || !menuItemId) {
        throw new HttpError(400, "tableSessionId, personId and menuItemId are required");
      }

      const removed = await storage.removePersonalItem({ tableSessionId, personId, menuItemId });
      res.json({ removed });
    }),
  );

  router.post(
    "/group-orders",
    asyncHandler(async (req, res) => {
      const { tableSessionId, personId } = req.body as { tableSessionId?: string; personId?: string };
      if (!tableSessionId || !personId) {
        throw new HttpError(400, "tableSessionId and personId are required");
      }

      const result = await storage.createGroupOrder(tableSessionId, personId);
      res.status(201).json(result);
    }),
  );

  router.post(
    "/group-orders/:groupOrderId/join",
    asyncHandler(async (req, res) => {
      const { groupOrderId } = req.params;
      const { personId } = req.body as { personId?: string };
      if (!groupOrderId || !personId) {
        throw new HttpError(400, "groupOrderId and personId are required");
      }

      const result = await storage.joinGroupOrder(groupOrderId, personId);
      res.json(result);
    }),
  );

  router.post(
    "/group-orders/:groupOrderId/close",
    asyncHandler(async (req, res) => {
      const { groupOrderId } = req.params;
      if (!groupOrderId) {
        throw new HttpError(400, "groupOrderId is required");
      }

      const groupOrder = await storage.closeGroupOrder(groupOrderId);
      res.json({ groupOrder });
    }),
  );

  router.post(
    "/table-session/:tableSessionId/finish",
    asyncHandler(async (req, res) => {
      const { tableSessionId } = req.params;
      if (!tableSessionId) {
        throw new HttpError(400, "tableSessionId is required");
      }

      const tableSession = await storage.finishTableSession(tableSessionId);
      res.json({ tableSession });
    }),
  );

  router.get(
    "/table-session/:tableSessionId/state",
    asyncHandler(async (req, res) => {
      const { tableSessionId } = req.params;
      const { personId } = req.query as { personId?: string };
      if (!tableSessionId || !personId) {
        throw new HttpError(400, "tableSessionId and personId are required");
      }

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












