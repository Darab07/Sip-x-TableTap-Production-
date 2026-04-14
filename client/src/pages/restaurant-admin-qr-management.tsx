import React from "react";
import { useLocation } from "wouter";
import {
  Copy,
  ExternalLink,
  PlusCircle,
  QrCode,
  Trash2,
} from "lucide-react";
import {
  createAdminQrCodeApi,
  createAdminTakeawayQrCodeApi,
  deleteAdminQrCodeApi,
  fetchAdminQrCodes,
} from "@/lib/tabletap-supabase-api";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { supabaseBrowser } from "@/lib/supabase";
import { clearRestaurantAuthentication } from "@/lib/restaurant-auth";
import { useActiveBranchCode } from "@/lib/active-branch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type QrCodeRecord = {
  id: string;
  tableNumber: number;
  tableLabel: string;
  qrType: "table" | "takeaway";
  targetUrl: string;
  createdAt: string;
};

const DEFAULT_BRANCH_CODE =
  String(import.meta.env.VITE_DEFAULT_BRANCH_CODE ?? "").trim() || "f7-islamabad";

const normalizeTargetUrl = (targetUrl: string) => {
  const normalized = String(targetUrl ?? "").trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (typeof window === "undefined") return normalized;
  return `${window.location.origin}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
};

const createQrImageUrl = (url: string, size = 280) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    url,
  )}`;

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function RestaurantAdminQrManagement() {
  const activeBranchCode = useActiveBranchCode(DEFAULT_BRANCH_CODE);
  const [, setLocation] = useLocation();
  const [tableInput, setTableInput] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState("");
  const [qrCodes, setQrCodes] = React.useState<QrCodeRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const ensureAuthenticatedSession = async () => {
    if (!supabaseBrowser) {
      setStatusMessage("Supabase auth is not configured.");
      return false;
    }

    const { data } = await supabaseBrowser.auth.getSession();
    if (!data.session?.access_token) {
      clearRestaurantAuthentication();
      setStatusMessage("Session expired. Please log in again.");
      setLocation("/restaurant");
      return false;
    }

    return true;
  };

  React.useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const load = async () => {
      if (cancelled || inFlight) return;
      if (typeof document !== "undefined" && document.hidden) return;

      if (supabaseBrowser) {
        const { data } = await supabaseBrowser.auth.getSession();
        if (!data.session?.access_token) {
          if (!cancelled) {
            clearRestaurantAuthentication();
            setStatusMessage("Session expired. Please log in again.");
            setLocation("/restaurant");
          }
          return;
        }
      }

      inFlight = true;
      try {
        const response = await fetchAdminQrCodes(activeBranchCode);
        if (!cancelled) {
          setQrCodes(response.rows);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message.toLowerCase() : "";
          if (message.includes("missing authorization bearer token") || message.includes("invalid or expired authentication token")) {
            clearRestaurantAuthentication();
            setStatusMessage("Session expired. Please log in again.");
            setLocation("/restaurant");
            return;
          }
          console.warn("QR codes sync failed:", error);
        }
      } finally {
        inFlight = false;
        setIsLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 15000);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void load();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeBranchCode, setLocation]);

  React.useEffect(() => {
    if (!qrCodes.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !qrCodes.some((entry) => entry.id === selectedId)) {
      setSelectedId(qrCodes[0].id);
    }
  }, [qrCodes, selectedId]);

  const selectedQr =
    qrCodes.find((entry) => entry.id === selectedId) ?? qrCodes[0] ?? null;

  const selectedQrUrl = selectedQr
    ? normalizeTargetUrl(selectedQr.targetUrl)
    : null;

  const handleCreateOrUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number.parseInt(tableInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStatusMessage("Enter a valid table number (1 or higher).");
      return;
    }

    if (!(await ensureAuthenticatedSession())) {
      return;
    }

    try {
      const existingId = qrCodes.find((entry) => entry.tableNumber === parsed)?.id;
      const response = await createAdminQrCodeApi(parsed, activeBranchCode);
      setQrCodes(response.rows);
      const selected = response.rows.find((entry) => entry.tableNumber === parsed);
      setSelectedId(selected?.id ?? existingId ?? null);
      setStatusMessage(`QR ${existingId ? "updated" : "created"} for Table${parsed}.`);
      setTableInput("");
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (
        message.includes("missing authorization bearer token") ||
        message.includes("invalid or expired authentication token")
      ) {
        setStatusMessage("Session expired. Please log in again.");
        return;
      }
      console.warn("Failed to create QR code:", error);
      setStatusMessage("Unable to create QR code right now.");
    }
  };

  const handleCreateTakeaway = async () => {
    if (!(await ensureAuthenticatedSession())) {
      return;
    }

    try {
      const response = await createAdminTakeawayQrCodeApi(activeBranchCode);
      setQrCodes(response.rows);
      if (response.created?.id) {
        setSelectedId(response.created.id);
      }
      setStatusMessage(`Takeaway QR created (${response.created?.tableLabel ?? "Takeaway"}).`);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (
        message.includes("missing authorization bearer token") ||
        message.includes("invalid or expired authentication token")
      ) {
        setStatusMessage("Session expired. Please log in again.");
        return;
      }
      console.warn("Failed to create takeaway QR code:", error);
      setStatusMessage("Unable to create takeaway QR code right now.");
    }
  };
  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setStatusMessage("QR link copied.");
    } catch {
      setStatusMessage("Unable to copy link on this browser.");
    }
  };

  const handleDelete = async (id: string, tableLabel: string) => {
    if (!window.confirm(`Delete QR code for ${tableLabel}?`)) {
      return;
    }

    if (!(await ensureAuthenticatedSession())) {
      return;
    }

    try {
      await deleteAdminQrCodeApi(id);
      setQrCodes((previous) => previous.filter((entry) => entry.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
      setStatusMessage(`Deleted QR code for ${tableLabel}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (
        message.includes("missing authorization bearer token") ||
        message.includes("invalid or expired authentication token")
      ) {
        setStatusMessage("Session expired. Please log in again.");
        return;
      }
      console.warn("Failed to delete QR code:", error);
      setStatusMessage("Unable to delete QR code right now.");
    }
  };

  return (
    <SidebarProvider
      style={
        {
          ["--sidebar-width" as string]: "16rem",
          ["--header-height" as string]: "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" dashboardRole="admin" />
      <SidebarInset>
        <SiteHeader title="QR Management" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="grid gap-4 p-4 md:p-6">
              <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Create Table QR Code</CardTitle>
                    <CardDescription>
                      Generate a QR for a table number. Scanning opens the menu for that exact table.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleCreateOrUpdate} className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        value={tableInput}
                        onChange={(event) => setTableInput(event.target.value)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Enter table number (e.g. 3)"
                        className="sm:max-w-xs"
                      />
                      <Button type="submit">
                        <PlusCircle />
                        Generate Table QR
                      </Button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => void handleCreateTakeaway()}>
                        <PlusCircle />
                        Generate Takeaway QR
                      </Button>
                    </div>
                    {statusMessage ? (
                      <p className="text-sm text-muted-foreground">{statusMessage}</p>
                    ) : null}
                    <p className="text-sm text-muted-foreground">
                      Example URL: <span className="font-medium">/karo/menu?table=Table3&amp;branchCode=karo-dha-phase-7</span>. Takeaway links are generated automatically.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Selected QR Preview</CardTitle>
                    <CardDescription>
                      {selectedQr
                        ? `${selectedQr.tableLabel} opens directly to its menu session.`
                        : "Select or create a table/takeaway QR code to preview."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="mx-auto h-52 w-52 rounded-lg" />
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : selectedQr && selectedQrUrl ? (
                      <>
                        <div className="mx-auto w-fit rounded-lg border bg-white p-3">
                          <img
                            src={createQrImageUrl(selectedQrUrl, 260)}
                            alt={`${selectedQr.tableLabel} QR code`}
                            className="h-52 w-52"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{selectedQr.tableLabel}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(selectedQr.createdAt)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleCopyLink(selectedQrUrl)}
                          >
                            <Copy />
                            Copy Link
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => window.open(selectedQrUrl, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink />
                            Open Menu
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                        No QR code created yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Existing Table QR Codes</CardTitle>
                  <CardDescription>
                    View all generated QR codes, then preview, open, copy or delete any table QR.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table</TableHead>
                        <TableHead>QR</TableHead>
                        <TableHead>Target URL</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6">
                            <div className="space-y-2">
                              <Skeleton className="h-10 w-full" />
                              <Skeleton className="h-10 w-full" />
                              <Skeleton className="h-10 w-full" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : qrCodes.length ? (
                        qrCodes.map((entry) => {
                          const url = normalizeTargetUrl(entry.targetUrl);
                          return (
                            <TableRow
                              key={entry.id}
                              className="cursor-pointer"
                              data-state={selectedId === entry.id ? "selected" : undefined}
                              onClick={() => setSelectedId(entry.id)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <span>{entry.tableLabel}</span>
                                  <Badge variant="outline">{entry.qrType === "takeaway" ? "Takeaway" : "Table"}</Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <img
                                  src={createQrImageUrl(url, 70)}
                                  alt={`${entry.tableLabel} QR`}
                                  className="h-12 w-12 rounded border"
                                />
                              </TableCell>
                              <TableCell className="max-w-[360px] truncate text-muted-foreground">
                                {url}
                              </TableCell>
                              <TableCell>{formatTimestamp(entry.createdAt)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleCopyLink(url);
                                    }}
                                  >
                                    <Copy />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      window.open(url, "_blank", "noopener,noreferrer");
                                    }}
                                  >
                                    <ExternalLink />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleDelete(entry.id, entry.tableLabel);
                                    }}
                                  >
                                    <Trash2 />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                            No table QR codes yet. Create your first one above.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="size-4" />
                    How it works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>1. Create a QR for a table number (for example, table 3).</p>
                  <p>2. Print and place that QR on the matching table.</p>
                  <p>3. When scanned, guests open the row-specific `targetUrl` for that outlet (for example `/sip/menu?...` or `/karo/menu?...`).</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}








