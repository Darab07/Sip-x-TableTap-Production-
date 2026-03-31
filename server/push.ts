import webpush from "web-push";
import { log } from "./app";

type OrderStatus = "placed" | "confirmed" | "preparing" | "served";

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
const vapidSubject = process.env.WEB_PUSH_SUBJECT || "mailto:tabletap@example.com";

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
const orderTimers = new Map<string, NodeJS.Timeout[]>();

const ORDER_STATUS_FLOW: Array<{ status: OrderStatus; delayMs: number }> = [
  { status: "confirmed", delayMs: 5_000 },
  { status: "preparing", delayMs: 15_000 },
  { status: "served", delayMs: 45_000 },
];

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
      url: "/menu",
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
  const existing = userSubscriptions.get(userId);
  if (!existing) return;

  existing.delete(endpoint);
  if (existing.size === 0) {
    userSubscriptions.delete(userId);
  }
};

export const pushOrderStatus = async (
  userId: string,
  orderNumber: string,
  tableLabel: string,
  status: OrderStatus,
) => {
  const existing = userSubscriptions.get(userId);
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
          removePushSubscription(userId, subscription.endpoint);
          return;
        }
        log(`Failed to send push: ${String(error)}`, "push");
      }
    }),
  );
};

export const cancelOrderPushTracking = (orderNumber: string) => {
  const timers = orderTimers.get(orderNumber);
  if (!timers) return;
  timers.forEach((timerId) => clearTimeout(timerId));
  orderTimers.delete(orderNumber);
};

export const startOrderPushTracking = async ({ userId, orderNumber, tableLabel }: OrderPushInput) => {
  cancelOrderPushTracking(orderNumber);

  await pushOrderStatus(userId, orderNumber, tableLabel, "placed");

  const timeoutIds = ORDER_STATUS_FLOW.map(({ status, delayMs }) =>
    setTimeout(() => {
      void pushOrderStatus(userId, orderNumber, tableLabel, status);
    }, delayMs),
  );

  orderTimers.set(orderNumber, timeoutIds);
};
