import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminEarnings } from "@/lib/tabletap-supabase-api";

type EarningsSnapshot = {
  summary: {
    thisMonthSales: number;
    thisMonthFee: number;
    ytdFee: number;
    pendingInvoiceCount: number;
    pendingInvoiceAmount: number;
  };
  rows: Array<{
    id: string;
    restaurantName: string;
    branchLabel: string;
    monthLabel: string;
    ordersCount: number;
    grossSales: number;
    tableTapFee: number;
    invoiceStatus: "Current month" | "Ready to invoice";
  }>;
};

const formatMoney = (value: number) =>
  `Rs. ${value.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusBadgeClass = (value: "Current month" | "Ready to invoice") =>
  value === "Ready to invoice"
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-slate-200 bg-slate-50 text-slate-700";

export default function RestaurantAdminEarnings() {
  const [snapshot, setSnapshot] = React.useState<EarningsSnapshot>({
    summary: {
      thisMonthSales: 0,
      thisMonthFee: 0,
      ytdFee: 0,
      pendingInvoiceCount: 0,
      pendingInvoiceAmount: 0,
    },
    rows: [],
  });

  React.useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const load = async () => {
      if (cancelled || inFlight) return;
      if (typeof document !== "undefined" && document.hidden) return;
      inFlight = true;
      try {
        const data = await fetchAdminEarnings();
        if (!cancelled) {
          setSnapshot({
            summary: data.summary,
            rows: data.rows,
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Admin earnings sync failed:", error);
        }
      } finally {
        inFlight = false;
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 30000);
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
  }, []);

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
        <SiteHeader title="Earnings & Invoicing" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="*:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 px-4 md:grid-cols-2 xl:grid-cols-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card lg:px-6">
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">This Month Sales</p>
                    <CardTitle className="text-2xl font-semibold">
                      {formatMoney(snapshot.summary.thisMonthSales)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">TableTap Fee (1%)</p>
                    <CardTitle className="text-2xl font-semibold">
                      {formatMoney(snapshot.summary.thisMonthFee)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">Pending Invoices</p>
                    <CardTitle className="text-2xl font-semibold">
                      {snapshot.summary.pendingInvoiceCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm text-muted-foreground">Pending Invoice Amount</p>
                    <CardTitle className="text-2xl font-semibold">
                      {formatMoney(snapshot.summary.pendingInvoiceAmount)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card className="mx-4 lg:mx-6">
                <CardHeader>
                  <CardTitle>Monthly Commission Tracker</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    1% TableTap fee on completed bills. Use this table to prepare monthly invoices per outlet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    YTD fee collected: {formatMoney(snapshot.summary.ytdFee)}
                  </p>
                </CardHeader>
                <CardContent>
                  {snapshot.rows.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No completed bill data found yet.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 md:hidden">
                        {snapshot.rows.map((row) => (
                          <div key={row.id} className="rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">{row.restaurantName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {row.branchLabel} - {row.monthLabel}
                                </p>
                              </div>
                              <Badge variant="outline" className={statusBadgeClass(row.invoiceStatus)}>
                                {row.invoiceStatus}
                              </Badge>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Orders</p>
                                <p className="text-sm font-medium">{row.ordersCount}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Gross Sales</p>
                                <p className="text-sm font-medium">{formatMoney(row.grossSales)}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground">TableTap Fee (1%)</p>
                                <p className="text-sm font-medium">{formatMoney(row.tableTapFee)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Restaurant</TableHead>
                              <TableHead>Branch</TableHead>
                              <TableHead>Month</TableHead>
                              <TableHead className="text-right">Completed Orders</TableHead>
                              <TableHead className="text-right">Gross Sales</TableHead>
                              <TableHead className="text-right">TableTap Fee (1%)</TableHead>
                              <TableHead>Invoice Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {snapshot.rows.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="font-medium">{row.restaurantName}</TableCell>
                                <TableCell>{row.branchLabel}</TableCell>
                                <TableCell>{row.monthLabel}</TableCell>
                                <TableCell className="text-right">{row.ordersCount}</TableCell>
                                <TableCell className="text-right">{formatMoney(row.grossSales)}</TableCell>
                                <TableCell className="text-right">{formatMoney(row.tableTapFee)}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={statusBadgeClass(row.invoiceStatus)}
                                  >
                                    {row.invoiceStatus}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
