import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { TableManagementCards } from "@/components/table-management-cards";
import { TableManagementOverview } from "@/components/table-management-overview";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { fetchOwnerTableManagement } from "@/lib/tabletap-supabase-api";
import { useActiveBranchCode } from "@/lib/active-branch";

const DEFAULT_BRANCH_CODE =
  String(import.meta.env.VITE_DEFAULT_BRANCH_CODE ?? "").trim() || "f7-islamabad";

type RestaurantTableManagementProps = {
  dashboardRole?: "owner" | "manager" | "admin";
};

export default function RestaurantTableManagement({
  dashboardRole,
}: RestaurantTableManagementProps) {
  const activeBranchCode = useActiveBranchCode(DEFAULT_BRANCH_CODE);
  const [snapshot, setSnapshot] = React.useState<{
    cards: {
      totalTables: number;
      available: number;
      occupied: number;
      served: number;
      unavailable: number;
    };
    rows: Array<{
      id: string;
      tableId: string;
      tableNumber: string;
      status: "Available" | "Occupied" | "Served" | "Unavailable";
      qrGenerated: boolean;
      currentSession: string;
      orderId: string | null;
      orderStatus: string;
      billTotal: number;
      participantsCount: number;
      startedAt: string | null;
      orderItems: string[];
    }>;
  }>({
    cards: { totalTables: 0, available: 0, occupied: 0, served: 0, unavailable: 0 },
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
        const data = await fetchOwnerTableManagement(activeBranchCode);
        if (!cancelled) {
          setSnapshot(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Owner table management sync failed:", error);
        }
      } finally {
        inFlight = false;
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
  }, [activeBranchCode]);

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
        <SiteHeader title="Table Management" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <TableManagementCards
                totalTables={snapshot.cards.totalTables}
                available={snapshot.cards.available}
                occupied={snapshot.cards.occupied}
              />
              <TableManagementOverview tables={snapshot.rows} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
