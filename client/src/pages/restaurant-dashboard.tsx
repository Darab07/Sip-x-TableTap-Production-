import React from "react";
import { z } from "zod";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable, schema } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { fetchOwnerTopItems } from "@/lib/tabletap-supabase-api";

export default function RestaurantDashboard() {
  const [rows, setRows] = React.useState<z.infer<typeof schema>[]>([]);

  React.useEffect(() => {
    let mounted = true;
    fetchOwnerTopItems("f7-islamabad", 30)
      .then((response) => {
        if (!mounted || !response.rows.length) return;
        setRows(
          response.rows.map((row, index) => ({
            id: index + 1,
            itemName: row.itemName,
            quantitySold: row.quantitySold,
            revenueGenerated: row.revenueGenerated,
            sessionsOrderedIn: row.sessionsOrderedIn,
            soldAt: row.soldAt,
          })),
        );
      })
      .catch((error) => {
        console.warn("Top-items sync failed:", error);
      });

    return () => {
      mounted = false;
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
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Dashboard" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
              <SectionCards />
              <ChartAreaInteractive />
              <DataTable data={rows} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
