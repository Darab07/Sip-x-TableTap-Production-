import { Router, type Express, type RequestHandler } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { insertUserSchema } from "@shared/schema";
import { storage } from "./storage";
import { HttpError } from "./errors";
import {
  getWebPushPublicKey,
  removePushSubscription,
  startOrderPushTracking,
  type PushSubscriptionPayload,
  upsertPushSubscription,
} from "./push";
import {
  createAdminQrCode,
  deleteAdminQrCode,
  getAdminEarnings,
  getAdminQrCodes,
  getManagerLiveOrders,
  getManagerMenuItems,
  getMenuCatalogForBranch,
  checkInTableFromQr,
  getOrderTrackerStatus,
  getPublicTableAccess,
  getOutletOptions,
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
  updateManagerMenuItem,
  updateManagerTableAvailability,
  updateOrderStatusFromManager,
} from "./supabase-data";

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
    "/outlets",
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
          : "f7-islamabad";
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
          : "f7-islamabad";
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
        branchCode || "f7-islamabad",
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
          : "f7-islamabad";
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
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
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
    asyncHandler(async (req, res) => {
      let order;
      try {
        order = await placeOrderInSupabase(req.body);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to place order";
        throw new HttpError(400, message);
      }
      res.status(201).json({ order });
    }),
  );

  router.get(
    "/manager/live-orders",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
      const orders = await getManagerLiveOrders(branchCode);
      res.json({ orders });
    }),
  );

  router.get(
    "/manager/menu-items",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
      const items = await getManagerMenuItems(branchCode);
      res.json({ items });
    }),
  );

  router.patch(
    "/manager/menu-items/:itemId",
    asyncHandler(async (req, res) => {
      const { itemId } = req.params;
      const { price, available } = req.body as {
        price?: number;
        available?: boolean;
      };
      if (!itemId) {
        throw new HttpError(400, "itemId is required");
      }
      const item = await updateManagerMenuItem({ id: itemId, price, available });
      res.json({ item });
    }),
  );

  router.get(
    "/manager/table-management",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
      const snapshot = await getTableSnapshot(branchCode);
      res.json(snapshot);
    }),
  );

  router.patch(
    "/manager/tables/:tableId/availability",
    asyncHandler(async (req, res) => {
      const { tableId } = req.params;
      const { availability } = req.body as {
        availability?: "available" | "unavailable";
      };
      if (!tableId || !availability) {
        throw new HttpError(400, "tableId and availability are required");
      }
      const table = await updateManagerTableAvailability({ tableId, availability });
      res.json({ table });
    }),
  );

  router.patch(
    "/manager/orders/:orderNumber/status",
    asyncHandler(async (req, res) => {
      const { orderNumber } = req.params;
      const { status } = req.body as {
        status?: "accepted" | "preparing" | "ready" | "completed";
      };
      if (!orderNumber || !status) {
        throw new HttpError(400, "orderNumber and status are required");
      }
      const updated = await updateOrderStatusFromManager({ orderNumber, status });
      res.json({ order: updated });
    }),
  );

  router.get(
    "/orders/:orderNumber/status",
    asyncHandler(async (req, res) => {
      const { orderNumber } = req.params;
      if (!orderNumber) {
        throw new HttpError(400, "orderNumber is required");
      }
      const order = await getOrderTrackerStatus(orderNumber);
      res.json({ order });
    }),
  );

  router.get(
    "/admin/qr-codes",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
      const rows = await getAdminQrCodes(branchCode);
      res.json({ rows });
    }),
  );

  router.post(
    "/admin/qr-codes",
    asyncHandler(async (req, res) => {
      const { tableNumber, branchCode } = req.body as {
        tableNumber?: number;
        branchCode?: string;
      };
      if (!Number.isFinite(tableNumber) || Number(tableNumber) <= 0) {
        throw new HttpError(400, "Valid tableNumber is required");
      }
      await createAdminQrCode(
        branchCode || "f7-islamabad",
        Math.round(Number(tableNumber)),
      );
      const rows = await getAdminQrCodes(branchCode || "f7-islamabad");
      res.status(201).json({ rows });
    }),
  );

  router.delete(
    "/admin/qr-codes/:id",
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
    asyncHandler(async (_req, res) => {
      const payload = await getAdminEarnings();
      res.json(payload);
    }),
  );

  router.get(
    "/dashboard/owner/cards",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
      const cards = await getOwnerDashboardCards(branchCode);
      res.json(cards);
    }),
  );

  router.get(
    "/dashboard/owner/sales-trend",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
      const rangeDays = Number(req.query.rangeDays ?? 30) || 30;
      const trend = await getOwnerSalesTrend(branchCode, rangeDays);
      res.json({ points: trend });
    }),
  );

  router.get(
    "/dashboard/owner/top-items",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
      const rangeDays = Number(req.query.rangeDays ?? 30) || 30;
      const rows = await getOwnerTopSellingItems(branchCode, rangeDays);
      res.json({ rows });
    }),
  );

  router.get(
    "/dashboard/owner/table-management",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
      const snapshot = await getTableSnapshot(branchCode);
      res.json(snapshot);
    }),
  );

  router.get(
    "/dashboard/owner/menu-insights",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
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
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
      const summary = await getOwnerOrdersSummary(branchCode);
      res.json(summary);
    }),
  );

  router.get(
    "/dashboard/owner/orders/trend",
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
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
    asyncHandler(async (req, res) => {
      const branchCode =
        typeof req.query.branchCode === "string"
          ? req.query.branchCode
          : "f7-islamabad";
      const rangeDays = Number(req.query.rangeDays ?? 31) || 31;
      const rows = await getOwnerOrdersTable(branchCode, rangeDays);
      res.json({ rows });
    }),
  );

  router.post(
    "/push/subscribe",
    asyncHandler(async (req, res) => {
      const { userId, subscription } = req.body as {
        userId?: string;
        subscription?: PushSubscriptionPayload;
      };

      if (!userId || !subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
        throw new HttpError(400, "userId and valid PushSubscription are required");
      }

      upsertPushSubscription(userId, subscription);
      res.status(201).json({ ok: true });
    }),
  );

  router.post(
    "/push/unsubscribe",
    asyncHandler(async (req, res) => {
      const { userId, endpoint } = req.body as { userId?: string; endpoint?: string };
      if (!userId || !endpoint) {
        throw new HttpError(400, "userId and endpoint are required");
      }

      removePushSubscription(userId, endpoint);
      res.json({ ok: true });
    }),
  );

  router.post(
    "/orders/track/start",
    asyncHandler(async (req, res) => {
      const { userId, orderNumber, tableLabel } = req.body as {
        userId?: string;
        orderNumber?: string;
        tableLabel?: string;
      };

      if (!userId || !orderNumber || !tableLabel) {
        throw new HttpError(400, "userId, orderNumber and tableLabel are required");
      }

      await startOrderPushTracking({ userId, orderNumber, tableLabel });
      res.status(202).json({ ok: true });
    }),
  );

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

  return router;
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", buildApiRouter());

  const httpServer = createServer(app);
  return httpServer;
}
