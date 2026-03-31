import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { OrdersCards } from "@/components/orders-cards";
import { OrdersOverview } from "@/components/orders-overview";
import { OrdersTrendChart } from "@/components/orders-trend-chart";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function RestaurantOrders() {
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
        <SiteHeader title="Orders" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <OrdersCards />
              <OrdersTrendChart />
              <OrdersOverview />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
