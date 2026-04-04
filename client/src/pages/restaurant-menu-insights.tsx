import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { MenuInsightsOverview } from "@/components/menu-insights-overview";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type RestaurantMenuInsightsProps = {
  dashboardRole?: "owner" | "manager" | "admin";
};

export default function RestaurantMenuInsights({
  dashboardRole,
}: RestaurantMenuInsightsProps) {
  return (
    <SidebarProvider
      style={
        {
          ["--sidebar-width" as string]: "16rem",
          ["--header-height" as string]: "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" dashboardRole={dashboardRole} />
      <SidebarInset>
        <SiteHeader title="Menu Insights" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <MenuInsightsOverview />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
