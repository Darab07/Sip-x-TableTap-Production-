self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Order update",
      body: event.data.text(),
    };
  }

  const title = payload.title || "Order update";
  const options = {
    body: payload.body || "You have a new order status update.",
    icon: payload.icon || "/logo.png",
    badge: payload.badge || "/logo.png",
    tag: payload.tag || "order-status",
    data: payload.data || { url: "/menu" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/menu";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    }),
  );
});

