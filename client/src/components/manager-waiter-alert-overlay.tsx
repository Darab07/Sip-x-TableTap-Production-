import * as React from "react";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  fetchManagerWaiterCallsApi,
  type WaiterCallEventApi,
} from "@/lib/tabletap-supabase-api";

type WaiterAlert = WaiterCallEventApi & {
  expiresAtMs: number;
};

const WAITER_ALERT_DURATION_MS = 6000;
const WAITER_SINCE_KEY = "manager_waiter_calls_since";

export function ManagerWaiterAlertOverlay() {
  const [alerts, setAlerts] = React.useState<WaiterAlert[]>([]);
  const [tickerNow, setTickerNow] = React.useState(Date.now());
  const sinceRef = React.useRef(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(WAITER_SINCE_KEY);
    const parsed = Number(raw ?? 0);
    sinceRef.current = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  };

  const syncAlerts = React.useCallback(async () => {
    try {
      const response = await fetchManagerWaiterCallsApi(sinceRef.current);
      if (!Array.isArray(response.events) || response.events.length === 0) {
        return;
      }

      const newestSince = response.events.reduce(
        (maxSince, event) => Math.max(maxSince, Number(event.createdAtMs ?? 0)),
        sinceRef.current,
      );
      sinceRef.current = newestSince;
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(WAITER_SINCE_KEY, String(newestSince));
      }

      const now = Date.now();
      const nextAlerts: WaiterAlert[] = response.events.map((event) => ({
        ...event,
        expiresAtMs: now + WAITER_ALERT_DURATION_MS,
      }));

      setAlerts((current) => [...nextAlerts, ...current].slice(0, 6));
    } catch (error) {
      console.warn("Waiter alerts sync failed.", error);
    }
  }, []);

  React.useEffect(() => {
    void syncAlerts();
    const interval = window.setInterval(() => {
      void syncAlerts();
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [syncAlerts]);

  React.useEffect(() => {
    if (alerts.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      setTickerNow(now);
      setAlerts((current) => current.filter((alert) => alert.expiresAtMs > now));
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, [alerts.length]);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] w-[min(92vw,24rem)] space-y-2">
      {alerts.map((alert) => {
        const progress = Math.max(
          0,
          Math.min(
            100,
            ((alert.expiresAtMs - tickerNow) / WAITER_ALERT_DURATION_MS) * 100,
          ),
        );

        return (
          <Card
            key={alert.id}
            className="pointer-events-auto overflow-hidden border-[#91bda6] bg-[#eaf4ef] shadow-md"
          >
            <div className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-start gap-2">
                <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-[#2f6f55]" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Waiter call: {alert.tableLabel}
                  </p>
                  <p className="text-xs text-gray-700">
                    A customer requested assistance.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-gray-500 hover:bg-[#d6e7de] hover:text-gray-700"
                onClick={() => dismissAlert(alert.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="h-1 w-full bg-[#d6e7de]">
              <div
                className="h-full bg-[#91bda6] transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
