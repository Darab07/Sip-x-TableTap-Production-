import webpush from "web-push";
import { log } from "./app.js";

type OrderStatus = "placed" | "confirmed" | "preparing" | "ready" | "served";

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface OrderPushInput {
  userId: string;
  orderNumber: string;
  tableLabel: string;
}

interface PushNotificationPayload {
  title: string;
  body: string;
  tag: string;
  icon: string;
  badge: string;
  data: {
    url: string;
    orderNumber: string;
    status: OrderStatus;
  };
}

const configuredPublicKey = process.env.VAPID_PUBLIC_KEY;
const configuredPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.WEB_PUSH_SUBJECT || "mailto:noreply@tabletappk.com";

const vapidKeys =
  configuredPublicKey && configuredPrivateKey
    ? {
        publicKey: configuredPublicKey,
        privateKey: configuredPrivateKey,
      }
    : webpush.generateVAPIDKeys();

if (!configuredPublicKey || !configuredPrivateKey) {
  log(
    "VAPID keys not found in env. Generated ephemeral keys for this process; existing subscriptions reset after restart.",
    "push",
  );
}

webpush.setVapidDetails(vapidSubject, vapidKeys.publicKey, vapidKeys.privateKey);

const userSubscriptions = new Map<string, Map<string, PushSubscriptionPayload>>();
const orderWatchers = new Map<string, { userId: string; tableLabel: string }>();

const normalizeOrderStatus = (status: string): OrderStatus | null => {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "placed") return "placed";
  if (normalized === "confirmed" || normalized === "accepted") return "confirmed";
  if (normalized === "preparing") return "preparing";
  if (normalized === "ready") return "ready";
  if (normalized === "served" || normalized === "completed") return "served";
  return null;
};

const getStatusCopy = (status: OrderStatus, orderNumber: string, tableLabel: string) => {
  if (status === "placed") {
    return {
      title: "Order placed",
      body: `Order #${orderNumber} for ${tableLabel} was placed successfully.`,
    };
  }
  if (status === "confirmed") {
    return {
      title: "Order confirmed",
      body: `Order #${orderNumber} has been confirmed by the restaurant.`,
    };
  }
  if (status === "preparing") {
    return {
      title: "Order preparing",
      body: `Order #${orderNumber} is now being prepared.`,
    };
  }
  if (status === "ready") {
    return {
      title: "Order ready",
      body: `Order #${orderNumber} is ready.`,
    };
  }
  return {
    title: "Order served",
    body: `Order #${orderNumber} has been served. Enjoy your meal.`,
  };
};

const buildPayload = (
  status: OrderStatus,
  orderNumber: string,
  tableLabel: string,
): PushNotificationPayload => {
  const copy = getStatusCopy(status, orderNumber, tableLabel);
  return {
    title: copy.title,
    body: copy.body,
    tag: `order-${orderNumber}`,
    icon: "/logo.png",
    badge: "/logo.png",
    data: {
      url: "/sip/menu",
      orderNumber,
      status,
    },
  };
};

const isGoneSubscriptionError = (error: unknown) => {
  const statusCode =
    typeof error === "object" && error
      ? Number((error as { statusCode?: number; status?: number }).statusCode ?? (error as { status?: number }).status)
      : NaN;
  return statusCode === 404 || statusCode === 410;
};

const sendPush = async (
  subscription: PushSubscriptionPayload,
  payload: PushNotificationPayload,
) => {
  await webpush.sendNotification(subscription, JSON.stringify(payload));
};

export const getWebPushPublicKey = () => vapidKeys.publicKey;

export const upsertPushSubscription = (userId: string, subscription: PushSubscriptionPayload) => {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return;
  }

  const existing = userSubscriptions.get(normalizedUserId) ?? new Map<string, PushSubscriptionPayload>();
  existing.set(subscription.endpoint, subscription);
  userSubscriptions.set(normalizedUserId, existing);
};

export const removePushSubscription = (userId: string, endpoint: string) => {
  const normalizedUserId = String(userId || "").trim();
  const existing = userSubscriptions.get(normalizedUserId);
  if (!existing) return;

  existing.delete(endpoint);
  if (existing.size === 0) {
    userSubscriptions.delete(normalizedUserId);
  }
};

export const pushOrderStatus = async (
  userId: string,
  orderNumber: string,
  tableLabel: string,
  status: OrderStatus,
) => {
  const normalizedUserId = String(userId || "").trim();
  const existing = userSubscriptions.get(normalizedUserId);
  if (!existing || existing.size === 0) {
    return;
  }

  const payload = buildPayload(status, orderNumber, tableLabel);
  const subscriptions = Array.from(existing.values());

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendPush(subscription, payload);
      } catch (error) {
        if (isGoneSubscriptionError(error)) {
          removePushSubscription(normalizedUserId, subscription.endpoint);
          return;
        }
        log(`Failed to send push: ${String(error)}`, "push");
      }
    }),
  );
};

export const cancelOrderPushTracking = (orderNumber: string) => {
  orderWatchers.delete(orderNumber);
};

export const startOrderPushTracking = async ({ userId, orderNumber, tableLabel }: OrderPushInput) => {
  const normalizedUserId = String(userId || "").trim();
  const normalizedOrderNumber = String(orderNumber || "").trim();
  if (!normalizedUserId || !normalizedOrderNumber) {
    return;
  }

  orderWatchers.set(normalizedOrderNumber, {
    userId: normalizedUserId,
    tableLabel: String(tableLabel || "Table").trim() || "Table",
  });

  await pushOrderStatus(normalizedUserId, normalizedOrderNumber, tableLabel, "placed");
};

export const notifyTrackedOrderStatus = async (orderNumber: string, status: string) => {
  const normalizedOrderNumber = String(orderNumber || "").trim();
  if (!normalizedOrderNumber) {
    return;
  }

  const watcher = orderWatchers.get(normalizedOrderNumber);
  if (!watcher) {
    return;
  }

  const normalizedStatus = normalizeOrderStatus(status);
  if (!normalizedStatus) {
    return;
  }

  await pushOrderStatus(
    watcher.userId,
    normalizedOrderNumber,
    watcher.tableLabel,
    normalizedStatus,
  );

  if (normalizedStatus === "served") {
    orderWatchers.delete(normalizedOrderNumber);
  }
};
