import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchOutletOrderingSettings,
  updateOutletOrderingSettingsApi,
  type OutletOrderingSettingsApi,
} from "@/lib/tabletap-supabase-api";

const DEFAULT_BRANCH_CODE =
  String(import.meta.env.VITE_DEFAULT_BRANCH_CODE ?? "").trim() || "f7-islamabad";

const DEFAULT_SETTINGS: OutletOrderingSettingsApi = {
  branchCode: DEFAULT_BRANCH_CODE,
  serviceStartTime: "08:00",
  serviceEndTime: "01:00",
  lastTakeawayTime: "00:30",
  timezone: "Asia/Karachi",
  serviceHoursLabel: "8:00 AM - 1:00 AM",
  lastTakeawayLabel: "12:30 AM",
};

type OutletOrderingSettingsCardProps = {
  branchCode?: string;
  className?: string;
};

export function OutletOrderingSettingsCard({
  branchCode = DEFAULT_BRANCH_CODE,
  className,
}: OutletOrderingSettingsCardProps) {
  const [settings, setSettings] = React.useState<OutletOrderingSettingsApi>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const response = await fetchOutletOrderingSettings(branchCode);
        if (!cancelled) {
          setSettings(response.settings);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Unable to load ordering schedule";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [branchCode]);

  const updateField = (key: "serviceStartTime" | "serviceEndTime" | "lastTakeawayTime") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSettings((current) => ({ ...current, [key]: value }));
      setSuccess(null);
    };

  const saveSettings = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await updateOutletOrderingSettingsApi({
        branchCode,
        serviceStartTime: settings.serviceStartTime,
        serviceEndTime: settings.serviceEndTime,
        lastTakeawayTime: settings.lastTakeawayTime,
        timezone: settings.timezone,
      });
      setSettings(response.settings);
      setSuccess("Restaurant timings updated.");
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unable to update ordering schedule";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Ordering Timings</CardTitle>
        <CardDescription>
          Set open hours and last takeaway order time for customer ordering access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="serviceStart">Service starts</Label>
            <Input
              id="serviceStart"
              type="time"
              value={settings.serviceStartTime}
              onChange={updateField("serviceStartTime")}
              disabled={isLoading || isSaving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="serviceEnd">Service ends</Label>
            <Input
              id="serviceEnd"
              type="time"
              value={settings.serviceEndTime}
              onChange={updateField("serviceEndTime")}
              disabled={isLoading || isSaving}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lastTakeaway">Last takeaway time</Label>
          <Input
            id="lastTakeaway"
            type="time"
            value={settings.lastTakeawayTime}
            onChange={updateField("lastTakeawayTime")}
            disabled={isLoading || isSaving}
          />
        </div>

        <Button onClick={() => void saveSettings()} disabled={isLoading || isSaving}>
          {isSaving ? "Saving..." : "Save timings"}
        </Button>
      </CardContent>
    </Card>
  );
}