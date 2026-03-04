import { Router, type Express, type RequestHandler } from "express";
import { createServer, type Server } from "http";
import { insertUserSchema } from "@shared/schema";
import { storage } from "./storage";
import { HttpError } from "./errors";

type AsyncRouteHandler = (
  ...args: Parameters<RequestHandler>
) => Promise<unknown> | unknown;

const asyncHandler = (handler: AsyncRouteHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

const buildApiRouter = (): Router => {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  router.get("/test", (_req, res) => {
    res.json({ message: "Server is working!" });
  });

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
