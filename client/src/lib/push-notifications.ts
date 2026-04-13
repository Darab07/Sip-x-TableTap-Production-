import { supabaseBrowser } from "./supabase";

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
  "/api";

export interface PushSubscriptionResult {
  subscribed: boolean;
  reason?: string;
}

const isIosDevice = () =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

const isRunningStandalone = () => {
  if (typeof window === "undefined") return false;
  const standaloneMedia = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const standaloneNavigator = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(standaloneMedia || standaloneNavigator);
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const getAuthHeader = async () => {
  if (!supabaseBrowser) {
    throw new Error("Supabase auth is not configured.");
  }

  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Please log in again.");
  }

  return { Authorization: `Bearer ${token}` };
};

const getPushPublicKey = async () => {
  const res = await fetch(`${API_BASE}/push/public-key`);
  if (!res.ok) {
    throw new Error(`Failed to fetch push public key (${res.status})`);
  }
  const body = (await res.json()) as { publicKey?: string };
  if (!body.publicKey) {
    throw new Error("Push public key not available");
  }
  return body.publicKey;
};

const registerServiceWorker = async () => {
  const registration = await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready.then(() => registration);
};

export const ensurePushSubscription = async () => {
  if (typeof window === "undefined") {
    return { subscribed: false, reason: "Push is only available in the browser." } satisfies PushSubscriptionResult;
  }

  if (!window.isSecureContext) {
    return {
      subscribed: false,
      reason: "Push requires HTTPS. HTTP LAN URLs like http://192.168.x.x are blocked on iPhone.",
    } satisfies PushSubscriptionResult;
  }

  if (isIosDevice() && !isRunningStandalone()) {
    return {
      subscribed: false,
      reason: "On iPhone, open this app from Home Screen (Add to Home Screen) to enable push notifications.",
    } satisfies PushSubscriptionResult;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return {
      subscribed: false,
      reason: "This browser does not support Web Push in the current mode.",
    } satisfies PushSubscriptionResult;
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    return {
      subscribed: false,
      reason: "Notification permission was not granted.",
    } satisfies PushSubscriptionResult;
  }

  const registration = await registerServiceWorker();
  const publicKey = await getPushPublicKey();

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to save push subscription (${res.status})`);
  }

  return { subscribed: true } satisfies PushSubscriptionResult;
};

export const startServerOrderPushTracking = async (input: {
  orderNumber: string;
  tableLabel: string;
}) => {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/orders/track/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Failed to start server order tracking (${res.status})`);
  }
};
